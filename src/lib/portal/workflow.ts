/**
 * The steps every sold booth goes through, from agreeing the furniture with the company to an
 * empty, clean booth after the show, plus the "problem" flag that can sit on any of them.
 * Pure, so the map, the booth panel, the company page and the tests share one set of rules.
 */
import type { EquipmentSummary, Phase } from "./metrics";

export type ProblemStep = "furniture_list" | "build" | "power" | "delivery" | "handover" | "collection" | "clearance" | "payment" | "other";

/** The booth steps, in the order they happen. */
export const BOOTH_STEPS = ["furniture_list", "build", "power", "delivery", "handover", "collection", "clearance"] as const;
export type BoothStep = (typeof BOOTH_STEPS)[number];

/** Steps somebody ticks by hand on the booth. The others come from the deal and the furniture lines. */
export const MANUAL_STEPS = ["build", "power", "handover", "clearance"] as const;
export type ManualStep = (typeof MANUAL_STEPS)[number];

export function isManualStep(step: string): step is ManualStep {
  return (MANUAL_STEPS as readonly string[]).includes(step);
}

export const problemStepLabel: Record<ProblemStep, { fa: string; en: string }> = {
  furniture_list: { fa: "فهرست تجهیزات", en: "Furniture list" },
  build: { fa: "غرفه سازی", en: "Stand build" },
  power: { fa: "برق", en: "Power" },
  delivery: { fa: "تحویل تجهیزات", en: "Furniture delivery" },
  handover: { fa: "تحویل غرفه", en: "Booth handover" },
  collection: { fa: "جمع آوری تجهیزات", en: "Furniture collection" },
  clearance: { fa: "تخلیه غرفه", en: "Booth clearance" },
  payment: { fa: "پرداخت", en: "Payment" },
  other: { fa: "سایر", en: "Something else" },
};

/** What the step means when it is done, for the step list. */
export const stepDoneLabel: Record<BoothStep, { fa: string; en: string }> = {
  furniture_list: { fa: "فهرست تجهیزات با شرکت نهایی شد", en: "Furniture agreed with the company" },
  build: { fa: "غرفه ساخته شد (کف، دیوار، تابلو)", en: "Stand built (floor, walls, sign)" },
  power: { fa: "برق غرفه وصل شد", en: "Power connected" },
  delivery: { fa: "تجهیزات به غرفه رسید", en: "Furniture delivered" },
  handover: { fa: "غرفه به مشارکت کننده تحویل شد", en: "Booth handed to the exhibitor" },
  collection: { fa: "تجهیزات جمع آوری شد", en: "Furniture collected" },
  clearance: { fa: "غرفه تخلیه و تمیز شد", en: "Booth cleared and clean" },
};

export type StepStamp = { at: string; by?: string | null };
export type BoothSteps = Partial<Record<ManualStep, StepStamp>>;

/** The ticked steps stored on a booth, ignoring anything malformed. */
export function readSteps(value: unknown): BoothSteps {
  const out: BoothSteps = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const key of MANUAL_STEPS) {
    const v = (value as Record<string, unknown>)[key];
    if (v && typeof v === "object" && typeof (v as StepStamp).at === "string") {
      const by = (v as StepStamp).by;
      out[key] = { at: (v as StepStamp).at, by: typeof by === "string" ? by : null };
    }
  }
  return out;
}

/** The new steps value after ticking or unticking one step. Other keys are kept as they were. */
export function stepsPatch(current: unknown, step: ManualStep, done: boolean, by: string | null, at = new Date().toISOString()) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? { ...(current as Record<string, unknown>) } : {};
  if (done) base[step] = { at, by };
  else delete base[step];
  return base;
}

export type StepState = "done" | "todo" | "skip" | "problem";

export type StepView = {
  step: BoothStep;
  state: StepState;
  at: string | null;
  by: string | null;
  /** For furniture steps: pieces done out of pieces in play. */
  count: { done: number; total: number } | null;
  /** Ticked by hand on the booth (and so can be unticked). */
  manual: boolean;
};

type DealLike = { furniture_confirmed_at: string | null; furniture_confirmed_by: string | null } | null | undefined;
type ProblemLike = { step: ProblemStep; resolved_at: string | null };

/**
 * Where a booth is on each step. A step with an open problem shows as a problem whatever else is
 * true. Furniture steps with nothing to move are skipped rather than left hanging.
 */
