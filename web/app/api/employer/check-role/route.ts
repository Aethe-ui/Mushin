import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const staff = (rows ?? []).find(
    (r) => r.role === "admin" || r.role === "manager"
  );

  return NextResponse.json({
    isAdmin: Boolean(staff),
    orgId: staff?.org_id ?? null,
  });
}
