"use client";

import Link from "next/link";
import { CheckCircle2, Hand, Map as MapIcon, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";
import { pick, relativeTime, sep } from "@/lib/portal/format";
import { newId } from "@/lib/portal/store";
import type { Problem, ProblemStep } from "@/lib/portal/types";
import { problemStepLabel } from "@/lib/portal/workflow";
import { useExhibition } from "./ExhibitionProvider";
import { useNow, usePortal } from "./PortalProvider";
import { StaffAvatar, personName } from "./people";
import { Button, Field, IconButton, Select, Sheet, Textarea } from "./ui";

const STEPS: ProblemStep[] = ["furniture_list", "build", "power", "delivery", "handover", "collection", "clearance", "payment", "other"];

type Target = { boothId?: string | null; dealId?: string | null; orderId?: string | null };

function sameTarget(p: Problem, t: Target) {
  if (t.orderId) return p.order_id === t.orderId;
  if (t.boothId) return p.booth_id === t.boothId;
  return p.deal_id === (t.dealId ?? null) && !p.booth_id && !p.order_id;
}

/** Where a problem is, in words: booth code and company. */
export function useProblemPlace() {
  const { lang } = usePortal();
  const x = useExhibition();
  return (p: Problem) => {
    const booth = p.booth_id ? x.booths.find((b) => b.id === p.booth_id) : undefined;
    const deal = p.deal_id ? x.dealById.get(p.deal_id) : undefined;
    const company = deal ? x.companyById.get(deal.company_id) : undefined;
    const line = p.order_id ? x.orders.find((o) => o.id === p.order_id) : undefined;
    const item = line ? x.itemById.get(line.item_id) : undefined;
    return {
      booth,
      company,
      companyName: company ? pick(lang, company.name_fa, company.name_en) : "",
      itemName: item ? pick(lang, item.name_fa, item.name_en) : "",
    };
  };
}

/**
 * The one-tap problem flag. A tap raises the problem straight away (the booth turns red for
 * everyone); a sheet then offers to add a few words or hand it to someone, which can be skipped.
 * Tapping again while one is open for the same thing opens that one instead of a duplicate.
 */
export function ProblemButton({
  boothId,
  dealId,
  orderId,
  step,
  label,
  variant = "button",
  className,
}: Target & { step: ProblemStep; label?: string; variant?: "button" | "icon" | "chip"; className?: string }) {
  const { lang, store, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [opened, setOpened] = useState<{ id: string; fresh: boolean } | null>(null);
  const target: Target = { boothId, dealId, orderId };
  const existing = x.openProblems.find((p) => p.step === step && sameTarget(p, target));
  const problem = opened ? (x.problems.find((p) => p.id === opened.id) ?? null) : null;
  // Stable, so the sheet doesn't move focus every time the data updates.
  const close = useCallback(() => setOpened(null), []);
  if (!can.edit || !x.exhibition) return null;
  const text = label ?? (fa ? "مشکل دارد" : "Problem");

  async function raise() {
    if (existing) return setOpened({ id: existing.id, fresh: false });
    const id = newId();
    const res = await store.insert("problems", {
      id,
      exhibition_id: x.exhibition!.id,
      booth_id: boothId ?? null,
      deal_id: dealId ?? null,
      order_id: orderId ?? null,
      step,
    });
    if (!res.ok) return;
    toast(fa ? "مشکل ثبت شد؛ همکاران می بینند" : "Problem raised; the team can see it");
    setOpened({ id, fresh: true });
  }

  const flagged = Boolean(existing);
  const trigger =
    variant === "icon" ? (
      <IconButton size="sm" label={flagged ? (fa ? "مشکل باز است" : "Open problem") : text} onClick={raise} className={cn(flagged && "bg-p-danger-soft text-p-danger", className)}>
        <TriangleAlert className="size-4" />
      </IconButton>
    ) : variant === "chip" ? (
      <button
        type="button"
        onClick={raise}
        aria-label={flagged ? (fa ? "مشکل باز است" : "Open problem") : text}
        title={flagged ? (fa ? "مشکل باز است" : "Open problem") : text}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
          flagged ? "bg-p-danger text-white" : "text-p-ink-3 hover:bg-p-danger-soft hover:text-p-danger",
          className,
        )}
      >
        <TriangleAlert className="size-4" />
      </button>
    ) : (
      <Button size="sm" tone="danger" icon={<TriangleAlert className="size-4" />} onClick={raise} className={className}>
        {flagged ? (fa ? "مشکل باز است" : "Problem open") : text}
      </Button>
    );

  return (
    <>
      {trigger}
      <ProblemSheet problem={problem} onClose={close} justRaised={opened?.fresh} />
    </>
  );
}

