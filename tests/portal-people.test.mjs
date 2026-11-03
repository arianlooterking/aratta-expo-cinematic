import assert from "node:assert/strict";
import { test } from "node:test";

import { AVATAR_COUNT, avatarPhoto, avatarPreset } from "../src/lib/portal/avatar.ts";
import { DemoStore } from "../src/lib/portal/demo-store.ts";
import { DEMO_STAFF_ID, demoSeed } from "../src/lib/portal/demo-seed.ts";
import { fromLocal, localDayKey, localTimeKey } from "../src/lib/portal/format.ts";
import { equipmentPatch } from "../src/lib/portal/furniture.ts";
import { cleanStaffIds, deriveHandoverPeople } from "../src/lib/portal/rules.ts";
import { collectionKey } from "../src/lib/portal/store.ts";

async function rows(store, table, filter = null) {
  store.subscribe(table, filter, () => {});
  await new Promise((resolve) => setTimeout(resolve, 5));
  return store.getSnapshot(collectionKey(table, filter)).rows;
}

test("a chosen picture wins, otherwise the same one is picked from the id every time", () => {
  assert.equal(avatarPreset({ id: "a", avatar_url: "preset:7" }), 7);
  const fallback = avatarPreset({ id: "11111111-2222-4333-8444-555555555555", avatar_url: null });
  assert.ok(fallback >= 0 && fallback < AVATAR_COUNT);
  assert.equal(avatarPreset({ id: "11111111-2222-4333-8444-555555555555", avatar_url: "preset:99" }), fallback, "out of range falls back");
  assert.equal(avatarPreset({ id: "11111111-2222-4333-8444-555555555555", avatar_url: "avatars/x/y.jpg" }), fallback);
});

test("only https photos are shown as images", () => {
  assert.equal(avatarPhoto("https://lh3.googleusercontent.com/a/x"), "https://lh3.googleusercontent.com/a/x");
  assert.equal(avatarPhoto("preset:3"), null);
  assert.equal(avatarPhoto("javascript:alert(1)"), null);
  assert.equal(avatarPhoto(null), null);
});

test("staff lists keep the order people were added in, without blanks, repeats or strangers", () => {
  const known = new Set(["a", "b", "c"]);
  assert.deepEqual(cleanStaffIds(["b", null, "a", "b", "", "z", "c"], (id) => known.has(id)), ["b", "a", "c"]);
  assert.deepEqual(cleanStaffIds(null), []);
});

test("a delivery saved with nobody named is credited to whoever saved it", () => {
  const order = { stage: "delivered", delivered_by: [], collected_by: [], handled_by: null };
  const next = deriveHandoverPeople(order, { stage: "prepared" }, "me");
  assert.deepEqual(next.delivered_by, ["me"]);
  assert.equal(next.handled_by, "me");

  const crew = deriveHandoverPeople({ ...order, delivered_by: ["a", "b", "a"] }, { stage: "prepared" }, "me");
  assert.deepEqual(crew.delivered_by, ["a", "b"], "a named crew is kept, in order");

  const unchanged = deriveHandoverPeople({ ...order, delivered_by: [] }, { stage: "delivered" }, "me");
  assert.deepEqual(unchanged.delivered_by, [], "clearing the names later is not overwritten");

  const collected = deriveHandoverPeople({ ...order, stage: "collected", delivered_by: ["a"] }, { stage: "delivered" }, "me");
  assert.deepEqual(collected.collected_by, ["me"]);
  assert.deepEqual(collected.delivered_by, ["a"]);
});

test("the handover patch carries the crew and one shared moment", () => {
  const line = { quantity: 4, delivered_qty: 0, damaged_qty: 0 };
  const at = "2026-11-03T07:32:00.000Z";
  assert.deepEqual(equipmentPatch(line, "deliver", ["a", "b", "a"], at), {
    stage: "delivered",
    delivered_qty: 4,
    delivered_at: at,
    delivered_by: ["a", "b"],
  });
  const collect = equipmentPatch({ quantity: 4, delivered_qty: 4, damaged_qty: 1 }, "collect", ["c"], at);
  assert.deepEqual(collect, { stage: "collected", collected_qty: 3, collected_at: at, collected_by: ["c"] });
  assert.equal("delivered_by" in equipmentPatch(line, "deliver"), false, "no crew leaves it to the database");
});

test("day and time fields round-trip to the same moment", () => {
  const at = new Date(2026, 10, 3, 10, 32).toISOString();
  assert.equal(fromLocal(localDayKey(at), localTimeKey(at)), at);
  assert.equal(fromLocal("not-a-day", "10:00"), null);
});

test("the demo records who delivered and who looks after each booth", async () => {
  const store = new DemoStore(demoSeed);
  const staff = await rows(store, "staff_members");
  assert.ok(staff.length >= 8, "a fuller demo team");
  assert.ok(staff.every((s) => /^preset:\d+$/.test(s.avatar_url)), "everyone has a picture");
  assert.ok(staff.every((s) => s.job_title), "everyone has a job title");

  const booths = await rows(store, "booths");
  const sold = booths.filter((b) => b.deal_id);
  assert.ok(sold.length && sold.every((b) => b.manager_ids.length >= 1), "every sold booth has someone in charge");
  assert.ok(sold.some((b) => b.manager_ids.includes(DEMO_STAFF_ID)), "the demo user looks after some booths");

  const orders = await rows(store, "equipment_orders");
  const delivered = orders.filter((o) => o.delivered_qty > 0);
  assert.ok(delivered.length && delivered.every((o) => o.delivered_by.length >= 1 && o.delivered_at), "every delivery names people and a time");
  assert.ok(delivered.some((o) => o.delivered_by.length >= 2), "some crews are two or three people");
});

test("the demo store applies the same crediting rules as the database", async () => {
  const store = new DemoStore(demoSeed);
  const orders = await rows(store, "equipment_orders");
  const open = orders.find((o) => o.stage === "requested" || o.stage === "prepared");
  assert.ok(open, "the seed has a line still to deliver");
  const staff = await rows(store, "staff_members");
  const [a, b] = staff.filter((s) => s.id !== DEMO_STAFF_ID);

  const mine = await store.update("equipment_orders", open.id, { stage: "delivered" });
  assert.deepEqual(mine.row.delivered_by, [DEMO_STAFF_ID]);

  const fixed = await store.update("equipment_orders", open.id, { delivered_by: [b.id, "stranger", a.id, b.id] });
  assert.deepEqual(fixed.row.delivered_by, [b.id, a.id], "unknown people are dropped, order kept");

  const booth = (await rows(store, "booths"))[0];
  const managed = await store.update("booths", booth.id, { manager_ids: [a.id, a.id, b.id] });
  assert.deepEqual(managed.row.manager_ids, [a.id, b.id]);
});

test("pictures are limited to the built-in set in the demo", async () => {
  const store = new DemoStore(demoSeed);
  await rows(store, "staff_members");
  const ok = await store.setMyAvatar(DEMO_STAFF_ID, "preset:4");
  assert.equal(ok.ok, true);
  assert.equal(ok.row.avatar_url, "preset:4");
  const bad = await store.setMyAvatar(DEMO_STAFF_ID, "https://example.com/me.png");
  assert.equal(bad.ok, false);
});
