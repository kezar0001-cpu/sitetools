"use client";

import { Organisation, OrgMember, Site } from "./types";
import { useOrgManagement } from "./useOrgManagement";
import { OverviewTab } from "./OverviewTab";
import { MembersTab } from "./MembersTab";
import { InvitationsTab } from "./InvitationsTab";
import { JoinRequestsTab } from "./JoinRequestsTab";
import { SettingsTab } from "./SettingsTab";

interface UnifiedOrgManagementPanelProps {
  org: Organisation;
  member: OrgMember;
  orgSites: Site[];
  onOrgDeleted?: () => void;
  onOrgUpdated?: (org: Organisation) => void;
}

export function UnifiedOrgManagementPanel({
  org,
  member,
  orgSites,
  onOrgDeleted,
  onOrgUpdated
}: UnifiedOrgManagementPanelProps) {
  const orgState = useOrgManagement(org, member, orgSites, onOrgDeleted, onOrgUpdated);
  const {
    isAdmin, activeTab, setActiveTab, error, success, loading,
    isCollapsed, setIsCollapsed, members, invitations, joinRequests
  } = orgState;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Collapsible Header */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-yellow-900 rounded-lg p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900">Organization Management</h2>
              <p className="text-sm text-gray-500">Manage members, invitations, and settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {members.length} members
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 text-gray-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: "overview", name: "Overview", icon: "📊" },
                { id: "members", name: "Members", icon: "👥" },
                { id: "invitations", name: "Invitations", icon: "✉️" },
                { id: "requests", name: "Join Requests", icon: "📝" },
                { id: "settings", name: "Settings", icon: "⚙️" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as "overview" | "members" | "invitations" | "requests" | "settings");
                    orgState.setError(null);
                    orgState.setSuccess(null);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                  {tab.id === "invitations" && invitations.filter(i => i.status === "pending").length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                      {invitations.filter(i => i.status === "pending").length}
                    </span>
                  )}
                  {tab.id === "requests" && joinRequests.filter(r => r.status === "pending").length > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-600 text-xs font-bold px-2 py-1 rounded-full">
                      {joinRequests.filter(r => r.status === "pending").length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
                {success}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-400 text-sm">Loading...</div>
              </div>
            )}

            {!loading && (
              <>
                {activeTab === "overview" && <OverviewTab orgState={orgState} />}
                {activeTab === "members" && <MembersTab orgState={orgState} />}
                {activeTab === "invitations" && <InvitationsTab orgState={orgState} />}
                {activeTab === "requests" && <JoinRequestsTab orgState={orgState} />}
                {activeTab === "settings" && <SettingsTab orgState={orgState} />}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
