/**
 * Canonical public URL for OAuth redirects and links.
 * Set NEXT_PUBLIC_SITE_URL on Vercel (e.g. https://mushin-ten.vercel.app) so
 * Google OAuth returns to production even if Supabase Site URL was localhost.
 * Falls back to window.location.origin when unset (local dev).
 */
export function getPublicAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
