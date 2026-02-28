"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface OrgJoinRequest {
  id: string;
  org_id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  org_id: string;
}

export function JoinRequestsPanel({ orgId, orgSites }: { orgId: string; orgSites: Site[] }) {
  const [requests, setRequests] = useState<OrgJoinRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<Record<string, "admin" | "editor" | "viewer">>({});
  const [assignSite, setAssignSite] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from("org_join_requests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (data) {
      setRequests(data as OrgJoinRequest[]);
      // Initialize role assignments
      const roleMap: Record<string, "admin" | "editor" | "viewer"> = {};
      const siteMap: Record<string, string> = {};
      data.forEach((req) => {
        roleMap[req.id] = "viewer";
        siteMap[req.id] = "";
      });
      setAssignRole(roleMap);
      setAssignSite(siteMap);
    }
  }, [orgId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleApprove(requestId: string) {
    setError(null);
    const role = assignRole[requestId];
    const siteId = assignSite[requestId];

    if (role === "editor" && !siteId) {
      setError("Editors must be assigned to a site.");
      return;
    }

    setProcessing(requestId);
    const { data, error: rpcError } = await supabase.rpc("approve_join_request", {
      request_id: requestId,
      assign_role: role,
      assign_site_id: role === "editor" ? siteId : null,
    });

    setProcessing(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      setError(result.error || "Failed to approve request.");
      return;
    }

    fetchRequests();
  }

  async function handleReject(requestId: string) {
    setProcessing(requestId);
    const { error: updateErr } = await supabase
      .from("org_join_requests")
      .update({
        status: "rejected",
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    setProcessing(null);
    if (updateErr) {
      setError("Failed to reject request.");
      return;
    }
    fetchRequests();
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-purple-400 text-white rounded-lg p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">Join Requests</span>
          <span className="text-xs text-gray-400 font-medium">({pendingRequests.length} pending)</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-4 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          {requests.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No join requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => {
                const statusColor =
                  req.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : req.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800";

                return (
                  <li key={req.id} className="bg-gray-50 rounded-xl px-4 py-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 font-mono truncate">
                            {req.user_id.slice(0, 8)}...
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Requested {new Date(req.created_at).toLocaleDateString()}
                        </p>
                        {req.message && (
                          <p className="text-sm text-gray-700 mt-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {req.status === "pending" && (
                      <div className="border-t border-gray-200 pt-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Role</label>
                            <select
                              value={assignRole[req.id] || "viewer"}
                              onChange={(e) =>
                                setAssignRole((prev) => ({
                                  ...prev,
                                  [req.id]: e.target.value as "admin" | "editor" | "viewer",
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          {assignRole[req.id] === "editor" && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to Site</label>
                              <select
                                value={assignSite[req.id] || ""}
                                onChange={(e) =>
                                  setAssignSite((prev) => ({ ...prev, [req.id]: e.target.value }))
                                }
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                              >
                                <option value="">Select a site…</option>
                                {orgSites.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={processing === req.id}
                            className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            {processing === req.id ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={processing === req.id}
                            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            {processing === req.id ? "…" : "Reject"}
                          </button>
                        </div>
                      </div>
                    )}

                    {req.status !== "pending" && req.reviewed_at && (
                      <p className="text-xs text-gray-500 border-t border-gray-200 pt-2">
                        Reviewed {new Date(req.reviewed_at).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
