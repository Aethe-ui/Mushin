import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(id, name, created_at)")
    .eq("user_id", user.id)
    .in("role", ["admin", "manager"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgs = (data ?? []).map((r: { organizations: unknown; role: string }) => ({
    ...(r.organizations as Record<string, unknown>),
    role: r.role,
  }));

  return NextResponse.json({ organizations: orgs });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ organization: data }, { status: 201 });
}
