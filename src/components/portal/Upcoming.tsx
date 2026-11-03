"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CalendarPlus,
  Flag,
  Globe2,
  ListTodo,
  PackageCheck,
  PackageOpen,
  Phone,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { agendaIcs, buildAgenda, collapseHandovers, filterAgenda, groupByDay, seasonBars, type AgendaItem, type AgendaKind } from "@/lib/portal/agenda";
import { countdownText } from "@/lib/portal/countdown";
import { date, moneyCompact, num, pick, time, weekdayDate } from "@/lib/portal/format";
import { invoiceTotals } from "@/lib/portal/money";
import type { Company, Deal, EquipmentOrder, Exhibition, InventoryItem, Invoice, InvoiceLine, Payment, StaffMember, Task } from "@/lib/portal/types";
import { StaffAvatar } from "./people";
import { useCollection, useNow, usePersistentState, usePortal } from "./PortalProvider";
import { Card, Empty, Pill, Segmented, Skeleton, Textarea } from "./ui";

type Range = "7" | "30" | "90";
type Who = "mine" | "all";

const KINDS: AgendaKind[] = ["milestone", "task", "follow_up", "delivery", "pickup", "invoice"];

const kindCopy: Record<AgendaKind, { fa: string; en: string; icon: ReactNode; tone: string }> = {
  milestone: { fa: "رویداد", en: "Milestone", icon: <Flag className="size-4" />, tone: "text-p-gold bg-p-gold-soft" },
  task: { fa: "کار", en: "Task", icon: <ListTodo className="size-4" />, tone: "text-p-brand bg-p-brand-soft" },
  follow_up: { fa: "پیگیری", en: "Follow-up", icon: <Phone className="size-4" />, tone: "text-p-info bg-p-info-soft" },
  delivery: { fa: "تحویل", en: "Delivery", icon: <PackageOpen className="size-4" />, tone: "text-p-violet bg-p-violet-soft" },
  pickup: { fa: "جمع آوری", en: "Pickup", icon: <PackageCheck className="size-4" />, tone: "text-p-ok bg-p-ok-soft" },
  invoice: { fa: "سررسید", en: "Invoice due", icon: <Banknote className="size-4" />, tone: "text-p-warn bg-p-warn-soft" },
};

const milestoneCopy = {
  build: { fa: "شروع غرفه سازی", en: "Build-up starts" },
  opening: { fa: "افتتاح نمایشگاه", en: "Opening day" },
  closing: { fa: "آخرین روز نمایشگاه", en: "Last show day" },
  strike: { fa: "پایان تخلیه سالن", en: "Hall cleared" },
};

