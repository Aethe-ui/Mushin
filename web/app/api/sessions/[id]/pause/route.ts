import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  let action: "pause" | "resume" = "pause";
  try {
    const b = await request.json();
    if (b?.action === "resume") action = "resume";
  } catch {
    // empty body ok
  }

  const supabase = createClient();
  const status = action === "pause" ? "paused" : "active";
  const { error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
