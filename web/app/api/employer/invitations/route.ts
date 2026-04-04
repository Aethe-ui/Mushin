import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth";
import {
  assertEmployerStaffForOrg,
  findUserIdByEmail,
  parseOrgIdParam,
} from "@/lib/employer-server";
import { parseUuidOrNull } from "@/lib/utils";
import { sendInvitationEmail } from "@/lib/email";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = parseOrgIdParam(request);
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const supabase = createClient();
  const allowed = await assertEmployerStaffForOrg(supabase, user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("org_invitations")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { org_id?: string; email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgId = parseUuidOrNull(body.org_id);
  const email = body.email?.trim().toLowerCase();
  const role = body.role === "manager" ? "manager" : "member";

  if (!orgId || !email) {
    return NextResponse.json(
      { error: "org_id and email are required" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const allowed = await assertEmployerStaffForOrg(supabase, user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = createServiceClient();
  const existingUserId = await findUserIdByEmail(svc, email);
  if (existingUserId) {
    const { data: existing } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", existingUserId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }
  }

  const { data: invite, error } = await supabase
    .from("org_invitations")
    .upsert(
      {
        org_id: orgId,
        invited_by: user.id,
        email,
        role,
        status: "pending",
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        responded_at: null,
      },
      { onConflict: "org_id,email" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  try {
    await sendInvitationEmail({
      to: email,
      orgName: org?.name ?? "an organization",
      token: invite.token,
      inviterEmail: user.email ?? "",
      role,
    });
  } catch (e) {
    console.error("Failed to send invitation email:", e);
  }

  return NextResponse.json({ invitation: invite }, { status: 201 });
}
