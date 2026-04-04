import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import {
  assertEmployerStaffForOrg,
  parseOrgIdParam,
} from "@/lib/employer-server";
import { parseUuidOrNull } from "@/lib/utils";
import type { EmployerAlert } from "@/types/employer";

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
  const statusParam = searchParams.get("status") ?? "active";
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
  );

  const supabase = createClient();
  const allowed = await assertEmployerStaffForOrg(supabase, user.id, orgId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let q = supabase
    .from("employer_alerts")
    .select(
      "id, user_id, alert_type, risk_level, message, status, created_at, resolved_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusParam === "active" || statusParam === "resolved") {
    q = q.eq("status", statusParam);
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

  const alerts: EmployerAlert[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    display_name: nameMap.get(String(r.user_id)) ?? null,
    alert_type: r.alert_type as EmployerAlert["alert_type"],
    risk_level: r.risk_level as EmployerAlert["risk_level"],
    message: String(r.message),
    status: r.status as EmployerAlert["status"],
    created_at: String(r.created_at),
    resolved_at: r.resolved_at ? String(r.resolved_at) : null,
  }));

  return NextResponse.json({ alerts });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { alert_id?: string; status?: string };
  try {
    body = (await request.json()) as { alert_id?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const alertId = parseUuidOrNull(body.alert_id);
  if (!alertId || body.status !== "resolved") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("employer_alerts")
    .select("org_id")
    .eq("id", alertId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orgId = String(existing.org_id);
  const allowed = await assertEmployerStaffForOrg(supabase, user.id, orgId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: upErr } = await supabase
    .from("employer_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
