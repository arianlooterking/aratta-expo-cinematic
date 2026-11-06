import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCount, setItemCount } from "../src/lib/portal/furniture.ts";

const line = (over = {}) => ({ id: "l1", item_id: "chair", quantity: 2, stage: "requested", delivered_qty: 0, collected_qty: 0, damaged_qty: 0, ...over });

test("the first tap on an item adds a new line", () => {
  assert.deepEqual(setItemCount([], 1), { kind: "insert", quantity: 1 });
  assert.deepEqual(setItemCount([], 0), { kind: "none" });
  assert.deepEqual(setItemCount([line({ stage: "cancelled" })], 3), { kind: "insert", quantity: 3 }, "cancelled lines don't count");
});

test("plus and minus move the open line up and down", () => {
  assert.deepEqual(setItemCount([line()], 3), { kind: "update", id: "l1", quantity: 3 });
  assert.deepEqual(setItemCount([line()], 1), { kind: "update", id: "l1", quantity: 1 });
  assert.deepEqual(setItemCount([line()], 2), { kind: "none" });
});

test("going to zero takes the line off while nothing has gone out", () => {
  assert.deepEqual(setItemCount([line({ quantity: 1 })], 0), { kind: "remove", id: "l1" });
  assert.deepEqual(setItemCount([line()], 0), { kind: "remove", id: "l1" }, "a typed zero removes it too");
  assert.deepEqual(setItemCount([line({ quantity: 1 })], -3), { kind: "remove", id: "l1" });
});

test("pieces already at the booth can't be taken off the list", () => {
  const out = line({ quantity: 3, stage: "delivered", delivered_qty: 3 });
  assert.deepEqual(setItemCount([out], 2), { kind: "blocked", min: 3 });
  assert.deepEqual(setItemCount([out], 0), { kind: "blocked", min: 3 });
  assert.deepEqual(setItemCount([out], 5), { kind: "update", id: "l1", quantity: 5, stage: "requested" }, "more than delivered goes back to be delivered");

  const partly = line({ quantity: 5, stage: "requested", delivered_qty: 3 });
  assert.deepEqual(setItemCount([partly], 1), { kind: "update", id: "l1", quantity: 3, stage: "delivered" }, "it goes down as far as it can");
  assert.deepEqual(setItemCount([line({ quantity: 3, stage: "requested", delivered_qty: 3 })], 2), { kind: "blocked", min: 3 });
});

test("collected lines stay as history and the count is on top of them", () => {
  const done = line({ id: "old", quantity: 2, stage: "collected", delivered_qty: 2, collected_qty: 2 });
  assert.deepEqual(setItemCount([done], 3), { kind: "insert", quantity: 1 });
  assert.deepEqual(setItemCount([done], 1), { kind: "blocked", min: 2 });
  assert.deepEqual(setItemCount([done], 2), { kind: "none" });

  const open = line({ id: "new", quantity: 1 });
  assert.deepEqual(setItemCount([done, open], 4), { kind: "update", id: "new", quantity: 2 });
  assert.deepEqual(setItemCount([done, open], 2), { kind: "remove", id: "new" });
});

test("a typed number reads Persian, Arabic and Latin digits", () => {
  assert.equal(parseCount("۱۲"), 12);
  assert.equal(parseCount("٣"), 3);
  assert.equal(parseCount(" 7 "), 7);
  assert.equal(parseCount("۰"), 0);
  assert.equal(parseCount("1,200"), 1200);
  assert.equal(parseCount("123456"), 9999, "capped");
  assert.equal(parseCount(""), null);
  assert.equal(parseCount("abc"), null);
});
