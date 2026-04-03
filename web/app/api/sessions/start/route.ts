import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    planned_duration: number;
    goal?: string;
    workspace_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planned = body.planned_duration;
  if (typeof planned !== "number" || planned <= 0) {
    return NextResponse.json(
      { error: "planned_duration must be a positive number" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      workspace_id: body.workspace_id ?? null,
      planned_duration: planned,
      goal: body.goal ?? null,
      status: "active",
    })
    .select("id, start_time")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    session_id: data.id,
    start_time: data.start_time,
  });
}
