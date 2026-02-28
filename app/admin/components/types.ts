export interface Organisation {
    id: string;
    name: string;
    created_at: string;
    is_public?: boolean;
    description?: string | null;
    join_code?: string | null;
    join_code_expires?: string | null;
    created_by?: string | null;
}

export interface OrgMember {
    id: string;
    org_id: string;
    user_id: string;
    role: "admin" | "editor" | "viewer";
    site_id: string | null;
    created_at?: string;
    email?: string;
}

export interface Site {
    id: string;
    name: string;
    slug: string;
    org_id: string;
    logo_url?: string | null;
}

export interface OrgInvitation {
    id: string;
    org_id: string;
    email: string;
    role: string;
    site_id: string | null;
    status: string;
    created_at: string;
    expires_at: string;
}

export interface OrgJoinRequest {
    id: string;
    org_id: string;
    user_id: string;
    message: string | null;
    status: string;
    created_at: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
}
