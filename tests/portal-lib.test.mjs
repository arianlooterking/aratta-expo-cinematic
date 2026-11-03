import assert from "node:assert/strict";
import { test } from "node:test";

import { boothListPrice, dealBalances, invoiceTotals, paidShare } from "../src/lib/portal/money.ts";
import { deriveBooth, deriveOrder } from "../src/lib/portal/rules.ts";
import {
  clampRect,
  fitLabel,
  nextCode,
  overlapping,
  rectFromPoints,
  snap,
  toPlan,
  zoomAt,
} from "../src/lib/portal/geometry.ts";
import {
  defaultExhibition,
  dueFollowUps,
  exhibitionPhase,
  summariseEquipment,
  summariseMoney,
  summariseSpace,
} from "../src/lib/portal/metrics.ts";
import { compact, date, num, pick } from "../src/lib/portal/format.ts";
import { DemoStore } from "../src/lib/portal/demo-store.ts";
import { demoSeed } from "../src/lib/portal/demo-seed.ts";
import { collectionKey } from "../src/lib/portal/store.ts";

// ---------- money: the same maths as the invoice_totals and deal_balances views

const invoices = [
  { id: "i1", deal_id: "d1", company_id: "c1", status: "issued", vat_rate: 0.1 },
  { id: "i2", deal_id: "d1", company_id: "c1", status: "cancelled", vat_rate: 0.1 },
  { id: "i3", deal_id: "d2", company_id: "c2", status: "issued", vat_rate: 0 },
];
const lines = [
  { invoice_id: "i1", quantity: 2, unit_price: 1_000, discount: 200 },
  { invoice_id: "i1", quantity: 1.5, unit_price: 1_000, discount: 0 },
  { invoice_id: "i2", quantity: 1, unit_price: 9_999, discount: 0 },
  { invoice_id: "i3", quantity: 1, unit_price: 500, discount: 0 },
];
const payments = [
  { invoice_id: "i1", deal_id: null, amount: 1_000, voided_at: null },
  { invoice_id: "i1", deal_id: null, amount: 5_000, voided_at: "2026-01-01" },
  { invoice_id: null, deal_id: "d2", amount: 100, voided_at: null },
];

test("invoice totals add VAT after discounts and skip cancelled invoices", () => {
  const totals = invoiceTotals(invoices, lines, payments);
  assert.deepEqual(totals.get("i1"), { subtotal: 3_300, vat: 330, total: 3_630, paid: 1_000, balance: 2_630 });
  assert.equal(totals.has("i2"), false, "cancelled invoices are left out");
  assert.equal(totals.get("i3").total, 500);
});

test("deal balances count deal-level payments and ignore voided ones", () => {
  const totals = invoiceTotals(invoices, lines, payments);
  const balances = dealBalances(invoices, totals, payments);
  assert.deepEqual(balances.get("d1"), { invoiced: 3_630, paid: 1_000, balance: 2_630 });
  assert.deepEqual(balances.get("d2"), { invoiced: 500, paid: 100, balance: 400 });
});

test("booth list price prefers the override, else area times the rate", () => {
  assert.equal(boothListPrice({ area_m2: 12, price_override: 7 }, 100), 7);
  assert.equal(boothListPrice({ area_m2: 12.5, price_override: null }, 100), 1_250);
  assert.equal(boothListPrice({ area_m2: 12, price_override: null }, null), null);
});

test("paid share stays between 0 and 1", () => {
  assert.equal(paidShare(undefined), null);
  assert.equal(paidShare({ invoiced: 0, paid: 10, balance: -10 }), null);
  assert.equal(paidShare({ invoiced: 100, paid: 25, balance: 75 }), 0.25);
  assert.equal(paidShare({ invoiced: 100, paid: 150, balance: -50 }), 1);
});

// ---------- rules: the fields the database triggers derive

const booth = {
  width: 3,
  depth: 4.5,
  area_m2: 0,
  area_is_manual: false,
  code: " B12 ",
  deal_id: null,
  status: "available",
  hall_id: "h1",
  exhibition_id: "",
};

