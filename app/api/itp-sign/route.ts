import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Upstash Redis rate limiter (sliding window, 10 req / 60 s per slug).
// Falls back to allowing the request if env vars are absent.
async function checkRateLimit(slug: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return true; // graceful fallback

  try {
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');

    const redis = new Redis({ url, token });
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'itp-sign',
    });

    const { success } = await ratelimit.limit(slug);
    return success;
  } catch {
    // If Upstash is unreachable, fail open
    return true;
  }
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    name?: string;
    signature?: string;
    lat?: number;
    lng?: number;
    status?: string;
    waive_reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, name, signature, lat, lng, status: requestedStatus, waive_reason } = body;
  const isWaiver = requestedStatus === 'waived';

  // Validate inputs
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  if (isWaiver) {
    const trimmedReason = typeof waive_reason === 'string' ? waive_reason.trim() : '';
    if (!trimmedReason) {
      return NextResponse.json({ error: 'waive_reason is required' }, { status: 400 });
    }
  } else {
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!signature || typeof signature !== 'string') {
      return NextResponse.json({ error: 'signature is required' }, { status: 400 });
    }
  }

  // Rate limit
  if (!(await checkRateLimit(slug))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();

  // Look up the item
  const { data: item, error: fetchError } = await supabase
    .from('itp_items')
    .select('id, session_id, title, type, status')
    .eq('slug', slug)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (item.status !== 'pending') {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 });
  }

  // Build the update payload
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const updatePayload: Record<string, unknown> = isWaiver
    ? {
        status: 'waived',
        signed_off_at: new Date().toISOString(),
        waive_reason: (waive_reason as string).trim(),
        ...(trimmedName ? { signed_off_by_name: trimmedName } : {}),
      }
    : {
        status: 'signed',
        signed_off_at: new Date().toISOString(),
        signed_off_by_name: trimmedName,
        signature,
      };

  if (!isWaiver) {
    if (typeof lat === 'number') updatePayload.sign_off_lat = lat;
    if (typeof lng === 'number') updatePayload.sign_off_lng = lng;
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from('itp_items')
    .update(updatePayload)
    .eq('slug', slug)
    .eq('status', 'pending')
    .select('id, title, type, signed_off_at, signed_off_by_name, waive_reason')
    .single();

  if (updateError || !updatedItem) {
    // Concurrent sign-off race — treat as already signed
    return NextResponse.json({ error: 'Already signed' }, { status: 409 });
  }

  // Check if all hold-type items in the session are now signed or waived
  const { data: holdItems, error: holdError } = await supabase
    .from('itp_items')
    .select('status')
    .eq('session_id', item.session_id)
    .eq('type', 'hold');

  if (!holdError && holdItems && holdItems.every((h: { status: string }) => h.status === 'signed' || h.status === 'waived')) {
    await supabase
      .from('itp_sessions')
      .update({ status: 'complete' })
      .eq('id', item.session_id);
  }

  return NextResponse.json({ success: true, item: updatedItem }, { status: 200 });
}
