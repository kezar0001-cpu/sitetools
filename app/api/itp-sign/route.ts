import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VALID_ROLES = ['superintendent', 'third_party', 'contractor', 'designer', 'inspector'];

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
    role?: string;
    signature?: string;
    status?: string;
    waive_reason?: string;
    client_hold_reason?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, name, role, signature, status: requestedStatus, waive_reason, client_hold_reason, notes } = body;
  const isWaiver = requestedStatus === 'waived';
  const isClientHold = requestedStatus === 'client_hold';

  // Validate inputs
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  if (isWaiver) {
    const trimmedReason = typeof waive_reason === 'string' ? waive_reason.trim() : '';
    if (!trimmedReason) {
      return NextResponse.json({ error: 'waive_reason is required' }, { status: 400 });
    }
  } else if (isClientHold) {
    const trimmedHold = typeof client_hold_reason === 'string' ? client_hold_reason.trim() : '';
    if (!trimmedHold) {
      return NextResponse.json({ error: 'client_hold_reason is required' }, { status: 400 });
    }
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
  } else {
    // Normal sign-off
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!signature || typeof signature !== 'string') {
      return NextResponse.json({ error: 'signature is required' }, { status: 400 });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'role is required and must be one of: superintendent, third_party, contractor, designer, inspector' }, { status: 400 });
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

  // Waived is the only terminal state — block all actions on waived items
  if (item.status === 'waived') {
    return NextResponse.json({ error: 'Item has been waived' }, { status: 409 });
  }
  // Normal sign-offs: allow multiple people to sign the same item (pending, signed, client_hold)

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const signedAt = new Date().toISOString();

  // ── Normal sign-off: upload signature + insert into itp_item_signoffs ──────
  if (!isWaiver && !isClientHold) {
    let signaturePath: string | undefined;

    try {
      const base64Data = (signature as string).replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const signoffId = crypto.randomUUID();
      // Store per-signoff: {session_id}/{item_id}/{signoff_id}.png
      const storagePath = `${item.session_id}/${item.id}/${signoffId}.png`;

      const { error: uploadError } = await supabase.storage
        .from('itp-signatures')
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('Signature upload failed:', uploadError);
        return NextResponse.json({ error: 'Failed to store signature' }, { status: 500 });
      }

      signaturePath = storagePath;
    } catch (err) {
      console.error('Signature processing error:', err);
      return NextResponse.json({ error: 'Failed to process signature' }, { status: 500 });
    }

    // Insert sign-off record
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    const { error: signoffErr } = await supabase
      .from('itp_item_signoffs')
      .insert({
        item_id: item.id,
        session_id: item.session_id,
        name: trimmedName,
        role: role as string,
        signed_at: signedAt,
        signature_path: signaturePath,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });

    if (signoffErr) {
      console.error('Sign-off insert failed:', signoffErr);
      return NextResponse.json({ error: 'Failed to record sign-off' }, { status: 500 });
    }

    // Update item status to 'signed' only if still pending (first signer)
    if (item.status === 'pending') {
      await supabase
        .from('itp_items')
        .update({
          status: 'signed',
          signed_off_at: signedAt,
          signed_off_by_name: trimmedName,
        })
        .eq('id', item.id)
        .eq('status', 'pending');
    }

    // Audit log
    await supabase.from('itp_audit_log').insert({
      session_id: item.session_id,
      item_id: item.id,
      action: 'sign',
      performed_by_user_id: null,
      old_values: { status: item.status },
      new_values: { status: 'signed', signed_off_by_name: trimmedName, role },
    });

    // Check if all hold-type items are now signed or waived → auto-complete session
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

      await supabase.from('itp_audit_log').insert({
        session_id: item.session_id,
        item_id: null,
        action: 'archive',
        performed_by_user_id: null,
        new_values: { status: 'complete', reason: 'all_hold_points_signed' },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  }

  // ── Waiver ───────────────────────────────────────────────────────────────────
  if (isWaiver) {
    const { data: updatedItem, error: updateError } = await supabase
      .from('itp_items')
      .update({
        status: 'waived',
        signed_off_at: signedAt,
        waive_reason: (waive_reason as string).trim(),
        ...(trimmedName ? { signed_off_by_name: trimmedName } : {}),
      })
      .eq('slug', slug)
      .eq('status', 'pending')
      .select('id, title, type, signed_off_at, signed_off_by_name, waive_reason')
      .single();

    if (updateError || !updatedItem) {
      return NextResponse.json({ error: 'Already signed' }, { status: 409 });
    }

    await supabase.from('itp_audit_log').insert({
      session_id: item.session_id,
      item_id: item.id,
      action: 'waive',
      performed_by_user_id: null,
      old_values: { status: 'pending' },
      new_values: { status: 'waived', waive_reason: (waive_reason as string).trim() },
    });

    return NextResponse.json({ success: true, item: updatedItem }, { status: 200 });
  }

  // ── Client hold ─────────────────────────────────────────────────────────────
  const { data: updatedItem, error: updateError } = await supabase
    .from('itp_items')
    .update({
      status: 'client_hold',
      client_hold_at: signedAt,
      client_hold_reason: (client_hold_reason as string).trim(),
      client_hold_by_name: trimmedName,
    })
    .eq('slug', slug)
    .in('status', ['pending', 'client_hold'])
    .select('id, title, type, signed_off_at, signed_off_by_name, waive_reason, client_hold_at, client_hold_by_name, client_hold_reason')
    .single();

  if (updateError || !updatedItem) {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 });
  }

  await supabase.from('itp_audit_log').insert({
    session_id: item.session_id,
    item_id: item.id,
    action: 'client_hold',
    performed_by_user_id: null,
    old_values: { status: 'pending' },
    new_values: { status: 'client_hold', client_hold_reason: (client_hold_reason as string).trim() },
  });

  return NextResponse.json({ success: true, item: updatedItem }, { status: 200 });
}
