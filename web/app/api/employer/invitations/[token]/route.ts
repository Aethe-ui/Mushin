import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const svc = createServiceClient();
  const { data: invite, error } = await svc
    .from("org_invitations")
    .select("id, org_id, email, role, status, expires_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: `Invitation already ${invite.status}` },
      { status: 410 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    await svc.from("org_invitations").update({ status: "expired" }).eq("token", token);
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  const orgRow = invite.organizations as { name?: string } | null;

  return NextResponse.json({
    invitation: {
      id: invite.id,
      org_id: invite.org_id,
      org_name: orgRow?.name ?? "",
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expires_at: invite.expires_at,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  let body: { action: "accept" | "reject" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "accept" && body.action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'reject'" },
      { status: 400 }
    );
  }

  const svc = createServiceClient();
  const { data: invite, error: fetchErr } = await svc
    .from("org_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (fetchErr || !invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `Already ${invite.status}` }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    await svc.from("org_invitations").update({ status: "expired" }).eq("token", token);
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized — please log in first" },
      { status: 401 }
    );
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 403 }
    );
  }

  const newStatus = body.action === "accept" ? "accepted" : "rejected";

  await svc
    .from("org_invitations")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("token", token);

  if (body.action === "accept") {
    await svc.from("org_members").upsert(
      {
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
        display_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      },
      { onConflict: "org_id,user_id" }
    );

    return NextResponse.json({ ok: true, action: "accepted", org_id: invite.org_id });
  }

  return NextResponse.json({ ok: true, action: "rejected" });
}