test("booth area and exhibition come from its size and hall", () => {
  const next = deriveBooth(booth, () => "e1");
  assert.equal(next.area_m2, 13.5);
  assert.equal(next.exhibition_id, "e1");
  assert.equal(next.code, "B12");
  assert.equal(deriveBooth({ ...booth, area_is_manual: true, area_m2: 20 }, () => "e1").area_m2, 20);
});

test("a deal reserves a booth and removing it frees the booth", () => {
  assert.equal(deriveBooth({ ...booth, deal_id: "d1" }, () => "e1").status, "reserved");
  assert.equal(deriveBooth({ ...booth, deal_id: "d1", status: "held" }, () => "e1").status, "reserved");
  assert.equal(deriveBooth({ ...booth, deal_id: "d1", status: "paid" }, () => "e1").status, "paid");
  assert.equal(deriveBooth({ ...booth, status: "paid" }, () => "e1").status, "available");
  assert.equal(deriveBooth({ ...booth, status: "blocked" }, () => "e1").status, "blocked");
});

test("equipment orders inherit the booth and stamp delivery and collection", () => {
  const order = {
    booth_id: "b1",
    deal_id: null,
    exhibition_id: "",
    stage: "delivered",
    quantity: 6,
    delivered_qty: 0,
    collected_qty: 0,
    damaged_qty: 0,
    delivered_at: null,
    collected_at: null,
  };
  const at = "2026-11-03T08:00:00.000Z";
  const delivered = deriveOrder(order, () => ({ exhibition_id: "e1", deal_id: "d1" }), at);
  assert.equal(delivered.exhibition_id, "e1");
  assert.equal(delivered.deal_id, "d1");
  assert.equal(delivered.delivered_qty, 6);
  assert.equal(delivered.delivered_at, at);

  const collected = deriveOrder({ ...delivered, stage: "collected", damaged_qty: 1 }, () => undefined, at);
  assert.equal(collected.collected_qty, 5, "collected = delivered minus damaged");
  assert.equal(collected.collected_at, at);
});

// ---------- geometry

test("drawing snaps to the grid whichever way the drag goes", () => {
  assert.equal(snap(2.26, 0.5), 2.5);
  assert.deepEqual(rectFromPoints({ x: 5.2, y: 4.9 }, { x: 1.9, y: 1.1 }, 1), { x: 2, y: 1, width: 3, depth: 4 });
});

test("booths are kept inside the hall", () => {
  assert.deepEqual(clampRect({ x: 58, y: -2, width: 4, depth: 3 }, { width_m: 60, depth_m: 36 }), { x: 56, y: 0, width: 4, depth: 3 });
});

test("only real overlaps are flagged, not shared edges", () => {
  const ids = overlapping([
    { id: "a", x: 0, y: 0, width: 3, depth: 3 },
    { id: "b", x: 3, y: 0, width: 3, depth: 3 },
    { id: "c", x: 5, y: 2, width: 3, depth: 3 },
  ]);
  assert.deepEqual([...ids].sort(), ["b", "c"]);
});

test("zooming keeps the point under the cursor still", () => {
  const view = { x: 10, y: 20, scale: 8 };
  const point = { x: 200, y: 150 };
  const before = toPlan(view, point);
  const after = toPlan(zoomAt(view, 1.5, point), point);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
});

test("labels shrink and shorten to fit a booth", () => {
  const { size, label } = fitLabel("Kerman Copper Industries Group", 3, 3, 1);
  assert.ok(size <= 0.75);
  assert.ok(label.endsWith("…") && label.length < 30);
  assert.equal(fitLabel("A1", 6, 6, 1).label, "A1");
});

test("next booth code follows the highest one with the same prefix", () => {
  assert.equal(nextCode(["B01", "B02", "A07"], "B"), "B03");
  assert.equal(nextCode(["B9", "B10"]), "B11");
  assert.equal(nextCode(["A1", "A2", "A3"], "A"), "A4");
  assert.equal(nextCode([], "K"), "K01");
});

