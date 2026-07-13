import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const DEFAULT_NEXT = "/reset-password";

/**
 * Restrict post-callback navigation to internal, single-slash paths so a
 * crafted `next` query parameter cannot be used for an open redirect.
 */
function resolveSafeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = resolveSafeNext(searchParams.get("next"));

  // A missing code means an invalid or already-consumed recovery link.
  // Send the user to the reset page, which fails closed without a session.
  if (!code) {
    return NextResponse.redirect(`${origin}${DEFAULT_NEXT}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Do not surface token/exchange internals; reset page shows a safe state.
    return NextResponse.redirect(`${origin}${DEFAULT_NEXT}`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
