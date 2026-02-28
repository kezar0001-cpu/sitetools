import { useOrgManagement } from "./useOrgManagement";

export function MembersTab({ orgState }: { orgState: ReturnType<typeof useOrgManagement> }) {
    const {
        loading, memberError,
        isExistingUser, setIsExistingUser,
        handleAddMember,
        newMemberEmail, setNewMemberEmail,
        newMemberPassword, setNewMemberPassword,
        newMemberRole, setNewMemberRole,
        newMemberSiteIds, toggleNewMemberSite,
        orgSites, addingMember,
        members, updatingMemberId, removingMemberId,
        handleRoleChange, handleRemoveMember, member
    } = orgState;

    if (loading) return null;

    return (
        <div className="space-y-6">
            {/* Add new member form */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Add Member</h3>
                {memberError && (
                    <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">{memberError}</div>
                )}

                {/* Existing vs New User Toggle */}
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="userType"
                            checked={!isExistingUser}
                            onChange={() => setIsExistingUser(false)}
                            className="w-4 h-4 text-blue-400 border-gray-300 rounded focus:ring-blue-400"
                        />
                        <span className="text-sm text-gray-700">Create new user</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="userType"
                            checked={isExistingUser}
                            onChange={() => setIsExistingUser(true)}
                            className="w-4 h-4 text-blue-400 border-gray-300 rounded focus:ring-blue-400"
                        />
                        <span className="text-sm text-gray-700">Add existing user</span>
                    </label>
                </div>

                <form onSubmit={handleAddMember} className="space-y-4 max-w-xl">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="member_email">Email address</label>
                        <input
                            id="member_email"
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            required
                            placeholder={isExistingUser ? "Enter existing user email" : "Enter email for new account"}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                    </div>
                    {!isExistingUser && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="member_password">Password</label>
                            <input
                                id="member_password"
                                type="password"
                                value={newMemberPassword}
                                onChange={(e) => setNewMemberPassword(e.target.value)}
                                required
                                placeholder="Create password for new user"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="member_role">Role</label>
                        <select
                            id="member_role"
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value as "admin" | "editor" | "viewer")}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        >
                            {isExistingUser ? (
                                <>
                                    <option value="admin">Admin (full organization management)</option>
                                    <option value="editor">Editor (can manage visits for assigned sites)</option>
                                    <option value="viewer">Viewer (read-only access)</option>
                                </>
                            ) : (
                                <>
                                    <option value="editor">Editor (can manage visits for assigned sites)</option>
                                    <option value="viewer">Viewer (read-only access)</option>
                                </>
                            )}
                        </select>
                        {!isExistingUser && (
                            <p className="text-xs text-gray-500 mt-1">💡 New users can be created as Editor or Viewer. Promote to Admin after creation using the role dropdown in Existing Members.</p>
                        )}
                    </div>
                    {newMemberRole === "editor" && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to sites</label>
                            <div className="space-y-2">
                                {orgSites.map((site: any) => (
                                    <label key={site.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={newMemberSiteIds.includes(site.id)}
                                            onChange={() => toggleNewMemberSite(site.id)}
                                            className="w-4 h-4 text-blue-400 border-gray-300 rounded focus:ring-blue-400"
                                        />
                                        <span>{site.name}</span>
                                    </label>
                                ))}
                                {orgSites.length === 0 && <span className="text-xs text-gray-500">No sites yet. Create one first.</span>}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={addingMember}
                            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                            {addingMember ? "Adding…" : "Add Member"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setNewMemberEmail(""); setNewMemberPassword(""); setNewMemberRole("editor"); toggleNewMemberSite(""); setIsExistingUser(false); }}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-2"
                        >
                            Clear
                        </button>
                    </div>
                </form>
            </div>

            {/* Existing members list */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Existing Members</h3>
                {members.length === 0 ? (
                    <p className="text-gray-500 text-sm">No members yet.</p>
                ) : (
                    <div className="space-y-2">
                        {members.map((memberItem: any) => (
                            <div key={memberItem.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{memberItem.email || memberItem.user_id}</p>
                                        <p className="text-xs text-gray-500">Role: {memberItem.role}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={memberItem.role}
                                            onChange={(e) => handleRoleChange(memberItem.id, e.target.value as "admin" | "editor" | "viewer")}
                                            disabled={updatingMemberId === memberItem.id}
                                            className="text-xs border border-gray-300 rounded px-2 py-1"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="editor">Editor</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(memberItem.id, memberItem.user_id)}
                                            disabled={removingMemberId === memberItem.id || memberItem.user_id === member.user_id}
                                            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                                        >
                                            {removingMemberId === memberItem.id ? "Removing…" : "Remove"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
