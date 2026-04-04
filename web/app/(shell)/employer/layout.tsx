import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "";
  if (pathname === "/employer/setup" || pathname.startsWith("/employer/setup/")) {
    return <div className="mx-auto w-full max-w-6xl">{children}</div>;
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/login");
  }

  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    redirect("/dashboard");
  }

  const canAccess = (rows ?? []).some(
    (r) => r.role === "admin" || r.role === "manager"
  );
  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">{children}</div>
  );
}
