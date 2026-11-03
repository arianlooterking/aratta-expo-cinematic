"use client";

import { ArrowLeft, ArrowRight, Ban, Check, Copy, FilePlus2, FileText, Plus, Printer, RotateCcw, Send, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { addDays, amountInWords, daysOverdue, dueDate, invoiceActions, issueProblems, lineAmount, linesTotal, nextInvoiceNumber, numberTaken } from "@/lib/portal/finance";
import { currencyName, date, money, num, pick, sep } from "@/lib/portal/format";
import { invoiceKindLabel, paymentMethodLabel, serviceKindLabel, unitLabel } from "@/lib/portal/labels";
import { newId } from "@/lib/portal/store";
import type { Booth, Company, Exhibition, Insert, Invoice, InvoiceLine, Payment } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { parseDigits, PickerField, todayIso } from "../fields";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { usePageTour } from "../Tour";
import { Button, Card, Empty, Field, Input, Segmented, Select, Sheet, Skeleton, Textarea } from "../ui";
import { PaymentForm, VoidPayment } from "./PaymentForm";
import { InvoiceStatusPill, invoiceTitle, useLinesByInvoice } from "./shared";

type Service = InvoiceLine["service"];
type Unit = "m2" | "unit" | "day" | "set" | "lump";
const SERVICES = Object.keys(serviceKindLabel) as Service[];
const UNITS = Object.keys(unitLabel) as Unit[];
const DEFAULT_UNIT: Record<Service, Unit> = { space: "m2", booth_build: "m2", flooring: "m2", partition: "unit", equipment: "unit", sponsorship: "lump", other: "unit" };

/** Seller block on printed invoices. Legal numbers are added here once the company provides them. */
const SELLER = { fa: "شرکت توسعه تجارت اَرَتَ (اَرَتَ اکسپو)", en: "Aratta Expo" };

const isolate = (s: string) => `⁦${s}⁩`;

type LineDraft = Omit<Insert<"invoice_lines">, "id" | "invoice_id">;

/** The space-rental line for a booth: area × the exhibition rate, or the booth's own agreed price. */
function spaceLine(booth: Booth, exhibition: Exhibition | null, lang: "fa" | "en"): LineDraft {
  const fa = lang === "fa";
  const code = isolate(booth.code);
  if (booth.price_override != null) {
    return {
      service: "space",
      booth_id: booth.id,
      quantity: 1,
      unit: "lump",
      unit_price: booth.price_override,
      discount: 0,
      description: fa ? `اجاره فضای غرفه ${code} (${num(lang, booth.area_m2, 2)} متر مربع، قیمت توافقی)` : `Space rental, booth ${code} (${booth.area_m2} m², agreed price)`,
    };
  }
  return {
    service: "space",
    booth_id: booth.id,
    quantity: booth.area_m2,
    unit: "m2",
    unit_price: exhibition?.space_rate ?? 0,
    discount: 0,
    description: fa ? `اجاره فضای غرفه ${code}` : `Space rental, booth ${code}`,
  };
}

/* ================================================================ New invoice */

export function NewInvoice() {
  const { lang, store, user, can } = usePortal();
  const x = useExhibition();
  const router = useRouter();
  const params = useSearchParams();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const presetId = params.get("company");
  const [picked, setPicked] = useState<Company | null>(null);
  const company = picked ?? (presetId ? (x.companyById.get(presetId) ?? null) : null);
  const [kind, setKind] = useState<Invoice["kind"]>("proforma");
  const [vat, setVat] = useState<string>("");
  const [skipBooths, setSkipBooths] = useState<Set<string>>(new Set());
  const [withFurniture, setWithFurniture] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const deal = company ? (x.deals.find((d) => d.company_id === company.id && d.stage !== "lost") ?? x.deals.find((d) => d.company_id === company.id) ?? null) : null;
  const booths = deal ? (x.boothsByDeal.get(deal.id) ?? []) : [];
  const priced = booths.flatMap((b) =>
    (x.ordersByBooth.get(b.id) ?? [])
      .map((o) => ({ o, b, item: x.itemById.get(o.item_id), price: o.unit_price ?? x.itemById.get(o.item_id)?.rental_rate ?? 0 }))
      .filter((r) => r.item && r.price > 0),
  );
  const vatRate = vat.trim() === "" ? (x.exhibition?.vat_rate ?? 0.1) : Number(parseDigits(vat)) / 100;
  const vatOk = Number.isFinite(vatRate) && vatRate >= 0 && vatRate < 1;

  const draftLines: LineDraft[] = [
    ...booths.filter((b) => !skipBooths.has(b.id)).map((b) => spaceLine(b, x.exhibition, lang)),
    ...(withFurniture
      ? priced.map(({ o, b, item, price }) => ({
          service: "equipment" as const,
          booth_id: b.id,
          quantity: o.quantity,
          unit: "unit",
          unit_price: price,
          discount: 0,
          description: fa ? `${item!.name_fa}، غرفه ${isolate(b.code)}` : `${item!.name_en ?? item!.name_fa}, booth ${isolate(b.code)}`,
        }))
      : []),
  ];
  const preview = linesTotal(draftLines.map((l) => ({ quantity: l.quantity ?? 1, unit_price: l.unit_price, discount: l.discount ?? 0 })), vatOk ? vatRate : 0);
  const currency = x.exhibition?.currency ?? "IRR";

  if (!can.finance) return <NoAccess />;

  const create = async () => {
    if (!company || !x.exhibition || !vatOk) return;
    setBusy(true);
    const id = newId();
    const res = await store.insert("invoices", {
      id,
      exhibition_id: x.exhibition.id,
      company_id: company.id,
      deal_id: deal?.id ?? null,
      kind,
      status: "draft",
      currency,
      vat_rate: vatRate,
      official: true,
      notes: notes.trim() || null,
      created_by: user.id,
    });
    if (!res.ok) {
      setBusy(false);
      return;
    }
    await Promise.all(draftLines.map((l, i) => store.insert("invoice_lines", { ...l, id: newId(), invoice_id: id, sort_order: i })));
    router.replace(`${base}/accounting/invoices/${id}`);
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-4 py-5 sm:px-6 lg:py-7">
      <BackLink />
      <h1 className="text-2xl font-bold">{fa ? "فاکتور جدید" : "New invoice"}</h1>
      <Card className="grid gap-4 p-4">
        <Field label={fa ? "برای شرکت" : "Bill to"}>
          <PickerField
            value={company}
            items={x.companies.filter((c) => !c.archived_at)}
            getKey={(c) => c.id}
            getLabel={(c) => pick(lang, c.name_fa, c.name_en)}
            getHint={(c) => {
              const d = x.deals.find((dd) => dd.company_id === c.id);
              const codes = d ? (x.boothsByDeal.get(d.id) ?? []).map((b) => b.code).join(", ") : "";
              return codes ? (fa ? `غرفه ${isolate(codes)}` : `booth ${codes}`) : null;
            }}
            onChange={(c) => {
              setPicked(c);
              setSkipBooths(new Set());
            }}
            placeholder={fa ? "انتخاب شرکت" : "Choose a company"}
            emptyText={fa ? "شرکتی پیدا نشد" : "No company found"}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fa ? "نوع" : "Kind"}>
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: "proforma", label: invoiceKindLabel.proforma[lang] },
                { value: "final", label: invoiceKindLabel.final[lang] },
              ]}
            />
          </Field>
          <Field label={fa ? "ارزش افزوده (درصد)" : "VAT (%)"} hint={!vatOk ? (fa ? "عددی بین ۰ تا ۹۹" : "A number from 0 to 99") : undefined}>
            <Input value={vat} onChange={(e) => setVat(e.target.value)} placeholder={String(Math.round((x.exhibition?.vat_rate ?? 0.1) * 10000) / 100)} inputMode="decimal" dir="ltr" className="max-w-28" />
          </Field>
        </div>

        {company ? (
          <div className="grid gap-2">
            <span className="text-[13px] font-medium text-p-ink-2">{fa ? "ردیف های آماده" : "Start with these lines"}</span>
            {booths.length === 0 ? (
              <p className="rounded-xl bg-p-surface-2 px-3 py-2 text-[13px] text-p-ink-3">
                {fa ? "این شرکت در این نمایشگاه غرفه ندارد. ردیف ها را بعد از ساخت اضافه کنید." : "This company has no booth in this exhibition. Add lines after creating it."}
              </p>
            ) : (
              booths.map((b) => {
                const l = spaceLine(b, x.exhibition, lang);
                const on = !skipBooths.has(b.id);
                return (
                  <label key={b.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px]", on ? "border-p-brand bg-p-brand-soft/40" : "border-p-line")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setSkipBooths((s) => {
                          const n = new Set(s);
                          if (n.has(b.id)) n.delete(b.id);
                          else n.add(b.id);
                          return n;
                        })
                      }
                      className="size-4 accent-[var(--p-brand)]"
                    />
                    <span className="min-w-0 flex-1">{l.description}</span>
                    <span className="tabular shrink-0 font-semibold">{num(lang, lineAmount({ quantity: l.quantity ?? 1, unit_price: l.unit_price, discount: 0 }))}</span>
                  </label>
                );
              })
            )}
            {booths.some((b) => spaceLine(b, x.exhibition, lang).unit_price === 0) ? (
              <p className="text-xs text-p-warn">{fa ? "نرخ متری این نمایشگاه ثبت نشده؛ قیمت را در فاکتور وارد کنید." : "This exhibition has no space rate yet; enter the price on the invoice."}</p>
            ) : null}
            {priced.length ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-p-line px-3 py-2.5 text-[13px]">
                <input type="checkbox" checked={withFurniture} onChange={(e) => setWithFurniture(e.target.checked)} className="size-4 accent-[var(--p-brand)]" />
                <span className="flex-1">{fa ? `اجاره مبلمان و تجهیزات غرفه (${num(lang, priced.length)} قلم)` : `Furniture and equipment rental (${priced.length} items)`}</span>
              </label>
            ) : null}
          </div>
        ) : null}

        <Field label={fa ? "توضیح روی فاکتور" : "Note on the invoice"}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-p-line pt-4">
          <span className="text-sm">
            <span className="text-p-ink-3">{fa ? "جمع با ارزش افزوده: " : "Total with VAT: "}</span>
            <b className="tabular">{money(lang, preview.total, currency)}</b>
          </span>
          <Button tone="primary" icon={<FilePlus2 className="size-4" />} disabled={!company || !vatOk || busy} onClick={create}>
            {fa ? "ساخت پیش نویس" : "Create draft"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BackLink() {
  const { lang } = usePortal();
  const Arrow = lang === "fa" ? ArrowRight : ArrowLeft;
  return (
    <Link href={`/${lang}/staff/accounting?tab=invoices`} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-p-ink-3 hover:text-p-ink print:hidden">
      <Arrow className="size-4" />
      {lang === "fa" ? "فاکتورها" : "Invoices"}
    </Link>
  );
}

function NoAccess() {
  const { lang } = usePortal();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <Empty icon={<FileText className="size-6" />} title={lang === "fa" ? "فاکتورها فقط برای تیم مالی و مدیران است" : "Invoices are for the finance team and managers"} />
      </Card>
    </div>
  );
}

