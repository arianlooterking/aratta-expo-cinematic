import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase?.auth.signOut();
  const form = await request.formData().catch(() => null);
  const lang = form?.get("lang") === "en" ? "en" : "fa";
  return NextResponse.redirect(new URL(`/${lang}/staff/sign-in`, request.nextUrl.origin), { status: 303 });
}
