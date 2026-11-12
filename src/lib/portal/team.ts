// Team screens: what each role may do, how history entries read, and how
// busy each colleague is. Pure functions so they can be tested in Node.

type Lang = "fa" | "en";
type Role = "owner" | "admin" | "manager" | "member" | "viewer";

type Text = Record<Lang, string>;

export const ROLE_ORDER: Role[] = ["owner", "admin", "manager", "member", "viewer"];
const rank: Record<Role, number> = { owner: 5, admin: 4, manager: 3, member: 2, viewer: 1 };

export type Access = "yes" | "no" | "some";

export type Capability = {
  key: string;
  label: Text;
  /** When "some": what decides it. */
  note?: Text;
  access: (role: Role) => Access;
};

/**
 * What each role can do. Keep in step with permissionsFor (PortalProvider)
 * and the row level security policies in supabase/migrations.
 */
export const CAPABILITIES: Capability[] = [
  { key: "view", label: { fa: "دیدن نقشه، شرکت ها، کارها و تیم", en: "See the map, companies, tasks and team" }, access: () => "yes" },
  {
    key: "edit",
    label: { fa: "کار روزانه: غرفه ها، تجهیزات، فروش و کارها", en: "Day-to-day: booths, equipment, sales and tasks" },
    access: (r) => (rank[r] >= rank.member ? "yes" : "no"),
  },
  {
    key: "finance",
    label: { fa: "پیش فاکتور، فاکتور و ثبت دریافت", en: "Proformas, invoices and payments" },
    note: { fa: "کارشناس فقط اگر در واحد فروش یا مالی باشد", en: "Members only when in Sales or Finance" },
    access: (r) => (rank[r] >= rank.manager ? "yes" : r === "member" ? "some" : "no"),
  },
  {
    key: "team-lead",
    label: { fa: "تغییر اعضای تیمی که سرپرست آن است", en: "Change who is on a team they lead" },
    access: (r) => (rank[r] >= rank.member ? "yes" : "no"),
  },
  {
    key: "manage",
    label: { fa: "ساخت نمایشگاه، تنظیمات و حذف رکوردها", en: "Create exhibitions, change settings, delete records" },
    access: (r) => (rank[r] >= rank.manager ? "yes" : "no"),
  },
  { key: "teams", label: { fa: "ساخت و ویرایش همه تیم ها", en: "Create and edit any team" }, access: (r) => (rank[r] >= rank.manager ? "yes" : "no") },
  { key: "history", label: { fa: "دیدن تاریخچه تغییرات", en: "Read the change history" }, access: (r) => (rank[r] >= rank.manager ? "yes" : "no") },
  {
    key: "staff",
    label: { fa: "دعوت همکار، تغییر نقش و قطع دسترسی", en: "Invite colleagues, change roles, remove access" },
    access: (r) => (rank[r] >= rank.admin ? "yes" : "no"),
  },
  { key: "owners", label: { fa: "دادن یا گرفتن دسترسی مالک", en: "Grant or change owner access" }, access: (r) => (r === "owner" ? "yes" : "no") },
  { key: "delete-exhibition", label: { fa: "حذف کامل نمایشگاه", en: "Delete an exhibition entirely" }, access: (r) => (rank[r] >= rank.admin ? "yes" : "no") },
];

/** Roles the signed-in person may hand out. */
export function grantableRoles(actor: Role): Role[] {
  if (actor === "owner") return ROLE_ORDER;
  if (actor === "admin") return ROLE_ORDER.filter((r) => r !== "owner");
  return [];
}

/** Whether the actor may change this colleague's access at all (role, status, removal). */
export function canManageAccess(actor: { id: string; role: Role }, target: { id: string; role: Role }) {
  if (rank[actor.role] < rank.admin) return false;
  if (actor.id === target.id) return false;
  if (target.role === "owner" && actor.role !== "owner") return false;
  return true;
}

/** Whether the actor may change this colleague's profile details (name, title, phone...). */
export function canEditProfile(actor: { id: string; role: Role }, target: { id: string; role: Role }) {
  if (actor.id === target.id) return true;
  if (rank[actor.role] < rank.admin) return false;
  return target.role !== "owner" || actor.role === "owner";
}

