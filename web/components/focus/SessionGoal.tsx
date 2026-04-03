"use client";

import { Button } from "@/components/ui/Button";

export function SessionGoal({
  value,
  onChange,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm text-text-secondary">
        Session goal <span className="text-text-tertiary">(optional)</span>
      </label>
      <input
        maxLength={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What will you accomplish in this session?"
        className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-border-active focus:outline-none"
      />
      <div className="flex justify-end">
        <Button variant="ghost" className="text-xs" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
