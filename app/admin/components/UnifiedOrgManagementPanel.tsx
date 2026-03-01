"use client";

import { useOrgManagement } from "./useOrgManagement";
import { Organisation, OrgMember, Site, OrgJoinRequest } from "./types";

interface OrgManagementPanelProps {
  org: Organisation;
  member: OrgMember;
  orgSites: Site[];
  onOrgDeleted?: () => void;
  onOrgUpdated?: (org: Organisation) => void;
}

type TabId = "overview" | "members" | "requests" | "settings";

const TABS: { id: TabId; name: string; icon: string }[] = [
  { id: "overview", name: "Overview", icon: "📊" },
  { id: "members", name: "Members", icon: "👥" },
  { id: "requests", name: "Join Requests", icon: "📩" },
  { id: "settings", name: "Settings", icon: "⚙️" },
];

export function UnifiedOrgManagementPanel(props: OrgManagementPanelProps) {
  const state = useOrgManagement(props.org, props.member, props.orgSites, props.onOrgDeleted, props.onOrgUpdated);
  const { isAdmin, activeTab, setActiveTab, isCollapsed, setIsCollapsed, loading, error, success, setError, setSuccess } = state;

  if (!isAdmin) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-yellow-100 text-yellow-700 rounded-lg p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">Organisation Management</span>
          {state.joinRequests.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{state.joinRequests.length}</span>
          )}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isCollapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!isCollapsed && (
        <div className="border-t border-gray-100">
          {/* Status messages */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
          {success && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {success}
              <button onClick={() => setSuccess(null)} className="ml-2 text-green-400 hover:text-green-600">✕</button>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 px-6 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setError(null); setSuccess(null); }}
                  className={`py-3 px-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${activeTab === tab.id
                      ? "border-yellow-500 text-yellow-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.name}</span>
                  {tab.id === "requests" && state.joinRequests.length > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{state.joinRequests.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              <>
                {activeTab === "overview" && <OverviewSection state={state} />}
                {activeTab === "members" && <MembersSection state={state} />}
                {activeTab === "requests" && <RequestsSection state={state} />}
                {activeTab === "settings" && <SettingsSection state={state} />}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Sections ────────────────────────────────────────────────────────────

type State = ReturnType<typeof useOrgManagement>;

function OverviewSection({ state }: { state: State }) {
  const { orgName, setOrgName, orgDescription, setOrgDescription, orgIsPublic, setOrgIsPublic, savingOrg, saveOrgDetails, org, members, orgSites, joinRequests, setActiveTab } = state;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => setActiveTab("members")} className="bg-blue-50 rounded-xl p-4 text-left hover:bg-blue-100 transition-colors">
          <div className="text-blue-600 text-sm font-medium">Members</div>
          <div className="text-2xl font-bold text-blue-900">{members.length}</div>
        </button>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-green-600 text-sm font-medium">Active Sites</div>
          <div className="text-2xl font-bold text-green-900">{orgSites.length}</div>
        </div>
        <button onClick={() => setActiveTab("requests")} className="bg-purple-50 rounded-xl p-4 text-left hover:bg-purple-100 transition-colors">
          <div className="text-purple-600 text-sm font-medium">Pending Requests</div>
          <div className="text-2xl font-bold text-purple-900">{joinRequests.length}</div>
        </button>
      </div>

      {/* Org details form */}
      <form onSubmit={saveOrgDetails} className="space-y-4 max-w-xl">
        <h3 className="text-sm font-bold text-gray-900">Organization Details</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="org_name">Name</label>
          <input id="org_name" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="org_desc">Description</label>
          <textarea id="org_desc" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
        </div>
        <div className="flex items-center gap-2">
          <input id="org_public" type="checkbox" checked={orgIsPublic} onChange={(e) => setOrgIsPublic(e.target.checked)}
            className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400" />
          <label htmlFor="org_public" className="text-sm text-gray-700">
            <span className="font-semibold">Make discoverable</span>
            <span className="text-gray-500 block text-xs">Allow users to find and request to join</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={savingOrg}
            className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
            {savingOrg ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={() => { setOrgName(org.name); setOrgDescription(org.description || ""); setOrgIsPublic(org.is_public || false); }}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function MembersSection({ state }: { state: State }) {
  const {
    members, orgSites, memberError,
    newMemberEmail, setNewMemberEmail, newMemberPassword, setNewMemberPassword,
    newMemberRole, setNewMemberRole, newMemberSiteIds, isExistingUser, setIsExistingUser,
    addingMember, removingMemberId, updatingMemberId,
    toggleNewMemberSite, handleAddMember, handleRemoveMember, handleRoleChange, member
  } = state;

  return (
    <div className="space-y-6">
      {/* Add member form */}
      <form onSubmit={handleAddMember} className="space-y-4 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-gray-900">Add Member</h3>

        {memberError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{memberError}</div>
        )}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" checked={!isExistingUser} onChange={() => setIsExistingUser(false)}
              className="text-yellow-400 focus:ring-yellow-400" />
            New user
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" checked={isExistingUser} onChange={() => setIsExistingUser(true)}
              className="text-yellow-400 focus:ring-yellow-400" />
            Existing user
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} required placeholder="user@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          {!isExistingUser && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
              <input type="password" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} required={!isExistingUser} placeholder="Min 6 characters"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
          <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as "admin" | "editor" | "viewer")}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="admin">Admin — full control</option>
            <option value="editor">Editor — manages assigned sites</option>
            <option value="viewer">Viewer — read only</option>
          </select>
        </div>

        {newMemberRole === "editor" && orgSites.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to sites</label>
            <div className="space-y-1">
              {orgSites.map((site: Site) => (
                <label key={site.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={newMemberSiteIds.includes(site.id)} onChange={() => toggleNewMemberSite(site.id)}
                    className="text-yellow-400 focus:ring-yellow-400 rounded" />
                  {site.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={addingMember}
          className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          {addingMember ? "Adding…" : "Add Member"}
        </button>
      </form>

      {/* Members list */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-900">Current Members ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-gray-400 text-sm">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m: OrgMember) => (
              <div key={m.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.email || m.user_id}</p>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${m.role === "admin" ? "bg-yellow-100 text-yellow-800" :
                      m.role === "editor" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-600"
                    }`}>{m.role}</span>
                  {m.user_id === member.user_id && <span className="text-xs text-gray-400 ml-2">(you)</span>}
                </div>
                {m.user_id !== member.user_id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as "admin" | "editor" | "viewer")}
                      disabled={updatingMemberId === m.id}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(m.id, m.user_id)}
                      disabled={removingMemberId === m.id}
                      className="text-red-500 hover:text-red-700 text-xs font-bold disabled:opacity-50"
                    >
                      {removingMemberId === m.id ? "…" : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsSection({ state }: { state: State }) {
  const { joinRequests, approveJoinRequest, rejectJoinRequest, orgSites } = state;

  if (joinRequests.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400 text-sm">No pending join requests.</p>
        <p className="text-gray-400 text-xs mt-1">Users can request to join if your organization is public, or use a join code.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-900">Pending Requests ({joinRequests.length})</h3>
      {joinRequests.map((req: OrgJoinRequest) => (
        <div key={req.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{req.user_email || req.user_id}</p>
            {req.message && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{req.message}&rdquo;</p>}
            <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => approveJoinRequest(req.id, "viewer", null)}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              Approve as Viewer
            </button>
            {orgSites.length > 0 && (
              <button
                onClick={() => approveJoinRequest(req.id, "editor", orgSites[0]?.id || null)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
              >
                Approve as Editor
              </button>
            )}
            <button
              onClick={() => rejectJoinRequest(req.id)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsSection({ state }: { state: State }) {
  const { joinCode, joinCodeExpiry, generatingCode, generateJoinCode, copyJoinCode, deleteOrganisation } = state;
  const isExpired = joinCodeExpiry && new Date(joinCodeExpiry) < new Date();

  return (
    <div className="space-y-8">
      {/* Join code */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Join Code</h3>
        <p className="text-xs text-gray-500">Share this code with people so they can join your organization directly.</p>

        {joinCode && !isExpired ? (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
            <code className="text-lg font-mono font-bold text-gray-900 tracking-widest">{joinCode}</code>
            <button onClick={copyJoinCode}
              className="text-blue-500 hover:text-blue-700 text-xs font-bold">
              Copy
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              Expires {new Date(joinCodeExpiry).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{isExpired ? "Join code has expired." : "No active join code."}</p>
        )}

        <button onClick={generateJoinCode} disabled={generatingCode}
          className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          {generatingCode ? "Generating…" : joinCode && !isExpired ? "Regenerate Code" : "Generate Join Code"}
        </button>
      </div>

      {/* Danger zone */}
      <div className="border-t border-gray-200 pt-6 space-y-3">
        <h3 className="text-sm font-bold text-red-600">Danger Zone</h3>
        <p className="text-xs text-gray-500">Permanently delete this organization and all its data. This cannot be undone.</p>
        <button onClick={deleteOrganisation}
          className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          Delete Organisation
        </button>
      </div>
    </div>
  );
}