/* ================================================================ Editor */

export function InvoiceEditor({ id }: { id: string }) {
  usePageTour("invoice");
  const { lang, can } = usePortal();
  const x = useExhibition();
  const all = useCollection("invoices");
  const fa = lang === "fa";
  const invoice = x.invoices.find((i) => i.id === id) ?? null;

  if (!can.finance) return <NoAccess />;
  if (!invoice) {
    const elsewhere = all.rows.find((i) => i.id === id);
    const show = elsewhere ? x.exhibitions.find((e) => e.id === elsewhere.exhibition_id) : null;
    return (
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6">
        <BackLink />
        {!x.ready || all.status === "loading" ? (
          <Skeleton className="h-64" />
        ) : (
          <Card>
            <Empty
              icon={<FileText className="size-6" />}
              title={show ? (fa ? "این فاکتور مال نمایشگاه دیگری است" : "This invoice belongs to another exhibition") : fa ? "فاکتور پیدا نشد" : "Invoice not found"}
              action={
                show ? (
                  <Button tone="primary" onClick={() => x.selectExhibition(show.id)}>
                    {fa ? `رفتن به ${show.name_fa}` : `Switch to ${show.name_en ?? show.name_fa}`}
                  </Button>
                ) : null
              }
            />
          </Card>
        )}
      </div>
    );
  }
  return <Editor invoice={invoice} />;
}

