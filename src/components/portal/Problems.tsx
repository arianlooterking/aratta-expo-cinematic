"use client";

import { CheckCircle2, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { num, pick } from "@/lib/portal/format";
import type { ProblemStep } from "@/lib/portal/types";
import { problemStepLabel } from "@/lib/portal/workflow";
import { useExhibition } from "./ExhibitionProvider";
import { usePortal } from "./PortalProvider";
import { ProblemCard } from "./ProblemFlag";
import { normalizeSearch } from "./SearchPalette";
import { Card, Empty, Segmented, Skeleton } from "./ui";

const STEPS: ProblemStep[] = ["furniture_list", "build", "power", "delivery", "handover", "collection", "clearance", "payment", "other"];

/** Every problem raised on any booth or company, newest first, for whoever can sort it out. */
export function Problems() {
  const { lang, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [view, setView] = useState<"open" | "mine" | "resolved">("open");
  const [step, setStep] = useState<ProblemStep | "all">("all");
  const [hallId, setHallId] = useState("all");
  const [query, setQuery] = useState("");

  const boothById = useMemo(() => new Map(x.booths.map((b) => [b.id, b])), [x.booths]);
  const base = useMemo(
    () =>
      x.problems.filter((p) => {
        if (view === "resolved" ? !p.resolved_at : p.resolved_at) return false;
        if (view === "mine" && p.assignee_id !== user.id && p.raised_by !== user.id) return false;
        if (hallId !== "all" && boothById.get(p.booth_id ?? "")?.hall_id !== hallId) return false;
        return true;
      }),
    [x.problems, view, user.id, hallId, boothById],
  );
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of base) m.set(p.step, (m.get(p.step) ?? 0) + 1);
    return m;
  }, [base]);
  const q = normalizeSearch(query);
  const shown = base.filter((p) => {
    if (step !== "all" && p.step !== step) return false;
    if (!q) return true;
    const booth = p.booth_id ? boothById.get(p.booth_id) : undefined;
    const deal = p.deal_id ? x.dealById.get(p.deal_id) : undefined;
    const company = deal ? x.companyById.get(deal.company_id) : undefined;
    return normalizeSearch(`${booth?.code ?? ""} ${company?.name_fa ?? ""} ${company?.name_en ?? ""} ${p.note ?? ""}`).includes(q);
  });

  if (!x.ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          {fa ? "مشکلات" : "Problems"}
          {x.openProblems.length ? <span className="tabular rounded-full bg-p-danger px-2.5 py-0.5 text-sm text-white">{num(lang, x.openProblems.length)}</span> : null}
        </h1>
        <p className="mt-1 text-sm text-p-ink-3">
          {fa
            ? "هر مشکلی که کسی روی غرفه یا شرکت ثبت کرده. غرفه تا وقتی مشکلش حل نشده روی نقشه قرمز می ماند."
            : "Everything anyone has flagged on a booth or company. A booth stays red on the plan until its problem is sorted."}
        </p>
      </div>

      <Card className="grid gap-3 p-4">
        <Segmented
          className="w-full [&>button]:flex-1"
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: fa ? "باز" : "Open", icon: <TriangleAlert className="size-4" /> },
            { value: "mine", label: fa ? "مربوط به من" : "Mine" },
            { value: "resolved", label: fa ? "حل شده" : "Resolved", icon: <CheckCircle2 className="size-4" /> },
          ]}
        />
        <div className="thin-scroll scroll-fade -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(["all", ...STEPS] as const).map((s) => {
            const n = s === "all" ? base.length : (counts.get(s) ?? 0);
            if (s !== "all" && !n && step !== s) return null;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={step === s}
                onClick={() => setStep(s)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                  step === s ? "bg-p-ink text-p-surface" : "bg-p-sunken text-p-ink-2 hover:bg-p-line",
                )}
              >
                {s === "all" ? (fa ? "همه" : "All") : problemStepLabel[s][lang]}
                <span className="tabular opacity-70">{num(lang, n)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {x.halls.length > 1 ? (
            <div className="thin-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {[{ id: "all", name: fa ? "همه سالن ها" : "All halls" }, ...x.halls.map((h) => ({ id: h.id, name: pick(lang, h.name_fa, h.name_en) }))].map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHallId(h.id)}
                  className={cn("h-8 shrink-0 rounded-lg px-3 text-[13px] font-medium", hallId === h.id ? "bg-p-ink text-p-bg" : "text-p-ink-2 hover:bg-p-sunken")}
                >
                  {h.name}
                </button>
              ))}
            </div>
          ) : null}
          <label className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={fa ? "غرفه، شرکت یا توضیح" : "Booth, company or note"}
              className="h-9 w-full rounded-lg border border-p-line bg-p-surface-2 ps-8 pe-2 text-sm outline-none focus:border-p-brand"
            />
          </label>
        </div>
      </Card>

      {shown.length === 0 ? (
        <Card>
          <Empty
            icon={view === "resolved" ? <TriangleAlert className="size-6" /> : <CheckCircle2 className="size-6" />}
            title={view === "resolved" ? (fa ? "هنوز مشکلی حل نشده" : "Nothing resolved yet") : fa ? "مشکل بازی نیست" : "No open problems"}
            hint={
              view === "resolved"
                ? undefined
                : fa
                  ? "روی هر غرفه در نقشه، در بخش روند کار، یا کنار هر قلم تجهیزات، دکمه مثلث قرمز را بزنید تا مشکلی ثبت شود."
                  : "Tap the red triangle on a booth's work steps, or next to any furniture line, to raise one."
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-2">
          {shown.map((p) => (
            <ProblemCard key={p.id} problem={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
