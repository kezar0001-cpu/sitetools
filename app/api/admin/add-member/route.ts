import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/workspace/permissions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {

  // Verify the requesting user is authenticated
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    request.headers.get("authorization")?.replace("Bearer ", "") || ""
  );

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized - authentication required" },
      { status: 401 }
    );
  }

  // Verify the requesting user is the super admin
  if (!isSuperAdmin(user.email)) {
    return NextResponse.json(
      { error: "Forbidden - super admin access required" },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { companyId: string; email: string; role: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { companyId, email, role } = body;

  // Validate required fields
  if (!companyId || !email || !role) {
    return NextResponse.json(
      { error: "Missing required fields: companyId, email, role" },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // Validate role
  const validRoles = ["admin", "manager", "member"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
      { status: 400 }
    );
  }

  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // First, check if the user already exists in auth.users
    const { data: existingUsers, error: userLookupError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userLookupError) {
      console.error("[add-member] Error looking up user:", userLookupError);
    }

    let targetUserId: string | null = existingUsers?.id || null;

    // If user doesn't exist, we can't add them directly - they need to sign up first
    // But we'll create a profile for them if auth user exists
    if (!targetUserId) {
      // Try to find the auth user by email using admin API
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError && authUsers?.users) {
        const matchingUser = authUsers.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
        if (matchingUser) {
          targetUserId = matchingUser.id;
          
          // Ensure profile exists
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
              id: targetUserId,
              email: normalizedEmail,
            }, { onConflict: "id" });
          
          if (profileError) {
            console.error("[add-member] Error creating profile:", profileError);
          }
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { 
          error: "User not found. They must sign up for an account first before being added directly. Please use the invitation flow instead." 
        },
        { status: 404 }
      );
    }

    // Check if user is already a member of this company
    const { data: existingMembership, error: membershipCheckError } = await supabaseAdmin
      .from("company_memberships")
      .select("id, role")
      .eq("company_id", companyId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (membershipCheckError) {
      console.error("[add-member] Error checking existing membership:", membershipCheckError);
    }

    if (existingMembership) {
      return NextResponse.json(
        { 
          error: `User is already a member of this company with role: ${existingMembership.role}`,
          membershipId: existingMembership.id
        },
        { status: 409 }
      );
    }

    // Create the membership directly
    const { data: membership, error: insertError } = await supabaseAdmin
      .from("company_memberships")
      .insert({
        company_id: companyId,
        user_id: targetUserId,
        role: role as "admin" | "manager" | "member",
        invited_by: user.id, // Track who added them
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[add-member] Error creating membership:", insertError);
      return NextResponse.json(
        { error: `Failed to add member: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Set the user's active company if they don't have one
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("active_company_id")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile?.active_company_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ active_company_id: companyId })
        .eq("id", targetUserId);
    }

    return NextResponse.json({
      success: true,
      membershipId: membership.id,
      userId: targetUserId,
      message: `Successfully added ${email} as ${role}`,
    });

  } catch (error) {
    console.error("[add-member] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
