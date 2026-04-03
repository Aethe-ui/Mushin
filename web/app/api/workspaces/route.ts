import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { enrichUserIds } from "@/lib/collaborators";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const { data: owned, error: ownedErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (ownedErr) {
    return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  }

  const { data: collabRows, error: collabErr } = await supabase
    .from("collaborators")
    .select("workspace_id")
    .eq("user_id", user.id);

  if (collabErr) {
    return NextResponse.json({ error: collabErr.message }, { status: 500 });
  }

  const collabIds = Array.from(
    new Set((collabRows ?? []).map((r) => r.workspace_id))
  );
  let shared: typeof owned = [];
  if (collabIds.length > 0) {
    const { data: s, error: sErr } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", collabIds)
      .order("updated_at", { ascending: false });
    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }
    shared = s ?? [];
  }

  const merged = [...(owned ?? [])];
  const seen = new Set(merged.map((w) => w.id));
  for (const w of shared) {
    if (!seen.has(w.id)) {
      merged.push(w);
      seen.add(w.id);
    }
  }
  merged.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const workspacesWithCollabs = await Promise.all(
    merged.map(async (w) => {
      const { data: c } = await supabase
        .from("collaborators")
        .select("user_id")
        .eq("workspace_id", w.id);
      const ids = [
        w.owner_id,
        ...((c ?? []).map((row) => row.user_id) as string[]),
      ];
      const unique = Array.from(new Set(ids)).filter((id) => id !== user.id);
      const users = await enrichUserIds(unique.slice(0, 8));
      return { ...w, collaborator_preview: users };
    })
  );

  return NextResponse.json({ workspaces: workspacesWithCollabs });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let title = "Untitled";
  try {
    const b = await request.json();
    if (typeof b?.title === "string" && b.title.trim()) title = b.title.trim();
  } catch {
    // default title
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, title, content: "" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspace: data });
}