function Editor({ invoice }: { invoice: Invoice }) {
  const { lang, store, toast, user, can } = usePortal();
  const x = useExhibition();
  const router = useRouter();
  const now = useNow();
  const fa = lang === "fa";
  const base = `/${lang}/staff`;
  const lines = useLinesByInvoice().get(invoice.id) ?? [];
  const company = x.companyById.get(invoice.company_id) ?? null;
  const currency = invoice.currency;
  const totals = linesTotal(lines, invoice.vat_rate);
  const live = x.invoiceTotalsById.get(invoice.id);
  const paid = live?.paid ?? 0;
  const balance = live?.balance ?? 0;
  const payments = x.payments.filter((p) => p.invoice_id === invoice.id).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  const draft = invoice.status === "draft";
  const problems = draft ? issueProblems(lines) : [];
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const late = (invoice.status === "issued" || invoice.status === "registered") && balance > 0 ? daysOverdue(invoice, new Date(now)) : 0;

  const patch = (p: Partial<Invoice>) => store.update("invoices", invoice.id, p);

  const act = async (action: "issue" | "register" | "cancel" | "reopen") => {
    if (action === "cancel") return setCancelling(true);
    setBusy(true);
    if (action === "issue") {
      const number = invoice.number ?? nextInvoiceNumber(x.invoices);
      if (numberTaken(x.invoices, number, invoice.id)) {
        toast(fa ? `شماره ${number} قبلاً استفاده شده` : `Number ${number} is already used`, "error");
        setBusy(false);
        return;
      }
      const issued = invoice.issued_on ?? todayIso();
      const res = await patch({ status: "issued", number, issued_on: issued, due_on: invoice.due_on ?? addDays(issued, 30) });
      if (res.ok) toast(fa ? `صادر شد با شماره ${number}` : `Issued as #${number}`);
    } else if (action === "register") {
      const res = await patch({ status: "registered", official: true });
      if (res.ok) toast(fa ? "ثبت در سامانه علامت خورد" : "Marked as filed");
    } else {
      const res = await patch({ status: "draft" });
      if (res.ok) toast(fa ? "به پیش نویس برگشت" : "Back to draft");
    }
    setBusy(false);
  };

  const copyAs = async (kind: Invoice["kind"]) => {
    setBusy(true);
    const id = newId();
    const res = await store.insert("invoices", {
      id,
      exhibition_id: invoice.exhibition_id,
      company_id: invoice.company_id,
      deal_id: invoice.deal_id,
      kind,
      status: "draft",
      currency,
      vat_rate: invoice.vat_rate,
      official: invoice.official,
      notes: kind !== invoice.kind && invoice.number ? (fa ? `بر اساس ${invoiceKindLabel[invoice.kind].fa} شماره ${invoice.number}` : `Based on ${invoiceKindLabel[invoice.kind].en} #${invoice.number}`) : invoice.notes,
      created_by: user.id,
    });
    if (res.ok) {
      await Promise.all(
        lines.map((l, i) =>
          store.insert("invoice_lines", {
            id: newId(),
            invoice_id: id,
            service: l.service,
            description: l.description,
            booth_id: l.booth_id,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            discount: l.discount,
            sort_order: i,
          }),
        ),
      );
      toast(fa ? "پیش نویس تازه ساخته شد" : "New draft created");
      router.push(`${base}/accounting/invoices/${id}`);
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    const res = await store.remove("invoices", invoice.id);
    setBusy(false);
    if (res.ok) {
      toast(fa ? "پیش نویس حذف شد" : "Draft deleted");
      router.replace(`${base}/accounting?tab=invoices`);
    }
  };

  const steps: Array<Invoice["status"]> = ["draft", "issued", "registered"];
  const at = steps.indexOf(invoice.status);
  const actionLabel = {
    issue: { fa: "صدور و شماره گذاری", en: "Issue and number" },
    register: { fa: "ثبت شد در سامانه مودیان", en: "Mark as filed with the tax system" },
    cancel: { fa: "ابطال", en: "Cancel invoice" },
    reopen: { fa: invoice.status === "cancelled" ? "بازگرداندن به پیش نویس" : "برگشت به پیش نویس", en: "Back to draft" },
  };
  const actionIcon = { issue: <Send className="size-4" />, register: <Check className="size-4" />, cancel: <Ban className="size-4" />, reopen: <RotateCcw className="size-4" /> };

  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:py-7 print:hidden">
        <BackLink />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">{invoiceTitle(invoice, lang)}</h1>
              <InvoiceStatusPill status={invoice.status} />
              {late ? <span className="rounded-full bg-p-danger-soft px-2 py-0.5 text-xs font-semibold text-p-danger">{fa ? `${num(lang, late)} روز از سررسید گذشته` : `${late} days overdue`}</span> : null}
            </div>
            {company ? (
              <Link href={`${base}/crm/${company.id}`} className="mt-1 block truncate text-sm font-medium text-p-brand hover:underline">
                {pick(lang, company.name_fa, company.name_en)}
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2" data-tour="invoice-status">
            {invoiceActions(invoice.status).map((a) => (
              <Button
                key={a}
                tone={a === "cancel" ? "danger" : a === "reopen" ? "ghost" : "primary"}
                icon={actionIcon[a]}
                disabled={busy || (a === "issue" && problems.length > 0)}
                onClick={() => act(a)}
              >
                {actionLabel[a][lang]}
              </Button>
            ))}
            {(invoice.status === "issued" || invoice.status === "registered") && balance > 0 ? (
              <Button icon={<Wallet className="size-4" />} onClick={() => setPaying(true)}>
                {fa ? "ثبت دریافتی" : "Record payment"}
              </Button>
            ) : null}
            <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
              {fa ? "چاپ / PDF" : "Print / PDF"}
            </Button>
          </div>
        </div>

        {/* Stage track */}
        {invoice.status === "cancelled" ? (
          <p className="rounded-xl bg-p-danger-soft px-3 py-2 text-sm text-p-danger">
            {fa ? "این فاکتور باطل شده و در مانده ها حساب نمی شود." : "This invoice is cancelled and no longer counts towards balances."}
          </p>
        ) : (
          <ol className="flex items-center gap-1.5 text-xs">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    i < at ? "bg-p-ok-soft text-p-ok" : i === at ? "bg-p-brand text-p-brand-ink" : "bg-p-sunken text-p-ink-3",
                  )}
                >
                  {i < at ? <Check className="size-3.5" /> : num(lang, i + 1)}
                </span>
                <span className={cn("whitespace-nowrap", i === at ? "font-semibold text-p-ink" : "text-p-ink-3")}>
                  {[fa ? "پیش نویس" : "Draft", fa ? "صادر شده" : "Issued", fa ? "ثبت در سامانه" : "Filed"][i]}
                </span>
                {i < steps.length - 1 ? <span className={cn("h-px flex-1", i < at ? "bg-p-ok" : "bg-p-line")} /> : null}
              </li>
            ))}
          </ol>
        )}

        {problems.length ? (
          <ul className="grid gap-1 rounded-xl bg-p-warn-soft px-3 py-2 text-[13px] text-p-warn">
            {problems.map((p) => (
              <li key={p}>
                •{" "}
                {
                  {
                    no_lines: fa ? "برای صدور، دست کم یک ردیف لازم است." : "Add at least one line to issue it.",
                    zero_total: fa ? "جمع فاکتور صفر است." : "The total is zero.",
                    bad_quantity: fa ? "تعداد همه ردیف ها باید بیشتر از صفر باشد." : "Every line needs a quantity above zero.",
                    discount_too_big: fa ? "تخفیف یک ردیف از مبلغ آن بیشتر است." : "A discount is larger than its line.",
                  }[p]
                }
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 gap-4">
            <LinesCard invoice={invoice} lines={lines} editable={draft} />
            <PaymentsCard invoice={invoice} payments={payments} onPay={() => setPaying(true)} onVoid={setVoiding} />
          </div>
          <div className="grid gap-4">
            <TotalsCard invoice={invoice} totals={totals} paid={paid} balance={balance} />
            <DetailsCard invoice={invoice} patch={patch} />
            <Card className="grid gap-2 p-4">
              <h2 className="text-[15px] font-semibold">{fa ? "کارهای دیگر" : "More"}</h2>
              {invoice.kind === "proforma" && invoice.status !== "cancelled" ? (
                <Button tone="quiet" icon={<FilePlus2 className="size-4" />} disabled={busy} onClick={() => copyAs("final")} className="justify-start">
                  {fa ? "ساخت فاکتور نهایی از این پیش فاکتور" : "Make the final invoice from this proforma"}
                </Button>
              ) : null}
              <Button tone="quiet" icon={<Copy className="size-4" />} disabled={busy} onClick={() => copyAs(invoice.kind)} className="justify-start">
                {fa ? "کپی به یک پیش نویس تازه" : "Copy into a new draft"}
              </Button>
              {draft && can.admin && payments.length === 0 ? (
                <Button tone="danger" icon={<Trash2 className="size-4" />} disabled={busy} onClick={remove} className="justify-start">
                  {fa ? "حذف این پیش نویس" : "Delete this draft"}
                </Button>
              ) : null}
            </Card>
          </div>
        </div>
      </div>

      <PrintSheet invoice={invoice} company={company} lines={lines} totals={totals} paid={paid} balance={balance} />

      <PaymentForm open={paying} onClose={() => setPaying(false)} invoice={invoice} />
      <VoidPayment payment={voiding} onClose={() => setVoiding(null)} />
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} invoice={invoice} paid={paid} />
    </>
  );
}

/* ---------------------------------------------------------------- Lines */

function LinesCard({ invoice, lines, editable }: { invoice: Invoice; lines: InvoiceLine[]; editable: boolean }) {
  const { lang, store } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const deal = invoice.deal_id ? x.dealById.get(invoice.deal_id) : null;
  const booths = deal ? (x.boothsByDeal.get(deal.id) ?? []) : [];
  const billed = new Set(lines.filter((l) => l.service === "space").map((l) => l.booth_id));
  const nextOrder = lines.reduce((m, l) => Math.max(m, l.sort_order), -1) + 1;

  const add = (draft: LineDraft) => store.insert("invoice_lines", { ...draft, id: newId(), invoice_id: invoice.id, sort_order: nextOrder });

  return (
    <Card className="grid gap-3 p-4" data-tour="invoice-lines">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">
          {fa ? "ردیف ها" : "Lines"} <span className="text-sm font-normal text-p-ink-3">({num(lang, lines.length)})</span>
        </h2>
        {!editable ? <span className="text-xs text-p-ink-3">{fa ? "برای ویرایش، فاکتور را به پیش نویس برگردانید" : "Move it back to draft to edit"}</span> : null}
      </div>

      {lines.length === 0 ? <p className="rounded-xl bg-p-surface-2 px-3 py-4 text-center text-[13px] text-p-ink-3">{fa ? "هنوز ردیفی ندارد" : "No lines yet"}</p> : null}

      {editable ? (
        <ol className="grid gap-2">
          {lines.map((l, i) => (
            <EditableLine key={l.id} line={l} index={i} booths={booths} />
          ))}
        </ol>
      ) : lines.length ? (
        <ReadOnlyLines lines={lines} />
      ) : null}

      {editable ? (
        <div className="flex flex-wrap gap-1.5 border-t border-p-line pt-3">
          {booths
            .filter((b) => !billed.has(b.id))
            .map((b) => (
              <button key={b.id} type="button" onClick={() => add(spaceLine(b, x.exhibition, lang))} className="inline-flex h-8 items-center gap-1 rounded-lg bg-p-brand-soft px-2.5 text-xs font-semibold text-p-brand hover:brightness-95">
                <Plus className="size-3.5" />
                {fa ? `فضای غرفه ${isolate(b.code)}` : `Space, booth ${b.code}`}
              </button>
            ))}
          {SERVICES.filter((s) => s !== "space" || booths.length === 0).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add({ service: s, description: null, booth_id: booths.length === 1 ? booths[0].id : null, quantity: 1, unit: DEFAULT_UNIT[s], unit_price: 0, discount: 0 })}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-p-sunken px-2.5 text-xs font-medium text-p-ink-2 hover:bg-p-line"
            >
              <Plus className="size-3.5" />
              {serviceKindLabel[s][lang]}
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function EditableLine({ line, index, booths }: { line: InvoiceLine; index: number; booths: Booth[] }) {
  const { lang, store } = usePortal();
  const fa = lang === "fa";
  const [confirm, setConfirm] = useState(false);
  const update = (p: Partial<InvoiceLine>) => store.update("invoice_lines", line.id, p);
  const gross = Math.round(line.quantity * line.unit_price);
  return (
    <li className="grid gap-2 rounded-xl border border-p-line p-2.5 sm:p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-p-sunken text-[11px] font-bold text-p-ink-3">{num(lang, index + 1)}</span>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_7rem]">
          <Select value={line.service} onChange={(e) => update({ service: e.target.value as Service })} aria-label={fa ? "خدمت" : "Service"}>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {serviceKindLabel[s][lang]}
              </option>
            ))}
          </Select>
          <div className="order-last col-span-2 sm:order-none sm:col-span-1">
            <TextCell value={line.description ?? ""} onCommit={(v) => update({ description: v || null })} label={fa ? "شرح" : "Description"} placeholder={fa ? "شرح خدمت" : "Description"} />
          </div>
          <Select value={line.booth_id ?? ""} onChange={(e) => update({ booth_id: e.target.value || null })} aria-label={fa ? "غرفه" : "Booth"}>
            <option value="">{fa ? "بدون غرفه" : "No booth"}</option>
            {booths.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </Select>
        </div>
        {confirm ? (
          <span className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => store.remove("invoice_lines", line.id)} className="h-8 rounded-lg bg-p-danger-soft px-2 text-xs font-semibold text-p-danger">
              {fa ? "حذف" : "Remove"}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="h-8 rounded-lg px-2 text-xs text-p-ink-3">
              {fa ? "نه" : "Keep"}
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="grid size-9 shrink-0 place-items-center rounded-lg text-p-ink-3 hover:bg-p-danger-soft hover:text-p-danger" aria-label={fa ? "حذف ردیف" : "Remove line"}>
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 ps-8 sm:grid-cols-[5.5rem_6.5rem_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
        <Labelled label={fa ? "مقدار" : "Qty"}>
          <NumberCell value={line.quantity} decimals={2} valid={(n) => n > 0} onCommit={(v) => update({ quantity: v })} label={fa ? "مقدار" : "Quantity"} />
        </Labelled>
        <Labelled label={fa ? "واحد" : "Unit"}>
          <Select value={line.unit} onChange={(e) => update({ unit: e.target.value })} aria-label={fa ? "واحد" : "Unit"}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {unitLabel[u][lang]}
              </option>
            ))}
          </Select>
        </Labelled>
        <Labelled label={fa ? "مبلغ واحد" : "Unit price"}>
          <NumberCell value={line.unit_price} valid={(n) => n >= 0} onCommit={(v) => update({ unit_price: v })} label={fa ? "مبلغ واحد" : "Unit price"} />
        </Labelled>
        <Labelled label={fa ? "تخفیف (مبلغ)" : "Discount"}>
          <NumberCell value={line.discount} valid={(n) => n >= 0 && n <= gross} onCommit={(v) => update({ discount: v })} label={fa ? "تخفیف" : "Discount"} />
        </Labelled>
        <Labelled label={fa ? "مبلغ ردیف" : "Line total"} className="col-span-2 sm:col-span-1">
          <span className="tabular flex h-10 items-center justify-end rounded-xl bg-p-surface-2 px-3 text-sm font-bold" dir="ltr">
            {lineAmount(line).toLocaleString("en-US")}
          </span>
        </Labelled>
      </div>
    </li>
  );
}

function Labelled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid min-w-0 gap-1", className)}>
      <span className="text-[11px] font-medium text-p-ink-3">{label}</span>
      {children}
    </label>
  );
}

