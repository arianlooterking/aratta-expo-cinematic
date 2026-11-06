import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addDays,
  ageing,
  amountInWords,
  bucketOf,
  daysOverdue,
  dueDate,
  invoiceActions,
  issueProblems,
  lineAmount,
  linesTotal,
  nextInvoiceNumber,
  numberTaken,
  toCsv,
} from "../src/lib/portal/finance.ts";
import { invoiceTotals } from "../src/lib/portal/money.ts";
import { checklistOf, checklistProgress, dueGroup, groupByDue, stagePatch, weightedValue } from "../src/lib/portal/work.ts";

test("line and invoice totals match the database view", () => {
  // 51 m² × 45,000,000 with a 5,000,000 discount, plus 10% VAT.
  const lines = [
    { quantity: 51, unit_price: 45_000_000, discount: 5_000_000 },
    { quantity: 2.5, unit_price: 1_000_001, discount: 0 },
  ];
  assert.equal(lineAmount(lines[0]), 2_290_000_000);
  assert.equal(lineAmount(lines[1]), 2_500_003);
  const t = linesTotal(lines, 0.1);
  assert.deepEqual(t, { gross: 2_297_500_003, discount: 5_000_000, subtotal: 2_292_500_003, vat: 229_250_000, total: 2_521_750_003 });

  const totals = invoiceTotals(
    [{ id: "i1", deal_id: "d1", company_id: "c1", status: "issued", vat_rate: 0.1 }],
    lines.map((l) => ({ ...l, invoice_id: "i1" })),
    [{ invoice_id: "i1", deal_id: null, amount: 1_000_000_000, voided_at: null }],
  );
  assert.equal(totals.get("i1").total, t.total);
  assert.equal(totals.get("i1").balance, t.total - 1_000_000_000);
});

test("invoice numbers continue the highest one and keep its shape", () => {
  assert.equal(nextInvoiceNumber([]), "1");
  assert.equal(nextInvoiceNumber([{ number: null }, { number: "1201" }, { number: "1240" }, { number: "998" }]), "1241");
  assert.equal(nextInvoiceNumber([{ number: "P-1405-009" }, { number: "P-1405-002" }]), "P-1405-010");
  assert.equal(nextInvoiceNumber([{ number: "۱۲۰۹" }]), "1210");
  assert.equal(nextInvoiceNumber([{ number: "draft" }]), "1");
  assert.equal(numberTaken([{ id: "a", number: "۱۲۰۹" }], "1209"), true);
  assert.equal(numberTaken([{ id: "a", number: "1209" }], "1209", "a"), false);
});

test("status moves and what blocks issuing", () => {
  assert.deepEqual(invoiceActions("draft"), ["issue", "cancel"]);
  assert.deepEqual(invoiceActions("issued"), ["register", "cancel", "reopen"]);
  assert.deepEqual(invoiceActions("registered"), ["cancel"]);
  assert.deepEqual(invoiceActions("cancelled"), ["reopen"]);
  assert.deepEqual(issueProblems([]), ["no_lines"]);
  assert.deepEqual(issueProblems([{ quantity: 0, unit_price: 10, discount: 0 }]), ["bad_quantity", "zero_total"]);
  assert.deepEqual(issueProblems([{ quantity: 1, unit_price: 10, discount: 11 }]), ["discount_too_big", "zero_total"]);
  assert.deepEqual(issueProblems([{ quantity: 1, unit_price: 10, discount: 2 }]), []);
});

