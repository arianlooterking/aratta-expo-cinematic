import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/platform/session";
import { createServerSupabase } from "@/lib/supabase/server";

/** Google / Apple send the visitor back here with a one-time code. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/fa/staff");
  const lang = next.startsWith("/en") ? "en" : "fa";
  const code = searchParams.get("code");
  const supabase = await createServerSupabase();

  if (!supabase || !code) {
    return NextResponse.redirect(new URL(`/${lang}/staff/sign-in?error=callback`, origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/${lang}/staff/sign-in?error=callback`, origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
