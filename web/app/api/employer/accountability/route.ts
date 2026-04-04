import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import {
  assertEmployerStaffForOrg,
  parseOrgIdParam,
} from "@/lib/employer-server";
import { parseUuidOrNull } from "@/lib/utils";
import type { AccountabilityEntry } from "@/types/employer";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = parseOrgIdParam(request);
  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const userFilter = parseUuidOrNull(searchParams.get("user_id"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10))
  );

  const supabase = createClient();
  const allowed = await assertEmployerStaffForOrg(supabase, user.id, orgId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let q = supabase
    .from("accountability_logs")
    .select("id, log_date, event_type, description, metadata, created_at, user_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userFilter) {
    q = q.eq("user_id", userFilter);
  }
  if (from) {
    q = q.gte("log_date", from);
  }
  if (to) {
    q = q.lte("log_date", to);
  }

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(
    new Set((rows ?? []).map((r) => String(r.user_id)))
  );
  const nameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: mems } = await supabase
      .from("org_members")
      .select("user_id, display_name")
      .eq("org_id", orgId)
      .in("user_id", userIds);
    for (const m of mems ?? []) {
      nameMap.set(String(m.user_id), (m.display_name as string | null) ?? null);
    }
  }

  const logs: AccountabilityEntry[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    log_date: String(r.log_date),
    event_type: String(r.event_type),
    description: String(r.description),
    metadata:
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as Record<string, unknown>)
        : {},
    created_at: String(r.created_at),
    employee_display_name: nameMap.get(String(r.user_id)) ?? null,
  }));

  return NextResponse.json({ logs });
}
