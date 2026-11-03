"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Circle,
  ListChecks,
  Map as MapIcon,
  PackageCheck,
  Phone,
  Plus,
  Square,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { countdownText } from "@/lib/portal/countdown";
import { area, compact, date, daysUntil, moneyCompact, num, percent, pick, relativeTime, sep } from "@/lib/portal/format";
import { boothStatusLabel, dealStageLabel } from "@/lib/portal/i18n";
import { dueFollowUps, summariseMoney, summariseSpace, type Phase } from "@/lib/portal/metrics";
import type { BoothStatus, DealStage } from "@/lib/portal/types";
import { useExhibition } from "./ExhibitionProvider";
import { StaffAvatar } from "./people";
import { useNow, usePortal } from "./PortalProvider";
import { Button, Card, Empty, Pill, Progress, SectionTitle, Skeleton } from "./ui";

const STATUSES: BoothStatus[] = ["paid", "contracted", "reserved", "held", "available", "blocked"];
const STAGES: DealStage[] = ["lead", "contacted", "qualified", "proposal", "negotiation", "won"];

const phases: Array<{ key: Phase; fa: string; en: string }> = [
  { key: "planning", fa: "فروش و برنامه ریزی", en: "Sales & planning" },
  { key: "build", fa: "غرفه سازی", en: "Build-up" },
  { key: "show", fa: "برگزاری", en: "Show days" },
  { key: "strike", fa: "جمع آوری", en: "Teardown" },
];

