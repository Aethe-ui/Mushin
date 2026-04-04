import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("workspaces").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { status: "error", db: "disconnected", detail: msg },
      { status: 503 }
    );
  }
}
