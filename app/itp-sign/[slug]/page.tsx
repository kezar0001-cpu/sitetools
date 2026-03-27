import { createClient } from "@supabase/supabase-js";
import SignOffForm from "./SignOffForm";

type ItemType = "hold" | "witness";
type ItemStatus = "pending" | "signed" | "waived";

interface ItpItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ItemType;
  status: ItemStatus;
  signed_off_at: string | null;
  signed_off_by_name: string | null;
  sign_off_lat: number | null;
  sign_off_lng: number | null;
  session_id: string;
  itp_sessions: { task_description: string | null } | null;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function ItpSignPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("itp_items")
    .select(
      "id, slug, title, description, type, status, signed_off_at, signed_off_by_name, sign_off_lat, sign_off_lng, session_id, itp_sessions!session_id(task_description)"
    )
    .eq("slug", slug)
    .maybeSingle();

  const item = data as ItpItem | null;

  // ── Not found ────────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
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
              This inspection point doesn&apos;t exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const taskDescription = item.itp_sessions?.task_description ?? null;

  // ── Waived ───────────────────────────────────────────────────────────────
  if (item.status === "waived") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 shadow-lg p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-900">Point Waived</h2>
            <p className="text-slate-500 text-sm">This point was waived.</p>
            <div className="bg-white rounded-xl border border-amber-200 p-4 text-left space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Item
              </p>
              <p className="font-bold text-slate-800">{item.title}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Already signed ───────────────────────────────────────────────────────
  if (item.status === "signed") {
    const signedAt = item.signed_off_at
      ? new Date(item.signed_off_at).toLocaleString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 shadow-lg p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Already Signed Off</h2>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 text-left space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Signed by
                </p>
                <p className="font-bold text-slate-800">
                  {item.signed_off_by_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Date &amp; Time
                </p>
                <p className="text-slate-700">{signedAt}</p>
              </div>
              {item.sign_off_lat != null && item.sign_off_lng != null && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Location
                  </p>
                  <p className="text-slate-700 text-sm font-mono">
                    {item.sign_off_lat.toFixed(5)}, {item.sign_off_lng.toFixed(5)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending — show sign-off form ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm mx-auto px-4 py-8">
        <SignOffForm
          slug={slug}
          title={item.title}
          description={item.description}
          type={item.type}
          taskDescription={taskDescription}
        />
      </div>
    </div>
  );
}
