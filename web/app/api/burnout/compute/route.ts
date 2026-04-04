/**
 * Supabase migration (run in SQL editor):
 *
 * CREATE TABLE IF NOT EXISTS public.burnout_risk_scores ( ... ); -- see project spec
 * CREATE TABLE IF NOT EXISTS public.burnout_risk_events ( ... );
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { runBurnoutCompute } from "@/lib/burnout-sync";
import {
  getOrgIdForUser,
  writeAccountabilityLog,
} from "@/lib/employer-sync";
import type { BurnoutComputeResponse } from "@/types/performance";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scoreDate = new Date().toISOString().slice(0, 10);
  const supabase = createClient();

  try {
    const {
      riskScore,
      escalationEvent,
      todayXPMultiplier,
      result,
      previousLevel,
    } = await runBurnoutCompute(supabase, user.id, scoreDate, {
      reconcileSnapshotXp: true,
    });

    const orgId = await getOrgIdForUser(supabase, user.id);
    if (orgId) {
      await writeAccountabilityLog(
        supabase,
        user.id,
        orgId,
        result,
        previousLevel,
        scoreDate
      );
    }

    const body: BurnoutComputeResponse = {
      riskScore,
      todayXPMultiplier,
      ...(escalationEvent ? { escalationEvent } : {}),
    };

    return NextResponse.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Burnout compute failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
