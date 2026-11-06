// Pure summaries used by the overview, the map layers and the handover lists.
import type { Balance } from "./money";

export type Phase = "planning" | "build" | "show" | "strike" | "after";

type DatedExhibition = {
  build_starts_on: string | null;
  starts_on: string | null;
  ends_on: string | null;
  strike_ends_on: string | null;
  status: string;
};

function dayIndex(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function today(now: Date) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000;
}

/** Where the show is in its life, from its dates (status as a fallback). */
export function exhibitionPhase(e: DatedExhibition, now = new Date()): Phase {
  const t = today(now);
  const start = e.starts_on ? dayIndex(e.starts_on) : null;
  const end = e.ends_on ? dayIndex(e.ends_on) : start;
  const build = e.build_starts_on ? dayIndex(e.build_starts_on) : start != null ? start - 2 : null;
  const strike = e.strike_ends_on ? dayIndex(e.strike_ends_on) : end != null ? end + 1 : null;
  if (start == null || end == null) {
    if (e.status === "build") return "build";
    if (e.status === "live") return "show";
    if (e.status === "strike") return "strike";
    if (e.status === "closed" || e.status === "archived") return "after";
    return "planning";
  }
  if (build != null && t < build) return "planning";
  if (t < start) return "build";
  if (t <= end) return "show";
  if (strike != null && t <= strike) return "strike";
  return "after";
}

/** The exhibition to open by default: the one being built, shown or struck, else the next one, else the latest. */
export function defaultExhibition<E extends DatedExhibition & { id: string }>(list: readonly E[], now = new Date()): E | null {
  if (!list.length) return null;
  const phase = (e: E) => exhibitionPhase(e, now);
  const active = list.find((e) => ["build", "show", "strike"].includes(phase(e)));
  if (active) return active;
  const upcoming = list
    .filter((e) => phase(e) === "planning" && e.starts_on)
    .sort((a, b) => a.starts_on!.localeCompare(b.starts_on!));
  if (upcoming[0]) return upcoming[0];
  return [...list].sort((a, b) => (b.starts_on ?? "").localeCompare(a.starts_on ?? ""))[0];
}

type OrderLike = {
  stage: string;
  quantity: number;
  delivered_qty: number;
  collected_qty: number;
  damaged_qty: number;
  item_id: string;
};

export type EquipmentState = "none" | "waiting" | "partial" | "delivered" | "collecting" | "collected" | "issue";

export type EquipmentSummary = {
  lines: number;
  pieces: number;
  /** Pieces not yet at the booth. */
  toDeliver: number;
  /** Returnable pieces at the booth that must come back. */
  toCollect: number;
  delivered: number;
  collected: number;
  issues: number;
  state: EquipmentState;
};

const WAITING = new Set(["requested", "reserved", "prepared"]);

export function summariseEquipment(orders: readonly OrderLike[], returnable: (itemId: string) => boolean): EquipmentSummary {
  let pieces = 0;
  let toDeliver = 0;
  let toCollect = 0;
  let delivered = 0;
  let collected = 0;
  let issues = 0;
  let lines = 0;
  for (const o of orders) {
    if (o.stage === "cancelled") continue;
    lines += 1;
    pieces += o.quantity;
    if (o.stage === "issue") issues += 1;
    if (WAITING.has(o.stage)) toDeliver += o.quantity;
    else if (o.stage === "issue" && o.delivered_qty === 0) toDeliver += o.quantity;
    delivered += o.delivered_qty;
    collected += o.collected_qty;
    if (returnable(o.item_id) && o.stage !== "collected") {
      toCollect += Math.max(0, o.delivered_qty - o.collected_qty - o.damaged_qty);
    }
  }
  let state: EquipmentState = "none";
  if (lines === 0) state = "none";
  else if (issues > 0) state = "issue";
  else if (collected > 0 && toCollect > 0) state = "collecting";
  else if (collected > 0 && toCollect === 0 && toDeliver === 0) state = "collected";
  else if (toDeliver === 0) state = "delivered";
  else if (delivered > 0) state = "partial";
  else state = "waiting";
  return { lines, pieces, toDeliver, toCollect, delivered, collected, issues, state };
}

type BoothLike = { id: string; status: string; area_m2: number; deal_id: string | null };

export type SpaceSummary = {
  booths: number;
  byStatus: Record<string, number>;
  areaTotal: number;
  /** Reserved, contracted or paid. */
  areaSold: number;
  soldShare: number;
};

export function summariseSpace(booths: readonly BoothLike[]): SpaceSummary {
  const byStatus: Record<string, number> = { available: 0, held: 0, reserved: 0, contracted: 0, paid: 0, blocked: 0 };
  let areaTotal = 0;
  let areaSold = 0;
  for (const b of booths) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    if (b.status === "blocked") continue;
    areaTotal += b.area_m2;
    if (b.status === "reserved" || b.status === "contracted" || b.status === "paid") areaSold += b.area_m2;
  }
  return { booths: booths.length, byStatus, areaTotal, areaSold, soldShare: areaTotal ? areaSold / areaTotal : 0 };
}

export type MoneySummary = { invoiced: number; paid: number; balance: number; debtors: number };

export function summariseMoney(balances: Iterable<Balance>): MoneySummary {
  let invoiced = 0;
  let paid = 0;
  let debtors = 0;
  for (const b of balances) {
    invoiced += b.invoiced;
    paid += b.paid;
    if (b.balance > 0) debtors += 1;
  }
  return { invoiced, paid, balance: invoiced - paid, debtors };
}

type DealLike = { id: string; stage: string; next_follow_up_at: string | null };

/** Open deals whose follow-up is due by the end of today, oldest first. */
export function dueFollowUps<D extends DealLike>(deals: readonly D[], now = new Date()): D[] {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost" && d.next_follow_up_at && new Date(d.next_follow_up_at) <= endOfDay)
    .sort((a, b) => a.next_follow_up_at!.localeCompare(b.next_follow_up_at!));
}
