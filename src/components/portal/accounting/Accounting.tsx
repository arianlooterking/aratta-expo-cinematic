"use client";

import { Ban, Download, FileText, Lock, Phone, Plus, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ageing, AGE_BUCKETS, bucketOf, daysOverdue, dueDate, toCsv } from "@/lib/portal/finance";
import { compact, currencyName, date, money, num, percent, pick, sep } from "@/lib/portal/format";
import { ageBucketLabel, invoiceKindLabel, invoiceStatusLabel, paymentMethodLabel } from "@/lib/portal/labels";
import type { Company, Invoice, Payment } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { normalizeSearch } from "../SearchPalette";
import { usePageTour } from "../Tour";
import { Button, Card, Empty, Pill, Progress, Segmented, Select, Skeleton } from "../ui";
import { downloadText, PageHeader } from "../crm/shared";
import { PaymentForm, VoidPayment } from "./PaymentForm";
import { AGE_COLOR, AgeingBar, InvoiceStatusPill, invoiceTitle, useInvoiceMoney } from "./shared";

type Tab = "receivables" | "invoices" | "payments";
const TABS: Tab[] = ["receivables", "invoices", "payments"];

export function Accounting() {
  usePageTour("accounting");
  const { lang, can } = usePortal();
  const x = useExhibition();
  const router = useRouter();
  const params = useSearchParams();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const tab: Tab = TABS.includes(params.get("tab") as Tab) ? (params.get("tab") as Tab) : "receivables";
  const [paying, setPaying] = useState<{ company?: Company | null; invoice?: Invoice | null } | null>(null);

  if (!can.finance) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <Empty
            icon={<Lock className="size-6" />}
            title={fa ? "حسابداری فقط برای تیم مالی و مدیران است" : "Accounting is for the finance team and managers"}
            hint={fa ? "اگر به این بخش نیاز دارید از مدیر سیستم بخواهید دسترسی مالی بدهد." : "Ask an admin for finance access if you need it."}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        eyebrow={x.exhibition ? pick(lang, x.exhibition.name_fa, x.exhibition.name_en) : null}
        title={fa ? "حسابداری" : "Accounting"}
        hint={fa ? `همه مبالغ به ${currencyName(lang, x.exhibition?.currency ?? "IRR")}، با ارزش افزوده` : `All amounts in ${currencyName(lang, x.exhibition?.currency ?? "IRR")}, including VAT`}
        actions={
          <>
            <Button icon={<Wallet className="size-4" />} onClick={() => setPaying({})}>
              {fa ? "ثبت دریافتی" : "Record payment"}
            </Button>
            <Link
              href={`${base}/accounting/invoices/new`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-p-brand px-3.5 text-sm font-medium text-p-brand-ink shadow-[var(--p-shadow)] hover:brightness-110"
            >
              <Plus className="size-4" />
              {fa ? "فاکتور جدید" : "New invoice"}
            </Link>
          </>
        }
      />

      <Kpis />

      <div className="scroll-fade thin-scroll -mx-1 overflow-x-auto px-1" data-tour="acc-tabs">
        <Segmented
          value={tab}
          onChange={(v) => router.replace(`${base}/accounting?tab=${v}`, { scroll: false })}
          options={[
            { value: "receivables", label: fa ? "مطالبات" : "Receivables" },
            { value: "invoices", label: fa ? "فاکتورها" : "Invoices" },
            { value: "payments", label: fa ? "دریافتی ها" : "Payments" },
          ]}
        />
      </div>

      {!x.ready ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : tab === "receivables" ? (
        <Receivables onPay={(company) => setPaying({ company })} />
      ) : tab === "invoices" ? (
        <Invoices />
      ) : (
        <Payments />
      )}

      <PaymentForm open={Boolean(paying)} onClose={() => setPaying(null)} company={paying?.company} invoice={paying?.invoice} />
    </div>
  );
}

/* ---------------------------------------------------------------- KPIs */

