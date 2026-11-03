"use server";

import { revalidatePath } from "next/cache";
import { Constants, type Enums } from "@/lib/platform/database.types";
import { createServerSupabase } from "@/lib/supabase/server";

export type TeamActionState = { ok: boolean; message: string | null };

const roles = Constants.public.Enums.staff_role;
const departments = Constants.public.Enums.department;
const statuses = Constants.public.Enums.staff_status;

function pickRole(value: FormDataEntryValue | null): Enums<"staff_role"> | null {
  return roles.includes(value as Enums<"staff_role">) ? (value as Enums<"staff_role">) : null;
}

function pickDepartments(form: FormData): Enums<"department">[] {
  return form
    .getAll("departments")
    .filter((d): d is Enums<"department"> => departments.includes(d as Enums<"department">));
}

function friendly(message: string) {
  if (message.includes("staff_members_email_key") || message.includes("duplicate key")) {
    return "duplicate";
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "forbidden";
  }
  return message;
}

export async function inviteStaff(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "unconfigured" };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = pickRole(form.get("role")) ?? "member";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "email" };

  const { error } = await supabase.from("staff_members").insert({
    email,
    role,
    departments: pickDepartments(form),
    display_name: String(form.get("display_name") ?? "").trim() || null,
    job_title: String(form.get("job_title") ?? "").trim() || null,
  });
  if (error) return { ok: false, message: friendly(error.message) };

  revalidatePath("/[lang]/staff/team", "page");
  return { ok: true, message: "invited" };
}

export async function updateStaff(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "unconfigured" };

  const id = String(form.get("id") ?? "");
  const role = pickRole(form.get("role"));
  const status = form.get("status");
  if (!id || !role || !statuses.includes(status as Enums<"staff_status">)) {
    return { ok: false, message: "invalid" };
  }

  const { data, error } = await supabase
    .from("staff_members")
    .update({ role, status: status as Enums<"staff_status">, departments: pickDepartments(form) })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, message: friendly(error.message) };
  if (!data?.length) return { ok: false, message: "forbidden" };

  revalidatePath("/[lang]/staff/team", "page");
  return { ok: true, message: "saved" };
}

export async function removeStaff(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, message: "unconfigured" };

  const id = String(form.get("id") ?? "");
  const { data, error } = await supabase.from("staff_members").delete().eq("id", id).select("id");
  if (error) return { ok: false, message: friendly(error.message) };
  if (!data?.length) return { ok: false, message: "forbidden" };

  revalidatePath("/[lang]/staff/team", "page");
  return { ok: true, message: "removed" };
}
