"use client";

import { AlarmClock, GripVertical, Phone, PhoneCall, Plus, Search, SquareKanban } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { compact, date, num, pick, relativeTime, sep } from "@/lib/portal/format";
import { dealStageLabel } from "@/lib/portal/i18n";
import { dueGroupLabel } from "@/lib/portal/labels";
import { boothListPrice } from "@/lib/portal/money";
import { newId } from "@/lib/portal/store";
import type { Company, Deal, DealStage } from "@/lib/portal/types";
import { DUE_GROUPS, groupByDue, stagePatch, weightedValue } from "@/lib/portal/work";
import { useExhibition } from "../ExhibitionProvider";
import { PickerField, dayToIso } from "../fields";
import { useNow, usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { usePageTour } from "../Tour";
import { Button, Card, Empty, Field, Segmented, Select, Sheet, Skeleton } from "../ui";
import { useBoardDrag } from "../useBoardDrag";
import { ActivityForm } from "./ActivityForm";
import { LostSheet } from "./CompanyDetail";
import { CompanyFormBody } from "./CompanyForm";
import { StaffAvatar } from "../people";
import { PageHeader, STAGES } from "./shared";

type View = "board" | "followups";

/** A deal's value: its estimate, else the list price of its booths, else the area it wants at the space rate. */
function useDealValue() {
  const x = useExhibition();
  return (d: Deal) => {
    if (d.estimated_value) return d.estimated_value;
    const booths = x.boothsByDeal.get(d.id) ?? [];
    const rate = x.exhibition?.space_rate ?? null;
    if (booths.length) return booths.reduce((s, b) => s + (boothListPrice(b, rate) ?? 0), 0) || null;
    return d.expected_area_m2 && rate ? Math.round(d.expected_area_m2 * rate) : null;
  };
}

export function Pipeline() {
  usePageTour("pipeline");
  const { lang, store, can, user } = usePortal();
  const x = useExhibition();
  const params = useSearchParams();
  const router = useRouter();
  const fa = lang === "fa";
  const [view, setViewState] = useState<View>(params.get("view") === "followups" ? "followups" : "board");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const [lost, setLost] = useState<Deal | null>(null);
  const [logFor, setLogFor] = useState<Company | null>(null);
  const [adding, setAdding] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const dealValue = useDealValue();
  const currency = x.exhibition?.currency ?? "IRR";

  const setView = (v: View) => {
    setViewState(v);
    router.replace(`/${lang}/staff/crm/pipeline${v === "followups" ? "?view=followups" : ""}`, { scroll: false });
  };

  const move = (dealId: string, stage: DealStage) => {
    const deal = x.dealById.get(dealId);
    if (!deal || !can.edit) return;
    if (stage === "lost") return setLost(deal);
    const patch = stagePatch(deal, stage);
    if (patch) store.update("deals", deal.id, patch);
  };
  const { drag, cardDown, wasDrag } = useBoardDrag<DealStage>(move, board);

  const q = normalizeSearch(query);
  const deals = useMemo(
    () =>
      x.deals.filter((d) => {
        if (mine && d.owner_id !== user.id) return false;
        if (!q) return true;
        const c = x.companyById.get(d.company_id);
        const booths = (x.boothsByDeal.get(d.id) ?? []).map((b) => b.code).join(" ");
        return normalizeSearch(`${c?.name_fa ?? ""} ${c?.name_en ?? ""} ${booths}`).includes(q);
      }),
    [x.deals, x.companyById, x.boothsByDeal, mine, q, user.id],
  );
  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const weighted = open.reduce((s, d) => s + weightedValue({ ...d, estimated_value: dealValue(d) }), 0);

  if (!x.ready)
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-7 sm:px-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );

  return (
    <div className="space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title={fa ? "فروش و پیگیری" : "Sales pipeline"}
          hint={
            fa
              ? `${num(lang, open.length)} پرونده باز، ارزش وزنی ${compact(lang, weighted)} ${currency === "IRR" ? "ریال" : currency}`
              : `${open.length} open deals · weighted ${compact(lang, weighted)} ${currency}`
          }
          actions={
            can.edit ? (
              <Button tone="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
                {fa ? "پرونده فروش جدید" : "New deal"}
              </Button>
            ) : null
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <div data-tour="pipeline-view">
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "board", label: fa ? "تابلوی مراحل" : "Board", icon: <SquareKanban className="size-3.5" /> },
                { value: "followups", label: fa ? "پیگیری ها" : "Follow-ups", icon: <AlarmClock className="size-3.5" /> },
              ]}
            />
          </div>
          <button
            type="button"
            aria-pressed={mine}
            onClick={() => setMine((v) => !v)}
            className={cn("h-8 rounded-lg px-2.5 text-[13px] font-medium", mine ? "bg-p-brand-soft text-p-brand" : "bg-p-sunken text-p-ink-2 hover:bg-p-line")}
          >
            {fa ? "فقط مال من" : "Only mine"}
          </button>
          <label className="relative min-w-40 flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={fa ? "شرکت یا کد غرفه" : "Company or booth"}
              className="h-8 w-full rounded-lg border border-p-line bg-p-surface ps-8 pe-2 text-[13px] outline-none focus:border-p-brand"
            />
          </label>
        </div>
      </div>

      {view === "board" ? (
        <div ref={board} className="thin-scroll -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" data-tour="pipeline-board">
          <div className="flex w-max min-w-full items-stretch gap-3">
            {STAGES.map((stage) => {
              const list = deals
                .filter((d) => d.stage === stage)
                .sort((a, b) => (a.next_follow_up_at ?? "9").localeCompare(b.next_follow_up_at ?? "9"));
              const sum = list.reduce((s, d) => s + (dealValue(d) ?? 0), 0);
              const over = drag?.over === stage;
              // Empty stages fold into a slim strip so the busy ones get the room. They still take drops.
              if (!list.length)
                return (
                  <section
                    key={stage}
                    data-column={stage}
                    className={cn(
                      "flex w-14 shrink-0 flex-col items-center gap-2 rounded-2xl border py-3 transition-colors",
                      over ? "border-p-brand bg-p-brand-soft/60" : "border-dashed border-p-line bg-p-surface-2/60",
                    )}
                    title={dealStageLabel[stage][lang]}
                  >
                    <span className={cn("size-2 rounded-full", stageDot[stage])} />
                    <span className="tabular text-xs text-p-ink-3">{num(lang, 0)}</span>
                    <span className="text-[13px] font-semibold text-p-ink-2 [writing-mode:vertical-rl]">{dealStageLabel[stage][lang]}</span>
                  </section>
                );
              return (
                <section
                  key={stage}
                  data-column={stage}
                  className={cn(
                    "flex w-[78vw] max-w-72 shrink-0 flex-col self-start rounded-2xl border bg-p-surface-2 transition-colors sm:w-72",
                    over ? "border-p-brand bg-p-brand-soft/40" : "border-p-line",
                    stage === "lost" && "opacity-80",
                  )}
                >
                  <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                    <span className={cn("size-2 rounded-full", stageDot[stage])} />
                    <h2 className="flex-1 text-[13px] font-semibold">{dealStageLabel[stage][lang]}</h2>
                    <span className="tabular text-xs text-p-ink-3">{num(lang, list.length)}</span>
                  </header>
                  {sum ? <p className="tabular px-3 pb-2 text-[11px] text-p-ink-3">{compact(lang, sum)}</p> : null}
                  <ul className="thin-scroll grid max-h-[calc(100dvh-20rem)] min-h-24 content-start gap-2 overflow-y-auto px-2 pb-2">
                    {list.map((d) => (
                      <DealCard
                        key={d.id}
                        deal={d}
                        dragging={drag?.id === d.id}
                        onPointerDown={(e) => cardDown(e, d.id)}
                        onOpen={() => {
                          if (wasDrag()) return;
                          router.push(`/${lang}/staff/crm/${d.company_id}`);
                        }}
                        onMove={(s) => move(d.id, s)}
                        onLog={() => setLogFor(x.companyById.get(d.company_id) ?? null)}
                        value={dealValue(d)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <FollowUps deals={deals} onLog={(c) => setLogFor(c)} />
      )}

      {drag ? (
        <div className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-xl border border-p-brand bg-p-surface px-3 py-2 text-sm font-semibold shadow-[var(--p-shadow-lg)]" style={{ left: drag.x, top: drag.y, width: Math.min(drag.width, 260) }}>
          {(() => {
            const d = x.dealById.get(drag.id);
            const c = d ? x.companyById.get(d.company_id) : null;
            return c ? pick(lang, c.name_fa, c.name_en) : "";
          })()}
          {drag.over ? <span className="block text-xs font-medium text-p-brand">→ {dealStageLabel[drag.over][lang]}</span> : null}
        </div>
      ) : null}

      <LostSheet deal={lost} onClose={() => setLost(null)} />
      <ActivityForm open={Boolean(logFor)} onClose={() => setLogFor(null)} company={logFor} />
      <NewDeal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

const stageDot: Record<DealStage, string> = {
  lead: "bg-p-ink-3",
  contacted: "bg-p-info",
  qualified: "bg-p-info",
  proposal: "bg-p-violet",
  negotiation: "bg-p-gold",
  won: "bg-p-ok",
  lost: "bg-p-danger",
};

function DealCard({
  deal,
  dragging,
  onPointerDown,
  onOpen,
  onMove,
  onLog,
  value,
}: {
  value: number | null;
  deal: Deal;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLLIElement>) => void;
  onOpen: () => void;
  onMove: (stage: DealStage) => void;
  onLog: () => void;
}) {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const fa = lang === "fa";
  const company = x.companyById.get(deal.company_id);
  const booths = x.boothsByDeal.get(deal.id) ?? [];
  const owner = deal.owner_id ? x.staffById.get(deal.owner_id) : null;
  const balance = x.balanceByDeal.get(deal.id);
  const overdue = deal.next_follow_up_at && now > 0 && new Date(deal.next_follow_up_at).getTime() < now;
  const phone = company?.phone;
  return (
    <li
      onPointerDown={can.edit ? onPointerDown : undefined}
      onClick={onOpen}
      className={cn(
        "group grid cursor-pointer select-none gap-1.5 rounded-xl border border-p-line bg-p-surface p-2.5 shadow-[var(--p-shadow)] transition-[opacity,border] hover:border-p-line-strong",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1.5">
        {can.edit ? <GripVertical className="mt-0.5 size-4 shrink-0 text-p-ink-3 opacity-40 group-hover:opacity-100" aria-hidden /> : null}
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug">{company ? pick(lang, company.name_fa, company.name_en) : "—"}</p>
        {owner ? <StaffAvatar staff={owner} size={24} /> : null}
      </div>
      <p className="flex flex-wrap gap-x-2 text-[11px] text-p-ink-3">
        {booths.length ? <bdi dir="ltr">{booths.map((b) => b.code).join(", ")}</bdi> : deal.expected_area_m2 ? <span>~{num(lang, deal.expected_area_m2)} m²</span> : null}
        {value ? <span className="tabular">{compact(lang, value)}</span> : null}
        {balance && balance.balance > 0 ? <span className="tabular text-p-warn">{fa ? "مانده" : "owes"} {compact(lang, balance.balance)}</span> : null}
      </p>
      <div className="flex items-center gap-1.5 text-[11px]">
        {deal.next_follow_up_at ? (
          <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-p-danger" : "text-p-ink-2")}>
            <AlarmClock className="size-3" />
            {date(lang, deal.next_follow_up_at, "short")}
          </span>
        ) : deal.last_contact_at ? (
          <span className="text-p-ink-3">{relativeTime(lang, deal.last_contact_at)}</span>
        ) : null}
        <span className="flex-1" />
        {phone ? (
          <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} className="grid size-7 place-items-center rounded-lg text-p-ink-2 hover:bg-p-sunken" aria-label={fa ? "تماس" : "Call"}>
            <Phone className="size-3.5" />
          </a>
        ) : null}
        {can.edit ? (
          <>
            <button type="button" onClick={(e) => {
                e.stopPropagation();
                onLog();
              }} className="grid size-7 place-items-center rounded-lg text-p-ink-2 hover:bg-p-sunken" aria-label={fa ? "ثبت تماس" : "Log a call"}>
              <PhoneCall className="size-3.5" />
            </button>
            <select
              value={deal.stage}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onMove(e.target.value as DealStage)}
              aria-label={fa ? "تغییر مرحله" : "Change stage"}
              className="h-7 max-w-24 rounded-lg border border-p-line bg-p-surface px-1 text-[11px]"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {dealStageLabel[s][lang]}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>
    </li>
  );
}

function FollowUps({ deals, onLog }: { deals: Deal[]; onLog: (c: Company) => void }) {
  const { lang, store, can } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const fa = lang === "fa";
  const groups = useMemo(
    () => groupByDue(deals.filter((d) => d.stage !== "won" && d.stage !== "lost"), (d) => d.next_follow_up_at, new Date(now)),
    [deals, now],
  );
  const snooze = (d: Deal, days: number) => {
    const t = new Date();
    t.setDate(t.getDate() + days);
    store.update("deals", d.id, { next_follow_up_at: dayToIso(t.toISOString().slice(0, 10)) });
  };
  const total = groups.overdue.length + groups.today.length + groups.week.length;
  if (!total && !groups.later.length)
    return (
      <Card className="mx-auto max-w-3xl">
        <Empty icon={<AlarmClock className="size-6" />} title={fa ? "پیگیری عقب افتاده ای نیست" : "No follow-ups waiting"} hint={fa ? "تاریخ پیگیری را هنگام ثبت تماس بگذارید." : "Set a follow-up date when you log a call."} />
      </Card>
    );
  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      {DUE_GROUPS.filter((g) => g !== "none").map((g) => {
        const list = groups[g];
        if (!list.length) return null;
        return (
          <section key={g} className="grid gap-2">
            <h2 className={cn("text-[13px] font-semibold", g === "overdue" ? "text-p-danger" : "text-p-ink-2")}>
              {dueGroupLabel[g][lang]}{sep(lang)}{num(lang, list.length)}
            </h2>
            <Card className="divide-y divide-p-line p-0">
              {list.map((d) => {
                const c = x.companyById.get(d.company_id);
                return (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                    <Link href={`/${lang}/staff/crm/${d.company_id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c ? pick(lang, c.name_fa, c.name_en) : "—"}</span>
                      <span className="block truncate text-xs text-p-ink-3">
                        {dealStageLabel[d.stage][lang]}{sep(lang)}{d.next_follow_up_at ? date(lang, d.next_follow_up_at, "short") : ""}
                        {d.last_contact_at ? `${sep(lang)}${fa ? "آخرین تماس" : "last contact"} ${relativeTime(lang, d.last_contact_at)}` : ""}
                      </span>
                    </Link>
                    <div className="flex items-center gap-1.5">
                      {c?.phone ? (
                        <a href={`tel:${c.phone}`} className="grid size-9 place-items-center rounded-xl bg-p-brand text-p-brand-ink" aria-label={fa ? "تماس" : "Call"}>
                          <Phone className="size-4" />
                        </a>
                      ) : null}
                      {can.edit && c ? (
                        <>
                          <Button size="sm" icon={<PhoneCall className="size-3.5" />} onClick={() => onLog(c)}>
                            {fa ? "ثبت" : "Log"}
                          </Button>
                          <Select aria-label={fa ? "تعویق" : "Snooze"} value="" onChange={(e) => e.target.value && snooze(d, Number(e.target.value))} compact>
                            <option value="">{fa ? "بعداً…" : "Later…"}</option>
                            <option value="1">{fa ? "فردا" : "Tomorrow"}</option>
                            <option value="3">{fa ? "۳ روز" : "3 days"}</option>
                            <option value="7">{fa ? "هفته بعد" : "Next week"}</option>
                          </Select>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        );
      })}
    </div>
  );
}

function NewDeal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, store, toast, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [company, setCompany] = useState<Company | null>(null);
  const [stage, setStage] = useState<DealStage>("lead");
  const [newCompany, setNewCompany] = useState<string | null>(null);
  const existing = company ? x.deals.find((d) => d.company_id === company.id) : null;
  return (
    <Sheet
      open={open}
      onClose={() => {
        setNewCompany(null);
        onClose();
      }}
      closeLabel={fa ? "بستن" : "Close"}
      title={newCompany !== null ? (fa ? "شرکت جدید" : "New company") : fa ? "پرونده فروش جدید" : "New deal"}
      wide={newCompany !== null}
    >
      {newCompany !== null ? (
        <CompanyFormBody
          company={null}
          initialName={newCompany}
          onClose={() => setNewCompany(null)}
          onSaved={(c) => {
            setCompany(c);
            setNewCompany(null);
          }}
        />
      ) : (
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!company || !x.exhibition || existing) return;
            const res = await store.insert("deals", { id: newId(), exhibition_id: x.exhibition.id, company_id: company.id, stage, owner_id: user.id, source: "pipeline" });
            if (res.ok) {
              toast(fa ? "پرونده باز شد" : "Deal opened");
              setCompany(null);
              onClose();
            }
          }}
        >
          <Field label={fa ? "شرکت" : "Company"}>
            <PickerField
              value={company}
              items={x.companies}
              getKey={(c) => c.id}
              getLabel={(c) => pick(lang, c.name_fa, c.name_en)}
              getHint={(c) => (x.deals.some((d) => d.company_id === c.id) ? (fa ? "پرونده دارد" : "has a deal") : c.city)}
              onChange={setCompany}
              placeholder={fa ? "انتخاب شرکت یا نوشتن نام شرکت جدید" : "Choose a company or type a new name"}
              emptyText={fa ? "شرکتی پیدا نشد" : "No company found"}
              createLabel={(q) => (fa ? `+ ساخت شرکت جدید «${q}»` : `+ Create new company “${q}”`)}
              onCreate={(q) => setNewCompany(q)}
            />
          </Field>
          {company ? null : (
            <button type="button" onClick={() => setNewCompany("")} className="-mt-2 inline-flex items-center gap-1 justify-self-start text-sm font-medium text-p-brand hover:underline">
              <Plus className="size-4" />
              {fa ? "شرکت در فهرست نیست؟ ساخت شرکت جدید" : "Not in the list? Create a new company"}
            </button>
          )}
          {existing ? <p className="rounded-xl bg-p-warn-soft px-3 py-2 text-xs text-p-warn">{fa ? `این شرکت در مرحله «${dealStageLabel[existing.stage].fa}» پرونده دارد.` : `This company already has a deal (${dealStageLabel[existing.stage].en}).`}</p> : null}
          <Field label={fa ? "مرحله" : "Stage"}>
            <Select value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
              {STAGES.filter((s) => s !== "lost").map((s) => (
                <option key={s} value={s}>
                  {dealStageLabel[s][lang]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button tone="ghost" onClick={onClose}>
              {fa ? "انصراف" : "Cancel"}
            </Button>
            <Button tone="primary" type="submit" disabled={!company || Boolean(existing)}>
              {fa ? "باز کردن پرونده" : "Open deal"}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
