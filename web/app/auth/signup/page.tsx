"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPublicAppOrigin } from "@/lib/app-url";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  async function google() {
    const supabase = createClient();
    const origin = getPublicAppOrigin();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-8">
        <h1 className="font-mono text-xl text-text-primary">Create account</h1>
        <p className="mt-1 text-sm text-text-secondary">Join Mushin.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-text-tertiary">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-bg-primary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary">Email</label>
            <input
              type="email"
              required
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-bg-primary px-3 py-2 text-text-primary"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Sign up"}
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
        <p className="mt-6 text-center text-sm text-text-tertiary">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
