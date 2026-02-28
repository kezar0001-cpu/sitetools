import { useOrgManagement } from "./useOrgManagement";

export function InvitationsTab({ orgState }: { orgState: ReturnType<typeof useOrgManagement> }) {
    const {
        loading,
        newInvitationEmail, setNewInvitationEmail,
        newInvitationRole, setNewInvitationRole,
        newInvitationSiteId, setNewInvitationSiteId,
        sendInvitation,
        invitations, revokeInvitation,
        orgSites
    } = orgState;

    if (loading) return null;

    return (
        <div className="space-y-6">
            {/* Send New Invitation */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Send New Invitation</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="email"
                        value={newInvitationEmail}
                        onChange={(e) => setNewInvitationEmail(e.target.value)}
                        placeholder="Email address"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <select
                        value={newInvitationRole}
                        onChange={(e) => setNewInvitationRole(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                    <select
                        value={newInvitationSiteId || ""}
                        onChange={(e) => setNewInvitationSiteId(e.target.value || null)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">No site assignment</option>
                        {orgSites.map((site: any) => (
                            <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={sendInvitation}
                        disabled={loading || !newInvitationEmail.trim()}
                        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        {loading ? "Sending..." : "Send Invitation"}
                    </button>
                </div>
            </div>

            {/* Existing Invitations */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Existing Invitations</h3>
                {invitations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No invitations sent yet.</p>
                ) : (
                    <div className="space-y-2">
                        {invitations.map((invitation: any) => (
                            <div key={invitation.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                                        <p className="text-xs text-gray-500">
                                            Role: {invitation.role} • Status: {invitation.status} •
                                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {invitation.status === "pending" && (
                                        <button
                                            onClick={() => revokeInvitation(invitation.id)}
                                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
