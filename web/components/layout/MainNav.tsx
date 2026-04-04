"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/performance", label: "Performance" },
  { href: "/burnout", label: "Burnout Risk" },
];

export function MainNav() {
  const pathname = usePathname();
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((r) => r.json())
      .then((d: { db?: string }) => setDbOk(d.db === "connected"))
      .catch(() => setDbOk(false));
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <nav className="sidebar flex items-center justify-between border-b border-border bg-bg-primary/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-mono text-sm text-text-primary">
          Mushin
        </Link>
        <div className="nav-secondary flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-text-secondary hover:text-text-primary",
                pathname === l.href && "text-accent"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {dbOk !== null && (
          <span
            className={`font-mono text-xs ${dbOk ? "text-success" : "text-danger"}`}
          >
            {dbOk ? "● DB" : "✕ DB"}
          </span>
        )}
        <Button variant="ghost" className="text-xs" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </nav>
  );
}
