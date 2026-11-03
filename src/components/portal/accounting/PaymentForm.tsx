"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { date, money, num, pick, sep } from "@/lib/portal/format";
import { invoiceKindLabel, paymentMethodLabel } from "@/lib/portal/labels";
import { newId } from "@/lib/portal/store";
import type { Company, Invoice, Payment } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { DateQuick, MoneyInput, PickerField, todayIso } from "../fields";
import { usePortal } from "../PortalProvider";
import { Button, Field, Input, Select, Sheet } from "../ui";

const METHODS = Object.keys(paymentMethodLabel) as Array<keyof typeof paymentMethodLabel>;

/** Record money received, against an invoice or on account. */
export function PaymentForm({
  open,
  onClose,
  company,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
  invoice?: Invoice | null;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "ثبت دریافتی" : "Record a payment"}>
      {open ? <Body company={company ?? null} invoice={invoice ?? null} onClose={onClose} /> : null}
    </Sheet>
  );
}

function Body({ company: presetCompany, invoice: presetInvoice, onClose }: { company: Company | null; invoice: Invoice | null; onClose: () => void }) {
  const { lang, store, toast, user } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [company, setCompany] = useState<Company | null>(presetCompany ?? (presetInvoice ? (x.companyById.get(presetInvoice.company_id) ?? null) : null));
  const open = company
    ? x.invoices.filter((i) => i.company_id === company.id && (i.status === "issued" || i.status === "registered") && (x.invoiceTotalsById.get(i.id)?.balance ?? 0) > 0)
    : [];
  const [invoiceId, setInvoiceId] = useState<string>(presetInvoice?.id ?? "");
  const chosen = invoiceId ? x.invoices.find((i) => i.id === invoiceId) : (open[0] ?? null);
  const balance = chosen ? (x.invoiceTotalsById.get(chosen.id)?.balance ?? 0) : 0;
  const [amount, setAmount] = useState<number | null>(balance || null);
  const [paidOn, setPaidOn] = useState<string | null>(todayIso());
  const [busy, setBusy] = useState(false);
  const currency = x.exhibition?.currency ?? "IRR";
  const deal = company ? (x.deals.find((d) => d.company_id === company.id && d.stage !== "lost") ?? null) : null;
  const effectiveInvoice = invoiceId === "none" ? null : (chosen ?? null);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!company || !amount || amount <= 0) return;
        const f = new FormData(e.currentTarget);
        setBusy(true);
        const res = await store.insert("payments", {
          id: newId(),
          company_id: company.id,
          deal_id: effectiveInvoice?.deal_id ?? deal?.id ?? null,
          invoice_id: effectiveInvoice?.id ?? null,
          amount,
          currency,
          paid_on: paidOn ?? todayIso(),
          method: String(f.get("method") ?? "bank_transfer") as (typeof METHODS)[number],
          reference: String(f.get("reference") ?? "").trim() || null,
          notes: String(f.get("notes") ?? "").trim() || null,
          recorded_by: user.id,
        });
        setBusy(false);
        if (res.ok) {
          toast(fa ? `${num(lang, amount)} ثبت شد` : `${amount.toLocaleString("en-US")} recorded`);
          onClose();
        }
      }}
    >
      <Field label={fa ? "از شرکت" : "From"}>
        <PickerField
          value={company}
          items={x.companies}
          getKey={(c) => c.id}
          getLabel={(c) => pick(lang, c.name_fa, c.name_en)}
          getHint={(c) => {
            const d = x.deals.find((dd) => dd.company_id === c.id);
            const b = d ? x.balanceByDeal.get(d.id) : null;
            return b && b.balance > 0 ? (fa ? `مانده ${num(lang, b.balance)}` : `owes ${b.balance.toLocaleString("en-US")}`) : null;
          }}
          onChange={(c) => {
            setCompany(c);
            setInvoiceId("");
            setAmount(null);
          }}
          placeholder={fa ? "انتخاب شرکت" : "Choose a company"}
          emptyText={fa ? "شرکتی پیدا نشد" : "No company found"}
        />
      </Field>
      {company ? (
        <Field label={fa ? "بابت" : "Against"}>
          <Select
            value={invoiceId || chosen?.id || "none"}
            onChange={(e) => {
              setInvoiceId(e.target.value);
              const inv = x.invoices.find((i) => i.id === e.target.value);
              const b = inv ? (x.invoiceTotalsById.get(inv.id)?.balance ?? 0) : 0;
              if (b) setAmount(b);
            }}
          >
            {open.map((i) => (
              <option key={i.id} value={i.id}>
                {invoiceKindLabel[i.kind][lang]} #{i.number ?? "—"}{sep(lang)}{fa ? "مانده" : "due"} {num(lang, x.invoiceTotalsById.get(i.id)?.balance ?? 0)}
              </option>
            ))}
            <option value="none">{fa ? "علی الحساب (بدون فاکتور)" : "On account (no invoice)"}</option>
          </Select>
        </Field>
      ) : null}
      <Field label={fa ? `مبلغ (${currency === "IRR" ? "ریال" : currency})` : `Amount (${currency})`}>
        <MoneyInput value={amount} onChange={setAmount} required autoFocus={Boolean(presetInvoice || presetCompany)} />
      </Field>
      {effectiveInvoice && amount && amount > balance && balance > 0 ? (
        <p className="rounded-xl bg-p-warn-soft px-3 py-2 text-xs text-p-warn">
          {fa ? `بیشتر از مانده فاکتور (${money(lang, balance, currency)}) است.` : `More than the invoice balance (${money(lang, balance, currency)}).`}
        </p>
      ) : null}
      <DateQuick label={fa ? "تاریخ دریافت" : "Date received"} value={paidOn} onChange={setPaidOn} allowEmpty={false} past />
      <div className="grid grid-cols-2 gap-3">
        <Field label={fa ? "روش" : "Method"}>
          <Select name="method" defaultValue="bank_transfer">
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "شماره پیگیری / چک" : "Reference / cheque no."}>
          <Input name="reference" dir="ltr" />
        </Field>
      </div>
      <Field label={fa ? "توضیح" : "Note"}>
        <Input name="notes" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={!company || !amount || busy}>
          {fa ? "ثبت دریافتی" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}

