"use client";

import { useCallback, useEffect, useState } from "react";
import { BurnoutAlertBanner } from "@/components/burnout/BurnoutAlertBanner";
import { BurnoutEscalationTimeline } from "@/components/burnout/BurnoutEscalationTimeline";
import { BurnoutPatternBadges } from "@/components/burnout/BurnoutPatternBadges";
import { BurnoutRiskGauge } from "@/components/burnout/BurnoutRiskGauge";
import { BurnoutRiskHistory } from "@/components/burnout/BurnoutRiskHistory";
import { BurnoutSubScoreBreakdown } from "@/components/burnout/BurnoutSubScoreBreakdown";
import { BurnoutSuggestions } from "@/components/burnout/BurnoutSuggestions";
import { Button } from "@/components/ui/Button";
import type {
  BurnoutHistoryResponse,
  BurnoutRiskScore,
} from "@/types/performance";

type TodayPayload = {
  score: BurnoutRiskScore | null;
  patterns: string[];
  suggestions: string[];
  explanation: string;
};

export default function BurnoutPage() {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [history, setHistory] = useState<BurnoutHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computeLoading, setComputeLoading] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, hRes] = await Promise.all([
        fetch("/api/burnout/today"),
        fetch("/api/burnout/history?days=14"),
      ]);
      if (!tRes.ok) {
        const j = await tRes.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? `Today: ${tRes.status}`
        );
      }
      if (!hRes.ok) {
        const j = await hRes.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? `History: ${hRes.status}`
        );
      }
      setToday((await tRes.json()) as TodayPayload);
      setHistory((await hRes.json()) as BurnoutHistoryResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load burnout data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runCompute() {
    setComputeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/burnout/compute", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? `Compute: ${res.status}`
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compute failed");
    } finally {
      setComputeLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded bg-bg-surface" />
        <div className="h-24 rounded-lg bg-bg-surface" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-56 rounded-lg bg-bg-surface" />
          <div className="h-56 rounded-lg bg-bg-surface" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
        <p className="font-mono text-sm text-danger">{error}</p>
        <Button
          variant="ghost"
          className="mt-3 text-xs"
          onClick={() => void load()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const score = today?.score;
  const level = score?.risk_level ?? "LOW";
  const explanation =
    score?.explanation ?? today?.explanation ?? "No explanation yet.";
  const suggestions =
    score?.suggestions?.length ? score.suggestions : today?.suggestions ?? [];
  const patterns = today?.patterns ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl text-text-primary">
            Burnout Risk
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pattern-aware risk score, gradual escalation, and XP feedback tied
            to recovery.
          </p>
        </div>
        <Button
          className="text-xs"
          disabled={computeLoading}
          onClick={() => void runCompute()}
        >
          {computeLoading ? "Refreshing…" : "Refresh risk (today)"}
        </Button>
      </header>

      {score && (level === "HIGH" || level === "CRITICAL") && (
        <BurnoutAlertBanner
          key={bannerKey}
          level={level}
          explanation={explanation}
          score={score.risk_score}
          onDismiss={() => setBannerKey((k) => k + 1)}
        />
      )}

      {score?.risk_level === "MODERATE" && (
        <p
          className="cursor-help rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-focus-paused"
          title={explanation}
        >
          Moderate burnout risk — hover for details.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-bg-surface p-6">
          {score ? (
            <BurnoutRiskGauge
              score={score.risk_score}
              level={score.risk_level}
            />
          ) : (
            <div className="text-center">
              <p className="font-mono text-sm text-text-tertiary">
                No score for today yet.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Save a performance snapshot or tap refresh to compute risk.
              </p>
            </div>
          )}
        </div>
        {score ? (
          <BurnoutSubScoreBreakdown
            workloadScore={score.workload_score}
            recoveryScore={score.recovery_score}
            consistencyScore={score.consistency_score}
          />
        ) : (
          <div className="flex items-center rounded-lg border border-border bg-bg-surface p-4">
            <p className="text-sm text-text-tertiary">
              Sub-scores appear after the first daily risk computation.
            </p>
          </div>
        )}
      </div>

      <BurnoutPatternBadges patterns={patterns} />
      <BurnoutSuggestions suggestions={suggestions} level={level} />

      {history && (
        <>
          <BurnoutRiskHistory
            scores={history.scores.map((s) => ({
              date: s.score_date,
              risk_score: s.risk_score,
              risk_level: s.risk_level,
              workload_score: s.workload_score,
              recovery_score: s.recovery_score,
              consistency_score: s.consistency_score,
            }))}
            events={history.events.map((e) => ({
              date: e.event_date,
              from: e.from_level,
              to: e.to_level,
            }))}
          />
          <BurnoutEscalationTimeline events={history.events} />
        </>
      )}

      <p className="font-mono text-xs text-text-tertiary">
        Trend: {history?.trend ?? "—"} · Current level:{" "}
        {history?.currentLevel ?? level}
      </p>
    </div>
  );
}
