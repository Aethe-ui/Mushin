import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { assertEmployerStaffForOrg } from "@/lib/employer-server";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data: invite, error } = await supabase
    .from("org_invitations")
    .select("*, organizations(name)")
    .eq("token", params.token)
    .maybeSingle();

  if (error || !invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await assertEmployerStaffForOrg(supabase, user.id, invite.org_id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("org_invitations")
    .update({ expires_at: newExpiry, status: "pending" })
    .eq("token", params.token);

  const orgRow = invite.organizations as { name?: string } | null;

  await sendInvitationEmail({
    to: invite.email,
    orgName: orgRow?.name ?? "",
    token: invite.token,
    inviterEmail: user.email ?? "",
    role: invite.role,
  });

  return NextResponse.json({ ok: true });
}
