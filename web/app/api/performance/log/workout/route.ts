import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { date: string; duration_min: number; intensity: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { date, duration_min, intensity } = body;
  if (!date || !["low", "medium", "high"].includes(intensity)) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }
  if (
    typeof duration_min !== "number" ||
    duration_min < 0 ||
    duration_min > 600
  ) {
    return NextResponse.json(
      { error: "duration_min must be 0–600" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("workout_logs")
    .upsert(
      {
        user_id: user.id,
        logged_date: date,
        duration_min,
        intensity,
      },
      { onConflict: "user_id,logged_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, log: data });
}
