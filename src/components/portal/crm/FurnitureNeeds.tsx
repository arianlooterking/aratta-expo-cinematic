"use client";

import Link from "next/link";
import { Armchair, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { num, relativeTime, sep } from "@/lib/portal/format";
import type { Deal } from "@/lib/portal/types";
import { boothWorkflow, problemStepLabel, stepDoneLabel } from "@/lib/portal/workflow";
import { useExhibition } from "../ExhibitionProvider";
import { FurnitureTab } from "../map/FurnitureTab";
import { useNow, usePortal } from "../PortalProvider";
import { personName } from "../people";
import { ProblemButton, ProblemStrip } from "../ProblemFlag";
import { Button, Card, Pill, Textarea } from "../ui";

/**
 * What the company wants on its booth. Sales fills it in while talking to the company; the list
 * shows on the furniture plan as soon as the company has a booth, and the floor team delivers it.
 */
export function FurnitureNeeds({ deal }: { deal: Deal }) {
  const { lang, store, can, user, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const now = useNow();
  const [notes, setNotes] = useState(deal.furniture_notes ?? "");
  const booths = x.boothsByDeal.get(deal.id) ?? [];
  const booth = booths[0] ?? null;
  const confirmedBy = deal.furniture_confirmed_by ? x.staffById.get(deal.furniture_confirmed_by) : null;
  const problems = x.openProblemsByDeal.get(deal.id) ?? [];
  const flow = booth ? boothWorkflow({ steps: booth.steps, deal, equipment: x.equipmentByBooth.get(booth.id), problems: x.openProblemsByBooth.get(booth.id) ?? [] }) : [];
  const floorSteps = flow.filter((s) => s.step === "delivery" || s.step === "collection");
  const base = `/${lang}/staff`;

  const confirm = async () => {
    const done = !deal.furniture_confirmed_at;
    await store.update("deals", deal.id, { furniture_confirmed_at: done ? new Date().toISOString() : null, furniture_confirmed_by: done ? user.id : null });
    if (done) toast(fa ? "فهرست نهایی شد؛ تیم تجهیزات می بیند" : "List confirmed; the furniture team can see it");
  };

  return (
    <Card className="grid gap-4 p-4" data-tour="company-furniture">
      <div className="flex flex-wrap items-center gap-2">
        <Armchair className="size-5 text-p-brand" />
        <h2 className="flex-1 text-[15px] font-semibold">{fa ? "تجهیزات و مبلمان درخواستی" : "Furniture the company wants"}</h2>
        {deal.furniture_confirmed_at ? (
          <Pill tone="ok">
            <CheckCircle2 className="size-3.5" />
            {fa ? "نهایی شده" : "Confirmed"}
          </Pill>
        ) : (
          <Pill tone="warn">{fa ? "هنوز نهایی نشده" : "Not confirmed yet"}</Pill>
        )}
        <ProblemButton dealId={deal.id} boothId={booth?.id ?? null} step="furniture_list" variant="icon" label={fa ? "مشکل در فهرست تجهیزات" : "Problem with the furniture list"} />
      </div>

      <p className="text-[13px] text-p-ink-3">
        {booth ? (
          <>
            {fa ? "این فهرست روی نقشه برای غرفه " : "This list shows on the plan for booth "}
            <Link href={`${base}/map?booth=${booth.id}`} className="font-semibold text-p-brand hover:underline" dir="ltr">
              {booth.code}
            </Link>
            {fa ? " دیده می شود و تیم تجهیزات از همانجا تحویل و جمع آوری را ثبت می کند." : ", where the furniture team ticks off delivery and collection."}
          </>
        ) : fa ? (
          "از شرکت بپرسید چه می خواهد و همینجا بزنید. وقتی غرفه گرفت، فهرست خودکار روی نقشه همان غرفه می رود."
        ) : (
          "Ask the company what it needs and add it here. When it gets a booth, the list moves onto that booth on the plan by itself."
        )}
      </p>

      <ProblemStrip problems={problems} />

      <FurnitureTab deal={deal} floor={false} />

      <label className="grid gap-1.5">
        <span className="text-[13px] font-medium text-p-ink-2">{fa ? "خواسته های دیگر شرکت" : "Anything else they asked for"}</span>
        <Textarea
          rows={2}
          value={notes}
          disabled={!can.edit}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if ((notes.trim() || null) !== deal.furniture_notes) store.update("deals", deal.id, { furniture_notes: notes.trim() || null });
          }}
          placeholder={fa ? "مثلا: میز بلند کنار ورودی، برق سه فاز، تحویل تا ساعت ۹ صبح" : "For example: a tall table by the entrance, three-phase power, delivered by 9am"}
        />
      </label>

      {floorSteps.length ? (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {floorSteps.map((s) => (
            <li
              key={s.step}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-[13px]",
                s.state === "done" ? "bg-p-ok-soft text-p-ok" : s.state === "problem" ? "bg-p-danger-soft text-p-danger" : "bg-p-surface-2 text-p-ink-2",
              )}
            >
              {s.state === "done" ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{s.state === "done" ? stepDoneLabel[s.step][lang] : problemStepLabel[s.step][lang]}</span>
              {s.count ? <span className="tabular shrink-0">{num(lang, s.count.done)}/{num(lang, s.count.total)}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {can.edit ? (
          <Button tone={deal.furniture_confirmed_at ? "ghost" : "primary"} size="sm" icon={<CheckCircle2 className="size-4" />} onClick={confirm}>
            {deal.furniture_confirmed_at ? (fa ? "باز کردن دوباره فهرست" : "Reopen the list") : fa ? "فهرست با شرکت نهایی شد" : "Confirmed with the company"}
          </Button>
        ) : null}
        {deal.furniture_confirmed_at ? (
          <span className="text-xs text-p-ink-3">
            {confirmedBy ? personName(confirmedBy, lang) : null}
            {now ? `${confirmedBy ? sep(lang) : ""}${relativeTime(lang, deal.furniture_confirmed_at, new Date(now))}` : null}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