function byId<T extends { id: string }>(rows: readonly T[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

export function Upcoming() {
  const { lang, user, can, store, toast } = usePortal();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const now = useNow();

  const ex = useCollection("exhibitions");
  const tasks = useCollection("tasks");
  const deals = useCollection("deals");
  const invoices = useCollection("invoices");
  const lines = useCollection("invoice_lines", null, can.finance);
  const payments = useCollection("payments", null, can.finance);
  const orders = useCollection("equipment_orders");
  const companies = useCollection("companies");
  const staff = useCollection("staff_members");
  const items = useCollection("inventory_items");

  const [range, setRange] = usePersistentState<Range>("aratta.upcoming.range", "30");
  const [who, setWho] = usePersistentState<Who>("aratta.upcoming.who", "all");
  const [exhibitionId, setExhibitionId] = useState<string>("");
  const [kinds, setKinds] = useState<Set<AgendaKind>>(new Set());
  const [allOverdue, setAllOverdue] = useState(false);

  const ready = ex.status !== "loading" && tasks.status !== "loading" && deals.status !== "loading";

  const maps = useMemo(
    () => ({
      exhibition: byId(ex.rows as Exhibition[]),
      task: byId(tasks.rows as Task[]),
      deal: byId(deals.rows as Deal[]),
      company: byId(companies.rows as Company[]),
      staff: byId(staff.rows as StaffMember[]),
      item: byId(items.rows as InventoryItem[]),
      invoice: byId(invoices.rows as Invoice[]),
    }),
    [ex.rows, tasks.rows, deals.rows, companies.rows, staff.rows, items.rows, invoices.rows],
  );

  const exRows = ex.rows as Exhibition[];
  const taskRows = tasks.rows as Task[];
  const dealRows = deals.rows as Deal[];
  const invoiceRows = invoices.rows as Invoice[];
  const lineRows = lines.rows as InvoiceLine[];
  const paymentRows = payments.rows as Payment[];
  const orderRows = orders.rows as EquipmentOrder[];
  const finance = can.finance;
  const agenda = useMemo(() => {
    const balance = new Map<string, number>();
    if (finance) {
      for (const [id, t] of invoiceTotals(invoiceRows, lineRows, paymentRows)) balance.set(id, t.balance);
    }
    return buildAgenda(
      {
        exhibitions: exRows,
        tasks: taskRows,
        deals: dealRows,
        invoices: finance ? invoiceRows : [],
        invoiceBalance: balance,
        orders: orderRows,
      },
      new Date(now),
    );
  }, [exRows, taskRows, dealRows, invoiceRows, lineRows, paymentRows, orderRows, finance, now]);

  const visible = useMemo(
    () =>
      collapseHandovers(filterAgenda(
        agenda,
        { days: Number(range), kinds, ownerId: who === "mine" ? user.id : null, exhibitionId: exhibitionId || null },
        new Date(now),
      )),
    [agenda, range, kinds, who, user.id, exhibitionId, now],
  );
  const overdue = visible.filter((i) => i.overdue);
  const days = groupByDay(visible);
  const counts = useMemo(() => {
    const c = new Map<AgendaKind, number>();
    for (const i of collapseHandovers(filterAgenda(agenda, { days: Number(range), ownerId: who === "mine" ? user.id : null, exhibitionId: exhibitionId || null }, new Date(now)))) {
      c.set(i.kind, (c.get(i.kind) ?? 0) + 1);
    }
    return c;
  }, [agenda, range, who, user.id, exhibitionId, now]);

  const season = useMemo(() => seasonBars(ex.rows as Exhibition[], new Date(now), 6), [ex.rows, now]);
  const upcomingShows = useMemo(
    () =>
      (ex.rows as Exhibition[])
        .filter((e) => e.status !== "archived" && e.status !== "closed")
        .sort((a, b) => (a.starts_on ?? "9999").localeCompare(b.starts_on ?? "9999")),
    [ex.rows],
  );

  function describe(i: AgendaItem): { title: string; sub: string; href: string } {
    const e = i.exhibitionId ? maps.exhibition.get(i.exhibitionId) : undefined;
    const exName = e ? pick(lang, e.name_fa, e.name_en) : "";
    const companyName = (id?: string) => {
      const c = id ? maps.company.get(id) : undefined;
      return c ? pick(lang, c.name_fa, c.name_en) : "";
    };
    switch (i.kind) {
      case "milestone":
        return { title: `${milestoneCopy[i.ref.milestone!][lang]}`, sub: exName, href: base };
      case "task": {
        const t = maps.task.get(i.ref.taskId!);
        return { title: t?.title ?? "", sub: exName, href: `${base}/tasks/${i.ref.taskId}` };
      }
      case "follow_up":
        return { title: `${fa ? "پیگیری" : "Follow up"} ${companyName(i.ref.companyId)}`, sub: exName, href: `${base}/crm/${i.ref.companyId}` };
      case "invoice": {
        const inv = maps.invoice.get(i.ref.invoiceId!);
        const left = moneyCompact(lang, i.ref.balance ?? 0, inv?.currency ?? "IRR");
        return {
          title: `${companyName(i.ref.companyId)} · ${fa ? "مانده" : "balance"} ${left}`,
          sub: `${inv?.number ? `#${inv.number} · ` : ""}${exName}`,
          href: `${base}/accounting/invoices/${i.ref.invoiceId}`,
        };
      }
      case "delivery":
      case "pickup": {
        const booths = i.ref.booths ?? 0;
        const pieces = num(lang, i.ref.quantity ?? 0);
        if (booths > 1 || (i.ref.lines ?? 1) > 1) {
          const verb = i.kind === "delivery" ? (fa ? "تحویل به" : "Deliver to") : fa ? "جمع آوری از" : "Collect from";
          return {
            title: fa ? `${verb} ${num(lang, booths)} غرفه · ${pieces} قلم` : `${verb} ${booths} booth${booths === 1 ? "" : "s"} · ${pieces} pieces`,
            sub: exName,
            href: `${base}/handover`,
          };
        }
        const item = i.ref.itemId ? maps.item.get(i.ref.itemId) : undefined;
        const name = item ? pick(lang, item.name_fa, item.name_en) : "";
        return { title: `${pieces} × ${name}`, sub: exName, href: `${base}/handover` };
      }
    }
  }

  function exportIcs() {
    const origin = window.location.origin;
    const rows = visible
      .filter((i) => !i.overdue)
      .map((i) => {
        const d = describe(i);
        return { id: i.id, at: i.at, title: `${kindCopy[i.kind][lang]}: ${d.title}`, url: origin + d.href };
      });
    const blob = new Blob([agendaIcs(rows)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aratta-upcoming.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function setListing(e: Exhibition, patch: Partial<Pick<Exhibition, "website_listed" | "registration_open" | "website_summary_fa" | "website_summary_en">>) {
    const res = await store.update("exhibitions", e.id, patch);
    if (res.ok) toast(fa ? "ذخیره شد؛ سایت تا ده دقیقه دیگر به روز می شود" : "Saved; the website updates within ten minutes");
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-56" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const today = new Date(now);
  const dayLabel = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const day = new Date(y, m - 1, d);
    const diff = Math.round((day.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
    if (diff === 0) return fa ? "امروز" : "Today";
    if (diff === 1) return fa ? "فردا" : "Tomorrow";
    return weekdayDate(lang, day);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{fa ? "کارهای پیش رو" : "Upcoming work"}</h1>
          <p className="mt-1 text-sm text-p-ink-3">
            {fa
              ? "همه تاریخ ها در یک جا: رویدادهای هر نمایشگاه، کارها، پیگیری ها، تحویل و جمع آوری و سررسید فاکتورها."
              : "Every date in one place: show milestones, tasks, follow-ups, handovers and invoices due, across all exhibitions."}
          </p>
        </div>
        <button
          type="button"
          onClick={exportIcs}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3 text-[13px] font-medium hover:border-p-line-strong"
        >
          <CalendarPlus className="size-4" />
          {fa ? "افزودن به تقویم گوشی" : "Add to my calendar"}
        </button>
      </div>

      {/* Season: where every exhibition's build, show and strike fall in the next six months. */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarDays className="size-4 text-p-ink-3" />
            {fa ? "فصل پیش رو" : "The season ahead"}
          </h2>
          <span className="flex items-center gap-3 text-[11px] text-p-ink-3">
            <Legend className="bg-p-ink-3/35" label={fa ? "غرفه سازی" : "Build-up"} />
            <Legend className="bg-p-brand" label={fa ? "برگزاری" : "Show"} />
            <Legend className="bg-p-gold/60" label={fa ? "تخلیه" : "Strike"} />
          </span>
        </div>
        <SeasonMonths from={season.from} to={season.to} lang={lang} />
        <div className="mt-1 grid gap-2">
          {season.bars.length ? (
            season.bars.map((bar) => {
              const e = maps.exhibition.get(bar.exhibitionId)!;
              return (
                <div key={bar.exhibitionId} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                    <span className="truncate">{pick(lang, e.name_fa, e.name_en)}</span>
                  </span>
                  <span className="relative h-6 rounded-lg bg-p-sunken">
                    <Segment span={bar.build} className="bg-p-ink-3/35" />
                    <Segment span={bar.show} className="bg-p-brand" style={{ background: e.color }} />
                    <Segment span={bar.strike} className="bg-p-gold/60" />
                  </span>
                </div>
              );
            })
          ) : (
            <p className="py-3 text-sm text-p-ink-3">{fa ? "در شش ماه آینده نمایشگاه تاریخ داری نیست." : "No dated exhibitions in the next six months."}</p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-4">
          <Card className="grid gap-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: "7", label: fa ? "۷ روز" : "7 days" },
                  { value: "30", label: fa ? "۳۰ روز" : "30 days" },
                  { value: "90", label: fa ? "۹۰ روز" : "90 days" },
                ]}
              />
              <Segmented
                size="sm"
                value={who}
                onChange={setWho}
                options={[
                  { value: "all", label: fa ? "همه تیم" : "Whole team" },
                  { value: "mine", label: fa ? "فقط من" : "Just me" },
                ]}
              />
              <select
                value={exhibitionId}
                onChange={(e) => setExhibitionId(e.target.value)}
                aria-label={fa ? "نمایشگاه" : "Exhibition"}
                className="h-8 min-w-0 max-w-full rounded-lg border border-p-line bg-p-surface px-2 text-[13px]"
              >
                <option value="">{fa ? "همه نمایشگاه ها" : "All exhibitions"}</option>
                {upcomingShows.map((e) => (
                  <option key={e.id} value={e.id}>
                    {pick(lang, e.name_fa, e.name_en)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={fa ? "نوع کار" : "Kind of work"}>
              {KINDS.filter((k) => k !== "invoice" || can.finance).map((k) => {
                const on = kinds.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setKinds((s) => {
                        const n = new Set(s);
                        if (n.has(k)) n.delete(k);
                        else n.add(k);
                        return n;
                      })
                    }
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                      on ? "border-p-brand bg-p-brand-soft text-p-brand" : "border-p-line text-p-ink-2 hover:border-p-line-strong",
                    )}
                  >
                    {kindCopy[k].icon}
                    {kindCopy[k][lang]}
                    <span className="tabular-nums text-p-ink-3">{num(lang, counts.get(k) ?? 0)}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {overdue.length ? (
            <Card className="border-p-danger/40 p-0">
              <h2 className="flex items-center gap-2 border-b border-p-line px-4 py-3 text-[15px] font-semibold text-p-danger">
                <AlertTriangle className="size-4" />
                {fa ? `عقب افتاده (${num(lang, overdue.length)})` : `Overdue (${overdue.length})`}
                <span className="ms-auto hidden flex-wrap justify-end gap-1 sm:flex">
                  {KINDS.map((k) => {
                    const n = overdue.filter((i) => i.kind === k).length;
                    return n ? (
                      <Pill key={k} className="font-normal">
                        {kindCopy[k][lang]} {num(lang, n)}
                      </Pill>
                    ) : null;
                  })}
                </span>
              </h2>
              <ul className="divide-y divide-p-line">
                {(allOverdue ? overdue : overdue.slice(0, 5)).map((i) => (
                  <AgendaRow key={i.id} item={i} d={describe(i)} lang={lang} staff={i.ownerId ? maps.staff.get(i.ownerId) : undefined} exhibition={i.exhibitionId ? maps.exhibition.get(i.exhibitionId) : undefined} showDay />
                ))}
              </ul>
              {overdue.length > 5 ? (
                <button type="button" onClick={() => setAllOverdue((v) => !v)} className="w-full border-t border-p-line px-4 py-2.5 text-start text-[13px] font-medium text-p-brand hover:bg-p-sunken/60">
                  {allOverdue ? (fa ? "نمایش کمتر" : "Show fewer") : fa ? `نمایش همه (${num(lang, overdue.length - 5)} مورد دیگر)` : `Show all (${overdue.length - 5} more)`}
                </button>
              ) : null}
            </Card>
          ) : null}

          {days.length ? (
            days.map((day) => (
              <Card key={day.key} className="p-0">
                <h2 className="flex items-center justify-between gap-2 border-b border-p-line px-4 py-2.5 text-[13px] font-semibold">
                  <span>{dayLabel(day.key)}</span>
                  <span className="text-p-ink-3">{num(lang, day.items.length)}</span>
                </h2>
                <ul className="divide-y divide-p-line">
                  {day.items.map((i) => (
                    <AgendaRow key={i.id} item={i} d={describe(i)} lang={lang} staff={i.ownerId ? maps.staff.get(i.ownerId) : undefined} exhibition={i.exhibitionId ? maps.exhibition.get(i.exhibitionId) : undefined} />
                  ))}
                </ul>
              </Card>
            ))
          ) : (
            <Card>
              <Empty
                icon={<CalendarDays className="size-5" />}
                title={fa ? "چیزی در این بازه نیست" : "Nothing in this window"}
                hint={fa ? "بازه را بلندتر کنید یا فیلترها را بردارید." : "Widen the window or clear the filters."}
              />
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Globe2 className="size-4 text-p-ink-3" />
              {fa ? "روی سایت" : "On the website"}
            </h2>
            <p className="mt-1 text-[13px] text-p-ink-3">
              {fa
                ? "نمایشگاه هایی که اینجا روشن کنید در تقویم صفحه اول سایت با تاریخ واقعی نشان داده می شوند."
                : "Exhibitions you switch on here appear in the website's calendar with their real dates."}
            </p>
            <ul className="mt-3 grid gap-3">
              {upcomingShows.map((e) => (
                <ListingCard key={e.id} e={e} lang={lang} editable={can.manage} onChange={(patch) => setListing(e, patch)} />
              ))}
              {!upcomingShows.length ? <li className="text-sm text-p-ink-3">{fa ? "نمایشگاه فعالی نیست." : "No active exhibitions."}</li> : null}
            </ul>
            {!can.manage ? (
              <p className="mt-3 text-xs text-p-ink-3">{fa ? "فقط مدیران می توانند این ها را تغییر دهند." : "Only managers can change these."}</p>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AgendaRow({
  item,
  d,
  lang,
  staff,
  exhibition,
  showDay,
}: {
  item: AgendaItem;
  d: { title: string; sub: string; href: string };
  lang: "fa" | "en";
  staff?: StaffMember;
  exhibition?: Exhibition;
  showDay?: boolean;
}) {
  const k = kindCopy[item.kind];
  const dayOnly = item.kind === "milestone" || item.kind === "invoice";
  return (
    <li>
      <Link href={d.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-p-sunken/60">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", k.tone)}>{k.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{d.title || "-"}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-p-ink-3">
            {exhibition ? <span className="size-2 shrink-0 rounded-full" style={{ background: exhibition.color }} /> : null}
            <span className="truncate">
              {k[lang]}
              {d.sub ? ` · ${d.sub}` : ""}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-end text-xs tabular-nums text-p-ink-3">
          {showDay ? date(lang, item.at, "short") : dayOnly ? "" : time(lang, item.at)}
          {showDay && !dayOnly ? <span className="block">{time(lang, item.at)}</span> : null}
        </span>
        {staff ? <StaffAvatar staff={staff} size={26} /> : <span className="size-[26px] shrink-0" />}
      </Link>
    </li>
  );
}

function ListingCard({
  e,
  lang,
  editable,
  onChange,
}: {
  e: Exhibition;
  lang: "fa" | "en";
  editable: boolean;
  onChange: (patch: Partial<Pick<Exhibition, "website_listed" | "registration_open" | "website_summary_fa" | "website_summary_en">>) => void;
}) {
  const fa = lang === "fa";
  const [summary, setSummary] = useState((fa ? e.website_summary_fa : e.website_summary_en) ?? "");
  const listed = Boolean(e.website_listed);
  const countdown = countdownText(lang, e);
  return (
    <li className="rounded-xl border border-p-line p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{pick(lang, e.name_fa, e.name_en)}</p>
          <p className="text-xs text-p-ink-3">
            {e.starts_on ? date(lang, e.starts_on) : fa ? "بدون تاریخ" : "No dates"}
            {countdown ? ` · ${countdown}` : ""}
          </p>
        </div>
        {listed ? <Pill tone="ok">{fa ? "روی سایت" : "Live"}</Pill> : <Pill>{fa ? "پنهان" : "Hidden"}</Pill>}
      </div>
      <div className="mt-3 grid gap-2">
        <Toggle label={fa ? "نمایش در سایت" : "Show on website"} on={listed} disabled={!editable} onChange={(v) => onChange({ website_listed: v })} />
        <Toggle
          label={fa ? "پذیرش درخواست غرفه" : "Booth inquiries open"}
          on={Boolean(e.registration_open)}
          disabled={!editable || !listed}
          onChange={(v) => onChange({ registration_open: v })}
        />
        {listed && editable ? (
          <Textarea
            rows={2}
            value={summary}
            placeholder={fa ? "یک جمله معرفی برای سایت (اختیاری)" : "One-line intro for the website (optional)"}
            onChange={(ev) => setSummary(ev.target.value)}
            onBlur={() => {
              const value = summary.trim() || null;
              const current = (fa ? e.website_summary_fa : e.website_summary_en) ?? null;
              if (value !== current) onChange(fa ? { website_summary_fa: value } : { website_summary_en: value });
            }}
            className="text-[13px]"
          />
        ) : null}
        {listed && !e.starts_on ? (
          <p className="text-xs text-p-warn">{fa ? "تاریخ ندارد؛ در سایت «به زودی اعلام می شود» نمایش داده می شود." : "No dates yet; the website shows it as “dates to be announced”."}</p>
        ) : null}
      </div>
    </li>
  );
}

function Toggle({ label, on, disabled, onChange }: { label: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cn("flex items-center justify-between gap-3 text-[13px]", disabled && "opacity-50")}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-p-brand" : "bg-p-line-strong")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "start-[1.125rem]" : "start-0.5")} />
      </button>
    </label>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-2 w-3 rounded-sm", className)} />
      {label}
    </span>
  );
}

function Segment({ span, className, style }: { span: [number, number] | null; className: string; style?: React.CSSProperties }) {
  if (!span) return null;
  const [a, b] = span;
  return <span className={cn("absolute inset-y-1 rounded-md", className)} style={{ insetInlineStart: `${a}%`, width: `${Math.max(b - a, 1.2)}%`, ...style }} />;
}

function SeasonMonths({ from, to, lang }: { from: number; to: number; lang: "fa" | "en" }) {
  const marks: Array<{ at: number; label: string }> = [];
  const fmt = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { month: "short" });
  const d = new Date(from);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() < to) {
    marks.push({ at: ((d.getTime() - from) / (to - from)) * 100, label: fmt.format(d) });
    d.setMonth(d.getMonth() + 1);
  }
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,9rem)_1fr] gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
      <span className="text-[11px] text-p-ink-3">{lang === "fa" ? "امروز" : "Today"}</span>
      <span className="relative h-4">
        {marks.map((m) => (
          <span key={m.at} className="absolute top-0 -translate-x-1/2 text-[11px] text-p-ink-3 rtl:translate-x-1/2" style={{ insetInlineStart: `${m.at}%` }}>
            {m.label}
          </span>
        ))}
      </span>
    </div>
  );
}
