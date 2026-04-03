"use client";

import { useWorkspaceStore } from "@/store/workspaceStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function AISuggestion() {
  const text = useWorkspaceStore((s) => s.aiSuggestion);
  const open = useWorkspaceStore((s) => s.showAISuggestion);
  const dismiss = useWorkspaceStore((s) => s.dismissSuggestion);

  return (
    <aside
      className={cn(
        "ai-panel fixed bottom-6 right-6 z-40 w-[min(100vw-3rem,20rem)] translate-x-0 rounded-lg border border-border bg-bg-elevated p-4 shadow-lg transition-transform duration-300 ease-out",
        !open && "translate-x-[calc(100%+2rem)] pointer-events-none opacity-0"
      )}
      aria-live="polite"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-tertiary">
        <span aria-hidden>◇</span> Quiet assist
      </div>
      <p className="text-sm leading-snug text-text-primary line-clamp-3">{text}</p>
      <Button
        variant="ghost"
        className="mt-3 w-full text-xs"
        onClick={dismiss}
      >
        Dismiss
      </Button>
    </aside>
  );
}