function Kpis() {
  const { lang } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const fa = lang === "fa";
  const currency = x.exhibition?.currency ?? "IRR";
  const k = useMemo(() => {
    const live = x.invoices.filter((i) => i.status === "issued" || i.status === "registered");
    const invoiced = live.reduce((s, i) => s + (x.invoiceTotalsById.get(i.id)?.total ?? 0), 0);
    const outstanding = live.reduce((s, i) => s + Math.max(0, x.invoiceTotalsById.get(i.id)?.balance ?? 0), 0);
    const valid = x.payments.filter((p) => !p.voided_at);
    const received = valid.reduce((s, p) => s + p.amount, 0);
    const onAccount = valid.filter((p) => !p.invoice_id).reduce((s, p) => s + p.amount, 0);
    const drafts = x.invoices.filter((i) => i.status === "draft");
    const draftTotal = drafts.reduce((s, i) => s + (x.invoiceTotalsById.get(i.id)?.total ?? 0), 0);
    const { buckets } = ageing(x.invoices, x.invoiceTotalsById, new Date(now));
    const overdue = AGE_BUCKETS.filter((b) => b !== "current").reduce((s, b) => s + buckets[b], 0);
    const overdueCount = live.filter((i) => (x.invoiceTotalsById.get(i.id)?.balance ?? 0) > 0 && daysOverdue(i, new Date(now)) > 0).length;
    return { invoiced, outstanding, received, onAccount, drafts: drafts.length, draftTotal, overdue, overdueCount };
  }, [x.invoices, x.invoiceTotalsById, x.payments, now]);

  const tiles = [
    {
      label: fa ? "فاکتور شده" : "Invoiced",
      value: k.invoiced,
      hint: k.drafts ? (fa ? `+ ${num(lang, k.drafts)} پیش نویس (${compact(lang, k.draftTotal)})` : `+ ${k.drafts} drafts (${compact(lang, k.draftTotal)})`) : fa ? "صادر و ثبت شده" : "Issued and filed",
    },
    {
      label: fa ? "دریافت شده" : "Received",
      value: k.received,
      hint: k.invoiced ? (fa ? `${percent(lang, k.received / k.invoiced)} وصول` : `${percent(lang, k.received / k.invoiced)} collected`) : "—",
      progress: k.invoiced ? Math.min(1, k.received / k.invoiced) : 0,
      tone: "text-p-ok",
    },
    {
      label: fa ? "مانده مطالبات" : "Outstanding",
      value: k.outstanding,
      hint: k.onAccount ? (fa ? `${compact(lang, k.onAccount)} علی الحساب بدون فاکتور` : `${compact(lang, k.onAccount)} on account, no invoice`) : fa ? "روی فاکتورهای صادر شده" : "On issued invoices",
      tone: k.outstanding ? "text-p-warn" : undefined,
    },
    {
      label: fa ? "سررسید گذشته" : "Overdue",
      value: k.overdue,
      hint: fa ? `${num(lang, k.overdueCount)} فاکتور` : `${k.overdueCount} invoices`,
      tone: k.overdue ? "text-p-danger" : undefined,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" data-tour="acc-kpis">
      {tiles.map((t) => (
        <Card key={t.label} className="grid min-w-0 content-start gap-1 p-3 sm:p-4">
          <span className="text-xs font-medium text-p-ink-3">{t.label}</span>
          <span className={cn("truncate text-xl font-bold leading-tight sm:text-2xl", t.tone)} title={money(lang, t.value, currency)}>
            {compact(lang, t.value)}
          </span>
          {t.progress != null ? <Progress value={t.progress} tone="ok" className="my-0.5" label={t.hint} /> : null}
          <span className="truncate text-[11px] text-p-ink-3 sm:text-xs" title={t.hint}>
            {t.hint}
          </span>
        </Card>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- Receivables */

function Receivables({ onPay }: { onPay: (company: Company) => void }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const contacts = useCollection("contacts");
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const currency = x.exhibition?.currency ?? "IRR";
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { buckets, rows } = useMemo(() => {
    const { buckets, byCompany } = ageing(x.invoices, x.invoiceTotalsById, new Date(now));
    const credit = new Map<string, number>();
    const lastPaid = new Map<string, string>();
    for (const p of x.payments) {
      if (p.voided_at) continue;
      if (!p.invoice_id) credit.set(p.company_id, (credit.get(p.company_id) ?? 0) + p.amount);
      if ((lastPaid.get(p.company_id) ?? "") < p.paid_on) lastPaid.set(p.company_id, p.paid_on);
    }
    const phone = new Map<string, string>();
    for (const c of contacts.rows) if (c.phone && (c.is_primary || !phone.has(c.company_id))) phone.set(c.company_id, c.phone);
    const rows = [...byCompany.entries()]
      .map(([companyId, r]) => ({
        company: x.companyById.get(companyId) ?? null,
        ...r,
        credit: credit.get(companyId) ?? 0,
        lastPaid: lastPaid.get(companyId) ?? null,
        phone: phone.get(companyId) ?? x.companyById.get(companyId)?.phone ?? null,
      }))
      .filter((r): r is typeof r & { company: Company } => r.company !== null)
      .sort((a, b) => b.overdue - a.overdue || b.balance - a.balance);
    return { buckets, rows };
  }, [x.invoices, x.invoiceTotalsById, x.payments, x.companyById, contacts.rows, now]);

  const total = AGE_BUCKETS.reduce((s, b) => s + buckets[b], 0);
  const shown = overdueOnly ? rows.filter((r) => r.overdue > 0) : rows;

  const exportCsv = () =>
    downloadText(
      `receivables-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        fa
          ? ["شرکت", "تعداد فاکتور", "مانده", "سررسید گذشته", "قدیمی ترین (روز)", "علی الحساب", "آخرین دریافت", "تلفن"]
          : ["Company", "Invoices", "Balance", "Overdue", "Oldest (days)", "On account", "Last payment", "Phone"],
        ...shown.map((r) => [pick(lang, r.company.name_fa, r.company.name_en), r.invoices, r.balance, r.overdue, r.oldest, r.credit, r.lastPaid ?? "", r.phone ?? ""]),
      ]),
      "text/csv",
    );

  return (
    <div className="grid gap-4">
      <Card className="grid gap-4 p-4" data-tour="acc-ageing">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold">{fa ? "سن مطالبات" : "Receivables by age"}</h2>
            <p className="text-xs text-p-ink-3">{fa ? "مانده فاکتورهای صادر شده، بر اساس روزهای گذشته از سررسید" : "Open balances on issued invoices, by days past due"}</p>
          </div>
          <span className="text-end">
            <span className="block text-xs text-p-ink-3">{fa ? "جمع مانده" : "Total open"}</span>
            <span className="text-lg font-bold">{money(lang, total, currency)}</span>
          </span>
        </div>
        {total ? <AgeingBar buckets={buckets} currency={currency} /> : <p className="text-sm text-p-ink-3">{fa ? "مانده ای روی فاکتورها نیست." : "Nothing is owed on issued invoices."}</p>}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-p-line p-3">
          <h2 className="flex-1 text-[15px] font-semibold">
            {fa ? "بدهکاران" : "Who owes"} <span className="text-sm font-normal text-p-ink-3">({num(lang, shown.length)})</span>
          </h2>
          <button
            type="button"
            aria-pressed={overdueOnly}
            onClick={() => setOverdueOnly((v) => !v)}
            className={cn("h-8 rounded-lg px-2.5 text-[13px] font-medium", overdueOnly ? "bg-p-danger-soft text-p-danger" : "bg-p-sunken text-p-ink-2 hover:bg-p-line")}
          >
            {fa ? "فقط سررسید گذشته" : "Overdue only"}
          </button>
          <Button size="sm" icon={<Download className="size-4" />} onClick={exportCsv}>
            {fa ? "اکسل" : "CSV"}
          </Button>
        </div>
        {shown.length === 0 ? (
          <Empty icon={<Wallet className="size-6" />} title={fa ? "بدهکاری نیست" : "Nobody owes money"} />
        ) : (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-p-surface-2 text-xs text-p-ink-3">
                <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
                  <th>{fa ? "شرکت" : "Company"}</th>
                  <th className="text-end">{fa ? "مانده" : "Balance"}</th>
                  <th className="text-end">{fa ? "سررسید گذشته" : "Overdue"}</th>
                  <th>{fa ? "قدیمی ترین" : "Oldest"}</th>
                  <th className="text-end">{fa ? "علی الحساب" : "On account"}</th>
                  <th>{fa ? "آخرین دریافت" : "Last payment"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.company.id} className="border-t border-p-line [&>td]:px-3 [&>td]:py-2.5">
                    <td className="max-w-72">
                      <Link href={`${base}/crm/${r.company.id}`} className="block truncate font-semibold hover:text-p-brand">
                        {pick(lang, r.company.name_fa, r.company.name_en)}
                      </Link>
                      <span className="text-xs text-p-ink-3">{fa ? `${num(lang, r.invoices)} فاکتور باز` : `${r.invoices} open invoices`}</span>
                    </td>
                    <td className="tabular text-end font-semibold">{num(lang, r.balance)}</td>
                    <td className={cn("tabular text-end", r.overdue ? "font-semibold text-p-danger" : "text-p-ink-3")}>{r.overdue ? num(lang, r.overdue) : "—"}</td>
                    <td>
                      <AgeTag days={r.oldest} />
                    </td>
                    <td className="tabular text-end text-p-ink-2">{r.credit ? num(lang, r.credit) : "—"}</td>
                    <td className="text-xs text-p-ink-3">{r.lastPaid ? date(lang, r.lastPaid) : fa ? "هنوز نه" : "None yet"}</td>
                    <td className="text-end">
                      <div className="flex justify-end gap-1">
                        {r.phone ? (
                          <a href={`tel:${r.phone}`} className="grid size-8 place-items-center rounded-lg text-p-ink-2 hover:bg-p-sunken" aria-label={fa ? "تماس" : "Call"} title={r.phone}>
                            <Phone className="size-4" />
                          </a>
                        ) : null}
                        <Button size="sm" tone="quiet" onClick={() => onPay(r.company)}>
                          {fa ? "دریافتی" : "Payment"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-p-line md:hidden">
              {shown.map((r) => (
                <li key={r.company.id} className="grid gap-2 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <Link href={`${base}/crm/${r.company.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{pick(lang, r.company.name_fa, r.company.name_en)}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-p-ink-3">
                        <AgeTag days={r.oldest} />
                        {r.credit ? <span>{fa ? `علی الحساب ${compact(lang, r.credit)}` : `on account ${compact(lang, r.credit)}`}</span> : null}
                      </span>
                    </Link>
                    <span className="shrink-0 text-end">
                      <span className="tabular block text-[15px] font-bold">{compact(lang, r.balance)}</span>
                      {r.overdue ? <span className="tabular block text-xs font-semibold text-p-danger">{fa ? `${compact(lang, r.overdue)} گذشته` : `${compact(lang, r.overdue)} late`}</span> : null}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {r.phone ? (
                      <a href={`tel:${r.phone}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-p-brand-soft text-[13px] font-medium text-p-brand">
                        <Phone className="size-4" />
                        {fa ? "تماس" : "Call"}
                      </a>
                    ) : null}
                    <Button size="sm" tone="quiet" className="h-9 flex-1" onClick={() => onPay(r.company)}>
                      {fa ? "ثبت دریافتی" : "Record payment"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function AgeTag({ days }: { days: number }) {
  const { lang } = usePortal();
  const b = bucketOf(days);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-p-ink-2">
      <span className="size-2.5 rounded-sm" style={{ background: AGE_COLOR[b] }} aria-hidden />
      {days > 0 ? (lang === "fa" ? `${num(lang, days)} روز گذشته` : `${days} days late`) : ageBucketLabel.current[lang]}
    </span>
  );
}

/* ------------------------------------------------------------- Invoices */

type InvoiceFilter = "all" | "draft" | "open" | "overdue" | "settled" | "cancelled";

function Invoices() {
  const { lang } = usePortal();
  const x = useExhibition();
  const now = useNow();
  const router = useRouter();
  const moneyOf = useInvoiceMoney();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [kind, setKind] = useState("");
  const [limit, setLimit] = useState(80);

  const rows = useMemo(() => {
    const today = new Date(now);
    return x.invoices
      .map((invoice) => {
        const company = x.companyById.get(invoice.company_id) ?? null;
        const m = moneyOf(invoice);
        const live = invoice.status === "issued" || invoice.status === "registered";
        const late = live && m.balance > 0 ? daysOverdue(invoice, today) : 0;
        const booths = invoice.deal_id ? (x.boothsByDeal.get(invoice.deal_id) ?? []).map((b) => b.code) : [];
        return {
          invoice,
          company,
          ...m,
          live,
          late,
          due: dueDate(invoice),
          search: normalizeSearch([invoice.number, company?.name_fa, company?.name_en, company?.legal_name, booths.join(" ")].filter(Boolean).join(" ")),
        };
      })
      .sort((a, b) => (b.invoice.issued_on ?? b.invoice.created_at).localeCompare(a.invoice.issued_on ?? a.invoice.created_at));
  }, [x.invoices, x.companyById, x.boothsByDeal, moneyOf, now]);

  const q = normalizeSearch(query);
  const shown = rows.filter((r) => {
    if (q && !r.search.includes(q)) return false;
    if (kind && r.invoice.kind !== kind) return false;
    if (filter === "draft") return r.invoice.status === "draft";
    if (filter === "open") return r.live && r.balance > 0;
    if (filter === "overdue") return r.late > 0;
    if (filter === "settled") return r.live && r.balance <= 0;
    if (filter === "cancelled") return r.invoice.status === "cancelled";
    return true;
  });
  const sum = shown.reduce(
    (s, r) => (r.invoice.status === "cancelled" ? s : { total: s.total + r.total, paid: s.paid + r.paid, balance: s.balance + Math.max(0, r.balance) }),
    { total: 0, paid: 0, balance: 0 },
  );

  const exportCsv = () =>
    downloadText(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        fa
          ? ["شماره", "نوع", "وضعیت", "شرکت", "شناسه ملی", "کد اقتصادی", "تاریخ صدور", "سررسید", "جمع قبل از مالیات", "ارزش افزوده", "جمع کل", "دریافتی", "مانده"]
          : ["Number", "Kind", "Status", "Company", "National ID", "Economic code", "Issued", "Due", "Subtotal", "VAT", "Total", "Paid", "Balance"],
        ...shown.map((r) => [
          r.invoice.number,
          invoiceKindLabel[r.invoice.kind][lang],
          invoiceStatusLabel[r.invoice.status][lang],
          r.company ? pick(lang, r.company.name_fa, r.company.name_en) : "",
          r.company?.national_id,
          r.company?.economic_code,
          r.invoice.issued_on,
          r.invoice.due_on,
          r.subtotal,
          r.vat,
          r.total,
          r.paid,
          r.balance,
        ]),
      ]),
      "text/csv",
    );

  return (
    <div className="grid gap-3">
      <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fa ? "شماره فاکتور، شرکت یا کد غرفه" : "Invoice number, company or booth code"}
            className="h-11 w-full rounded-xl border border-p-line bg-p-surface-2 ps-9 pe-3 text-sm outline-none focus:border-p-brand"
            aria-label={fa ? "جستجو" : "Search"}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="scroll-fade thin-scroll -mx-1 w-full min-w-0 overflow-x-auto px-1 sm:w-auto">
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: fa ? "همه" : "All" },
                { value: "draft", label: fa ? "پیش نویس" : "Drafts" },
                { value: "open", label: fa ? "باز" : "Open" },
                { value: "overdue", label: fa ? "سررسید گذشته" : "Overdue" },
                { value: "settled", label: fa ? "تسویه" : "Settled" },
                { value: "cancelled", label: fa ? "باطل" : "Cancelled" },
              ]}
            />
          </div>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} compact aria-label={fa ? "نوع" : "Kind"}>
            <option value="">{fa ? "پیش فاکتور و فاکتور" : "Proformas and invoices"}</option>
            <option value="proforma">{invoiceKindLabel.proforma[lang]}</option>
            <option value="final">{invoiceKindLabel.final[lang]}</option>
          </Select>
          <span className="flex-1" />
          <Button size="sm" icon={<Download className="size-4" />} onClick={exportCsv}>
            {fa ? "خروجی اکسل" : "Export CSV"}
          </Button>
        </div>
      </Card>

      {shown.length === 0 ? (
        <Card>
          <Empty
            icon={<FileText className="size-6" />}
            title={fa ? "فاکتوری با این مشخصات نیست" : "No invoice matches"}
            action={
              <Link href={`${base}/accounting/invoices/new`} className="text-sm font-semibold text-p-brand hover:underline">
                {fa ? "ساخت فاکتور جدید" : "Create an invoice"}
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-p-line bg-p-surface-2 text-xs text-p-ink-3">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
                <th>{fa ? "فاکتور" : "Invoice"}</th>
                <th>{fa ? "شرکت" : "Company"}</th>
                <th>{fa ? "وضعیت" : "Status"}</th>
                <th>{fa ? "صدور" : "Issued"}</th>
                <th>{fa ? "سررسید" : "Due"}</th>
                <th className="text-end">{fa ? "جمع کل" : "Total"}</th>
                <th className="text-end">{fa ? "دریافتی" : "Paid"}</th>
                <th className="text-end">{fa ? "مانده" : "Balance"}</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((r) => {
                const href = `${base}/accounting/invoices/${r.invoice.id}`;
                const cancelled = r.invoice.status === "cancelled";
                return (
                  <tr key={r.invoice.id} onClick={() => router.push(href)} className="cursor-pointer border-b border-p-line last:border-0 hover:bg-p-surface-2 [&>td]:px-3 [&>td]:py-2.5">
                    <td className="whitespace-nowrap">
                      <Link href={href} onClick={(e) => e.stopPropagation()} className="font-semibold hover:text-p-brand">
                        {invoiceTitle(r.invoice, lang)}
                      </Link>
                    </td>
                    <td className="max-w-64 truncate">{r.company ? pick(lang, r.company.name_fa, r.company.name_en) : "—"}</td>
                    <td>
                      <InvoiceStatusPill status={r.invoice.status} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-p-ink-2">{r.invoice.issued_on ? date(lang, r.invoice.issued_on) : "—"}</td>
                    <td className={cn("whitespace-nowrap text-xs", r.late ? "font-semibold text-p-danger" : "text-p-ink-2")}>
                      {r.due && r.invoice.status !== "draft" ? date(lang, r.due) : "—"}
                      {r.late ? <span className="block text-[11px]">{fa ? `${num(lang, r.late)} روز گذشته` : `${r.late} days late`}</span> : null}
                    </td>
                    <td className={cn("tabular text-end font-medium", cancelled && "text-p-ink-3 line-through")}>{num(lang, r.total)}</td>
                    <td className="tabular text-end text-p-ok">{r.paid ? num(lang, r.paid) : "—"}</td>
                    <td className={cn("tabular text-end font-semibold", r.balance > 0 && r.live ? "text-p-warn" : "text-p-ink-3")}>
                      {r.live ? (r.balance > 0 ? num(lang, r.balance) : fa ? "تسویه" : "Settled") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-p-line-strong bg-p-surface-2 text-[13px] font-semibold">
              <tr className="[&>td]:px-3 [&>td]:py-2.5">
                <td colSpan={5}>{fa ? `جمع ${num(lang, shown.length)} فاکتور (بدون باطل شده ها)` : `Total of ${shown.length} invoices (cancelled left out)`}</td>
                <td className="tabular text-end">{num(lang, sum.total)}</td>
                <td className="tabular text-end text-p-ok">{num(lang, sum.paid)}</td>
                <td className="tabular text-end text-p-warn">{num(lang, sum.balance)}</td>
              </tr>
            </tfoot>
          </table>
          <ul className="divide-y divide-p-line md:hidden">
            {shown.slice(0, limit).map((r) => (
              <li key={r.invoice.id}>
                <Link href={`${base}/accounting/invoices/${r.invoice.id}`} className="flex items-center gap-3 px-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{r.company ? pick(lang, r.company.name_fa, r.company.name_en) : "—"}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-p-ink-3">
                      <span className="font-medium text-p-ink-2">{invoiceTitle(r.invoice, lang)}</span>
                      <InvoiceStatusPill status={r.invoice.status} />
                      {r.late ? <span className="font-semibold text-p-danger">{fa ? `${num(lang, r.late)} روز گذشته` : `${r.late}d late`}</span> : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className={cn("tabular block text-[15px] font-bold", r.invoice.status === "cancelled" && "text-p-ink-3 line-through")}>{compact(lang, r.total)}</span>
                    {r.live && r.balance > 0 ? <span className="tabular block text-xs font-medium text-p-warn">{fa ? `مانده ${compact(lang, r.balance)}` : `${compact(lang, r.balance)} due`}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
            <li className="flex items-center justify-between bg-p-surface-2 px-3 py-2.5 text-[13px] font-semibold">
              <span>{fa ? "مانده این فهرست" : "Balance of this list"}</span>
              <span className="tabular text-p-warn">{num(lang, sum.balance)}</span>
            </li>
          </ul>
          {shown.length > limit ? (
            <div className="border-t border-p-line p-3 text-center">
              <Button tone="ghost" onClick={() => setLimit((l) => l + 100)}>
                {fa ? `نمایش بیشتر (${num(lang, shown.length - limit)} مانده)` : `Show more (${shown.length - limit} left)`}
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Payments */

function Payments() {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const currency = x.exhibition?.currency ?? "IRR";
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("");
  const [against, setAgainst] = useState<"all" | "invoice" | "account">("all");
  const [showVoided, setShowVoided] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [limit, setLimit] = useState(80);
  const invoiceById = useMemo(() => new Map(x.invoices.map((i) => [i.id, i])), [x.invoices]);

  const rows = useMemo(
    () =>
      [...x.payments]
        .sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.created_at.localeCompare(a.created_at))
        .map((p) => {
          const company = x.companyById.get(p.company_id) ?? null;
          const invoice = p.invoice_id ? (invoiceById.get(p.invoice_id) ?? null) : null;
          return {
            p,
            company,
            invoice,
            by: p.recorded_by ? x.staffById.get(p.recorded_by) : null,
            search: normalizeSearch([company?.name_fa, company?.name_en, invoice?.number, p.reference, p.notes].filter(Boolean).join(" ")),
          };
        }),
    [x.payments, x.companyById, x.staffById, invoiceById],
  );
  const q = normalizeSearch(query);
  const shown = rows.filter((r) => {
    if (!showVoided && r.p.voided_at) return false;
    if (q && !r.search.includes(q)) return false;
    if (method && r.p.method !== method) return false;
    if (against === "invoice" && !r.p.invoice_id) return false;
    if (against === "account" && r.p.invoice_id) return false;
    return true;
  });
  const sum = shown.filter((r) => !r.p.voided_at).reduce((s, r) => s + r.p.amount, 0);
  const voidedCount = rows.filter((r) => r.p.voided_at).length;

  const exportCsv = () =>
    downloadText(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        fa
          ? ["تاریخ", "شرکت", "بابت", "روش", "شماره پیگیری", "مبلغ", "ثبت کننده", "باطل شده", "دلیل ابطال", "توضیح"]
          : ["Date", "Company", "Against", "Method", "Reference", "Amount", "Recorded by", "Voided", "Void reason", "Note"],
        ...shown.map((r) => [
          r.p.paid_on,
          r.company ? pick(lang, r.company.name_fa, r.company.name_en) : "",
          r.invoice ? r.invoice.number : fa ? "علی الحساب" : "On account",
          paymentMethodLabel[r.p.method][lang],
          r.p.reference,
          r.p.amount,
          r.by?.display_name ?? r.by?.email ?? "",
          r.p.voided_at ? r.p.voided_at.slice(0, 10) : "",
          r.p.void_reason,
          r.p.notes,
        ]),
      ]),
      "text/csv",
    );

  return (
    <div className="grid gap-3">
      <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-p-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fa ? "شرکت، شماره فاکتور، شماره پیگیری یا چک" : "Company, invoice number, reference or cheque"}
            className="h-11 w-full rounded-xl border border-p-line bg-p-surface-2 ps-9 pe-3 text-sm outline-none focus:border-p-brand"
            aria-label={fa ? "جستجو" : "Search"}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={against}
            onChange={setAgainst}
            options={[
              { value: "all", label: fa ? "همه" : "All" },
              { value: "invoice", label: fa ? "بابت فاکتور" : "Against invoices" },
              { value: "account", label: fa ? "علی الحساب" : "On account" },
            ]}
          />
          <Select value={method} onChange={(e) => setMethod(e.target.value)} compact aria-label={fa ? "روش" : "Method"}>
            <option value="">{fa ? "همه روش ها" : "Every method"}</option>
            {(Object.keys(paymentMethodLabel) as Array<keyof typeof paymentMethodLabel>).map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m][lang]}
              </option>
            ))}
          </Select>
          <button
            type="button"
            aria-pressed={showVoided}
            onClick={() => setShowVoided((v) => !v)}
            className={cn("h-8 rounded-lg px-2.5 text-[13px] font-medium", showVoided ? "bg-p-danger-soft text-p-danger" : "bg-p-sunken text-p-ink-2 hover:bg-p-line")}
          >
            {fa ? `باطل شده ها (${num(lang, voidedCount)})` : `Voided (${voidedCount})`}
          </button>
          <span className="flex-1" />
          <Button size="sm" icon={<Download className="size-4" />} onClick={exportCsv}>
            {fa ? "خروجی اکسل" : "Export CSV"}
          </Button>
        </div>
      </Card>

      {shown.length === 0 ? (
        <Card>
          <Empty icon={<Wallet className="size-6" />} title={fa ? "دریافتی با این مشخصات نیست" : "No payment matches"} />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-p-line bg-p-surface-2 text-xs text-p-ink-3">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-start [&>th]:font-medium">
                <th>{fa ? "تاریخ" : "Date"}</th>
                <th>{fa ? "شرکت" : "Company"}</th>
                <th>{fa ? "بابت" : "Against"}</th>
                <th>{fa ? "روش و پیگیری" : "Method and reference"}</th>
                <th>{fa ? "ثبت کننده" : "Recorded by"}</th>
                <th className="text-end">{fa ? "مبلغ" : "Amount"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((r) => (
                <tr key={r.p.id} className={cn("border-b border-p-line last:border-0 [&>td]:px-3 [&>td]:py-2.5", r.p.voided_at && "text-p-ink-3")}>
                  <td className="whitespace-nowrap text-xs">{date(lang, r.p.paid_on)}</td>
                  <td className="max-w-60">
                    {r.company ? (
                      <Link href={`${base}/crm/${r.company.id}`} className="block truncate font-medium hover:text-p-brand">
                        {pick(lang, r.company.name_fa, r.company.name_en)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {r.invoice ? (
                      <Link href={`${base}/accounting/invoices/${r.invoice.id}`} className="font-medium text-p-brand hover:underline">
                        {invoiceTitle(r.invoice, lang)}
                      </Link>
                    ) : (
                      <Pill>{fa ? "علی الحساب" : "On account"}</Pill>
                    )}
                  </td>
                  <td className="text-xs">
                    {paymentMethodLabel[r.p.method][lang]}
                    {r.p.reference ? (
                      <bdi dir="ltr" className="ms-1 text-p-ink-3">
                        {r.p.reference}
                      </bdi>
                    ) : null}
                    {r.p.voided_at ? <span className="block text-p-danger">{fa ? `باطل: ${r.p.void_reason}` : `Voided: ${r.p.void_reason}`}</span> : null}
                  </td>
                  <td className="text-xs text-p-ink-3">{r.by?.display_name ?? r.by?.email ?? "—"}</td>
                  <td className={cn("tabular text-end font-semibold", r.p.voided_at ? "line-through" : "text-p-ok")}>{num(lang, r.p.amount)}</td>
                  <td className="text-end">
                    {!r.p.voided_at ? (
                      <button type="button" onClick={() => setVoiding(r.p)} className="rounded-lg px-2 py-1 text-xs text-p-ink-3 hover:bg-p-danger-soft hover:text-p-danger">
                        {fa ? "ابطال" : "Void"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-p-line-strong bg-p-surface-2 text-[13px] font-semibold">
              <tr className="[&>td]:px-3 [&>td]:py-2.5">
                <td colSpan={5}>{fa ? `جمع ${num(lang, shown.filter((r) => !r.p.voided_at).length)} دریافتی معتبر` : `Total of ${shown.filter((r) => !r.p.voided_at).length} valid payments`}</td>
                <td className="tabular text-end text-p-ok">{num(lang, sum)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <ul className="divide-y divide-p-line md:hidden">
            {shown.slice(0, limit).map((r) => (
              <li key={r.p.id} className={cn("flex items-center gap-3 px-3 py-3", r.p.voided_at && "text-p-ink-3")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{r.company ? pick(lang, r.company.name_fa, r.company.name_en) : "—"}</span>
                  <span className="mt-0.5 block truncate text-xs text-p-ink-3">
                    {date(lang, r.p.paid_on, "short")}{sep(lang)}{paymentMethodLabel[r.p.method][lang]}{sep(lang)}{r.invoice ? invoiceTitle(r.invoice, lang) : fa ? "علی الحساب" : "On account"}
                  </span>
                  {r.p.voided_at ? <span className="block text-xs text-p-danger">{fa ? `باطل: ${r.p.void_reason}` : `Voided: ${r.p.void_reason}`}</span> : null}
                </span>
                <span className={cn("tabular shrink-0 text-[15px] font-bold", r.p.voided_at ? "line-through" : "text-p-ok")}>{compact(lang, r.p.amount)}</span>
                {!r.p.voided_at ? (
                  <button type="button" onClick={() => setVoiding(r.p)} className="grid size-9 shrink-0 place-items-center rounded-lg text-p-ink-3 hover:bg-p-danger-soft hover:text-p-danger" aria-label={fa ? "ابطال" : "Void"}>
                    <Ban className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
            <li className="flex items-center justify-between bg-p-surface-2 px-3 py-2.5 text-[13px] font-semibold">
              <span>{fa ? "جمع دریافتی ها" : "Total received"}</span>
              <span className="tabular text-p-ok">{money(lang, sum, currency)}</span>
            </li>
          </ul>
          {shown.length > limit ? (
            <div className="border-t border-p-line p-3 text-center">
              <Button tone="ghost" onClick={() => setLimit((l) => l + 100)}>
                {fa ? `نمایش بیشتر (${num(lang, shown.length - limit)} مانده)` : `Show more (${shown.length - limit} left)`}
              </Button>
            </div>
          ) : null}
        </Card>
      )}
      <VoidPayment payment={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}
