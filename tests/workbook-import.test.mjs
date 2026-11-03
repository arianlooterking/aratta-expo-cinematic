import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";

import { buildDataset, invoiceLine, stageFromStatus, summarise } from "../scripts/workbook/build.mjs";
import { parseBoothLabel, parseHallMap } from "../scripts/workbook/hall-map.mjs";
import {
  companyKey,
  extractPhones,
  jalaliToGregorian,
  normalizeText,
  parseAmount,
  parseJalaliDate,
} from "../scripts/workbook/normalize.mjs";
import { proposePlan } from "../scripts/workbook/plan.mjs";

const GREEN = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8BC34A" } };

/** A small synthetic workbook shaped like Aratta's real one (no real data). */
function fixtureWorkbook() {
  const wb = new ExcelJS.Workbook();

  const hall = wb.addWorksheet("سالن خواجوی کرمانی 1405", { views: [{ rightToLeft: true }] });
  hall.mergeCells("A1:Z3");
  hall.getCell("A1").value = "دهمین نمایشگاه بین المللی معدن کرمان";
  const booths = [
    ["B5:D7", "K1 9m شرکت نمونه یک", GREEN],
    ["E5:H7", "K2   12m", null],
    ["I5:L7", "K3 12M رزرو نمونه دو", null],
    ["B9:G10", "k4  12m² نمونه سه", GREEN],
    ["H9:J10", "6m", null],
    ["K9:M10", "درب بار انداز", null],
    ["N5:O6", "ورودی سالن", null],
    ["P5:Q6", "K5 4m", null],
  ];
  for (const [range, text, fill] of booths) {
    hall.mergeCells(range);
    const cell = hall.getCell(range.split(":")[0]);
    cell.value = text;
    if (fill) cell.fill = fill;
  }

  const invoices = wb.addWorksheet("پیش فاکتور معدن 1405");
  invoices.getRow(1).values = ["اسم شرکت", null, null, null, null, "مالی", null, "مالی", "مالی"];
  invoices.getRow(2).values = [
    "سالن خواجو",
    "شماره تلفن اول",
    "متراژ",
    "واحد",
    "مبلغ قبل از ارزش افزوده",
    "مبلغ فاکتور اجاره زمین با ارزش افزوده و کسر تخفیف",
    "وضعیت فاکتور",
    "وصول شده",
    "مانده",
  ];
  invoices.getRow(3).values = ["نمونه یک (K1)", "آقای نمونه 09120000001", 9, 45000000, 405000000, 445500000, "ارسال سامانه", 200000000, 245500000];
  invoices.getRow(4).values = ["شرکت نمونه سه (K4)", "09120000002", 12, 45000000, 540000000, 534600000, "صدور فاکتور", 0, 534600000];
  invoices.getRow(5).values = ["جمع", null, 21, null, 945000000, 980100000];

  const crm = wb.addWorksheet("crmمعدن 1405");
  crm.getRow(1).values = [null, null, null, "وضعیت", "مهتاب", "بردیا"];
  crm.getRow(2).values = ["شرکت", "رابط", "حوزه فعالیت", null, "تاریخ", "تاریخ"];
  crm.getRow(3).values = ["نمونه چهار", "خانم آزمایشی 09120000003", "معدن", "شرکت نمیکنن", "19تیر", null];
  crm.getRow(4).values = ["نمونه یک", "آقای نمونه", "معدن", null, null, "ارسال شد 2 مرداد"];

  const equipment = wb.addWorksheet("تجهیزات نمایشگاه معدن 1405");
  equipment.getRow(1).values = ["ردیف", "نام شرکت", "تلویزیون 55 (252)", "میز جلسه (310)", "صندلی (311)", "مبلغ کل", "پرداختی", "مانده", "وضعیت"];
  equipment.getRow(2).values = [1, "نمونه یک", 1, null, 4, 22000000, 22000000, 0, "رسمی"];
  equipment.getRow(3).values = [2, "نمونه سه", null, 1, 2, 5000000, 0, 5000000, "غیر رسمی"];

  wb.addWorksheet("خالی");
  return wb;
}

test("normalises Arabic letters, digits and spacing", () => {
  assert.equal(normalizeText("  علي   ۱۲۳ كرمان "), "علی 123 کرمان");
  assert.equal(companyKey("شرکت  نمونه-یک"), companyKey("نمونه یک"));
});

test("reads money written in several styles", () => {
  assert.equal(parseAmount("4,032,600,000"), 4032600000);
  assert.equal(parseAmount("2.000.000"), 2000000);
  assert.equal(parseAmount("60 میلیون"), 60000000);
  assert.equal(parseAmount({ formula: "C3*D3", result: 2295000000 }), 2295000000);
  assert.equal(parseAmount("—"), null);
});

test("finds Iranian phone numbers in free text", () => {
  assert.deepEqual(extractPhones("روستایی 09353429718"), ["09353429718"]);
  assert.deepEqual(extractPhones(9131965919), ["09131965919"]);
  assert.deepEqual(extractPhones("021-88203356"), ["02188203356"]);
});

test("converts Jalali dates", () => {
  assert.deepEqual(jalaliToGregorian(1405, 1, 1), { year: 2026, month: 3, day: 21 });
  assert.deepEqual(jalaliToGregorian(1404, 7, 1), { year: 2025, month: 9, day: 23 });
  assert.equal(parseJalaliDate("19تیر", 1405), "2026-07-10T05:30:00.000Z");
  assert.equal(parseJalaliDate("1402/05/28"), "2023-08-19T05:30:00.000Z");
  assert.equal(parseJalaliDate("سه شنبه _ 1 مهر 23 september 20:05", 1404), "2025-09-23T16:35:00.000Z");
  assert.equal(parseJalaliDate("بدون تاریخ", 1405), null);
});