export function Overview() {
  const { lang, can } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const { exhibition, phase, ready } = x;
  const now = useNow();

  const data = useMemo(() => {
    const space = summariseSpace(x.booths);
    const money = summariseMoney(x.balanceByDeal.values());
    let toDeliver = 0;
    let toCollect = 0;
    let delivered = 0;
    let issues = 0;
    let pieces = 0;
    for (const s of x.equipmentByBooth.values()) {
      toDeliver += s.toDeliver;
      toCollect += s.toCollect;
      delivered += s.delivered;
      issues += s.issues;
      pieces += s.pieces;
    }
    const followUps = dueFollowUps(x.deals, new Date(now));
    const debtors = [...x.balanceByDeal.entries()]
      .filter(([, b]) => b.balance > 0)
      .map(([dealId, b]) => ({ deal: x.dealById.get(dealId)!, balance: b }))
      .filter((d) => d.deal)
      .sort((a, b) => b.balance.balance - a.balance.balance);
    const tasks = x.tasks
      .filter((t) => t.status !== "done" && t.status !== "cancelled")
      .sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));
    const overdueTasks = tasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now).length;
    const stageCounts = STAGES.map((s) => ({ stage: s, count: x.deals.filter((d) => d.stage === s).length }));
    const halls = x.halls.map((h) => {
      const hb = x.booths.filter((b) => b.hall_id === h.id);
      return { hall: h, space: summariseSpace(hb) };
    });
    return { space, money, toDeliver, toCollect, delivered, issues, pieces, followUps, debtors, tasks, overdueTasks, stageCounts, halls };
  }, [x.booths, x.balanceByDeal, x.equipmentByBooth, x.deals, x.dealById, x.tasks, x.halls, now]);

  if (!ready) return <OverviewSkeleton />;
  if (!exhibition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <Empty
            icon={<CalendarClock className="size-6" />}
            title={fa ? "هنوز نمایشگاهی ثبت نشده" : "No exhibitions yet"}
            hint={
              fa
                ? "از منوی نمایشگاه، یک نمایشگاه بسازید یا فایل اکسل را وارد کنید."
                : "Create an exhibition from the exhibition menu, or import the Excel workbook."
            }
          />
        </Card>
      </div>
    );
  }

  const currency = exhibition.currency;
  const equipmentMode = phase === "strike" || phase === "after" ? "collect" : "deliver";
  const equipmentDone = equipmentMode === "deliver" ? data.pieces - data.toDeliver : data.delivered - data.toCollect;
  const equipmentTotal = equipmentMode === "deliver" ? data.pieces : data.delivered;
  const phaseIndex = Math.max(0, phases.findIndex((p) => p.key === phase));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      {/* Heading */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-p-gold">{countdownText(lang, exhibition)}</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">{pick(lang, exhibition.name_fa, exhibition.name_en)}</h1>
          <p className="mt-1 text-sm text-p-ink-3">
            {[pick(lang, exhibition.venue_fa, exhibition.venue_en), exhibition.starts_on ? `${date(lang, exhibition.starts_on)} – ${date(lang, exhibition.ends_on)}` : null]
              .filter(Boolean)
              .join(sep(lang))}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`${base}/map`}>
            <Button tone="primary" icon={<MapIcon className="size-4" />}>
              {fa ? "باز کردن نقشه" : "Open the map"}
            </Button>
          </Link>
          <Link href={`${base}/handover`}>
            <Button icon={<PackageCheck className="size-4" />}>{fa ? "تحویل و جمع آوری" : "Handover"}</Button>
          </Link>
        </div>
      </div>

      {/* Phase timeline */}
      <Card className="px-4 py-3">
        <ol className="grid grid-cols-4 gap-2">
          {phases.map((p, i) => {
            const state = phase === "after" || i < phaseIndex ? "done" : i === phaseIndex ? "now" : "next";
            const dates = p.key === "build" ? exhibition.build_starts_on : p.key === "show" ? exhibition.starts_on : p.key === "strike" ? exhibition.ends_on : null;
            return (
              <li key={p.key} className="min-w-0">
                <div className={cn("h-1.5 rounded-full", state === "done" ? "bg-p-brand" : state === "now" ? "bg-p-gold" : "bg-p-sunken")} />
                <p className={cn("mt-2 truncate text-xs font-semibold sm:text-[13px]", state === "next" ? "text-p-ink-3" : "text-p-ink")}>{fa ? p.fa : p.en}</p>
                <p className="truncate text-[11px] text-p-ink-3">{dates ? date(lang, dates, "short") : state === "now" ? (fa ? "اکنون" : "Now") : ""}</p>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<Square className="size-4" />}
          label={fa ? "فضای فروخته شده" : "Space sold"}
          value={percent(lang, data.space.soldShare)}
          detail={`${num(lang, Math.round(data.space.areaSold))} / ${area(lang, Math.round(data.space.areaTotal))}`}
          progress={data.space.soldShare}
          tone="brand"
        />
        <Kpi
          icon={<Banknote className="size-4" />}
          label={fa ? "وصول شده" : "Collected"}
          value={moneyCompact(lang, data.money.paid, currency)}
          detail={`${fa ? "از" : "of"} ${moneyCompact(lang, data.money.invoiced, currency)} ${fa ? "فاکتور" : "invoiced"}`}
          progress={data.money.invoiced ? data.money.paid / data.money.invoiced : 0}
          tone="ok"
        />
        <Kpi
          icon={<AlertTriangle className="size-4" />}
          label={fa ? "مانده طلب" : "Outstanding"}
          value={moneyCompact(lang, Math.max(0, data.money.balance), currency)}
          detail={fa ? `${num(lang, data.money.debtors)} شرکت بدهکار` : `${data.money.debtors} companies owe`}
          tone="warn"
        />
        <Kpi
          icon={<PackageCheck className="size-4" />}
          label={equipmentMode === "deliver" ? (fa ? "تجهیزات تحویل شده" : "Equipment delivered") : fa ? "تجهیزات جمع شده" : "Equipment collected"}
          value={equipmentTotal ? percent(lang, equipmentDone / equipmentTotal) : "—"}
          detail={
            equipmentMode === "deliver"
              ? fa
                ? `${num(lang, data.toDeliver)} قلم مانده`
                : `${data.toDeliver} pieces to go`
              : fa
                ? `${num(lang, data.toCollect)} قلم در غرفه ها`
                : `${data.toCollect} pieces still out`
          }
          progress={equipmentTotal ? equipmentDone / equipmentTotal : 0}
          tone="info"
          alert={data.issues ? (fa ? `${num(lang, data.issues)} مشکل` : `${data.issues} issues`) : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Today */}
        <Card className="p-4 sm:p-5">
          <SectionTitle
            title={fa ? "کارهای امروز" : "Today"}
            hint={fa ? "پیگیری ها، طلب ها و کارهایی که منتظر شماست" : "Follow-ups, balances and tasks waiting on the team"}
          />
          <div className="mt-4 grid gap-5">
            <TodayGroup
              title={fa ? "پیگیری های امروز" : "Follow-ups due"}
              count={data.followUps.length}
              empty={fa ? "پیگیری عقب افتاده ای نیست" : "No follow-ups due"}
            >
              {data.followUps.slice(0, 6).map((d) => {
                const company = x.companyById.get(d.company_id);
                const overdue = d.next_follow_up_at ? daysUntil(d.next_follow_up_at) < 0 : false;
                const owner = d.owner_id ? x.staffById.get(d.owner_id) : null;
                return (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className={cn("size-2 shrink-0 rounded-full", overdue ? "bg-p-danger" : "bg-p-warn")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{company ? pick(lang, company.name_fa, company.name_en) : "—"}</p>
                      <p className="truncate text-xs text-p-ink-3">
                        {dealStageLabel[d.stage][lang]}{sep(lang)}{relativeTime(lang, d.next_follow_up_at!)}
                        {owner ? `${sep(lang)}${owner.display_name ?? owner.email}` : ""}
                      </p>
                    </div>
                    {company?.phone ? (
                      <a href={`tel:${company.phone}`} className="grid size-9 place-items-center rounded-xl bg-p-brand-soft text-p-brand" aria-label={fa ? "تماس" : "Call"}>
                        <Phone className="size-4" />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </TodayGroup>
            <TodayGroup title={fa ? "بیشترین مانده" : "Largest balances"} count={data.debtors.length} empty={fa ? "همه تسویه کرده اند" : "Everyone has paid"}>
              {data.debtors.slice(0, 5).map(({ deal, balance }) => {
                const company = x.companyById.get(deal.company_id);
                const booths = x.boothsByDeal.get(deal.id) ?? [];
                return (
                  <li key={deal.id}>
                    <Link
                      href={booths[0] ? `${base}/map?booth=${booths[0].id}` : `${base}/map`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-p-sunken"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{company ? pick(lang, company.name_fa, company.name_en) : "—"}</p>
                        <p className="truncate text-xs text-p-ink-3">
                          {booths.map((b) => b.code).join("، ") || (fa ? "بدون غرفه" : "No booth")}{sep(lang)}{fa ? "پرداخت" : "paid"}{" "}
                          {percent(lang, balance.invoiced ? balance.paid / balance.invoiced : 0)}
                        </p>
                      </div>
                      <span className="tabular text-sm font-semibold text-p-warn">{moneyCompact(lang, balance.balance, currency)}</span>
                    </Link>
                  </li>
                );
              })}
            </TodayGroup>
            <TodayGroup title={fa ? "کارهای باز تیم" : "Open team tasks"} count={data.tasks.length} empty={fa ? "کار بازی نیست" : "No open tasks"} badge={data.overdueTasks ? (fa ? `${num(lang, data.overdueTasks)} عقب افتاده` : `${data.overdueTasks} overdue`) : undefined}>
              {data.tasks.slice(0, 5).map((task) => {
                const assignee = task.assignee_id ? x.staffById.get(task.assignee_id) : null;
                const late = task.due_at ? new Date(task.due_at).getTime() < now : false;
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    {task.status === "in_progress" ? <CheckCircle2 className="size-4 shrink-0 text-p-info" /> : <Circle className="size-4 shrink-0 text-p-ink-3" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className={cn("truncate text-xs", late ? "text-p-danger" : "text-p-ink-3")}>
                        {assignee ? `${assignee.display_name ?? assignee.email}${sep(lang)}` : ""}
                        {task.due_at ? relativeTime(lang, task.due_at) : fa ? "بدون مهلت" : "No due date"}
                      </p>
                    </div>
                    {task.priority === "urgent" || task.priority === "high" ? (
                      <Pill tone={task.priority === "urgent" ? "danger" : "warn"}>{task.priority === "urgent" ? (fa ? "فوری" : "Urgent") : fa ? "مهم" : "High"}</Pill>
                    ) : null}
                    {assignee ? <StaffAvatar staff={assignee} size={26} /> : null}
                  </li>
                );
              })}
            </TodayGroup>
          </div>
        </Card>

        <div className="grid content-start gap-5">
          {/* Booths by status */}
          <Card className="p-4 sm:p-5">
            <SectionTitle
              title={fa ? "غرفه ها" : "Booths"}
              hint={fa ? `${num(lang, data.space.booths)} غرفه در ${num(lang, x.halls.length)} سالن` : `${data.space.booths} booths in ${x.halls.length} halls`}
              action={
                <Link href={`${base}/map`} className="inline-flex items-center gap-1 text-[13px] font-medium text-p-brand hover:underline">
                  {fa ? "نقشه" : "Map"}
                  <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                </Link>
              }
            />
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-p-sunken">
              {STATUSES.map((s) =>
                data.space.byStatus[s] ? (
                  <span key={s} data-tone={s} className="h-full" style={{ width: `${(data.space.byStatus[s] / Math.max(1, data.space.booths)) * 100}%`, background: "var(--tone-stroke)" }} />
                ) : null,
              )}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {STATUSES.map((s) => (
                <li key={s} data-tone={s} className="flex items-center gap-2 text-sm">
                  <span className="swatch" />
                  <span className="flex-1 text-p-ink-2">{boothStatusLabel[s][lang]}</span>
                  <span className="tabular font-semibold">{num(lang, data.space.byStatus[s] ?? 0)}</span>
                </li>
              ))}
            </ul>
            {data.halls.length ? (
              <div className="mt-5 grid gap-3 border-t border-p-line pt-4">
                {data.halls.map(({ hall, space }) => (
                  <Link key={hall.id} href={`${base}/map?hall=${hall.id}`} className="group grid gap-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium group-hover:text-p-brand">{pick(lang, hall.name_fa, hall.name_en)}</span>
                      <span className="tabular text-xs text-p-ink-3">
                        {percent(lang, space.soldShare)}{sep(lang)}{num(lang, space.booths)} {fa ? "غرفه" : "booths"}
                      </span>
                    </div>
                    <Progress value={space.soldShare} label={pick(lang, hall.name_fa, hall.name_en)} />
                  </Link>
                ))}
              </div>
            ) : can.edit ? (
              <div className="mt-4">
                <Link href={`${base}/map`}>
                  <Button icon={<Plus className="size-4" />}>{fa ? "ساخت اولین سالن" : "Add the first hall"}</Button>
                </Link>
              </div>
            ) : null}
          </Card>

          {/* Pipeline */}
          <Card className="p-4 sm:p-5">
            <SectionTitle title={fa ? "قیف فروش" : "Sales pipeline"} hint={fa ? `${num(lang, x.deals.length)} شرکت در جریان` : `${x.deals.length} companies in play`} />
            <ul className="mt-4 grid gap-2">
              {data.stageCounts.map(({ stage, count }) => {
                const max = Math.max(1, ...data.stageCounts.map((c) => c.count));
                return (
                  <li key={stage} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-[13px]">
                    <span className="truncate text-p-ink-2">{dealStageLabel[stage][lang]}</span>
                    <span className="h-2 rounded-full bg-p-sunken">
                      <span className={cn("block h-full rounded-full", stage === "won" ? "bg-p-ok" : "bg-p-info")} style={{ width: `${(count / max) * 100}%` }} />
                    </span>
                    <span className="tabular text-end font-semibold">{compact(lang, count)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-p-sunken px-3 py-2 text-xs text-p-ink-3">
              <ListChecks className="size-4 shrink-0" />
              {fa ? "صفحه کامل فروش و پیگیری در مرحله بعد اضافه می شود." : "The full sales pipeline screen comes in the next step."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  detail,
  progress,
  tone,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  tone: "brand" | "ok" | "warn" | "info";
  alert?: string;
}) {
  const iconTone = { brand: "bg-p-brand-soft text-p-brand", ok: "bg-p-ok-soft text-p-ok", warn: "bg-p-warn-soft text-p-warn", info: "bg-p-info-soft text-p-info" }[tone];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-p-ink-2">{label}</span>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", iconTone)}>{icon}</span>
      </div>
      <div>
        <p className="tabular text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
        <p className="mt-0.5 truncate text-xs text-p-ink-3">{detail}</p>
      </div>
      {progress !== undefined ? <Progress value={progress} tone={tone === "warn" ? "warn" : tone} /> : null}
      {alert ? <Pill tone="danger" className="self-start">{alert}</Pill> : null}
    </Card>
  );
}

function TodayGroup({ title, count, empty, badge, children }: { title: string; count: number; empty: string; badge?: string; children: React.ReactNode }) {
  const { lang } = usePortal();
  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className="text-[13px] font-semibold text-p-ink-2">{title}</h3>
        <span className="tabular rounded-full bg-p-sunken px-2 text-xs font-semibold text-p-ink-2">{num(lang, count)}</span>
        {badge ? <Pill tone="danger">{badge}</Pill> : null}
      </div>
      {count === 0 ? <p className="py-3 text-sm text-p-ink-3">{empty}</p> : <ul className="mt-1 divide-y divide-p-line">{children}</ul>}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-14" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
