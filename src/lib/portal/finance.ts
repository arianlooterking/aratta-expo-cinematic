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

const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/**
 * The next free invoice number in an exhibition. Takes the number with the highest trailing
 * digits and adds one, keeping its prefix and zero padding: 1240 → 1241, P-1405-009 → P-1405-010.
 */
export function nextInvoiceNumber(invoices: ReadonlyArray<Pick<InvoiceLike, "number">>) {
  let best: { prefix: string; n: number; width: number } | null = null;
  for (const i of invoices) {
    const m = /^(.*?)(\d+)$/.exec(toLatinDigits(String(i.number ?? "")).trim());
    if (!m) continue;
    const n = Number(m[2]);
    if (!best || n > best.n) best = { prefix: m[1], n, width: m[2].length };
  }
  if (!best) return "1";
  return best.prefix + String(best.n + 1).padStart(best.width, "0");
}

/** True when another invoice of the exhibition already uses this number (digits compared as Latin). */
export function numberTaken(invoices: ReadonlyArray<Pick<InvoiceLike, "id" | "number">>, number: string, exceptId?: string) {
  const want = toLatinDigits(number).trim();
  return invoices.some((i) => i.id !== exceptId && i.number != null && toLatinDigits(i.number).trim() === want);
}

/** What stops an invoice from being issued. Empty means it can go out. */
export function issueProblems(lines: ReadonlyArray<{ quantity: number; unit_price: number; discount: number }>) {
  const problems: Array<"no_lines" | "zero_total" | "bad_quantity" | "discount_too_big"> = [];
  if (!lines.length) problems.push("no_lines");
  if (lines.some((l) => !(l.quantity > 0))) problems.push("bad_quantity");
  if (lines.some((l) => l.discount < 0 || l.discount > Math.round(l.quantity * l.unit_price))) problems.push("discount_too_big");
  if (lines.length && linesTotal(lines, 0).subtotal <= 0) problems.push("zero_total");
  return problems;
}

/** An ISO day (yyyy-mm-dd) moved by whole days, without time zone drift. */
export function addDays(day: string, days: number) {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
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
  if (i.issued_on) return new Date(`${addDays(i.issued_on, 30)}T00:00:00`);
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

/* ---------------------------------------------------------------- Amount in words */

const FA_ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const FA_TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const FA_TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const FA_HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const FA_SCALES = ["", "هزار", "میلیون", "میلیارد", "هزار میلیارد"];

const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const EN_TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const EN_SCALES = ["", "thousand", "million", "billion", "trillion"];

function faTriple(n: number) {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(FA_HUNDREDS[h]);
  if (rest >= 10 && rest < 20) parts.push(FA_TEENS[rest - 10]);
  else {
    if (rest >= 20) parts.push(FA_TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(FA_ONES[rest % 10]);
  }
  return parts.join(" و ");
}

function enTriple(n: number) {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (rest >= 10 && rest < 20) parts.push(EN_TEENS[rest - 10]);
  else if (rest >= 20) parts.push(EN_TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${EN_ONES[rest % 10]}` : ""));
  else if (rest) parts.push(EN_ONES[rest]);
  return parts.join(" ");
}

/**
 * A whole amount written out, for the "amount in words" line of an invoice.
 * Persian joins every group with «و»: ۱٬۲۰۰٬۰۰۰ → «یک میلیون و دویست هزار».
 */
export function amountInWords(value: number, lang: "fa" | "en") {
  const n = Math.round(Math.abs(value));
  if (n === 0) return lang === "fa" ? "صفر" : "zero";
  if (n >= 1e15) return lang === "fa" ? n.toLocaleString("fa-IR") : n.toLocaleString("en-US");
  const groups: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 1000)) groups.push(v % 1000);
  const words: string[] = [];
  for (let g = groups.length - 1; g >= 0; g--) {
    const part = groups[g];
    if (!part) continue;
    const triple = lang === "fa" ? faTriple(part) : enTriple(part);
    const scale = lang === "fa" ? FA_SCALES[g] : EN_SCALES[g];
    words.push(scale ? `${triple} ${scale}` : triple);
  }
  const text = words.join(lang === "fa" ? " و " : " ");
  return value < 0 ? (lang === "fa" ? `منفی ${text}` : `minus ${text}`) : text;
}
