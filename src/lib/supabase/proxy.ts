import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/platform/database.types";
import { getSupabaseConfig } from "./config";

const STAFF_PATH = /^\/(fa|en)\/staff(?:\/|$)/;
const SIGN_IN_PATH = /^\/(fa|en)\/staff\/sign-in(?:\/|$)/;

/**
 * Refreshes the Supabase session cookie on every staff request and sends
 * signed-out visitors to the sign-in page. This is only an optimistic check:
 * each page and every query still verifies access through RLS.
 */
export async function updateStaffSession(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const staffMatch = pathname.match(STAFF_PATH);
  if (staffMatch && !user && !SIGN_IN_PATH.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${staffMatch[1]}/staff/sign-in`;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