/** A problem's details: add a note, change the step, hand it to someone, resolve or reopen it. */
export function ProblemSheet({ problem, onClose, justRaised }: { problem: Problem | null; onClose: () => void; justRaised?: boolean }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const place = useProblemPlace();
  const where = problem ? place(problem) : null;
  const title = problem
    ? [fa ? "مشکل" : "Problem", where?.booth ? `⁦${where.booth.code}⁩` : where?.companyName].filter(Boolean).join(fa ? " در " : " at ")
    : "";
  return (
    <Sheet open={Boolean(problem)} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={title}>
      {problem ? <ProblemForm key={problem.id} problem={problem} onClose={onClose} justRaised={justRaised} /> : null}
    </Sheet>
  );
}

function ProblemForm({ problem: p, onClose, justRaised }: { problem: Problem; onClose: () => void; justRaised?: boolean }) {
  const { lang, store, can, toast, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const now = useNow();
  const [note, setNote] = useState(p.note ?? "");
  // Decided once, so the hint doesn't vanish (and move the buttons) the moment a note is saved.
  const [showHint] = useState(Boolean(justRaised && !p.resolved_at && !p.note));
  const [resolution, setResolution] = useState("");
  const raisedBy = p.raised_by ? x.staffById.get(p.raised_by) : null;
  const resolvedBy = p.resolved_by ? x.staffById.get(p.resolved_by) : null;
  const where = useProblemPlace()(p);
  const people = x.staff.filter((s) => s.status === "active" || s.id === p.assignee_id);

  const saveNote = async () => {
    if ((note.trim() || null) !== p.note) await store.update("problems", p.id, { note });
  };

  return (
    <div className="grid gap-4">
      {showHint ? (
        <p className="rounded-xl bg-p-danger-soft px-3 py-2 text-[13px] text-p-danger">
          {fa
            ? "غرفه برای همه قرمز شد. اگر بخواهید چند کلمه بنویسید یا آن را به کسی بسپارید؛ وگرنه همین کافی است."
            : "The booth is now red for everyone. Add a few words or hand it to someone if you like; otherwise this is enough."}
        </p>
      ) : null}

      <p className="text-[13px] text-p-ink-3">
        {[where.companyName, where.itemName].filter(Boolean).join(sep(lang))}
        {raisedBy || p.raised_by ? (
          <span className="ms-1 inline-flex items-center gap-1 align-middle">
            {where.companyName || where.itemName ? sep(lang) : null}
            <StaffAvatar staff={raisedBy} size={18} />
            {personName(raisedBy, lang)}
            {now ? `${sep(lang)}${relativeTime(lang, p.raised_at, new Date(now))}` : null}
          </span>
        ) : null}
      </p>

      <Field label={fa ? "کدام مرحله؟" : "Which step?"}>
        <div className="flex flex-wrap gap-1.5">
          {STEPS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={!can.edit}
              aria-pressed={p.step === s}
              onClick={() => store.update("problems", p.id, { step: s })}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition-colors",
                p.step === s ? "bg-p-danger text-white" : "bg-p-sunken text-p-ink-2 hover:bg-p-line",
              )}
            >
              {problemStepLabel[s][lang]}
            </button>
          ))}
        </div>
      </Field>

      <Field label={fa ? "چه شده؟ (اختیاری)" : "What's wrong? (optional)"}>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          rows={3}
          disabled={!can.edit}
          placeholder={fa ? "مثلا: دو صندلی کم است، برق قطع است..." : "For example: two chairs short, no power..."}
        />
      </Field>

      <Field label={fa ? "چه کسی رسیدگی کند؟ (اختیاری)" : "Who should sort it? (optional)"}>
        <div className="flex items-center gap-2">
          <Select
            value={p.assignee_id ?? ""}
            disabled={!can.edit}
            onChange={(e) => store.update("problems", p.id, { assignee_id: e.target.value || null })}
            className="flex-1"
          >
            <option value="">{fa ? "هر کس که می تواند" : "Whoever can"}</option>
            {people.map((s) => (
              <option key={s.id} value={s.id}>
                {personName(s, lang)}
              </option>
            ))}
          </Select>
          {can.edit && p.assignee_id !== user.id && !p.resolved_at ? (
            <Button size="sm" icon={<Hand className="size-4" />} onClick={() => store.update("problems", p.id, { assignee_id: user.id })}>
              {fa ? "با من" : "I'll take it"}
            </Button>
          ) : null}
        </div>
      </Field>

      {p.resolved_at ? (
        <div className="grid gap-2 rounded-xl bg-p-ok-soft px-3 py-2.5 text-[13px] text-p-ok">
          <p className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="size-4" />
            {fa ? "حل شد" : "Resolved"}
            {resolvedBy ? `${sep(lang)}${personName(resolvedBy, lang)}` : ""}
            {now ? `${sep(lang)}${relativeTime(lang, p.resolved_at, new Date(now))}` : ""}
          </p>
          {p.resolution ? <p className="text-p-ink-2">{p.resolution}</p> : null}
        </div>
      ) : can.edit ? (
        <div className="grid gap-2 rounded-xl border border-p-line p-3">
          <Textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={2}
            placeholder={fa ? "چه کار شد؟ (اختیاری)" : "What was done? (optional)"}
          />
          <Button
            tone="primary"
            icon={<CheckCircle2 className="size-4" />}
            onClick={async () => {
              await saveNote();
              await store.update("problems", p.id, { resolved_at: new Date().toISOString(), resolution: resolution || null });
              toast(fa ? "حل شد؛ غرفه دیگر قرمز نیست" : "Resolved; the booth is no longer red");
              onClose();
            }}
          >
            {fa ? "حل شد" : "Mark as resolved"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {can.edit && p.resolved_at ? (
          <Button size="sm" tone="ghost" icon={<RotateCcw className="size-4" />} onClick={() => store.update("problems", p.id, { resolved_at: null })}>
            {fa ? "دوباره باز شود" : "Reopen"}
          </Button>
        ) : null}
        {can.edit && (p.raised_by === user.id || can.manage) ? (
          <Button
            size="sm"
            tone="ghost"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              await store.remove("problems", p.id);
              toast(fa ? "حذف شد" : "Deleted");
              onClose();
            }}
          >
            {fa ? "اشتباه بود، حذف شود" : "Raised by mistake, delete"}
          </Button>
        ) : null}
        <span className="flex-1" />
        <Button
          tone="secondary"
          onClick={async () => {
            await saveNote();
            onClose();
          }}
        >
          {fa ? "تمام" : "Done"}
        </Button>
      </div>
    </div>
  );
}