const cellClass = "h-10 w-full min-w-0 rounded-xl border border-p-line bg-p-surface px-3 text-sm outline-none focus:border-p-brand disabled:bg-p-surface-2";

/** A number box that saves when you leave it (Enter saves, Escape undoes). Accepts Persian digits. */
function NumberCell({ value, onCommit, decimals = 0, valid, label }: { value: number; onCommit: (v: number) => void; decimals?: number; valid?: (n: number) => boolean; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const cancel = useRef(false);
  const shown = draft ?? value.toLocaleString("en-US", { maximumFractionDigits: decimals });
  return (
    <input
      aria-label={label}
      aria-invalid={bad || undefined}
      inputMode={decimals ? "decimal" : "numeric"}
      dir="ltr"
      value={shown}
      onFocus={(e) => {
        setDraft(shown);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        setBad(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancel.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        const raw = draft;
        setDraft(null);
        if (cancel.current || raw == null) {
          cancel.current = false;
          return;
        }
        const n = Number(parseDigits(raw));
        const v = Math.round(n * 10 ** decimals) / 10 ** decimals;
        if (!raw.trim() || !Number.isFinite(n) || (valid && !valid(v))) {
          setBad(true);
          return;
        }
        if (v !== value) onCommit(v);
      }}
      className={cn(cellClass, "tabular text-end", bad && "border-p-danger")}
    />
  );
}

function TextCell({ value, onCommit, label, placeholder }: { value: string; onCommit: (v: string) => void; label: string; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancel = useRef(false);
  return (
    <input
      aria-label={label}
      placeholder={placeholder}
      value={draft ?? value}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancel.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        const raw = draft;
        setDraft(null);
        if (cancel.current || raw == null) {
          cancel.current = false;
          return;
        }
        if (raw.trim() !== value) onCommit(raw.trim());
      }}
      className={cellClass}
    />
  );
}

function ReadOnlyLines({ lines }: { lines: InvoiceLine[] }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const boothCode = (id: string | null) => (id ? x.booths.find((b) => b.id === id)?.code : null);
  return (
    <>
      <table className="hidden w-full text-[13px] sm:table">
        <thead className="text-xs text-p-ink-3">
          <tr className="border-b border-p-line [&>th]:px-2 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium">
            <th>#</th>
            <th>{fa ? "شرح" : "Description"}</th>
            <th className="text-end">{fa ? "مقدار" : "Qty"}</th>
            <th className="text-end">{fa ? "مبلغ واحد" : "Unit price"}</th>
            <th className="text-end">{fa ? "تخفیف" : "Discount"}</th>
            <th className="text-end">{fa ? "مبلغ" : "Amount"}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id} className="border-b border-p-line last:border-0 [&>td]:px-2 [&>td]:py-2">
              <td className="text-p-ink-3">{num(lang, i + 1)}</td>
              <td>
                <span className="font-medium">{l.description || serviceKindLabel[l.service][lang]}</span>
                <span className="block text-xs text-p-ink-3">
                  {serviceKindLabel[l.service][lang]}
                  {boothCode(l.booth_id) ? `${sep(lang)}${fa ? "غرفه" : "booth"} ${isolate(boothCode(l.booth_id)!)}` : ""}
                </span>
              </td>
              <td className="tabular whitespace-nowrap text-end">
                {num(lang, l.quantity, 2)} {unitLabel[l.unit as Unit]?.[lang] ?? l.unit}
              </td>
              <td className="tabular text-end">{num(lang, l.unit_price)}</td>
              <td className="tabular text-end text-p-ink-3">{l.discount ? num(lang, l.discount) : "—"}</td>
              <td className="tabular text-end font-semibold">{num(lang, lineAmount(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="grid gap-2 sm:hidden">
        {lines.map((l, i) => (
          <li key={l.id} className="rounded-xl border border-p-line px-3 py-2.5 text-[13px]">
            <div className="flex gap-2">
              <span className="text-p-ink-3">{num(lang, i + 1)}.</span>
              <span className="min-w-0 flex-1 font-medium">{l.description || serviceKindLabel[l.service][lang]}</span>
              <span className="tabular shrink-0 font-bold">{num(lang, lineAmount(l))}</span>
            </div>
            <p className="mt-1 ps-5 text-xs text-p-ink-3">
              {num(lang, l.quantity, 2)} {unitLabel[l.unit as Unit]?.[lang] ?? l.unit} × {num(lang, l.unit_price)}
              {l.discount ? ` − ${num(lang, l.discount)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/* --------------------------------------------------------------- Side cards */

function TotalsCard({ invoice, totals, paid, balance }: { invoice: Invoice; totals: ReturnType<typeof linesTotal>; paid: number; balance: number }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const live = invoice.status === "issued" || invoice.status === "registered";
  const rows: Array<[string, number, string?]> = [
    [fa ? "جمع ردیف ها" : "Lines", totals.gross],
    ...(totals.discount ? ([[fa ? "تخفیف" : "Discounts", -totals.discount, "text-p-ok"]] as Array<[string, number, string]>) : []),
    [fa ? "جمع قبل از مالیات" : "Before VAT", totals.subtotal],
    [fa ? `ارزش افزوده (${num(lang, invoice.vat_rate * 100, 2)}٪)` : `VAT (${Math.round(invoice.vat_rate * 10000) / 100}%)`, totals.vat],
  ];
  return (
    <Card className="grid gap-2 p-4">
      <h2 className="text-[15px] font-semibold">{fa ? "جمع فاکتور" : "Totals"}</h2>
      <dl className="grid gap-1.5 text-[13px]">
        {rows.map(([k, v, tone]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-p-ink-3">{k}</dt>
            <dd className={cn("tabular font-medium", tone)}>{num(lang, v)}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-p-line pt-2">
          <dt className="font-semibold">{fa ? "قابل پرداخت" : "Total due"}</dt>
          <dd className="tabular text-lg font-bold">{num(lang, totals.total)}</dd>
        </div>
      </dl>
      <p className="text-xs leading-5 text-p-ink-3">
        {amountInWords(totals.total, lang)} {currencyName(lang, invoice.currency)}
      </p>
      {live ? (
        <dl className="grid gap-1.5 rounded-xl bg-p-surface-2 p-3 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-p-ink-3">{fa ? "دریافت شده" : "Received"}</dt>
            <dd className="tabular font-medium text-p-ok">{num(lang, paid)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold">{fa ? "مانده" : "Balance"}</dt>
            <dd className={cn("tabular font-bold", balance > 0 ? "text-p-warn" : "text-p-ok")}>{balance > 0 ? num(lang, balance) : fa ? "تسویه شده" : "Settled"}</dd>
          </div>
        </dl>
      ) : null}
    </Card>
  );
}

function DetailsCard({ invoice, patch }: { invoice: Invoice; patch: (p: Partial<Invoice>) => Promise<unknown> }) {
  const { lang, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const draft = invoice.status === "draft";
  const open = draft || invoice.status === "issued";
  const [notes, setNotes] = useState<string | null>(null);
  const due = dueDate(invoice);
  return (
    <Card className="grid gap-3 p-4">
      <h2 className="text-[15px] font-semibold">{fa ? "مشخصات" : "Details"}</h2>
      <Field label={fa ? "نوع" : "Kind"}>
        {draft ? (
          <Segmented
            size="sm"
            value={invoice.kind}
            onChange={(k) => patch({ kind: k })}
            options={[
              { value: "proforma", label: invoiceKindLabel.proforma[lang] },
              { value: "final", label: invoiceKindLabel.final[lang] },
            ]}
          />
        ) : (
          <span className="text-sm">{invoiceKindLabel[invoice.kind][lang]}</span>
        )}
      </Field>
      <Field label={fa ? "شماره" : "Number"} hint={draft && !invoice.number ? (fa ? `هنگام صدور: ${nextInvoiceNumber(x.invoices)}` : `On issue: ${nextInvoiceNumber(x.invoices)}`) : undefined}>
        {open ? (
          <TextCell
            value={invoice.number ?? ""}
            label={fa ? "شماره" : "Number"}
            placeholder={fa ? "خودکار" : "Automatic"}
            onCommit={(v) => {
              if (v && numberTaken(x.invoices, v, invoice.id)) {
                toast(fa ? `شماره ${v} قبلاً استفاده شده` : `Number ${v} is already used`, "error");
                return;
              }
              if (!v && !draft) return;
              patch({ number: v || null });
            }}
          />
        ) : (
          <span className="text-sm font-semibold" dir="ltr">
            {invoice.number ?? "—"}
          </span>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <DayField label={fa ? "تاریخ صدور" : "Issued"} value={invoice.issued_on} disabled={!open} onChange={(v) => patch({ issued_on: v })} />
        <DayField label={fa ? "سررسید" : "Due"} value={invoice.due_on} placeholder={due && !invoice.due_on ? date(lang, due) : undefined} disabled={invoice.status === "cancelled"} onChange={(v) => patch({ due_on: v })} />
      </div>
      <Field label={fa ? "ارزش افزوده (درصد)" : "VAT (%)"}>
        {draft ? (
          <NumberCell value={Math.round(invoice.vat_rate * 10000) / 100} decimals={2} valid={(n) => n >= 0 && n < 100} onCommit={(v) => patch({ vat_rate: v / 100 })} label={fa ? "ارزش افزوده" : "VAT"} />
        ) : (
          <span className="text-sm">{num(lang, invoice.vat_rate * 100, 2)}٪</span>
        )}
      </Field>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={invoice.official} disabled={!open} onChange={(e) => patch({ official: e.target.checked })} className="size-4 accent-[var(--p-brand)]" />
        {fa ? "رسمی، برای ثبت در سامانه مودیان" : "Official, to be filed with the tax system"}
      </label>
      <Field label={fa ? "توضیح" : "Note"}>
        <Textarea
          rows={3}
          value={notes ?? invoice.notes ?? ""}
          onFocus={() => setNotes(invoice.notes ?? "")}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const v = (notes ?? "").trim();
            setNotes(null);
            if (v !== (invoice.notes ?? "")) patch({ notes: v || null });
          }}
        />
      </Field>
    </Card>
  );
}

function DayField({ label, value, onChange, disabled, placeholder }: { label: string; value: string | null; onChange: (v: string | null) => void; disabled?: boolean; placeholder?: string }) {
  const { lang } = usePortal();
  return (
    <Field label={label}>
      <Input type="date" value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value || null)} dir="ltr" className="w-full" />
      <span className="text-xs text-p-ink-3">{value ? date(lang, value) : (placeholder ?? "—")}</span>
    </Field>
  );
}

function PaymentsCard({ invoice, payments, onPay, onVoid }: { invoice: Invoice; payments: Payment[]; onPay: () => void; onVoid: (p: Payment) => void }) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const live = invoice.status === "issued" || invoice.status === "registered";
  return (
    <Card className="grid gap-3 p-4">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[15px] font-semibold">{fa ? "دریافتی های این فاکتور" : "Payments on this invoice"}</h2>
        {live ? (
          <Button size="sm" tone="quiet" icon={<Plus className="size-4" />} onClick={onPay}>
            {fa ? "ثبت" : "Add"}
          </Button>
        ) : null}
      </div>
      {payments.length === 0 ? (
        <p className="text-[13px] text-p-ink-3">{live ? (fa ? "هنوز دریافتی ثبت نشده" : "Nothing received yet") : fa ? "بعد از صدور، دریافتی ها اینجا ثبت می شوند" : "Payments are recorded here once it is issued"}</p>
      ) : (
        <ul className="divide-y divide-p-line text-[13px]">
          {payments.map((p) => {
            const by = p.recorded_by ? x.staffById.get(p.recorded_by) : null;
            return (
              <li key={p.id} className={cn("flex items-center gap-3 py-2", p.voided_at && "text-p-ink-3")}>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    {date(lang, p.paid_on)}{sep(lang)}{paymentMethodLabel[p.method][lang]}
                    {p.reference ? (
                      <bdi dir="ltr" className="ms-1 text-p-ink-3">
                        {p.reference}
                      </bdi>
                    ) : null}
                  </span>
                  <span className="block text-xs text-p-ink-3">
                    {p.voided_at ? <span className="text-p-danger">{fa ? `باطل: ${p.void_reason}` : `Voided: ${p.void_reason}`}</span> : (by?.display_name ?? by?.email ?? "")}
                  </span>
                </span>
                <span className={cn("tabular shrink-0 font-semibold", p.voided_at ? "line-through" : "text-p-ok")}>{num(lang, p.amount)}</span>
                {!p.voided_at ? (
                  <button type="button" onClick={() => onVoid(p)} className="shrink-0 rounded-lg px-2 py-1 text-xs text-p-ink-3 hover:bg-p-danger-soft hover:text-p-danger">
                    {fa ? "ابطال" : "Void"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function CancelSheet({ open, onClose, invoice, paid }: { open: boolean; onClose: () => void; invoice: Invoice; paid: number }) {
  const { lang, store, toast } = usePortal();
  const fa = lang === "fa";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? `ابطال ${invoiceTitle(invoice, lang)}` : `Cancel ${invoiceTitle(invoice, lang)}`}>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const note = reason.trim() ? `${fa ? "ابطال" : "Cancelled"}: ${reason.trim()}` : null;
          const res = await store.update("invoices", invoice.id, { status: "cancelled", notes: [invoice.notes, note].filter(Boolean).join("\n") || null });
          setBusy(false);
          if (res.ok) {
            toast(fa ? "فاکتور باطل شد" : "Invoice cancelled");
            setReason("");
            onClose();
          }
        }}
      >
        <p className="text-sm text-p-ink-2">
          {fa
            ? "فاکتور باطل شده در مانده ها حساب نمی شود ولی شماره و ردیف هایش برای سابقه می ماند. بعداً می توانید آن را به پیش نویس برگردانید."
            : "A cancelled invoice stops counting towards balances. Its number and lines stay on record, and you can move it back to draft later."}
        </p>
        {paid > 0 ? (
          <p className="rounded-xl bg-p-warn-soft px-3 py-2 text-[13px] text-p-warn">
            {fa
              ? `${money(lang, paid, invoice.currency)} بابت این فاکتور دریافت شده. آن دریافتی ها را جداگانه باطل کنید یا با فاکتور جدید تسویه کنید.`
              : `${money(lang, paid, invoice.currency)} was received against this invoice. Void those payments separately or settle them on a new invoice.`}
          </p>
        ) : null}
        <Field label={fa ? "دلیل (روی فاکتور ثبت می شود)" : "Reason (added to the invoice note)"}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            {fa ? "منصرف شدم" : "Keep it"}
          </Button>
          <Button tone="danger" type="submit" disabled={busy} icon={<Ban className="size-4" />}>
            {fa ? "ابطال فاکتور" : "Cancel invoice"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Print */

function PrintSheet({
  invoice,
  company,
  lines,
  totals,
  paid,
  balance,
}: {
  invoice: Invoice;
  company: Company | null;
  lines: InvoiceLine[];
  totals: ReturnType<typeof linesTotal>;
  paid: number;
  balance: number;
}) {
  const { lang } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const e = x.exhibitions.find((ex) => ex.id === invoice.exhibition_id) ?? x.exhibition;
  const code = (id: string | null) => (id ? x.booths.find((b) => b.id === id)?.code : null);
  const title = invoice.kind === "proforma" ? (fa ? "پیش فاکتور" : "Proforma invoice") : fa ? "صورتحساب فروش خدمات" : "Invoice";
  const unit = (u: string) => unitLabel[u as Unit]?.[lang] ?? u;
  const due = dueDate(invoice);
  const currency = currencyName(lang, invoice.currency);
  const cell = "border border-black/60 px-2 py-1.5";
  const meta: Array<[string, string]> = [
    [fa ? "شماره" : "No.", invoice.number ?? (fa ? "پیش نویس" : "Draft")],
    [fa ? "تاریخ" : "Date", invoice.issued_on ? date(lang, invoice.issued_on) : "—"],
    [fa ? "سررسید" : "Due", due ? date(lang, due) : "—"],
  ];
  return (
    <article className="hidden text-[10.5pt] leading-relaxed text-black print:block">
      <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <p className="text-[18pt] font-bold">{title}</p>
          {e ? (
            <p>
              {pick(lang, e.name_fa, e.name_en)}
              {e.venue_fa || e.venue_en ? `${sep(lang)}${pick(lang, e.venue_fa, e.venue_en)}` : ""}
            </p>
          ) : null}
          {invoice.status === "cancelled" ? <p className="mt-1 font-bold">{fa ? "باطل شده" : "CANCELLED"}</p> : null}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[10pt]">
          {meta.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}:</dt>
              <dd dir={k === meta[0][0] ? "ltr" : undefined} className="text-start">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-black/60 p-3">
          <p className="mb-1 font-bold">{fa ? "فروشنده" : "Seller"}</p>
          <p>{SELLER[lang]}</p>
        </div>
        <div className="border border-black/60 p-3">
          <p className="mb-1 font-bold">{fa ? "خریدار" : "Buyer"}</p>
          <p>{company ? (company.legal_name ?? pick(lang, company.name_fa, company.name_en)) : "—"}</p>
          {company?.national_id ? <p>{fa ? `شناسه ملی: ${company.national_id}` : `National ID: ${company.national_id}`}</p> : null}
          {company?.economic_code ? <p>{fa ? `کد اقتصادی: ${company.economic_code}` : `Economic code: ${company.economic_code}`}</p> : null}
          {company?.address ? <p>{company.address}</p> : null}
          {company?.phone ? (
            <p>
              {fa ? "تلفن: " : "Phone: "}
              <bdi dir="ltr">{company.phone}</bdi>
            </p>
          ) : null}
        </div>
      </section>

      <table className="mt-4 w-full border-collapse text-[10pt]">
        <thead>
          <tr className="bg-black/5">
            <th className={cell}>{fa ? "ردیف" : "#"}</th>
            <th className={cn(cell, "text-start")}>{fa ? "شرح خدمات" : "Description"}</th>
            <th className={cell}>{fa ? "مقدار" : "Qty"}</th>
            <th className={cell}>{fa ? "واحد" : "Unit"}</th>
            <th className={cell}>{fa ? `مبلغ واحد (${currency})` : `Unit price (${currency})`}</th>
            <th className={cell}>{fa ? "تخفیف" : "Discount"}</th>
            <th className={cell}>{fa ? `مبلغ (${currency})` : `Amount (${currency})`}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.id}>
              <td className={cn(cell, "text-center")}>{num(lang, i + 1)}</td>
              <td className={cell}>
                {l.description || serviceKindLabel[l.service][lang]}
                {code(l.booth_id) && !(l.description ?? "").includes(code(l.booth_id)!) ? ` (${fa ? "غرفه" : "booth"} ${isolate(code(l.booth_id)!)})` : ""}
              </td>
              <td className={cn(cell, "text-center")}>{num(lang, l.quantity, 2)}</td>
              <td className={cn(cell, "text-center")}>{unit(l.unit)}</td>
              <td className={cn(cell, "text-end")}>{num(lang, l.unit_price)}</td>
              <td className={cn(cell, "text-end")}>{l.discount ? num(lang, l.discount) : "—"}</td>
              <td className={cn(cell, "text-end font-semibold")}>{num(lang, lineAmount(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-end">
        <table className="w-[55%] border-collapse text-[10pt]">
          <tbody>
            {(
              [
                [fa ? "جمع کل" : "Gross", totals.gross],
                [fa ? "تخفیف" : "Discount", totals.discount],
                [fa ? "جمع پس از تخفیف" : "After discount", totals.subtotal],
                [fa ? `مالیات و عوارض ارزش افزوده (${num(lang, invoice.vat_rate * 100, 2)}٪)` : `VAT (${Math.round(invoice.vat_rate * 10000) / 100}%)`, totals.vat],
              ] as Array<[string, number]>
            ).map(([k, v]) => (
              <tr key={k}>
                <td className={cell}>{k}</td>
                <td className={cn(cell, "text-end")}>{num(lang, v)}</td>
              </tr>
            ))}
            <tr className="bg-black/5 font-bold">
              <td className={cell}>{fa ? "مبلغ قابل پرداخت" : "Total payable"}</td>
              <td className={cn(cell, "text-end")}>{num(lang, totals.total)}</td>
            </tr>
            {paid > 0 ? (
              <>
                <tr>
                  <td className={cell}>{fa ? "دریافت شده تا امروز" : "Received to date"}</td>
                  <td className={cn(cell, "text-end")}>{num(lang, paid)}</td>
                </tr>
                <tr className="font-bold">
                  <td className={cell}>{fa ? "مانده" : "Balance"}</td>
                  <td className={cn(cell, "text-end")}>{num(lang, Math.max(0, balance))}</td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3">
        <b>{fa ? "مبلغ به حروف: " : "Amount in words: "}</b>
        {amountInWords(totals.total, lang)} {currency}
      </p>
      {invoice.notes ? <p className="mt-2 whitespace-pre-line">{invoice.notes}</p> : null}

      <footer className="mt-14 grid grid-cols-2 gap-10 text-center text-[10pt]">
        <div className="border-t border-black pt-2">{fa ? "مهر و امضای فروشنده" : "Seller stamp and signature"}</div>
        <div className="border-t border-black pt-2">{fa ? "مهر و امضای خریدار" : "Buyer stamp and signature"}</div>
      </footer>
    </article>
  );
}
