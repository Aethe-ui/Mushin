import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    session_id: string;
    status: "completed" | "abandoned";
    actual_duration: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.session_id || !body.status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", body.session_id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const endTime = new Date().toISOString();
  const duration =
    typeof body.actual_duration === "number" && body.actual_duration >= 0
      ? Math.round(body.actual_duration)
      : existing.planned_duration ?? 0;

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({
      end_time: endTime,
      duration,
      status: body.status,
    })
    .eq("id", body.session_id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session: updated });
}
