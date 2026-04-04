"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { RiskLevel } from "@/types/performance";

const STORAGE_KEY = "mushin-burnout-alert-dismissed-at";
const TTL_MS = 24 * 60 * 60 * 1000;

export interface BurnoutAlertBannerProps {
  level: RiskLevel;
  explanation: string;
  score: number;
  onDismiss: () => void;
}

export function BurnoutAlertBanner({
  level,
  explanation,
  score,
  onDismiss,
}: BurnoutAlertBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const t = Number(raw);
    if (Number.isFinite(t) && Date.now() - t < TTL_MS) {
      setVisible(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  if (level !== "HIGH" && level !== "CRITICAL") return null;
  if (!visible) return null;

  const critical = level === "CRITICAL";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        critical
          ? "border-danger bg-danger/15 animate-pulse border-2"
          : "border-focus-paused/50 bg-focus-paused/10"
      )}
      role="alert"
    >
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
          {critical ? "Critical burnout risk" : "Elevated burnout risk"}
        </p>
        <p className="mt-1 font-mono text-sm text-text-primary">
          Score {Math.round(score)}/100 — {level}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {explanation}
        </p>
      </div>
      <Button
        variant="ghost"
        className="shrink-0 self-end text-xs sm:self-center"
        onClick={dismiss}
      >
        Dismiss 24h
      </Button>
    </div>
  );
}
