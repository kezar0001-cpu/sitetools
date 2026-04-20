import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * POST /api/transfer-ownership
 * Transfers company ownership to another admin member.
 * Only the current owner can execute this transfer.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice(7);

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user's session
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companyId, newOwnerId } = body;

    if (!companyId || !newOwnerId) {
      return NextResponse.json(
        { error: "Company ID and new owner ID are required" },
        { status: 400 }
      );
    }

    // Execute the ownership transfer RPC
    const { data, error } = await supabaseAdmin.rpc("transfer_company_ownership", {
      p_company_id: companyId,
      p_new_owner_id: newOwnerId,
    });

    if (error) {
      console.error("Ownership transfer RPC error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to transfer ownership" },
        { status: 400 }
      );
    }

    // Send notification emails to both parties
    try {
      await sendOwnershipTransferNotifications(supabaseAdmin as unknown as typeof createClient, companyId, user.id, newOwnerId, data);
    } catch (emailError) {
      // Don't fail the transfer if emails fail, just log it
      console.error("Failed to send ownership transfer emails:", emailError);
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Ownership transfer error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to transfer ownership" },
      { status: 500 }
    );
  }
}

interface ProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
}

/**
 * Send notification emails to both parties about the ownership transfer
 */
async function sendOwnershipTransferNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  companyId: string,
  previousOwnerId: string,
  newOwnerId: string,
  transferData: Record<string, unknown>
): Promise<void> {
  // Get both users' profiles
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", [previousOwnerId, newOwnerId]);

  const profileList = (profiles ?? []) as ProfileData[];
  const previousOwner = profileList.find((p: ProfileData) => p.id === previousOwnerId);
  const newOwner = profileList.find((p: ProfileData) => p.id === newOwnerId);

  if (!previousOwner?.email || !newOwner?.email) {
    console.warn("Missing email addresses for ownership transfer notifications");
    return;
  }

  const companyName = (transferData.company_name as string) || "Your company";

  // Send notification to previous owner (demoted to admin)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: previousOwner.email,
        subject: `You transferred ownership of ${companyName}`,
        template: "ownership-transferred-previous-owner",
        data: {
          recipientName: previousOwner.full_name || previousOwner.email,
          companyName,
          newOwnerName: newOwner.full_name || newOwner.email,
          newOwnerEmail: newOwner.email,
          transferredAt: new Date().toISOString(),
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings`,
        },
      }),
    });
  } catch (err) {
    console.error("Failed to send notification to previous owner:", err);
  }

  // Send notification to new owner
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: newOwner.email,
        subject: `You are now the owner of ${companyName}`,
        template: "ownership-transferred-new-owner",
        data: {
          recipientName: newOwner.full_name || newOwner.email,
          companyName,
          previousOwnerName: previousOwner.full_name || previousOwner.email,
          previousOwnerEmail: previousOwner.email,
          transferredAt: new Date().toISOString(),
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings`,
        },
      }),
    });
  } catch (err) {
    console.error("Failed to send notification to new owner:", err);
  }
}
