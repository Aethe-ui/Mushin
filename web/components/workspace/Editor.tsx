"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useFocusStore } from "@/store/focusStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function Editor({
  value,
  onChange,
  onActivity,
  isFocusMode,
}: {
  value: string;
  onChange: (v: string) => void;
  onActivity?: () => void;
  isFocusMode?: boolean;
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const lastSavedAt = useWorkspaceStore((s) => s.lastSavedAt);

  useEffect(() => {
    if (!lastSavedAt) return;
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  return (
    <div className="relative flex min-h-[50vh] flex-1 flex-col">
      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onActivity?.();
        }}
        onKeyDown={() => onActivity?.()}
        onMouseMove={() => onActivity?.()}
        spellCheck={false}
        className={cn(
          "min-h-[50vh] w-full flex-1 resize-none rounded-md border border-border bg-bg-primary p-4 font-sans text-text-primary placeholder:text-text-tertiary focus:border-border-active focus:outline-none",
          isFocusMode && "text-lg leading-relaxed p-6"
        )}
        placeholder="Write without friction…"
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-3 right-3 text-xs text-text-tertiary transition-opacity",
          savedFlash ? "opacity-100" : "opacity-0"
        )}
      >
        Saved
      </span>
    </div>
  );
}

export function EditorWithFocusFlag(props: Omit<Parameters<typeof Editor>[0], "isFocusMode">) {
  const isFocusMode = useFocusStore((s) => s.isFocusMode);
  return <Editor {...props} isFocusMode={isFocusMode} />;
}
