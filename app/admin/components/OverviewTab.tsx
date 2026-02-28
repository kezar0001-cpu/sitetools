import { OrgInvitation, OrgJoinRequest } from "./types";
import { useOrgManagement } from "./useOrgManagement";

export function OverviewTab({ orgState }: { orgState: ReturnType<typeof useOrgManagement> }) {
    const {
        loading, error, success,
        orgName, setOrgName, orgDescription, setOrgDescription, orgIsPublic, setOrgIsPublic,
        savingOrg, saveOrgDetails, org,
        members, orgSites, invitations, joinRequests,
        setActiveTab
    } = orgState;

    if (loading) return null;

    return (
        <div className="space-y-6">
            {/* Organization Details */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Organization Details</h3>
                <form onSubmit={saveOrgDetails} className="space-y-4 max-w-xl">
                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
                    )}
                    {success && (
                        <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">{success}</div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="org_name">Organization name</label>
                        <input
                            id="org_name"
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="org_desc">Description (optional)</label>
                        <textarea
                            id="org_desc"
                            value={orgDescription}
                            onChange={(e) => setOrgDescription(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id="org_public"
                            type="checkbox"
                            checked={orgIsPublic}
                            onChange={(e) => setOrgIsPublic(e.target.checked)}
                            className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                        />
                        <label htmlFor="org_public" className="text-sm text-gray-700">
                            <span className="font-semibold">Make organization discoverable</span>
                            <span className="text-gray-500 block text-xs">Allow users to find and request to join</span>
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={savingOrg}
                            className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                            {savingOrg ? "Saving…" : "Save changes"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setOrgName(org.name); setOrgDescription(org.description || ""); setOrgIsPublic(org.is_public || false); }}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-blue-600 text-sm font-medium">Total Members</div>
                    <div className="text-2xl font-bold text-blue-900">{members.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-green-600 text-sm font-medium">Active Sites</div>
                    <div className="text-2xl font-bold text-green-900">{orgSites.length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-purple-600 text-sm font-medium">Pending Requests</div>
                    <div className="text-2xl font-bold text-purple-900">
                        {invitations.filter((i: OrgInvitation) => i.status === "pending").length + joinRequests.filter((r: OrgJoinRequest) => r.status === "pending").length}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setActiveTab("members")}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-sm font-medium">Manage Members</span>
                        <span className="text-blue-500">→</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("invitations")}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-sm font-medium">Send Invitation</span>
                        <span className="text-blue-500">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
