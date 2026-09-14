import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateInventoryItemTotals,
  deriveInventoryTotals,
  inventoryItemToCatalogItem,
  inventoryItemsToCatalog,
  makeInventorySlug,
  parseInventoryDelimitedText,
  parseInventoryRows,
  upsertInventoryItems,
  validateInventoryItems,
} from "../src/lib/staff-inventory.ts";

const timestamp = "2026-07-14T12:00:00.000Z";

function inventoryItem(overrides = {}) {
  return {
    id: "tv-55",
    sku: "TV-55",
    name: { fa: "تلویزیون", en: "Television" },
    variant: "55 inch",
    category: "av",
    unit: { fa: "دستگاه", en: "unit" },
    returnable: true,
    onHand: 45,
    lowStockThreshold: 5,
    updatedAt: timestamp,
    ...overrides,
  };
}

function equipmentLine(overrides = {}) {
  return {
    id: "line-tv-55",
    catalogItemId: "tv-55",
    name: { fa: "تلویزیون", en: "Television" },
    quantity: 20,
    stage: "delivered",
    returnable: true,
    deliveryWindow: "",
    pickupWindow: "",
    notes: "",
    updatedAt: timestamp,
    ...overrides,
  };
}

function hallsWithLines(lines) {
  return [
    {
      id: "hall-a",
      name: { fa: "سالن", en: "Hall" },
      width: 1000,
      height: 700,
      physicalWidth: 50,
      physicalHeight: 35,
      unit: "m",
      features: [],
      booths: [
        {
          id: "booth-a",
          code: "A-1",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          area: 25,
          status: "confirmed",
          company: null,
          owner: "",
          notes: "",
          equipment: lines,
          zone: "north",
          updatedAt: timestamp,
        },
      ],
    },
  ];
}

test("45 televisions with 20 assigned leave 25 available", () => {
  const totals = calculateInventoryItemTotals(
    inventoryItem(),
    hallsWithLines([equipmentLine()]),
  );

  assert.deepEqual(totals, {
    itemId: "tv-55",
    sku: "TV-55",
    onHand: 45,
    assigned: 20,
    outstanding: 20,
    missing: 0,
    available: 25,
  });
});

test("a recorded partial collection reports the unreturned unit as missing", () => {
  const item = inventoryItem({ onHand: 8 });
  const line = equipmentLine({
    quantity: 8,
    stage: "issue",
    collectedQuantity: 7,
  });

  assert.deepEqual(calculateInventoryItemTotals(item, hallsWithLines([line])), {
    itemId: "tv-55",
    sku: "TV-55",
    onHand: 8,
    assigned: 1,
    outstanding: 1,
    missing: 1,
    available: 7,
  });
});

test("generic issue lines remain outstanding without inventing a physical shortage", () => {
  const item = inventoryItem({ onHand: 8 });
  const issue = equipmentLine({ quantity: 8, stage: "issue" });
  const totals = calculateInventoryItemTotals(item, hallsWithLines([issue]));

  assert.equal(totals.outstanding, 8);
  assert.equal(totals.missing, 0);
  assert.equal(totals.available, 0);
});

test("a collected returnable line without a count is treated as fully collected", () => {
  const totals = calculateInventoryItemTotals(
    inventoryItem({ onHand: 8 }),
    hallsWithLines([equipmentLine({ quantity: 8, stage: "collected" })]),
  );

  assert.equal(totals.assigned, 0);
  assert.equal(totals.outstanding, 0);
  assert.equal(totals.missing, 0);
  assert.equal(totals.available, 8);
});

test("totals cover every hall and map lines by either inventory ID or SKU", () => {
  const firstHall = hallsWithLines([equipmentLine({ quantity: 3 })])[0];
  const secondHall = structuredClone(firstHall);
  secondHall.id = "hall-b";
  secondHall.booths[0].id = "booth-b";
  secondHall.booths[0].equipment[0].id = "line-b";
  secondHall.booths[0].equipment[0].catalogItemId = "TV-55";
  secondHall.booths[0].equipment[0].quantity = 2;

  const totals = deriveInventoryTotals([inventoryItem()], [firstHall, secondHall]);
  assert.equal(totals.length, 1);
  assert.equal(totals[0].assigned, 5);
  assert.equal(totals[0].available, 40);
});