test("due dates and receivables by age", () => {
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(dueDate({ due_on: null, issued_on: null }), null);
  assert.equal(dueDate({ due_on: null, issued_on: "2026-10-01" }).getDate(), 31);
  const now = new Date("2026-11-03T12:00:00");
  assert.equal(daysOverdue({ due_on: "2026-11-03", issued_on: null }, now), 0);
  assert.equal(daysOverdue({ due_on: "2026-10-01", issued_on: null }, now), 33);
  assert.equal(bucketOf(0), "current");
  assert.equal(bucketOf(30), "d30");
  assert.equal(bucketOf(31), "d60");
  assert.equal(bucketOf(91), "older");

  const invoices = [
    { id: "a", company_id: "c1", status: "issued", due_on: "2026-11-20", issued_on: "2026-10-20", number: "1", kind: "final" },
    { id: "b", company_id: "c1", status: "registered", due_on: "2026-09-01", issued_on: null, number: "2", kind: "final" },
    { id: "c", company_id: "c2", status: "draft", due_on: "2026-01-01", issued_on: null, number: null, kind: "final" },
    { id: "d", company_id: "c2", status: "issued", due_on: "2026-10-30", issued_on: null, number: "3", kind: "final" },
  ];
  const totals = new Map([
    ["a", { subtotal: 0, vat: 0, total: 100, paid: 0, balance: 100 }],
    ["b", { subtotal: 0, vat: 0, total: 300, paid: 100, balance: 200 }],
    ["c", { subtotal: 0, vat: 0, total: 999, paid: 0, balance: 999 }],
    ["d", { subtotal: 0, vat: 0, total: 50, paid: 50, balance: 0 }],
  ]);
  const { buckets, byCompany } = ageing(invoices, totals, now);
  assert.deepEqual(buckets, { current: 100, d30: 0, d60: 0, d90: 200, older: 0 }, "63 days late sits in 61–90");
  assert.deepEqual(byCompany.get("c1"), { balance: 300, overdue: 200, oldest: 63, invoices: 2 });
  assert.equal(byCompany.has("c2"), false, "drafts and settled invoices are not receivables");
});

test("amounts in words for the invoice footer", () => {
  assert.equal(amountInWords(0, "fa"), "صفر");
  assert.equal(amountInWords(15, "fa"), "پانزده");
  assert.equal(amountInWords(1_200_000, "fa"), "یک میلیون و دویست هزار");
  assert.equal(amountInWords(2_524_500_000, "fa"), "دو میلیارد و پانصد و بیست و چهار میلیون و پانصد هزار");
  assert.equal(amountInWords(1_001, "fa"), "یک هزار و یک");
  assert.equal(amountInWords(2_524_500_000, "en"), "two billion five hundred twenty-four million five hundred thousand");
  assert.equal(amountInWords(-40, "en"), "minus forty");
});

test("CSV opens in Excel with Persian text", () => {
  const csv = toCsv([["نام", "مبلغ"], ['شرکت "آلفا", کرمان', 1200], [null, undefined]]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv.slice(1), 'نام,مبلغ\r\n"شرکت ""آلفا"", کرمان",1200\r\n,');
});

test("tasks group by due date and keep checklists readable", () => {
  const now = new Date("2026-11-03T10:00:00");
  assert.equal(dueGroup(null, now), "none");
  assert.equal(dueGroup("2026-11-02T17:00:00", now), "overdue");
  assert.equal(dueGroup("2026-11-03T17:00:00", now), "today");
  assert.equal(dueGroup("2026-11-03T09:00:00", now), "overdue");
  assert.equal(dueGroup("2026-11-08T17:00:00", now), "week");
  assert.equal(dueGroup("2026-12-01T17:00:00", now), "later");
  const g = groupByDue([{ d: "2026-11-05T17:00:00" }, { d: "2026-11-04T17:00:00" }, { d: null }], (r) => r.d, now);
  assert.deepEqual(g.week.map((r) => r.d), ["2026-11-04T17:00:00", "2026-11-05T17:00:00"]);
  assert.equal(g.none.length, 1);

  const items = checklistOf(["Call", { id: "x", text: "Send PDF", done: true }, { title: "" }, 4]);
  assert.deepEqual(items, [
    { id: "c0", text: "Call", done: false },
    { id: "x", text: "Send PDF", done: true },
  ]);
  assert.deepEqual(checklistProgress(items), { done: 1, total: 2 });
  assert.deepEqual(checklistOf(null), []);
});

test("deal stage moves and weighted value", () => {
  assert.equal(stagePatch({ stage: "lead", lost_reason: null }, "lead"), null);
  assert.equal(stagePatch({ stage: "lead", lost_reason: null }, "lost", "  "), null);
  assert.deepEqual(stagePatch({ stage: "lead", lost_reason: null }, "lost", "Price"), { stage: "lost", lost_reason: "Price" });
  assert.deepEqual(stagePatch({ stage: "lost", lost_reason: "Price" }, "proposal"), { stage: "proposal", lost_reason: null });
  assert.equal(weightedValue({ stage: "proposal", estimated_value: 1000, probability: null }), 500);
  assert.equal(weightedValue({ stage: "proposal", estimated_value: 1000, probability: 80 }), 800);
  assert.equal(weightedValue({ stage: "won", estimated_value: null, probability: null }), 0);
});