// ---------- metrics

const show = { build_starts_on: "2026-11-10", starts_on: "2026-11-12", ends_on: "2026-11-15", strike_ends_on: "2026-11-16", status: "selling" };
const at = (iso) => new Date(`${iso}T12:00:00`);

test("the phase follows the show's dates", () => {
  assert.equal(exhibitionPhase(show, at("2026-11-01")), "planning");
  assert.equal(exhibitionPhase(show, at("2026-11-10")), "build");
  assert.equal(exhibitionPhase(show, at("2026-11-12")), "show");
  assert.equal(exhibitionPhase(show, at("2026-11-15")), "show");
  assert.equal(exhibitionPhase(show, at("2026-11-16")), "strike");
  assert.equal(exhibitionPhase(show, at("2026-11-20")), "after");
  assert.equal(exhibitionPhase({ ...show, starts_on: null, ends_on: null, status: "live" }, at("2026-11-01")), "show");
});

test("the default exhibition is the active one, else the next one", () => {
  const list = [
    { id: "old", ...show, build_starts_on: null, starts_on: "2025-03-01", ends_on: "2025-03-04", strike_ends_on: null },
    { id: "later", ...show, build_starts_on: null, starts_on: "2027-03-01", ends_on: "2027-03-04", strike_ends_on: null },
    { id: "soon", ...show },
  ];
  assert.equal(defaultExhibition(list, at("2026-11-13")).id, "soon");
  assert.equal(defaultExhibition(list, at("2026-11-01")).id, "soon");
  assert.equal(defaultExhibition(list, at("2026-12-01")).id, "later");
  assert.equal(defaultExhibition([], at("2026-12-01")), null);
});

test("equipment summary tracks what is left to deliver and collect", () => {
  const returnable = (id) => id !== "water";
  const line = (o) => ({ item_id: "chair", quantity: 4, delivered_qty: 0, collected_qty: 0, damaged_qty: 0, ...o });
  assert.equal(summariseEquipment([], returnable).state, "none");
  assert.equal(summariseEquipment([line({ stage: "requested" })], returnable).state, "waiting");
  assert.equal(summariseEquipment([line({ stage: "delivered", delivered_qty: 4 }), line({ stage: "requested" })], returnable).state, "partial");

  const delivered = summariseEquipment([line({ stage: "delivered", delivered_qty: 4 }), line({ item_id: "water", stage: "delivered", delivered_qty: 4 })], returnable);
  assert.equal(delivered.state, "delivered");
  assert.equal(delivered.toCollect, 4, "consumables are not collected back");

  const collecting = summariseEquipment([line({ stage: "delivered", delivered_qty: 4, collected_qty: 1 })], returnable);
  assert.equal(collecting.state, "collecting");
  assert.equal(collecting.toCollect, 3);

  assert.equal(summariseEquipment([line({ stage: "collected", delivered_qty: 4, collected_qty: 3, damaged_qty: 1 })], returnable).state, "collected");
  assert.equal(summariseEquipment([line({ stage: "issue" }), line({ stage: "cancelled" })], returnable).state, "issue");
});

test("space summary leaves blocked booths out of the sellable area", () => {
  const s = summariseSpace([
    { id: "1", status: "paid", area_m2: 12, deal_id: "d" },
    { id: "2", status: "available", area_m2: 12, deal_id: null },
    { id: "3", status: "blocked", area_m2: 40, deal_id: null },
  ]);
  assert.equal(s.areaTotal, 24);
  assert.equal(s.areaSold, 12);
  assert.equal(s.soldShare, 0.5);
  assert.equal(s.byStatus.blocked, 1);
});

test("money summary counts companies that still owe", () => {
  const m = summariseMoney([
    { invoiced: 100, paid: 100, balance: 0 },
    { invoiced: 50, paid: 10, balance: 40 },
  ]);
  assert.deepEqual(m, { invoiced: 150, paid: 110, balance: 40, debtors: 1 });
});

