/**
 * Accounting helpers: invoice numbering, line maths, receivables ageing and CSV export.
 * Pure, and in step with the invoice_totals view (discount is an amount per line, VAT a rate).
 */
import type { InvoiceTotal } from "./money.ts";

type InvoiceLike = {
  id: string;
  number: string | null;
  kind: "proforma" | "final";
  status: "draft" | "issued" | "registered" | "cancelled";
  issued_on: string | null;
  due_on: string | null;
  company_id: string;
};

/** One line's amount before VAT. */
export function lineAmount(l: { quantity: number; unit_price: number; discount: number }) {
  return Math.round(l.quantity * l.unit_price) - l.discount;
}

/** Totals of a set of lines, the way the database view computes them. */
export function linesTotal(lines: ReadonlyArray<{ quantity: number; unit_price: number; discount: number }>, vatRate: number) {
  const gross = lines.reduce((s, l) => s + Math.round(l.quantity * l.unit_price), 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const subtotal = gross - discount;
  const vat = Math.round(subtotal * vatRate);
  return { gross, discount, subtotal, vat, total: subtotal + vat };
}

/** The next free invoice number in an exhibition: one more than the highest numeric number used. */
export function nextInvoiceNumber(invoices: ReadonlyArray<Pick<InvoiceLike, "number">>) {
  let max = 0;
  for (const i of invoices) {
    const n = Number(String(i.number ?? "").replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

/** Which status changes the accounting team can make from each status. */
export function invoiceActions(status: InvoiceLike["status"]): Array<"issue" | "register" | "cancel" | "reopen"> {
  switch (status) {
    case "draft":
      return ["issue", "cancel"];
    case "issued":
      return ["register", "cancel", "reopen"];
    case "registered":
      return ["cancel"];
    case "cancelled":
      return ["reopen"];
  }
}

const DAY = 86_400_000;

/** When an invoice is due: its due date, else 30 days after issue. Null for drafts with no dates. */
export function dueDate(i: Pick<InvoiceLike, "due_on" | "issued_on">) {
  if (i.due_on) return new Date(`${i.due_on}T00:00:00`);
  if (i.issued_on) return new Date(new Date(`${i.issued_on}T00:00:00`).getTime() + 30 * DAY);
  return null;
}

export type AgeBucket = "current" | "d30" | "d60" | "d90" | "older";
export const AGE_BUCKETS: AgeBucket[] = ["current", "d30", "d60", "d90", "older"];

/** Days past due, 0 or more. */
export function daysOverdue(i: Pick<InvoiceLike, "due_on" | "issued_on">, now = new Date()) {
  const due = dueDate(i);
  if (!due) return 0;
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / DAY));
}

export function bucketOf(days: number): AgeBucket {
  if (days <= 0) return "current";
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  if (days <= 90) return "d90";
  return "older";
}

/** Open balances by age, for issued and registered invoices only. */
export function ageing(invoices: readonly InvoiceLike[], totals: Map<string, InvoiceTotal>, now = new Date()) {
  const buckets: Record<AgeBucket, number> = { current: 0, d30: 0, d60: 0, d90: 0, older: 0 };
  const byCompany = new Map<string, { balance: number; overdue: number; oldest: number; invoices: number }>();
  for (const i of invoices) {
    if (i.status !== "issued" && i.status !== "registered") continue;
    const t = totals.get(i.id);
    if (!t || t.balance <= 0) continue;
    const days = daysOverdue(i, now);
    buckets[bucketOf(days)] += t.balance;
    const c = byCompany.get(i.company_id) ?? { balance: 0, overdue: 0, oldest: 0, invoices: 0 };
    c.balance += t.balance;
    if (days > 0) c.overdue += t.balance;
    c.oldest = Math.max(c.oldest, days);
    c.invoices += 1;
    byCompany.set(i.company_id, c);
  }
  return { buckets, byCompany };
}

/** CSV that Excel opens correctly in Persian: UTF-8 with a byte order mark, every cell quoted when needed. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
