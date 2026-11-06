import type { NextRequest } from "next/server";
import { updateStaffSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateStaffSession(request);
}

export const config = {
  matcher: ["/fa/staff/:path*", "/en/staff/:path*", "/fa/staff", "/en/staff", "/auth/:path*"],
};