test("Persian spreadsheet headers, digits, booleans, and AV categories normalize safely", () => {
  const result = parseInventoryRows(
    [
      [
        "کد کالا",
        "نام فارسی",
        "نام انگلیسی",
        "سایز تلویزیون",
        "دسته‌بندی",
        "واحد فارسی",
        "واحد انگلیسی",
        "موجودی فعلی",
        "قابل برگشت",
        "حداقل موجودی",
      ],
      [
        "TV-55",
        "تلویزیون",
        "Television",
        "۵۵ اینچ",
        "صوتی تصویری",
        "دستگاه",
        "unit",
        "۴۵",
        "بله",
        "۵",
      ],
    ],
    { updatedAt: "2026-07-14T15:00:00+03:00" },
  );

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.items, [
    {
      id: "tv-55",
      sku: "TV-55",
      name: { fa: "تلویزیون", en: "Television" },
      variant: "۵۵ اینچ",
      category: "av",
      unit: { fa: "دستگاه", en: "unit" },
      returnable: true,
      onHand: 45,
      lowStockThreshold: 5,
      updatedAt: "2026-07-14T12:00:00.000Z",
    },
  ]);
});

test("CSV parsing supports quoted delimiters, escaped quotes, CRLF, and embedded newlines", () => {
  const rows = parseInventoryDelimitedText(
    '\uFEFFSKU,Name,Category,Unit,Quantity,Returnable\r\n' +
      'TV-55,"Television, 55 ""Pro""",AV,unit,45,yes\r\n' +
      'SIGN-1,"Two-line\r\nsign",support,unit,2,no\r\n',
  );

  assert.deepEqual(rows, [
    ["SKU", "Name", "Category", "Unit", "Quantity", "Returnable"],
    ["TV-55", 'Television, 55 "Pro"', "AV", "unit", "45", "yes"],
    ["SIGN-1", "Two-line\nsign", "support", "unit", "2", "no"],
  ]);
  const parsed = parseInventoryRows(rows, { updatedAt: timestamp });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.items[0].name.en, 'Television, 55 "Pro"');
});

test("delimited parsing auto-detects TSV and supports explicit semicolon files", () => {
  assert.deepEqual(parseInventoryDelimitedText("SKU\tName\tQuantity\nTV-55\tTelevision\t45\n"), [
    ["SKU", "Name", "Quantity"],
    ["TV-55", "Television", "45"],
  ]);
  assert.deepEqual(parseInventoryDelimitedText('SKU;Name\nA-1;"Table; large"', ";"), [
    ["SKU", "Name"],
    ["A-1", "Table; large"],
  ]);
  assert.deepEqual(parseInventoryDelimitedText(""), []);
});

test("TV variants remain distinct and are retained in catalog labels", () => {
  const result = parseInventoryRows(
    [
      ["SKU", "Name", "TV Size", "Category", "Unit", "On Hand", "Returnable", "Threshold"],
      ["TV-55", "Television", "55 inch", "AV", "unit", 45, true, 5],
      ["TV-65", "Television", "65 inch", "AV", "unit", 12, true, 2],
    ],
    { updatedAt: timestamp },
  );

  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map((item) => item.id), ["tv-55", "tv-65"]);
  const catalog = inventoryItemsToCatalog(result.items);
  assert.match(catalog[0].name.en, /55 inch/);
  assert.match(catalog[1].name.en, /65 inch/);
  assert.equal(catalog[0].id, "tv-55");
  assert.equal(catalog[0].category, "av");
});

test("generic names and units populate both locales", () => {
  const result = parseInventoryRows(
    [
      ["code", "product name", "type", "group", "uom", "stock", "reusable"],
      ["TABLE-01", "Meeting table", "180 cm", "furniture", "piece", "1,000", "yes"],
    ],
    { updatedAt: timestamp },
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.items[0].onHand, 1000);
  assert.deepEqual(result.items[0].name, { fa: "Meeting table", en: "Meeting table" });
  assert.deepEqual(result.items[0].unit, { fa: "piece", en: "piece" });
  assert.equal(result.items[0].lowStockThreshold, 0);
});

test("plain English spreadsheet locale headers are accepted", () => {
  const result = parseInventoryRows(
    [
      [
        "SKU",
        "Persian name",
        "English name",
        "Variant",
        "Category",
        "Persian unit",
        "English unit",
        "On hand",
        "Returnable",
        "Low stock threshold",
      ],
      ["tv-55", "تلویزیون", "TV", "55-inch", "av", "دستگاه", "device", 46, true, 5],
    ],
    { updatedAt: timestamp },
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.items[0]?.onHand, 46);
  assert.deepEqual(result.items[0]?.unit, { fa: "دستگاه", en: "device" });
});