export function boothWorkflow(input: {
  steps: unknown;
  deal: DealLike;
  equipment: EquipmentSummary | undefined;
  problems: readonly ProblemLike[];
}): StepView[] {
  const ticks = readSteps(input.steps);
  const eq = input.equipment;
  const open = new Set(input.problems.filter((p) => !p.resolved_at).map((p) => p.step));
  const pieces = eq?.pieces ?? 0;
  return BOOTH_STEPS.map((step): StepView => {
    let state: StepState = "todo";
    let at: string | null = null;
    let by: string | null = null;
    let count: StepView["count"] = null;
    const manual = isManualStep(step);
    if (manual) {
      const tick = ticks[step];
      if (tick) {
        state = "done";
        at = tick.at;
        by = tick.by ?? null;
      }
    } else if (step === "furniture_list") {
      if (input.deal?.furniture_confirmed_at) {
        state = "done";
        at = input.deal.furniture_confirmed_at;
        by = input.deal.furniture_confirmed_by;
      } else if (!input.deal) state = "skip";
    } else if (step === "delivery") {
      if (!pieces) state = input.deal?.furniture_confirmed_at ? "skip" : "todo";
      else {
        count = { done: pieces - eq!.toDeliver, total: pieces };
        if (eq!.toDeliver === 0) state = "done";
      }
    } else if (step === "collection") {
      const back = (eq?.collected ?? 0) + (eq?.toCollect ?? 0);
      if (!pieces) state = input.deal?.furniture_confirmed_at ? "skip" : "todo";
      else if (back === 0 && eq!.toDeliver === 0) state = "skip";
      else {
        count = back ? { done: eq!.collected, total: back } : null;
        if (eq!.toCollect === 0 && eq!.collected > 0 && eq!.toDeliver === 0) state = "done";
      }
    }
    if (open.has(step)) state = "problem";
    return { step, state, at, by, count, manual };
  });
}

/** The first step still to do, or null when the booth is finished. */
export function nextStep(flow: readonly StepView[]): BoothStep | null {
  return flow.find((s) => s.state === "todo" || s.state === "problem")?.step ?? null;
}

export type ProgressTone = "none" | "problem" | "prep" | "delivery" | "handover" | "open" | "strike" | "done";
export const PROGRESS_TONES: ProgressTone[] = ["none", "prep", "delivery", "handover", "open", "strike", "done", "problem"];

export const progressToneLabel: Record<ProgressTone, { fa: string; en: string }> = {
  none: { fa: "بدون مشارکت کننده", en: "No exhibitor" },
  prep: { fa: "در حال آماده سازی", en: "Getting ready" },
  delivery: { fa: "منتظر تجهیزات", en: "Waiting for furniture" },
  handover: { fa: "آماده تحویل", en: "Ready to hand over" },
  open: { fa: "تحویل شده و فعال", en: "Handed over" },
  strike: { fa: "جمع آوری و تخلیه", en: "Packing up" },
  done: { fa: "تمام شده", en: "Finished" },
  problem: { fa: "مشکل دارد", en: "Has a problem" },
};

/**
 * One colour for the booth on the work layer. Collection only counts as pending once the show is
 * over; while it runs, a handed-over booth is simply open.
 */
export function progressTone(flow: readonly StepView[], hasExhibitor: boolean, phase: Phase, openProblems: number): ProgressTone {
  if (openProblems > 0) return "problem";
  if (!hasExhibitor) return "none";
  const next = nextStep(flow);
  if (!next) return "done";
  if (next === "furniture_list" || next === "build" || next === "power") return "prep";
  if (next === "delivery") return "delivery";
  if (next === "handover") return "handover";
  return phase === "strike" || phase === "after" ? "strike" : "open";
}

/** Steps done out of the steps that apply. */
export function workflowShare(flow: readonly StepView[]) {
  const counted = flow.filter((s) => s.state !== "skip");
  const done = counted.filter((s) => s.state === "done").length;
  return { done, total: counted.length, share: counted.length ? done / counted.length : 0 };
}

/** The step a problem raised from a furniture line belongs to. */
export function lineProblemStep(line: { delivered_qty: number; stage: string }): ProblemStep {
  return line.delivered_qty > 0 || line.stage === "delivered" ? "collection" : "delivery";
}
