// The "upcoming works" agenda: every dated piece of work across all
// exhibitions, merged into one timeline. Pure, so the portal page and the
// tests share it.

export type AgendaKind = "milestone" | "task" | "follow_up" | "invoice" | "delivery" | "pickup";

export type MilestoneKey = "build" | "opening" | "closing" | "strike";

export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  /** ISO timestamp; day-only dates are placed at 09:00 local time. */
  at: string;
  exhibitionId: string | null;
  /** Who should act: assignee, deal owner, handover person. Null when nobody is set. */
  ownerId: string | null;
  overdue: boolean;
  /** Ids used by the page to build a title and a link. */
  ref: {
    taskId?: string;
    dealId?: string;
    companyId?: string;
    invoiceId?: string;
    orderId?: string;
    boothId?: string | null;
    milestone?: MilestoneKey;
    balance?: number;
    quantity?: number;
    itemId?: string;
    priority?: string;
    /** Set on merged handover rows. */
    lines?: number;
    booths?: number;
  };
};

type ExhibitionLike = {
  id: string;
  status: string;
  build_starts_on: string | null;
  starts_on: string | null;
  ends_on: string | null;
  strike_ends_on: string | null;
};
type TaskLike = { id: string; exhibition_id: string | null; status: string; due_at: string | null; assignee_id: string | null; priority?: string };
type DealLike = { id: string; exhibition_id: string; company_id: string; owner_id: string | null; stage: string; next_follow_up_at: string | null };
type InvoiceLike = { id: string; exhibition_id: string; company_id: string; status: string; due_on: string | null; created_by: string | null };
type OrderLike = {
  id: string;
  exhibition_id: string;
  booth_id: string | null;
  item_id: string;
  quantity: number;
  stage: string;
  delivery_due_at: string | null;
  pickup_due_at: string | null;
  handled_by: string | null;
};

export type AgendaInput = {
  exhibitions: readonly ExhibitionLike[];
  tasks: readonly TaskLike[];
  deals: readonly DealLike[];
  invoices: readonly InvoiceLike[];
  /** Remaining balance per invoice id; invoices with nothing left are skipped. */
  invoiceBalance: ReadonlyMap<string, number>;
  orders: readonly OrderLike[];
};

const DAY = 86_400_000;

/** A calendar day (YYYY-MM-DD) as a local 09:00 timestamp. */
export function dayAt(day: string, hour = 9) {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hour, 0, 0).toISOString();
}

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildAgenda(input: AgendaInput, now = new Date()): AgendaItem[] {
  const out: AgendaItem[] = [];
  const today = startOfDay(now.getTime());
  const nowMs = now.getTime();
  const isOver = (iso: string, dayOnly: boolean) => (dayOnly ? new Date(iso).getTime() < today : new Date(iso).getTime() < nowMs);

  for (const e of input.exhibitions) {
    if (e.status === "archived" || e.status === "closed") continue;
    const marks: Array<[MilestoneKey, string | null]> = [
      ["build", e.build_starts_on],
      ["opening", e.starts_on],
      ["closing", e.ends_on],
      ["strike", e.strike_ends_on],
    ];
    for (const [key, day] of marks) {
      if (!day) continue;
      const at = dayAt(day);
      // Milestones are facts, not work: past ones are simply dropped.
      if (new Date(at).getTime() < today) continue;
      out.push({ id: `m:${e.id}:${key}`, kind: "milestone", at, exhibitionId: e.id, ownerId: null, overdue: false, ref: { milestone: key } });
    }
  }

  for (const t of input.tasks) {
    if (!t.due_at || t.status === "done" || t.status === "cancelled") continue;
    out.push({ id: `t:${t.id}`, kind: "task", at: t.due_at, exhibitionId: t.exhibition_id, ownerId: t.assignee_id, overdue: isOver(t.due_at, false), ref: { taskId: t.id, priority: t.priority } });
  }

  for (const d of input.deals) {
    if (!d.next_follow_up_at || d.stage === "won" || d.stage === "lost") continue;
    out.push({
      id: `f:${d.id}`,
      kind: "follow_up",
      at: d.next_follow_up_at,
      exhibitionId: d.exhibition_id,
      ownerId: d.owner_id,
      overdue: isOver(d.next_follow_up_at, false),
      ref: { dealId: d.id, companyId: d.company_id },
    });
  }

  for (const i of input.invoices) {
    if (!i.due_on || i.status === "cancelled" || i.status === "draft") continue;
    const balance = input.invoiceBalance.get(i.id) ?? 0;
    if (balance <= 0) continue;
    const at = dayAt(i.due_on);
    out.push({ id: `i:${i.id}`, kind: "invoice", at, exhibitionId: i.exhibition_id, ownerId: i.created_by, overdue: isOver(at, true), ref: { invoiceId: i.id, companyId: i.company_id, balance } });
  }

  for (const o of input.orders) {
    if (o.stage === "cancelled") continue;
    const waiting = o.stage === "requested" || o.stage === "reserved" || o.stage === "prepared";
    if (waiting && o.delivery_due_at) {
      out.push({ id: `d:${o.id}`, kind: "delivery", at: o.delivery_due_at, exhibitionId: o.exhibition_id, ownerId: o.handled_by, overdue: isOver(o.delivery_due_at, false), ref: { orderId: o.id, boothId: o.booth_id, quantity: o.quantity, itemId: o.item_id } });
    }
    if ((o.stage === "delivered" || o.stage === "issue") && o.pickup_due_at) {
      out.push({ id: `p:${o.id}`, kind: "pickup", at: o.pickup_due_at, exhibitionId: o.exhibition_id, ownerId: o.handled_by, overdue: isOver(o.pickup_due_at, false), ref: { orderId: o.id, boothId: o.booth_id, quantity: o.quantity, itemId: o.item_id } });
    }
  }

  return out.sort((a, b) => a.at.localeCompare(b.at) || a.kind.localeCompare(b.kind));
}

