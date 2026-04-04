/**
 * Email sender for Mushin invitations.
 *
 * Set env vars:
 *   RESEND_API_KEY=re_...
 *   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
 */

import { getPublicAppOrigin } from "@/lib/app-url";

export interface InvitationEmailParams {
  to: string;
  orgName: string;
  token: string;
  inviterEmail: string;
  role: string;
}

export async function sendInvitationEmail(
  params: InvitationEmailParams
): Promise<void> {
  const { to, orgName, token, inviterEmail, role } = params;
  const origin = getPublicAppOrigin();
  const acceptUrl = `${origin}/invite/${token}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:monospace;background:#080c14;color:#e8f0fe;padding:40px;max-width:560px;margin:auto">
  <h1 style="font-size:20px;color:#3b82f6;margin-bottom:8px">Mushin — Team Invitation</h1>
  <p style="color:#7a9abf;margin-bottom:24px">
    <strong style="color:#e8f0fe">${inviterEmail}</strong> has invited you to join
    <strong style="color:#e8f0fe">${orgName}</strong> on Mushin as a
    <strong style="color:#e8f0fe">${role}</strong>.
  </p>
  <a href="${acceptUrl}"
     style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;
            border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
    View Invitation
  </a>
  <p style="color:#3d5a7a;font-size:12px;margin-top:32px">
    This link expires in 7 days. If you did not expect this invite, you can safely ignore it.
  </p>
</body>
</html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[DEV] Invitation link for ${to}: ${acceptUrl}`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Mushin <onboarding@resend.dev>",
    to,
    subject: `You've been invited to ${orgName} on Mushin`,
    html,
  });
}
