import { cn, initialsFromEmail } from "@/lib/utils";

export function Avatar({
  label,
  email,
  className,
  title,
}: {
  label?: string | null;
  email?: string | null;
  className?: string;
  title?: string;
}) {
  const text =
    label?.trim().slice(0, 2).toUpperCase() ||
    initialsFromEmail(email ?? undefined);
  const tip = title ?? label ?? email ?? "";
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-elevated text-[10px] font-medium text-text-secondary",
        className
      )}
      title={tip}
    >
      {text}
    </div>
  );
}
