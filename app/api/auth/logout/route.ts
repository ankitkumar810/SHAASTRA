import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Derive the base origin from the incoming request so the redirect always
 * points to the current host — works on localhost, Vercel preview URLs, and
 * the production domain without needing a NEXT_PUBLIC_SITE_URL env var.
 *
 * Falls back to NEXT_PUBLIC_SITE_URL if set (e.g. for non-request contexts),
 * then to localhost only as a last resort for local dev.
 */
function getLoginUrl(request: NextRequest): URL {
  const requestOrigin = request.nextUrl.origin;
  // Prefer the live origin; fall back to env var; last resort is localhost dev
  const base =
    requestOrigin && requestOrigin !== "null"
      ? requestOrigin
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL("/login", base);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(getLoginUrl(request), 303);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(getLoginUrl(request), 303);
}