/** Whether the actor may change a team: managers any team, a member the one they lead. */
export function canEditTeam(actor: { id: string; role: Role }, team: { lead_id: string | null } | null) {
  if (rank[actor.role] >= rank.manager) return true;
  return Boolean(team && rank[actor.role] >= rank.member && team.lead_id === actor.id);
}

/* ------------------------------------------------------------ Workload */

type Workable = {
  booths: ReadonlyArray<{ manager_ids: readonly string[] }>;
  tasks: ReadonlyArray<{ assignee_id: string | null; status: string; due_at: string | null }>;
  deals: ReadonlyArray<{ owner_id: string | null; stage: string }>;
  orders: ReadonlyArray<{ delivered_by: readonly string[]; collected_by: readonly string[] }>;
};

export type Workload = { booths: number; openTasks: number; overdueTasks: number; openDeals: number; wonDeals: number; handovers: number };

export function workloadFor(staffId: string, data: Workable, now: number): Workload {
  let openTasks = 0;
  let overdueTasks = 0;
  for (const t of data.tasks) {
    if (t.assignee_id !== staffId || t.status === "done" || t.status === "cancelled") continue;
    openTasks += 1;
    if (t.due_at && Date.parse(t.due_at) < now) overdueTasks += 1;
  }
  let openDeals = 0;
  let wonDeals = 0;
  for (const d of data.deals) {
    if (d.owner_id !== staffId) continue;
    if (d.stage === "won") wonDeals += 1;
    else if (d.stage !== "lost") openDeals += 1;
  }
  return {
    booths: data.booths.filter((b) => b.manager_ids.includes(staffId)).length,
    openTasks,
    overdueTasks,
    openDeals,
    wonDeals,
    handovers: data.orders.filter((o) => o.delivered_by.includes(staffId) || o.collected_by.includes(staffId)).length,
  };
}

/* ------------------------------------------------------------- History */

const fieldLabels: Record<string, Text> = {
  display_name: { fa: "نام", en: "name" },
  job_title: { fa: "سمت", en: "job title" },
  role: { fa: "نقش", en: "role" },
  status: { fa: "وضعیت", en: "status" },
  departments: { fa: "واحدها", en: "departments" },
  phone: { fa: "تلفن", en: "phone" },
  email: { fa: "ایمیل", en: "email" },
  avatar_url: { fa: "تصویر", en: "picture" },
  locale: { fa: "زبان", en: "language" },
  bio: { fa: "درباره", en: "about" },
  start_date: { fa: "تاریخ شروع همکاری", en: "start date" },
  skills: { fa: "مهارت ها", en: "skills" },
  name_fa: { fa: "نام فارسی", en: "Persian name" },
  name_en: { fa: "نام انگلیسی", en: "English name" },
  description: { fa: "توضیح", en: "description" },
  color: { fa: "رنگ", en: "colour" },
  lead_id: { fa: "سرپرست", en: "lead" },
  member_ids: { fa: "اعضا", en: "members" },
  exhibition_id: { fa: "نمایشگاه", en: "exhibition" },
  archived_at: { fa: "بایگانی", en: "archive" },
  starts_on: { fa: "تاریخ افتتاح", en: "opening date" },
  ends_on: { fa: "تاریخ پایان", en: "closing date" },
  build_starts_on: { fa: "شروع غرفه سازی", en: "build-up start" },
  strike_ends_on: { fa: "پایان جمع آوری", en: "strike end" },
  venue_fa: { fa: "محل برگزاری", en: "venue" },
  venue_en: { fa: "محل برگزاری (انگلیسی)", en: "venue (English)" },
  city_fa: { fa: "شهر", en: "city" },
  city_en: { fa: "شهر (انگلیسی)", en: "city (English)" },
  edition: { fa: "دوره", en: "edition" },
  year_label: { fa: "سال", en: "year" },
  currency: { fa: "واحد پول", en: "currency" },
  vat_rate: { fa: "نرخ مالیات", en: "VAT rate" },
  space_rate: { fa: "نرخ فضا", en: "space rate" },
  booth_build_rate: { fa: "نرخ غرفه سازی", en: "booth build rate" },
  notes: { fa: "یادداشت", en: "notes" },
};

