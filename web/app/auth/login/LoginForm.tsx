"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPublicAppOrigin } from "@/lib/app-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type LoginMode = "employee" | "employer";

const LOGIN_CONFIG: Record<
  LoginMode,
  {
    heading: string;
    description: string;
    defaultNext: string;
    signupHref: string;
    signupPrompt: string;
  }
> = {
  employee: {
    heading: "Employee",
    description: "Access your workspace and personal dashboard.",
    defaultNext: "/dashboard",
    signupHref: "/auth/signup",
    signupPrompt: "No account?",
  },
  employer: {
    heading: "Employer",
    description: "Manage your organization and team.",
    defaultNext: "/employer",
    signupHref: "/auth/employer/signup",
    signupPrompt: "No employer account?",
  },
};

type LoginSectionProps = {
  mode: LoginMode;
};

function LoginSection({ mode }: LoginSectionProps) {
  const { heading, description, defaultNext, signupHref, signupPrompt } =
    LOGIN_CONFIG[mode];
  const headingId = `login-heading-${mode}`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? defaultNext;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function google() {
    const supabase = createClient();
    const origin = getPublicAppOrigin();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <section
      className="flex w-full flex-col rounded-lg border border-border bg-bg-surface p-6 sm:p-8"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="font-mono text-lg text-text-primary">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label className="text-xs text-text-tertiary">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg-primary px-3 py-2 text-text-primary"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg-primary px-3 py-2 text-text-primary"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full"
        onClick={() => void google()}
      >
        Continue with Google
      </Button>
      <p className="mt-5 text-center text-sm text-text-tertiary">
        {signupPrompt}{" "}
        <Link href={signupHref} className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </section>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<LoginMode>("employee");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center">
        <header className="mb-6 text-center">
          <h1 className="font-mono text-2xl text-text-primary">Mushin</h1>
          <p className="mt-2 text-sm text-text-secondary">Sign in to focus.</p>
        </header>

        <LoginSection key={mode} mode={mode} />

        <div
          className="mt-6 w-full"
          role="group"
          aria-label="Sign-in as employee or employer"
        >
          <div className="flex rounded-lg border border-border bg-bg-primary p-0.5">
            <button
              type="button"
              onClick={() => setMode("employee")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === "employee"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => setMode("employer")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                mode === "employer"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Employer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
