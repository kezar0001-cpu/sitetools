import { createClient } from "@supabase/supabase-js";
import SessionSignOffClient from "./SessionSignOffClient";

type ItemType = "hold" | "witness";
type ItemStatus = "pending" | "signed" | "waived";

export interface ItpItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ItemType;
  status: ItemStatus;
  sort_order: number;
  signed_off_at: string | null;
  signed_off_by_name: string | null;
  sign_off_lat: number | null;
  sign_off_lng: number | null;
  reference_standard: string | null;
  responsibility: string | null;
  acceptance_criteria: string | null;
}

export interface ItpSession {
  id: string;
  task_description: string;
  status: string;
  created_at: string;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function ItpSessionSignPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const supabase = getSupabaseAdmin();

  const { data: sessionData } = await supabase
    .from("itp_sessions")
    .select("id, task_description, status, created_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
            <svg
              className="h-7 w-7 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Not Found</h2>
          <p className="text-slate-500 text-sm">
            This ITP does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const { data: itemsData } = await supabase
    .from("itp_items")
    .select(
      "id, slug, title, description, type, status, sort_order, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, reference_standard, responsibility, acceptance_criteria"
    )
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  const items = (itemsData ?? []) as ItpItem[];
  const session = sessionData as ItpSession;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <SessionSignOffClient session={session} initialItems={items} />
      </div>
    </div>
  );
}