test("bad rows are skipped with field-level errors", () => {
  const result = parseInventoryRows(
    [
      ["SKU", "Name", "Category", "Unit", "Quantity", "Returnable", "Threshold"],
      ["BAD-1", "Broken count", "AV", "unit", -1, "yes", 1],
      ["BAD-2", "Broken category", "unknown", "unit", 2, "maybe", 1.5],
      ["😀", "Unsafe code", "AV", "unit", 2, "yes", 1],
      ["GOOD-1", "Valid item", "support", "unit", 0, "no", 0],
    ],
    { updatedAt: timestamp },
  );

  assert.deepEqual(result.items.map((item) => item.id), ["good-1"]);
  assert.ok(result.errors.some((error) => error.row === 2 && error.field === "onHand"));
  assert.ok(result.errors.some((error) => error.row === 3 && error.field === "category"));
  assert.ok(result.errors.some((error) => error.row === 3 && error.field === "returnable"));
  assert.ok(result.errors.some((error) => error.row === 3 && error.field === "lowStockThreshold"));
  assert.ok(result.errors.some((error) => error.row === 4 && error.field === "sku"));
});

test("missing required headers and invalid timestamps fail deterministically", () => {
  const missing = parseInventoryRows([["SKU"], ["TV-55"]]);
  assert.equal(missing.items.length, 0);
  assert.match(missing.errors[0].message, /Missing required columns/);

  const timestampError = parseInventoryRows(
    [["SKU", "Name", "Category", "Unit", "Quantity", "Returnable"]],
    { updatedAt: "not-a-date" },
  );
  assert.match(timestampError.errors[0].message, /valid date/);
});

test("duplicate spreadsheet SKUs use the last valid row", () => {
  const result = parseInventoryRows(
    [
      ["SKU", "Name", "Category", "Unit", "Quantity", "Returnable"],
      ["TV-55", "First", "AV", "unit", 10, "yes"],
      [" tv-55 ", "Latest", "AV", "unit", 45, "yes"],
    ],
    { updatedAt: timestamp },
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name.en, "Latest");
  assert.equal(result.items[0].onHand, 45);
});

test("upsert replaces by normalized SKU or ID while preserving stable order", () => {
  const existing = [
    inventoryItem(),
    inventoryItem({ id: "chair", sku: "CHAIR", variant: undefined, name: { fa: "صندلی", en: "Chair" } }),
  ];
  const replacement = inventoryItem({ id: "tv-55-new", sku: " tv 55 ", onHand: 50 });
  const addition = inventoryItem({ id: "cooler", sku: "COOLER", category: "cooling", onHand: 3 });

  const updated = upsertInventoryItems(existing, [replacement, addition]);
  assert.deepEqual(updated.map((item) => item.id), ["tv-55-new", "chair", "cooler"]);
  assert.equal(updated[0].onHand, 50);
  replacement.name.en = "Mutated after upsert";
  assert.equal(updated[0].name.en, "Television");
});

test("catalog conversion is independent and does not mutate inventory text", () => {
  const source = inventoryItem();
  const catalog = inventoryItemToCatalogItem(source);
  catalog.name.en = "Changed";
  catalog.unit.en = "Changed unit";

  assert.equal(source.name.en, "Television");
  assert.equal(source.unit.en, "unit");
});

test("runtime inventory validation sanitizes valid persisted data", () => {
  const source = inventoryItem({ updatedAt: "2026-07-14T15:00:00+03:00", archived: true, extra: "ignored" });
  const result = validateInventoryItems([source]);

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.items[0].updatedAt, "2026-07-14T12:00:00.000Z");
  assert.equal(Object.hasOwn(result.items[0], "extra"), false);
  assert.equal(result.items[0].archived, true);
  assert.notEqual(result.items[0].name, source.name);
});

test("runtime inventory validation rejects unsafe, duplicate, and malformed records", () => {
  const result = validateInventoryItems([
    inventoryItem({ id: "Unsafe ID", onHand: -1, archived: "yes" }),
    inventoryItem({ id: "tv-55", sku: " tv-55 ", lowStockThreshold: 1.5 }),
  ]);

  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.match(result.errors.join("\n"), /safe slug/);
  assert.match(result.errors.join("\n"), /onHand/);
  assert.match(result.errors.join("\n"), /sku must be unique/);
  assert.match(result.errors.join("\n"), /lowStockThreshold/);
  assert.match(result.errors.join("\n"), /archived/);
  assert.equal(validateInventoryItems({}).valid, false);
});

test("invalid collected counts cannot silently corrupt availability", () => {
  assert.throws(
    () =>
      calculateInventoryItemTotals(
        inventoryItem(),
        hallsWithLines([
          equipmentLine({ quantity: 8, stage: "collected", collectedQuantity: 9 }),
        ]),
      ),
    /Collected quantity/,
  );
});

test("safe inventory slugs remove executable punctuation and preserve Persian IDs", () => {
  assert.equal(makeInventorySlug(" TV/55 <script> "), "tv-55-script");
  assert.equal(makeInventorySlug("میز جلسه ۰۱"), "میز-جلسه-01");
});
