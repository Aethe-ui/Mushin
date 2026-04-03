import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "active" | "paused" | "complete";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-bg-elevated text-text-secondary",
        tone === "active" && "bg-focus-active/15 text-focus-active",
        tone === "paused" && "bg-focus-paused/15 text-focus-paused",
        tone === "complete" && "bg-focus-complete/15 text-focus-complete"
      )}
    >
      {children}
    </span>
  );
}
