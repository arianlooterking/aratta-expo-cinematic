/**
 * Helpers for the CRM and team tasks: follow-up and due-date grouping, checklists, stage moves.
 */

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s.getTime();
}

export type DueGroup = "overdue" | "today" | "week" | "later" | "none";
export const DUE_GROUPS: DueGroup[] = ["overdue", "today", "week", "later", "none"];

/** Which bucket a due date falls in, seen from now. */
export function dueGroup(due: string | null | undefined, now = new Date()): DueGroup {
  if (!due) return "none";
  const t = new Date(due).getTime();
  const today = startOfDay(now);
  if (t < today) return "overdue";
  if (t < today + DAY) return now.getTime() > t ? "overdue" : "today";
  if (t < today + 7 * DAY) return "week";
  return "later";
}

/** Groups rows by due date, keeping each group sorted soonest first. */
export function groupByDue<T>(rows: readonly T[], due: (row: T) => string | null | undefined, now = new Date()) {
  const out: Record<DueGroup, T[]> = { overdue: [], today: [], week: [], later: [], none: [] };
  for (const r of rows) out[dueGroup(due(r), now)].push(r);
  for (const g of DUE_GROUPS) out[g].sort((a, b) => (due(a) ?? "9").localeCompare(due(b) ?? "9"));
  return out;
}

export type ChecklistItem = { id: string; text: string; done: boolean };

/** Reads a task checklist from its jsonb column, whatever shape it was saved in. */
export function checklistOf(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v, i) => {
      if (typeof v === "string") return { id: `c${i}`, text: v, done: false };
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const text = String(o.text ?? o.title ?? "").trim();
        if (!text) return null;
        return { id: String(o.id ?? `c${i}`), text, done: Boolean(o.done) };
      }
      return null;
    })
    .filter((v): v is ChecklistItem => v !== null);
}

export function checklistProgress(items: readonly ChecklistItem[]) {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length };
}

type Stage = "lead" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

/** The patch for moving a deal to a stage. Moving to lost needs a reason; leaving lost clears it. */
export function stagePatch(current: { stage: Stage; lost_reason: string | null }, stage: Stage, reason?: string | null) {
  if (stage === current.stage) return null;
  if (stage === "lost") {
    const r = (reason ?? "").trim();
    if (!r) return null;
    return { stage, lost_reason: r };
  }
  return current.stage === "lost" ? { stage, lost_reason: null } : { stage };
}

/** Default chance of closing by stage, used when a deal has no probability (0..100) of its own. */
export const STAGE_PROBABILITY: Record<Stage, number> = {
  lead: 0.1,
  contacted: 0.2,
  qualified: 0.35,
  proposal: 0.5,
  negotiation: 0.7,
  won: 1,
  lost: 0,
};

/** Weighted pipeline value: estimated value × chance of closing. */
export function weightedValue(d: { stage: Stage; estimated_value: number | null; probability: number | null }) {
  if (!d.estimated_value) return 0;
  const p = d.probability != null ? d.probability / 100 : STAGE_PROBABILITY[d.stage];
  return Math.round(d.estimated_value * p);
}