/** Void a payment that was entered by mistake or bounced. The row stays, struck through, with the reason. */
export function VoidPayment({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const { lang, store, toast } = usePortal();
  const fa = lang === "fa";
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const reasons = fa ? ["اشتباه در ثبت", "چک برگشتی", "تکراری", "بازپرداخت به مشتری"] : ["Entered by mistake", "Cheque bounced", "Duplicate", "Refunded"];
  return (
    <Sheet open={Boolean(payment)} onClose={onClose} closeLabel={fa ? "بستن" : "Close"} title={fa ? "ابطال دریافتی" : "Void payment"}>
      {payment ? (
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = reason.trim();
            if (!r) return;
            setBusy(true);
            const res = await store.update("payments", payment.id, { voided_at: new Date().toISOString(), void_reason: r });
            setBusy(false);
            if (res.ok) {
              toast(fa ? "دریافتی باطل شد" : "Payment voided");
              setReason("");
              onClose();
            }
          }}
        >
          <p className="text-sm text-p-ink-2">
            {fa
              ? `${money(lang, payment.amount, payment.currency)} در تاریخ ${date(lang, payment.paid_on)} از حساب ها خارج می شود. ردیف با دلیل ابطال باقی می ماند.`
              : `${money(lang, payment.amount, payment.currency)} from ${date(lang, payment.paid_on)} stops counting. The row stays on record with the reason.`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className={cn("h-7 rounded-lg px-2.5 text-xs font-medium", reason === r ? "bg-p-danger-soft text-p-danger ring-1 ring-p-danger" : "bg-p-sunken text-p-ink-2 hover:bg-p-line")}
              >
                {r}
              </button>
            ))}
          </div>
          <Field label={fa ? "دلیل ابطال" : "Reason"}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button tone="ghost" onClick={onClose}>
              {fa ? "انصراف" : "Cancel"}
            </Button>
            <Button tone="danger" type="submit" disabled={!reason.trim() || busy}>
              {fa ? "ابطال دریافتی" : "Void payment"}
            </Button>
          </div>
        </form>
      ) : null}
    </Sheet>
  );
}
