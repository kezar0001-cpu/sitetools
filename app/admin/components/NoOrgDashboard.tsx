"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { JoinOrgPanel } from "./JoinOrgPanel";
import { PendingInvitationsView } from "./PendingInvitationsView";

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
    
    if (data) {
      setPublicOrgs(data);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }
    
    setCreating(true);
    setError(null);
    
    // Check for duplicate organization name (case-insensitive)
    const { data: existingOrg, error: checkError } = await supabase
      .from("organisations")
      .select("id")
      .ilike("name", orgName.trim())
      .single();
    
    if (checkError && checkError.code !== "PGRST116") { // PGRST116 is "not found" error
      setError("Error checking organization name");
      setCreating(false);
      return;
    }
    
    if (existingOrg) {
      setError("An organization with this name already exists");
      setCreating(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("organisations")
      .insert({
        name: orgName.trim(),
        description: orgDescription.trim() || null,
        is_public: isPublic,
        created_by: userId
      })
      .select()
      .single();
    
    if (error) {
      setError(error.message);
      setCreating(false);
      return;
    }
    
    // Add user as admin
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({
        org_id: data.id,
        user_id: userId,
        role: "admin",
        site_id: null
      });
    
    setCreating(false);
    
    if (memberError) {
      setError("Organization created but failed to add you as admin");
      return;
    }
    
    setSuccess("Organization created successfully!");
    onOrgJoined?.();
  }

  async function handleRequestJoin(orgId: string) {
    setRequesting(true);
    setError(null);
    
    const { error } = await supabase
      .from("org_join_requests")
      .insert({
        org_id: orgId,
        user_id: userId,
        message: joinMessage.trim() || null
      });
    
    setRequesting(false);
    
    if (error) {
      setError(error.message);
      return;
    }
    
    setSuccess("Join request sent! An admin will review your request.");
    setJoinMessage("");
  }

  if (mode === "browse") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600 text-white rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">SiteSign</h1>
                <p className="text-xs font-medium text-yellow-800">Construction Site Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-yellow-800">No Organization</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Welcome to SiteSign!</h2>
              <p className="text-gray-600 mb-6">
                You&apos;re all set up with an account. To get started, you can either create your own organization or join an existing one.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setMode("create")}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Create Organization
                </button>
                <button
                  onClick={() => { setMode("join"); fetchPublicOrgs(); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Browse Organizations
                </button>
              </div>
            </div>

            {/* Pending Invitations */}
            <PendingInvitationsView userEmail={userEmail} />

            {/* Join Organization Panel */}
            <JoinOrgPanel userId={userId} onOrgJoined={onOrgJoined} />
          </div>
        </main>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600 text-white rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">Create Organization</h1>
                <p className="text-xs font-medium text-yellow-800">Set up your construction site management</p>
              </div>
            </div>
            <button
              onClick={() => setMode("browse")}
              className="text-yellow-800 hover:text-yellow-900 font-medium text-sm"
            >
              ← Back
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Create Your Organization</h2>
                <p className="text-sm text-gray-500 mt-1">This is the company or group that manages your sites.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
                  {success}
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="org_name">
                    Organization Name *
                  </label>
                  <input
                    id="org_name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Constructions"
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="org_desc">
                    Description (optional)
                  </label>
                  <textarea
                    id="org_desc"
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Brief description of your organization"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    id="is_public"
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="is_public" className="text-sm text-gray-700">
                    <span className="font-semibold">Make organization discoverable</span>
                    <span className="text-gray-500 block text-xs">Allow users to find and request to join</span>
                  </label>
                </div>
                
                <button
                  type="submit"
                  disabled={creating || !orgName.trim()}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold py-3 rounded-xl transition-colors text-sm shadow"
                >
                  {creating ? "Creating…" : "Create Organization"}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-yellow-400 border-b-4 border-yellow-600 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600 text-white rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-yellow-900 tracking-tight">Browse Organizations</h1>
                <p className="text-xs font-medium text-yellow-800">Find and request to join organizations</p>
              </div>
            </div>
            <button
              onClick={() => setMode("browse")}
              className="text-yellow-800 hover:text-yellow-900 font-medium text-sm"
            >
              ← Back
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
                {success}
              </div>
            )}

            {/* Join Organization Panel */}
            <JoinOrgPanel userId={userId} onOrgJoined={onOrgJoined} />

            {/* Public Organizations */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <h2 className="text-xl font-extrabold text-gray-900 mb-6">Public Organizations</h2>
              
              {publicOrgs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No public organizations available. Create your own or ask an admin to invite you.
                </p>
              ) : (
                <div className="space-y-4">
                  {publicOrgs.map((org) => (
                    <div key={org.id} className="border border-gray-200 rounded-xl p-6 space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
                        {org.description && (
                          <p className="text-gray-600 mt-2">{org.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Created {new Date(org.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <textarea
                          placeholder="Optional message to admin (e.g., your role, experience)"
                          value={joinMessage}
                          onChange={(e) => setJoinMessage(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleRequestJoin(org.id)}
                          disabled={requesting}
                          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                        >
                          {requesting ? "Sending..." : "Request to Join"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