test("splits booth labels", () => {
  assert.deepEqual(parseBoothLabel("k11     12m کوماتسو مرکزی"), { code: "K11", area: 12, company: "کوماتسو مرکزی", held: false });
  assert.deepEqual(parseBoothLabel("S45  132"), { code: "S45", area: 132, company: null, held: false });
  assert.equal(parseBoothLabel("  K21  161m²  رزرو هلدینگ ماهان").held, true);
  assert.equal(parseBoothLabel("یاتاقان سازی SDFR (B1)").code, "B1");
});

test("billed totals win over area x unit price", () => {
  assert.deepEqual(invoiceLine("space", 51, 45000000, 2524500000, null, 0.1), {
    service: "space", quantity: 51, unit: "m2", unit_price: 45000000,
  });
  const discounted = invoiceLine("space", 33, 45000000, 1386000000, null, 0.1);
  assert.equal(discounted.discount, 1485000000 - 1260000000);
  assert.deepEqual(invoiceLine("space", 400, 45000000, 47850000000, null, 0.1), {
    service: "space", quantity: 1, unit: "lump", unit_price: 43500000000,
  });
  assert.equal(invoiceLine("space", null, null, null, null, 0.1), null);
});

test("deal stage from Persian status notes", () => {
  assert.equal(stageFromStatus("فروش قطعی"), "won");
  assert.equal(stageFromStatus("شرکت نمیکنن"), "lost");
  assert.equal(stageFromStatus("ارسال شد"), "proposal");
  assert.equal(stageFromStatus(""), null);
});

test("hall drawing becomes booths and features in metres (RTL mirrored)", () => {
  const ws = fixtureWorkbook().getWorksheet("سالن خواجوی کرمانی 1405");
  const hall = parseHallMap(ws);
  assert.equal(hall.title, "دهمین نمایشگاه بین المللی معدن کرمان");
  assert.equal(hall.width, 16);
  assert.equal(hall.depth, 6);
  const k1 = hall.booths.find((b) => b.code === "K1");
  assert.deepEqual(
    { x: k1.x, y: k1.y, width: k1.width, depth: k1.depth, status: k1.status, company: k1.company },
    { x: 13, y: 0, width: 3, depth: 3, status: "contracted", company: "شرکت نمونه یک" },
  );
  assert.equal(hall.booths.find((b) => b.code === "K3").status, "held");
  assert.equal(hall.booths.find((b) => b.code === "K2").status, "available");
  assert.ok(hall.booths.some((b) => b.code === "X1"), "booth without a code gets a placeholder");
  assert.deepEqual(hall.features.map((f) => f.kind).sort(), ["entrance", "loading"]);
});

test("plan guesses sheet kinds and exhibitions", () => {
  const plan = proposePlan(fixtureWorkbook());
  const kinds = Object.fromEntries(plan.sheets.map((s) => [s.sheet, s.kind]));
  assert.equal(kinds["سالن خواجوی کرمانی 1405"], "hall_map");
  assert.equal(kinds["پیش فاکتور معدن 1405"], "invoices");
  assert.equal(kinds["crmمعدن 1405"], "crm");
  assert.equal(kinds["تجهیزات نمایشگاه معدن 1405"], "equipment_matrix");
  assert.equal(kinds["خالی"], "skip");
  assert.deepEqual(plan.exhibitions.map((e) => e.slug), ["kerman-mining-1405"]);
  assert.deepEqual(Object.keys(plan.salespeople).sort(), ["بردیا", "مهتاب"]);
});

test("dataset links companies, booths, invoices, follow-ups and equipment", () => {
  const wb = fixtureWorkbook();
  const plan = proposePlan(wb);
  const ds = buildDataset(wb, plan);
  const summary = summarise(ds);

  assert.equal(summary.halls, 1);
  assert.equal(summary.booths, 6);
  assert.equal(summary.invoices, 4, "two space invoices + two equipment invoices; the total row is ignored");
  assert.equal(summary.invoicesLinkedToBooths, 2);
  assert.ok(![...ds.companies.values()].some((c) => c.name_fa === "جمع"));

  const one = ds.deals.get(`kerman-mining-1405|${companyKey("نمونه یک")}`);
  assert.equal(one.stage, "won");
  assert.equal(one.owner, "بردیا");
  assert.equal(ds.deals.get(`kerman-mining-1405|${companyKey("نمونه چهار")}`).stage, "lost");

  const followUp = ds.activities.find((a) => a.author === "مهتاب");
  assert.equal(followUp.summary, "19تیر");
  assert.equal(followUp.occurred_at, "2026-07-10T05:30:00.000Z");

  const k4Invoice = ds.invoices.find((i) => i.boothCode === "K4");
  assert.equal(k4Invoice.lines[0].discount, 540000000 - 486000000);
  assert.equal(k4Invoice.status, "issued");
  assert.equal(ds.invoices.find((i) => i.boothCode === "K1").collected, 200000000);

  assert.deepEqual([...ds.items.keys()].sort(), ["item-252", "item-310", "item-311"]);
  assert.equal(ds.orders.length, 4);
  const unofficial = ds.invoices.find((i) => i.lines[0].service === "equipment" && !i.official);
  assert.equal(unofficial.vatRate, 0);

  const contact = [...ds.contacts.values()].find((c) => c.phone === "09120000003");
  assert.equal(contact.full_name, "خانم آزمایشی");
});
