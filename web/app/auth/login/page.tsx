import { Suspense } from "react";
import { Hero } from "@/components/ui/hero";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Hero
          title=""
          showMarketingContent={false}
          className="min-h-screen rounded-none"
        />
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-text-tertiary">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
