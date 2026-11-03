import assert from "node:assert/strict";
import { test } from "node:test";

import { wrapLabel } from "../src/lib/portal/geometry.ts";
import { clearWidth, columnsAlong, repeatRect, snapToWall, turn, wallOf } from "../src/lib/portal/structure.ts";
import {
  equipmentPatch,
  kitOf,
  mergeKit,
  minQuantity,
  nextEquipmentStep,
  quantityPatch,
  removable,
  standardKit,
  stockLeft,
} from "../src/lib/portal/furniture.ts";

const hall = { width_m: 60, depth_m: 40 };

test("columns along a horizontal corridor sit on its centre line, evenly spaced", () => {
  const aisle = { x: 0, y: 10, width: 30, depth: 3 };
  const cols = columnsAlong(aisle, 3, 0.6, "centre");
  assert.equal(cols.length, 3);
  for (const c of cols) assert.equal(c.y, 11.2);
  assert.deepEqual(
    cols.map((c) => c.x),
    [4.7, 14.7, 24.7],
  );
});

test("columns on both edges of a vertical corridor come in pairs", () => {
  const aisle = { x: 20, y: 0, width: 4, depth: 40 };
  const cols = columnsAlong(aisle, 2, 0.5, "edges");
  assert.equal(cols.length, 4);
  assert.deepEqual([...new Set(cols.map((c) => c.x))], [20, 23.5]);
  assert.equal(columnsAlong(aisle, 0).length, 0);
});

test("repeat stops at the hall edge", () => {
  const col = { x: 50, y: 5, width: 0.6, depth: 0.6 };
  assert.equal(repeatRect(col, 10, 4, "across", hall).length, 2);
  assert.equal(repeatRect(col, 3, 9, "down", hall).length, 3);
});

test("snapping an entrance to a wall lays it along that wall", () => {
  const door = { x: 30, y: 20, width: 1, depth: 6 };
  const top = snapToWall(door, "top", hall);
  assert.deepEqual(top, { x: 27.5, y: 0, width: 6, depth: 1 });
  assert.equal(wallOf(top, hall), "top");
  const right = snapToWall(door, "right", hall);
  assert.deepEqual(right, { x: 59, y: 20, width: 1, depth: 6 });
  assert.equal(wallOf({ x: 10, y: 10, width: 2, depth: 2 }, hall), null);
});

test("turning keeps the centre and stays inside the hall", () => {
  assert.deepEqual(turn({ x: 10, y: 10, width: 6, depth: 2 }, hall), { x: 12, y: 8, width: 2, depth: 6 });
  const edge = turn({ x: 0, y: 0, width: 10, depth: 1 }, hall);
  assert.ok(edge.x >= 0 && edge.y >= 0);
  assert.equal(clearWidth({ width: 30, depth: 3 }), 3);
});

test("full company names wrap onto several lines before shrinking", () => {
  const fit = wrapLabel("شرکت فولاد سازان کرمان", 4, 3, 0.9);
  assert.ok(fit.lines.length >= 2);
  assert.equal(fit.complete, true);
  assert.equal(fit.lines.join(" "), "شرکت فولاد سازان کرمان");
  const tiny = wrapLabel("A very long company name that cannot fit", 0.6, 0.3, 0.9);
  assert.equal(tiny.complete, false);
});

const line = (over = {}) => ({ id: "l1", item_id: "chair", quantity: 4, stage: "requested", delivered_qty: 0, collected_qty: 0, damaged_qty: 0, ...over });

test("furniture quantities never drop below what is already at the booth", () => {
  assert.equal(minQuantity(line()), 1);
  assert.equal(minQuantity(line({ stage: "delivered", delivered_qty: 4 })), 4);
  assert.equal(quantityPatch(line(), 0)?.quantity, 1);
  assert.equal(quantityPatch(line({ stage: "delivered", delivered_qty: 4 }), 2), null);
  assert.equal(quantityPatch(line(), 4), null);
  assert.equal(quantityPatch(line({ stage: "collected", delivered_qty: 4, collected_qty: 4 }), 6), null);
});

test("adding to a delivered line sends the extra pieces back to the delivery list", () => {
  assert.deepEqual(quantityPatch(line({ stage: "delivered", delivered_qty: 4 }), 6), { quantity: 6, stage: "requested" });
  assert.deepEqual(quantityPatch(line({ quantity: 6, delivered_qty: 4 }), 4), { quantity: 4, stage: "delivered" });
  assert.equal(nextEquipmentStep(line({ quantity: 6, delivered_qty: 4 }), true), "deliver");
  assert.deepEqual(Object.keys(equipmentPatch(line(), "deliver")).sort(), ["delivered_at", "delivered_qty", "stage"]);
});

test("only lines with nothing delivered can be deleted", () => {
  assert.equal(removable(line()), true);
  assert.equal(removable(line({ stage: "delivered", delivered_qty: 1 })), false);
});

test("stock left counts every active line in the exhibition", () => {
  const item = { id: "chair", sku: "chair", on_hand: 10 };
  const orders = [line(), line({ id: "l2", quantity: 3, stage: "collected", delivered_qty: 3, collected_qty: 3 }), line({ id: "l3", quantity: 2, stage: "cancelled" })];
  assert.equal(stockLeft(item, orders), 6);
});

test("a kit tops up existing lines and adds the rest", () => {
  const { updates, inserts } = mergeKit([line()], [
    { item_id: "chair", quantity: 2 },
    { item_id: "table", quantity: 1 },
    { item_id: "table", quantity: 1 },
  ]);
  assert.deepEqual(updates, [{ id: "l1", quantity: 6 }]);
  assert.deepEqual(inserts, [{ item_id: "table", quantity: 2 }]);
  assert.deepEqual(kitOf([line(), line({ id: "x", stage: "cancelled" })]), [{ item_id: "chair", quantity: 4 }]);
});

test("the standard kit grows with the booth and skips items the store room lacks", () => {
  const items = ["table", "chair", "spot", "socket"].map((sku) => ({ id: sku, sku, on_hand: 10 }));
  const small = standardKit(9, items);
  assert.deepEqual(small.map((k) => k.item_id), ["table", "chair", "spot", "socket"]);
  assert.equal(small.find((k) => k.item_id === "spot").quantity, 2);
  const big = standardKit(36, items);
  assert.equal(big.find((k) => k.item_id === "chair").quantity, 4);
  assert.equal(big.find((k) => k.item_id === "spot").quantity, 6);
});