/** Columns that change on their own and say nothing to a reader. */
const QUIET = new Set(["updated_at", "last_seen_at", "user_id", "sort_order", "created_by", "invited_by", "import_key"]);

export function fieldLabel(key: string, lang: Lang) {
  return fieldLabels[key]?.[lang] ?? key.replace(/_/g, " ");
}

export type ChangeLine = { field: string; from: unknown; to: unknown };

/** The changed fields of an update a person would care about. */
export function changedFields(changes: Record<string, unknown>): ChangeLine[] {
  const out: ChangeLine[] = [];
  for (const [field, value] of Object.entries(changes)) {
    if (QUIET.has(field)) continue;
    if (value && typeof value === "object" && "to" in (value as object)) {
      const v = value as { from?: unknown; to?: unknown };
      out.push({ field, from: v.from ?? null, to: v.to ?? null });
    }
  }
  return out;
}

/** Who joined and who left, for array columns such as member_ids. */
export function listDiff(from: unknown, to: unknown) {
  const a = Array.isArray(from) ? (from as string[]) : [];
  const b = Array.isArray(to) ? (to as string[]) : [];
  return { added: b.filter((x) => !a.includes(x)), removed: a.filter((x) => !b.includes(x)) };
}

/** The name an audit row was about, from its saved values. */
export function entryTitle(changes: Record<string, unknown>): string | null {
  const pickText = (k: string) => {
    const v = changes[k];
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "to" in (v as object)) {
      const t = (v as { to?: unknown }).to;
      return typeof t === "string" ? t : null;
    }
    return null;
  };
  return pickText("display_name") ?? pickText("name_fa") ?? pickText("email") ?? pickText("title") ?? pickText("code") ?? null;
}

/* ------------------------------------------------------------- Helpers */

/** Skills typed as "a, b، c" into a clean list. */
export function parseSkills(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[,،\n]/)) {
    const s = part.trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 20);
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Iranian mobile numbers written any way (Persian digits, +98, spaces) as 09xxxxxxxxx. */
export function normalizePhone(raw: string): string {
  const latin = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const digits = latin.replace(/[^\d+]/g, "");
  if (/^\+989\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^00989\d{9}$/.test(digits)) return `0${digits.slice(4)}`;
  if (/^989\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^9\d{9}$/.test(digits)) return `0${digits}`;
  return latin.trim();
}

export const TEAM_COLORS = ["#0e5d4c", "#2364a8", "#b07a1e", "#6a43b8", "#c0362c", "#0f6b78", "#b23a6b", "#4d7c0f", "#2f3e46", "#c46a2c"];

/* ------------------------------------------------------------ Passwords */

// No look-alikes (0/o, 1/l/i), so a password read out over the phone or
// typed from a message arrives intact.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A starting password an admin hands to a colleague, like "kq7m-x3pd-9wtr". */
export function newStartingPassword(random: (count: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const out: string[] = [];
  // Reject bytes past the last full multiple of the alphabet so every letter is equally likely.
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  while (out.length < 12) {
    for (const byte of random(24)) {
      if (byte < limit && out.length < 12) out.push(PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]);
    }
  }
  return `${out.slice(0, 4).join("")}-${out.slice(4, 8).join("")}-${out.slice(8, 12).join("")}`;
}

/** Why a password can't be used, or null when it is fine. Mirrors staff_account_set_password. */
export function passwordProblem(password: string): "short" | "long" | null {
  if (password.length < 8) return "short";
  if (new TextEncoder().encode(password).length > 72) return "long";
  return null;
}

/** What the admin sends a colleague: where to sign in and with what. */
export function signInDetails(lang: Lang, link: string, email: string, password: string) {
  return lang === "fa"
    ? `سامانه کارکنان اَرَتَ\nنشانی ورود: ${link}\nایمیل: ${email}\nگذرواژه شروع: ${password}\nبعد از اولین ورود، گذرواژه خودتان را انتخاب می کنید.`
    : `Aratta staff portal\nSign in: ${link}\nEmail: ${email}\nStarting password: ${password}\nAfter your first sign-in you choose your own password.`;
}