/** One problem as a red card for lists. Tapping it opens the details. */
export function ProblemCard({ problem: p, showPlace = true }: { problem: Problem; showPlace?: boolean }) {
  const { lang, store, can, user, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const now = useNow();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const where = useProblemPlace()(p);
  const raisedBy = p.raised_by ? x.staffById.get(p.raised_by) : null;
  const assignee = p.assignee_id ? x.staffById.get(p.assignee_id) : null;
  const resolved = Boolean(p.resolved_at);
  return (
    <li
      className={cn(
        "grid gap-2 rounded-2xl border px-3 py-3",
        resolved ? "border-p-line bg-p-surface opacity-75" : "border-p-danger/40 bg-p-danger-soft/60",
      )}
    >
      <button type="button" onClick={() => setOpen(true)} className="flex items-start gap-3 text-start">
        {showPlace && where.booth ? (
          <span
            className={cn("tabular grid h-10 min-w-12 place-items-center rounded-xl px-2 text-sm font-bold", resolved ? "bg-p-sunken" : "bg-p-danger text-white")}
            dir="ltr"
          >
            {where.booth.code}
          </span>
        ) : (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", resolved ? "bg-p-sunken text-p-ok" : "bg-p-danger text-white")}>
            {resolved ? <CheckCircle2 className="size-5" /> : <TriangleAlert className="size-5" />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn("text-sm font-semibold", !resolved && "text-p-danger")}>{problemStepLabel[p.step][lang]}</span>
            {showPlace && where.companyName ? <span className="truncate text-[13px] text-p-ink-2">{where.companyName}</span> : null}
          </span>
          <span className="mt-0.5 block text-[13px] text-p-ink">
            {p.note ?? (where.itemName ? where.itemName : <span className="text-p-ink-3">{fa ? "بدون توضیح" : "No details"}</span>)}
            {p.note && where.itemName ? <span className="text-p-ink-3">{sep(lang)}{where.itemName}</span> : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-p-ink-3">
            <StaffAvatar staff={raisedBy} size={16} />
            {personName(raisedBy, lang)}
            {now ? `${sep(lang)}${relativeTime(lang, p.raised_at, new Date(now))}` : null}
            {assignee ? (
              <>
                {sep(lang)}
                {fa ? "رسیدگی:" : "With"}
                <StaffAvatar staff={assignee} size={16} />
                {personName(assignee, lang)}
              </>
            ) : null}
            {resolved && p.resolution ? <span className="text-p-ok">{sep(lang)}{p.resolution}</span> : null}
          </span>
        </span>
      </button>
      {!resolved ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {where.booth ? (
            <Link href={`/${lang}/staff/map?booth=${where.booth.id}`} className="grid size-8 place-items-center rounded-lg text-p-ink-3 hover:bg-p-surface" aria-label={fa ? "نمایش روی نقشه" : "Show on map"}>
              <MapIcon className="size-4" />
            </Link>
          ) : null}
          {can.edit && !p.assignee_id ? (
            <Button size="sm" tone="ghost" icon={<Hand className="size-4" />} onClick={() => store.update("problems", p.id, { assignee_id: user.id })}>
              {fa ? "با من" : "I'll take it"}
            </Button>
          ) : null}
          {can.edit ? (
            <Button
              size="sm"
              tone="primary"
              icon={<CheckCircle2 className="size-4" />}
              onClick={async () => {
                await store.update("problems", p.id, { resolved_at: new Date().toISOString() });
                toast(fa ? "حل شد" : "Resolved");
              }}
            >
              {fa ? "حل شد" : "Resolved"}
            </Button>
          ) : null}
        </div>
      ) : null}
      <ProblemSheet problem={open ? p : null} onClose={close} />
    </li>
  );
}

/** A red strip listing the open problems on a booth or company, for the top of a panel. */
export function ProblemStrip({ problems }: { problems: readonly Problem[] }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  if (!problems.length) return null;
  return (
    <section className="grid gap-2" aria-label={fa ? "مشکلات باز" : "Open problems"}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-p-danger">
        <TriangleAlert className="size-4" />
        {fa ? `${problems.length.toLocaleString("fa")} مشکل باز` : `${problems.length} open problem${problems.length > 1 ? "s" : ""}`}
      </p>
      <ul className="grid gap-2">
        {problems.map((p) => (
          <ProblemCard key={p.id} problem={p} showPlace={false} />
        ))}
      </ul>
    </section>
  );
}
