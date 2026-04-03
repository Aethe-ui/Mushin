import { cn, formatTimer } from "@/lib/utils";

export function Timer({
  seconds,
  className,
  pulse,
}: {
  seconds: number;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-timer tabular-nums tracking-tight text-text-primary",
        pulse && "animate-timer-pulse",
        className
      )}
    >
      {formatTimer(seconds)}
    </span>
  );
}
