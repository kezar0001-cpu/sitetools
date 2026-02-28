import { useOrgManagement } from "./useOrgManagement";

export function SettingsTab({ orgState }: { orgState: ReturnType<typeof useOrgManagement> }) {
    const {
        loading,
        joinCode, joinCodeExpiry, generatingCode, generateJoinCode, copyJoinCode,
        transferEmail, setTransferEmail, transferMessage, setTransferMessage, requestTransfer,
        deletionReason, setDeletionReason, requestDeletion
    } = orgState;

    if (loading) return null;

    return (
        <div className="space-y-6">
            {/* Join Code Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Join Code</h3>
                <p className="text-xs text-gray-600">Generate a code that allows users to join directly without approval.</p>

                {joinCode ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm">{joinCode}</code>
                            <button
                                onClick={copyJoinCode}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Expires: {joinCodeExpiry ? new Date(joinCodeExpiry).toLocaleString() : "Unknown"}
                        </p>
                    </div>
                ) : (
                    <p className="text-xs text-gray-500">No active join code</p>
                )}

                <button
                    onClick={generateJoinCode}
                    disabled={generatingCode}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    {generatingCode ? "Generating..." : "Generate New Code"}
                </button>
            </div>

            {/* Organization Transfer */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-900">Transfer Organization</h3>
                <p className="text-xs text-gray-600">Transfer ownership to another user.</p>

                <div className="space-y-2">
                    <input
                        type="email"
                        value={transferEmail}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        placeholder="User email address"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <textarea
                        value={transferMessage}
                        onChange={(e) => setTransferMessage(e.target.value)}
                        placeholder="Optional message to the user"
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        onClick={requestTransfer}
                        disabled={loading || !transferEmail.trim()}
                        className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-yellow-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        {loading ? "Sending..." : "Send Transfer Request"}
                    </button>
                </div>
            </div>

            {/* Organization Deletion */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-red-700">Delete Organization</h3>
                <p className="text-xs text-gray-600">
                    ⚠️ This action cannot be undone. All data will be permanently deleted.
                </p>

                <div className="space-y-2">
                    <textarea
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        placeholder="Reason for deletion (required)"
                        rows={3}
                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                        onClick={requestDeletion}
                        disabled={loading || !deletionReason.trim()}
                        className="bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        {loading ? "Processing..." : "Request Deletion"}
                    </button>
                </div>
            </div>
        </div>
    );
}
