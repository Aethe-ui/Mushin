import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { enrichUserIds } from "@/lib/collaborators";

async function canAccessWorkspace(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  workspaceId: string
): Promise<"owner" | "collaborator" | null> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (!ws) return null;
  if (ws.owner_id === userId) return "owner";
  const { data: c } = await supabase
    .from("collaborators")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return c ? "collaborator" : null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const access = await canAccessWorkspace(supabase, user.id, params.id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: collabRows } = await supabase
    .from("collaborators")
    .select("user_id")
    .eq("workspace_id", params.id);

  const ids = [
    workspace.owner_id,
    ...((collabRows ?? []).map((r) => r.user_id) as string[]),
  ];
  const collaborators = await enrichUserIds(Array.from(new Set(ids)));

  return NextResponse.json({ workspace, collaborators });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const access = await canAccessWorkspace(supabase, user.id, params.id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.content === "string") patch.content = body.content;

  if (access === "collaborator" && patch.title !== undefined) {
    delete patch.title;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspaces")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspace: data });
}
