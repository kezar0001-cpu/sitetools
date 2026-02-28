import { useOrgManagement } from "./useOrgManagement";

export function JoinRequestsTab({ orgState }: { orgState: ReturnType<typeof useOrgManagement> }) {
    const {
        loading,
        joinRequests,
        approveJoinRequest,
        rejectJoinRequest
    } = orgState;

    if (loading) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Join Requests</h3>
            {joinRequests.length === 0 ? (
                <p className="text-gray-500 text-sm">No pending join requests.</p>
            ) : (
                <div className="space-y-2">
                    {joinRequests.map((request: any) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">User: {request.user_id}</p>
                                    {request.message && (
                                        <p className="text-xs text-gray-600 mt-1">&ldquo;{request.message}&rdquo;</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        Status: {request.status} • {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {request.status === "pending" && (
                                    <div className="flex gap-2">
                                        <select
                                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                                            defaultValue="viewer"
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="editor">Editor</option>
                                        </select>
                                        <button
                                            onClick={() => approveJoinRequest(request.id, "viewer", null)}
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded text-xs"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => rejectJoinRequest(request.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1 rounded text-xs"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
