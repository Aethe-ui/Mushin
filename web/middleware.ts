import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PREFIX = "/auth";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/api")) {
    return supabaseResponse;
  }

  const isAuthRoute =
    path.startsWith(`${AUTH_PREFIX}/login`) ||
    path.startsWith(`${AUTH_PREFIX}/signup`) ||
    path.startsWith(`${AUTH_PREFIX}/callback`);

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `${AUTH_PREFIX}/login`;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (
    user &&
    (path === `${AUTH_PREFIX}/login` || path === `${AUTH_PREFIX}/signup`)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