test("follow-ups due today or earlier come first, closed deals never", () => {
  const now = at("2026-11-03");
  const due = dueFollowUps(
    [
      { id: "later", stage: "lead", next_follow_up_at: "2026-11-09T09:00:00" },
      { id: "today", stage: "proposal", next_follow_up_at: "2026-11-03T18:00:00" },
      { id: "late", stage: "contacted", next_follow_up_at: "2026-10-30T09:00:00" },
      { id: "won", stage: "won", next_follow_up_at: "2026-10-01T09:00:00" },
      { id: "none", stage: "lead", next_follow_up_at: null },
    ],
    now,
  );
  assert.deepEqual(due.map((d) => d.id), ["late", "today"]);
});

// ---------- format

test("Persian numbers and dates use Persian digits and the Jalali calendar", () => {
  assert.equal(num("fa", 1234), "۱٬۲۳۴");
  assert.equal(num("en", 1234), "1,234");
  assert.match(compact("fa", 12_500_000_000), /[۰-۹]/);
  assert.match(date("fa", "2026-03-21", "long"), /فروردین/);
  assert.equal(date("fa", null), "");
  assert.equal(pick("en", "فارسی", ""), "فارسی", "falls back to Persian when English is empty");
});

// ---------- demo store: behaves like the database

async function rows(store, table, filter = null) {
  store.subscribe(table, filter, () => {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  return store.getSnapshot(collectionKey(table, filter)).rows;
}

test("the demo seed has halls, booths and deals for three exhibitions", async () => {
  const store = new DemoStore(demoSeed);
  const exhibitions = await rows(store, "exhibitions");
  const halls = await rows(store, "halls");
  const booths = await rows(store, "booths");
  assert.equal(exhibitions.length, 3);
  assert.ok(halls.length >= 2);
  assert.ok(booths.length > 20);
  const hallIds = new Set(halls.map((h) => h.id));
  assert.ok(booths.every((b) => hallIds.has(b.hall_id)), "every booth sits in a hall");
});

test("demo booths derive like the database and follow their deal", async () => {
  const store = new DemoStore(demoSeed);
  const [hall] = await rows(store, "halls");
  const [deal] = (await rows(store, "deals")).filter((d) => d.exhibition_id === hall.exhibition_id);
  assert.ok(deal, "the seed has a deal in the first hall's exhibition");

  const created = await store.insert("booths", { id: "test-booth", hall_id: hall.id, code: "Z1 ", x: 0, y: 0, width: 2, depth: 3 });
  assert.equal(created.ok, true);
  assert.equal(created.row.exhibition_id, hall.exhibition_id);
  assert.equal(created.row.area_m2, 6);
  assert.equal(created.row.code, "Z1");

  const reserved = await store.update("booths", "test-booth", { deal_id: deal.id });
  assert.equal(reserved.row.status, "reserved");

  await store.remove("deals", deal.id);
  const after = (await rows(store, "booths")).find((b) => b.id === "test-booth");
  assert.equal(after.deal_id, null);
  assert.equal(after.status, "available");
});

test("logging a call moves a new lead to contacted", async () => {
  const store = new DemoStore(demoSeed);
  const [exhibition] = await rows(store, "exhibitions");
  const [company] = await rows(store, "companies");
  await store.insert("deals", { id: "test-deal", exhibition_id: exhibition.id, company_id: company.id });
  await store.insert("activities", {
    id: "test-call",
    deal_id: "test-deal",
    company_id: company.id,
    kind: "call",
    next_follow_up_at: "2026-11-09T09:00:00.000Z",
  });
  const deal = (await rows(store, "deals")).find((d) => d.id === "test-deal");
  assert.equal(deal.stage, "contacted");
  assert.equal(deal.next_follow_up_at, "2026-11-09T09:00:00.000Z");
  assert.ok(deal.last_contact_at);
});

test("removing a missing row reports it instead of throwing", async () => {
  const store = new DemoStore(demoSeed);
  const result = await store.remove("booths", "does-not-exist");
  assert.deepEqual(result, { ok: false, error: "missing" });
});
