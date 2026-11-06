"use client";

import { Check, ChevronLeft, Minus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { num, relativeTime, sep } from "@/lib/portal/format";
import type { Json } from "@/lib/platform/database.types";
import type { Booth, Patch } from "@/lib/portal/types";
import { boothWorkflow, problemStepLabel, stepDoneLabel, stepsPatch, workflowShare, type StepView } from "@/lib/portal/workflow";
import { useExhibition } from "../ExhibitionProvider";
import { useNow, usePortal } from "../PortalProvider";
import { StaffAvatar, personName } from "../people";
import { ProblemButton, ProblemCard } from "../ProblemFlag";
import { Button, Progress } from "../ui";

/**
 * Every step a booth goes through, from the furniture list to an empty booth after the show.
 * Steps done on the floor are ticked here with one tap; furniture steps fill themselves in from
 * the deliveries. Each step has its own red flag for when something goes wrong.
 */
export function WorkTab({ booth, onUpdate, onFurniture }: { booth: Booth; onUpdate: (patch: Patch<"booths">) => void; onFurniture: () => void }) {
  const { lang, store, can, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const deal = booth.deal_id ? (x.dealById.get(booth.deal_id) ?? null) : null;
  const problems = x.problems.filter((p) => p.booth_id === booth.id);
  const open = problems.filter((p) => !p.resolved_at);
  const flow = boothWorkflow({ steps: booth.steps, deal, equipment: x.equipmentByBooth.get(booth.id), problems: open });
  const share = workflowShare(flow);
  const resolved = problems.filter((p) => p.resolved_at).slice(0, 5);
  const otherOpen = open.filter((p) => !flow.some((s) => s.step === p.step));

  const toggle = (s: StepView) => {
    if (s.step === "furniture_list") {
      if (!deal) return;
      const done = !deal.furniture_confirmed_at;
      store.update("deals", deal.id, { furniture_confirmed_at: done ? new Date().toISOString() : null, furniture_confirmed_by: done ? user.id : null });
      return;
    }
    if (!s.manual) return onFurniture();
    onUpdate({ steps: stepsPatch(booth.steps, s.step as "build", s.state !== "done", user.id) as Json });
  };

  return (
    <div className="grid gap-4" data-tour="booth-work">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{fa ? "روند کار غرفه" : "Booth progress"}</span>
          <span className="tabular text-p-ink-2">{fa ? `${num(lang, share.done)} از ${num(lang, share.total)} مرحله` : `${share.done} of ${share.total} steps`}</span>
        </div>
        <Progress value={share.share} tone={open.length ? "warn" : "ok"} />
        {!deal ? (
          <p className="text-xs text-p-ink-3">
            {fa ? "این غرفه هنوز به شرکتی داده نشده؛ مراحل ساخت و برق را می توان همین حالا ثبت کرد." : "No company on this booth yet; build and power can still be ticked."}
          </p>
        ) : null}
      </div>

      <ol className="grid gap-1.5">
        {flow.map((s, i) => (
          <StepRow key={s.step} index={i} view={s} booth={booth} onToggle={() => toggle(s)} canToggle={can.edit && (s.step !== "furniture_list" || Boolean(deal))} />
        ))}
      </ol>

      {otherOpen.length ? (
        <ul className="grid gap-2">
          {otherOpen.map((p) => (
            <ProblemCard key={p.id} problem={p} showPlace={false} />
          ))}
        </ul>
      ) : null}

      {can.edit ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-p-line-strong p-3">
          <p className="min-w-0 flex-1 text-[13px] text-p-ink-3">
            {fa ? "مشکل دیگری هست؟ یک لمس کافی است؛ غرفه قرمز می شود تا کسی رسیدگی کند." : "Something else wrong? One tap turns the booth red until someone sorts it out."}
          </p>
          <ProblemButton boothId={booth.id} step="other" label={fa ? "ثبت مشکل" : "Raise a problem"} />
        </div>
      ) : null}

      {resolved.length ? (
        <details className="group">
          <summary className="cursor-pointer list-none text-[13px] font-medium text-p-ink-3 hover:text-p-ink">
            {fa ? `${num(lang, resolved.length)} مشکل حل شده` : `${resolved.length} resolved problems`}
          </summary>
          <ul className="mt-2 grid gap-2">
            {resolved.map((p) => (
              <ProblemCard key={p.id} problem={p} showPlace={false} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function StepRow({ view: s, index, booth, onToggle, canToggle }: { view: StepView; index: number; booth: Booth; onToggle: () => void; canToggle: boolean }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const now = useNow();
  const who = s.by ? x.staffById.get(s.by) : null;
  const furniture = s.step === "delivery" || s.step === "collection";
  const icon =
    s.state === "done" ? (
      <Check className="size-4" />
    ) : s.state === "problem" ? (
      <TriangleAlert className="size-4" />
    ) : s.state === "skip" ? (
      <Minus className="size-4" />
    ) : (
      <span className="tabular text-xs font-bold">{num(lang, index + 1)}</span>
    );
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2 py-2",
        s.state === "problem" ? "border-p-danger/50 bg-p-danger-soft/60" : s.state === "done" ? "border-p-line bg-p-surface-2" : "border-p-line bg-p-surface",
        s.state === "skip" && "opacity-60",
      )}
    >
      <button
        type="button"
        disabled={!canToggle || s.state === "skip"}
        onClick={onToggle}
        aria-pressed={s.state === "done"}
        aria-label={s.state === "done" ? (fa ? `برگرداندن: ${stepDoneLabel[s.step].fa}` : `Undo: ${stepDoneLabel[s.step].en}`) : stepDoneLabel[s.step][lang]}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:cursor-default",
          s.state === "done"
            ? "border-p-ok bg-p-ok text-white"
            : s.state === "problem"
              ? "border-p-danger bg-p-danger text-white"
              : s.state === "skip"
                ? "border-p-line text-p-ink-3"
                : "border-p-line-strong text-p-ink-3 hover:border-p-brand hover:text-p-brand",
        )}
      >
        {icon}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] font-semibold leading-snug", s.state === "problem" && "text-p-danger")}>
          {s.state === "done" ? stepDoneLabel[s.step][lang] : problemStepLabel[s.step][lang]}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-p-ink-3">
          {s.state === "skip" ? (
            <span>{s.step === "furniture_list" ? (fa ? "بدون شرکت" : "No company") : fa ? "تجهیزاتی ندارد" : "No furniture"}</span>
          ) : s.count ? (
            <span className="tabular">
              {fa ? `${num(lang, s.count.done)} از ${num(lang, s.count.total)} قلم` : `${s.count.done} of ${s.count.total} pieces`}
            </span>
          ) : null}
          {s.at && s.state !== "skip" ? (
            <span className="inline-flex items-center gap-1">
              {s.count ? sep(lang) : null}
              {who ? <StaffAvatar staff={who} size={16} /> : null}
              {who ? personName(who, lang) : null}
              {now ? `${who ? sep(lang) : ""}${relativeTime(lang, s.at, new Date(now))}` : null}
            </span>
          ) : null}
          {s.state === "todo" && !s.count && !s.at ? <span>{furniture ? (fa ? "از بخش تجهیزات ثبت می شود" : "Ticked from the furniture tab") : fa ? "یک لمس روی دایره" : "Tap the circle when done"}</span> : null}
        </p>
      </div>
      {furniture && s.state !== "skip" ? (
        <Button size="sm" tone="ghost" onClick={onToggle} className="px-1.5" aria-label={fa ? "رفتن به تجهیزات" : "Open furniture"}>
          <ChevronLeft className="size-4 ltr:rotate-180" />
        </Button>
      ) : null}
      <ProblemButton boothId={booth.id} step={s.step} variant="chip" label={fa ? `مشکل در ${problemStepLabel[s.step].fa}` : `Problem with ${problemStepLabel[s.step].en.toLowerCase()}`} />
    </li>
  );
}