export type AgendaFilter = {
  days: number;
  kinds?: ReadonlySet<AgendaKind>;
  ownerId?: string | null;
  exhibitionId?: string | null;
};

/** Overdue work always shows; the rest only inside the chosen window. */
export function filterAgenda(items: readonly AgendaItem[], f: AgendaFilter, now = new Date()) {
  const until = startOfDay(now.getTime()) + (f.days + 1) * DAY;
  return items.filter((i) => {
    if (f.kinds && f.kinds.size && !f.kinds.has(i.kind)) return false;
    if (f.exhibitionId && i.exhibitionId !== f.exhibitionId) return false;
    if (f.ownerId && i.kind !== "milestone" && i.ownerId !== f.ownerId) return false;
    return i.overdue || new Date(i.at).getTime() < until;
  });
}

export type AgendaDay = { key: string; items: AgendaItem[] };

/** Groups upcoming (not overdue) items by local calendar day. */
export function groupByDay(items: readonly AgendaItem[]): AgendaDay[] {
  const map = new Map<string, AgendaItem[]>();
  for (const i of items) {
    if (i.overdue) continue;
    const d = new Date(i.at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = map.get(key);
    if (list) list.push(i);
    else map.set(key, [i]);
  }
  return [...map.entries()].map(([key, list]) => ({ key, items: list }));
}

export type SeasonBar = {
  exhibitionId: string;
  /** Percent offsets inside the window, clamped to 0..100. */
  build: [number, number] | null;
  show: [number, number] | null;
  strike: [number, number] | null;
};

/** Where each exhibition's build, show and strike fall inside a window of `months` from today. */
export function seasonBars(exhibitions: readonly ExhibitionLike[], now = new Date(), months = 6): { from: number; to: number; bars: SeasonBar[] } {
  const from = startOfDay(now.getTime());
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  const to = end.getTime();
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - from) / (to - from)) * 100));
  const span = (a: string | null, b: string | null): [number, number] | null => {
    if (!a || !b) return null;
    const s = new Date(dayAt(a, 0)).getTime();
    const e = new Date(dayAt(b, 0)).getTime() + DAY;
    if (e <= from || s >= to) return null;
    return [pct(s), pct(e)];
  };
  const bars: SeasonBar[] = [];
  for (const e of exhibitions) {
    if (e.status === "archived" || e.status === "closed" || !e.starts_on) continue;
    const bar: SeasonBar = {
      exhibitionId: e.id,
      build: e.build_starts_on ? span(e.build_starts_on, prevDay(e.starts_on)) : null,
      show: span(e.starts_on, e.ends_on ?? e.starts_on),
      strike: e.strike_ends_on ? span(nextDay(e.ends_on ?? e.starts_on), e.strike_ends_on) : null,
    };
    if (bar.build || bar.show || bar.strike) bars.push(bar);
  }
  return { from, to, bars };
}

function shiftDay(day: string, by: number) {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + by));
  return dt.toISOString().slice(0, 10);
}
const prevDay = (d: string) => shiftDay(d, -1);
const nextDay = (d: string) => shiftDay(d, 1);

/** Calendar file with one event per agenda item, for phones and desktop calendars. */
export function agendaIcs(items: readonly { id: string; at: string; title: string; url: string }[], stamp = new Date()) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aratta Expo//Staff agenda//EN", "CALSCALE:GREGORIAN"];
  for (const i of items) {
    const start = new Date(i.at).getTime();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${i.id.replace(/[^a-zA-Z0-9-]/g, "-")}@staff.arattaexpo.ir`,
      `DTSTAMP:${fmt(stamp.toISOString())}`,
      `DTSTART:${fmt(new Date(start).toISOString())}`,
      `DTEND:${fmt(new Date(start + 30 * 60_000).toISOString())}`,
      `SUMMARY:${esc(i.title)}`,
      `URL:${i.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Deliveries and pickups come one per equipment line, which floods the agenda
 * on build-up days. Merge them into one row per exhibition, kind and day,
 * with the number of booths and pieces.
 */
export function collapseHandovers(items: readonly AgendaItem[]): AgendaItem[] {
  const out: AgendaItem[] = [];
  const merged = new Map<string, AgendaItem & { booths: Set<string> }>();
  for (const i of items) {
    if (i.kind !== "delivery" && i.kind !== "pickup") {
      out.push(i);
      continue;
    }
    const d = new Date(i.at);
    const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const key = `${i.kind}:${i.exhibitionId}:${day}:${i.overdue ? "o" : ""}`;
    const prev = merged.get(key);
    if (!prev) {
      const first = { ...i, id: `${i.kind[0]}:${i.exhibitionId}:${day}`, ref: { ...i.ref, quantity: i.ref.quantity ?? 0, lines: 1, booths: 0 }, booths: new Set<string>() };
      if (i.ref.boothId) first.booths.add(i.ref.boothId);
      merged.set(key, first);
      out.push(first);
    } else {
      prev.ref.quantity = (prev.ref.quantity ?? 0) + (i.ref.quantity ?? 0);
      prev.ref.lines = (prev.ref.lines ?? 1) + 1;
      if (i.ref.boothId) prev.booths.add(i.ref.boothId);
      if (i.at < prev.at) prev.at = i.at;
      if (prev.ownerId !== i.ownerId) prev.ownerId = null;
    }
  }
  for (const m of merged.values()) {
    m.ref.booths = m.booths.size;
    delete (m as Partial<typeof m>).booths;
  }
  return out;
}
