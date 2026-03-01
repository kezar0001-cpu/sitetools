"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { JoinOrgPanel } from "./JoinOrgPanel";

interface Organisation {
  id: string;
  name: string;
  created_at: string;
  is_public?: boolean;
  description?: string | null;
}

interface NoOrgDashboardProps {
  userId: string;
  userEmail: string;
  onOrgJoined?: () => void;
}

export function NoOrgDashboard({ userId, userEmail, onOrgJoined }: NoOrgDashboardProps) {
  const [mode, setMode] = useState<"browse" | "create" | "join">("browse");
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publicOrgs, setPublicOrgs] = useState<Organisation[]>([]);
  const [joinMessage, setJoinMessage] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchPublicOrgs();
  }, []);

  async function fetchPublicOrgs() {
    const { data } = await supabase
      .from("organisations")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    if (data) setPublicOrgs(data);
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!orgName.trim()) { setError("Organization name is required"); return; }

    setCreating(true);

    // Check for duplicate name
    const { data: existingOrg, error: checkError } = await supabase
      .from("organisations").select("id").ilike("name", orgName.trim()).single();

    if (checkError && checkError.code !== "PGRST116") {
      setError("Error checking organization name"); setCreating(false); return;
    }
    if (existingOrg) {
      setError("An organization with this name already exists"); setCreating(false); return;
    }

    const { data, error } = await supabase
      .from("organisations")
      .insert({ name: orgName.trim(), description: orgDescription.trim() || null, is_public: isPublic })
      .select()
      .single();

    if (error) { setError(error.message); setCreating(false); return; }

    // Add user as admin
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({ org_id: data.id, user_id: userId, role: "admin", site_id: null });

    setCreating(false);
    if (memberError) { setError("Organization created but failed to add you as admin"); return; }

    setSuccess("Organization created successfully!");
    onOrgJoined?.();
  }

  async function handleRequestJoin(orgId: string) {
    setRequesting(true); setError(null);
    const { error } = await supabase
      .from("org_join_requests")
      .insert({ org_id: orgId, user_id: userId, message: joinMessage.trim() || null });

    setRequesting(false);
    if (error) {
      if (error.code === "23505" || error.message?.toLowerCase().includes("duplicate")) {
        setError("You already have a pending request for this organisation.");
      } else {
        setError(error.message);
      }
      return;
    }
    setSuccess("Join request sent! An admin will review your request.");
    setJoinMessage("");
  }

  // ─── Browse mode ───────────────────────────────────────
  if (mode === "browse") {
    return (
      <section className="max-w-5xl mx-auto w-full py-8 px-4 space-y-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome to SiteSign</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get started by creating your own organization or joining an existing one to manage your construction sites.
          </p>
          {userEmail && (
            <p className="text-sm text-gray-400">Signed in as {userEmail}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button onClick={() => setMode("create")}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-left hover:shadow-xl transition-shadow group">
            <div className="bg-yellow-100 text-yellow-700 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Create Organization</h3>
            <p className="text-gray-600">Set up a new organization to manage your construction sites and team members.</p>
          </button>

          <button onClick={() => setMode("join")}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-left hover:shadow-xl transition-shadow group">
            <div className="bg-blue-100 text-blue-700 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Join Organization</h3>
            <p className="text-gray-600">Browse public organizations or use a join code to access an existing organization.</p>
          </button>
        </div>
      </section>
    );
  }

  // ─── Create mode ───────────────────────────────────────
  if (mode === "create") {
    return (
      <section className="max-w-3xl mx-auto w-full py-8 px-4 space-y-6">
        <button onClick={() => setMode("browse")} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
          ← Back to options
        </button>
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold text-gray-900">Create Your Organization</h2>
          <p className="text-sm text-gray-600">This is the company or group that manages your sites.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
        {success && <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">{success}</div>}

        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="org_name">Organization Name *</label>
            <input id="org_name" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Acme Constructions" autoFocus
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="org_desc">Description (optional)</label>
            <textarea id="org_desc" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} placeholder="Brief description of your organization" rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <input id="is_public" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400" />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              <span className="font-semibold">Make organization discoverable</span>
              <span className="text-gray-500 block text-xs">Allow users to find and request to join</span>
            </label>
          </div>
          <button type="submit" disabled={creating || !orgName.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold py-3 rounded-xl transition-colors text-sm shadow">
            {creating ? "Creating…" : "Create Organization"}
          </button>
        </form>
      </section>
    );
  }

  // ─── Join mode ─────────────────────────────────────────
  if (mode === "join") {
    return (
      <section className="max-w-5xl mx-auto w-full py-8 px-4 space-y-6">
        <button onClick={() => setMode("browse")} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
          ← Back to options
        </button>

        {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}
        {success && <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">{success}</div>}

        <JoinOrgPanel userId={userId} onOrgJoined={onOrgJoined} />

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6">Public Organizations</h2>
          {publicOrgs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No public organizations available. Create your own or ask an admin to invite you.</p>
          ) : (
            <div className="space-y-4">
              {publicOrgs.map((org) => (
                <div key={org.id} className="border border-gray-200 rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
                    {org.description && <p className="text-gray-600 mt-2">{org.description}</p>}
                    <p className="text-xs text-gray-500 mt-2">Created {new Date(org.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-3">
                    <textarea
                      placeholder="Optional message to admin (e.g., your role, experience)"
                      value={joinMessage}
                      onChange={(e) => setJoinMessage(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                    <button onClick={() => handleRequestJoin(org.id)} disabled={requesting}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                      {requesting ? "Sending…" : "Request to Join"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
}
