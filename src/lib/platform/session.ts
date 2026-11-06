import "server-only";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "./database.types";

export type StaffMember = Tables<"staff_members">;

export type StaffSession =
  /** Supabase env vars are missing: the portal runs as a local demo. */
  | { state: "unconfigured" }
  | { state: "signed-out" }
  /** Signed in with Google/Apple, but this email has no active invite. */
  | { state: "pending"; email: string | null; status: StaffMember["status"] | null }
  | { state: "active"; staff: StaffMember; email: string | null };

/**
 * Resolves who is looking at a staff page. Cached per request so layouts and
 * pages can both call it without extra round trips.
 */
export const getStaffSession = cache(async (): Promise<StaffSession> => {
  const supabase = await createServerSupabase();
  if (!supabase) return { state: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed-out" };

  const { data: staff } = await supabase
    .from("staff_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff || staff.status !== "active") {
    return { state: "pending", email: user.email ?? null, status: staff?.status ?? null };
  }
  return { state: "active", staff, email: user.email ?? null };
});

export const roleRank: Record<StaffMember["role"], number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export function hasRole(staff: Pick<StaffMember, "role">, minimum: StaffMember["role"]) {
  return roleRank[staff.role] >= roleRank[minimum];
}

export { safeNextPath } from "./redirects";
