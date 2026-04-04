"use client";

import { useCallback, useEffect, useState } from "react";
import { BurnoutAlertBanner } from "@/components/burnout/BurnoutAlertBanner";
import type { BurnoutRiskScore } from "@/types/performance";

type TodayPayload = {
  score: BurnoutRiskScore | null;
  explanation: string;
};

export function BurnoutRiskAlert() {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [bannerKey, setBannerKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/burnout/today");
      if (!res.ok) return;
      setData((await res.json()) as TodayPayload);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const score = data?.score;
  if (!score) return null;
  const lvl = score.risk_level;
  if (lvl !== "HIGH" && lvl !== "CRITICAL") return null;

  return (
    <BurnoutAlertBanner
      key={bannerKey}
      level={lvl}
      explanation={score.explanation ?? data?.explanation ?? ""}
      score={score.risk_score}
      onDismiss={() => setBannerKey((k) => k + 1)}
    />
  );
}
