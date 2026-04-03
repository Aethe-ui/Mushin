import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { findUserIdByEmail } from "@/lib/collaborators";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let email: string;
  try {
    const b = await request.json();
    email = typeof b?.email === "string" ? b.email : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!email.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", params.id)
    .single();

  if (wsErr || !ws || ws.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let invitedId: string | null;
  try {
    invitedId = await findUserIdByEmail(email);
  } catch {
    return NextResponse.json(
      { error: "Invite service unavailable" },
      { status: 503 }
    );
  }

  if (!invitedId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (invitedId === user.id) {
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  const { error } = await supabase.from("collaborators").insert({
    workspace_id: params.id,
    user_id: invitedId,
    role: "editor",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
