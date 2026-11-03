import assert from "node:assert/strict";
import { test } from "node:test";

import { applyChange } from "../src/lib/platform/live-merge.ts";
import { safeNextPath } from "../src/lib/platform/redirects.ts";

const rows = [
  { id: "a", code: "K1", status: "available" },
  { id: "b", code: "K2", status: "reserved" },
];

test("realtime insert appends a new row", () => {
  const next = applyChange(rows, { eventType: "INSERT", new: { id: "c", code: "K3", status: "available" }, old: {} });
  assert.deepEqual(next.map((r) => r.id), ["a", "b", "c"]);
  assert.equal(rows.length, 2, "input is not mutated");
});

test("realtime update merges into the existing row", () => {
  const next = applyChange(rows, { eventType: "UPDATE", new: { id: "a", status: "paid" }, old: { id: "a" } });
  assert.deepEqual(next[0], { id: "a", code: "K1", status: "paid" });
});

test("realtime update for an unseen row inserts it", () => {
  const next = applyChange(rows, { eventType: "UPDATE", new: { id: "z", code: "Z1", status: "held" }, old: {} });
  assert.equal(next.length, 3);
});

test("realtime delete removes by id", () => {
  const next = applyChange(rows, { eventType: "DELETE", new: {}, old: { id: "b" } });
  assert.deepEqual(next.map((r) => r.id), ["a"]);
});

test("sign-in redirects stay on this site", () => {
  assert.equal(safeNextPath("/en/staff/team", "/fa/staff"), "/en/staff/team");
  assert.equal(safeNextPath("//evil.example", "/fa/staff"), "/fa/staff");
  assert.equal(safeNextPath("https://evil.example", "/fa/staff"), "/fa/staff");
  assert.equal(safeNextPath("/\\evil.example", "/fa/staff"), "/fa/staff");
  assert.equal(safeNextPath(null, "/fa/staff"), "/fa/staff");
});
