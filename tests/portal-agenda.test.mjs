import assert from "node:assert/strict";
import { test } from "node:test";

import { agendaIcs, buildAgenda, collapseHandovers, dayAt, filterAgenda, groupByDay, seasonBars } from "../src/lib/portal/agenda.ts";

const now = new Date(2026, 10, 3, 12, 0, 0); // 3 Nov 2026, local noon
const iso = (y, m, d, h = 10) => new Date(y, m - 1, d, h).toISOString();

const input = {
  exhibitions: [
    { id: "e1", status: "selling", build_starts_on: "2026-11-08", starts_on: "2026-11-10", ends_on: "2026-11-13", strike_ends_on: "2026-11-14" },
    { id: "old", status: "archived", build_starts_on: null, starts_on: "2026-11-20", ends_on: "2026-11-21", strike_ends_on: null },
  ],
  tasks: [
    { id: "t1", exhibition_id: "e1", status: "todo", due_at: iso(2026, 11, 4), assignee_id: "sara" },
    { id: "t2", exhibition_id: "e1", status: "done", due_at: iso(2026, 11, 4), assignee_id: "sara" },
    { id: "t3", exhibition_id: "e1", status: "in_progress", due_at: iso(2026, 11, 1), assignee_id: "reza" },
  ],
  deals: [
    { id: "d1", exhibition_id: "e1", company_id: "c1", owner_id: "reza", stage: "proposal", next_follow_up_at: iso(2026, 11, 5) },
    { id: "d2", exhibition_id: "e1", company_id: "c2", owner_id: "reza", stage: "won", next_follow_up_at: iso(2026, 11, 5) },
  ],
  invoices: [
    { id: "i1", exhibition_id: "e1", company_id: "c1", status: "issued", due_on: "2026-11-02", created_by: "mina" },
    { id: "i2", exhibition_id: "e1", company_id: "c2", status: "issued", due_on: "2026-11-20", created_by: "mina" },
    { id: "i3", exhibition_id: "e1", company_id: "c3", status: "draft", due_on: "2026-11-20", created_by: "mina" },
  ],
  invoiceBalance: new Map([["i1", 500], ["i2", 0], ["i3", 900]]),
  orders: [
    { id: "o1", exhibition_id: "e1", booth_id: "b1", item_id: "chair", quantity: 4, stage: "reserved", delivery_due_at: iso(2026, 11, 9, 9), pickup_due_at: null, handled_by: "ali" },
    { id: "o2", exhibition_id: "e1", booth_id: "b2", item_id: "tv", quantity: 1, stage: "prepared", delivery_due_at: iso(2026, 11, 9, 11), pickup_due_at: null, handled_by: "ali" },
    { id: "o3", exhibition_id: "e1", booth_id: "b1", item_id: "table", quantity: 1, stage: "delivered", delivery_due_at: iso(2026, 11, 9), pickup_due_at: iso(2026, 11, 14), handled_by: "ali" },
  ],
};

test("the agenda collects open work across sources, oldest first", () => {
  const items = buildAgenda(input, now);
  const ids = items.map((i) => i.id);
  assert.ok(ids.includes("t:t1") && ids.includes("t:t3"));
  assert.ok(!ids.includes("t:t2"), "done tasks are left out");
  assert.ok(ids.includes("f:d1") && !ids.includes("f:d2"), "won deals need no follow-up");
  assert.ok(ids.includes("i:i1"));
  assert.ok(!ids.includes("i:i2"), "paid invoices are left out");
  assert.ok(!ids.includes("i:i3"), "drafts are not due");
  assert.ok(ids.includes("d:o1") && ids.includes("d:o2") && ids.includes("p:o3"));
  assert.ok(!ids.includes("d:o3"), "delivered lines are not delivered twice");
  assert.equal(items.filter((i) => i.kind === "milestone").length, 4, "archived shows add no milestones");
  const sorted = [...items].sort((a, b) => a.at.localeCompare(b.at));
  assert.deepEqual(items.map((i) => i.id), sorted.map((i) => i.id));
});

test("overdue is flagged and always shown, whatever the window", () => {
  const items = buildAgenda(input, now);
  assert.equal(items.find((i) => i.id === "t:t3").overdue, true);
  assert.equal(items.find((i) => i.id === "i:i1").overdue, true);
  assert.equal(items.find((i) => i.id === "t:t1").overdue, false);
  const week = filterAgenda(items, { days: 1 }, now);
  assert.ok(week.some((i) => i.id === "t:t3"));
  assert.ok(!week.some((i) => i.id === "p:o3"), "outside the window");
});

test("filters by person, kind and exhibition; milestones stay for everyone", () => {
  const items = buildAgenda(input, now);
  const mine = filterAgenda(items, { days: 30, ownerId: "sara" }, now);
  assert.ok(mine.every((i) => i.kind === "milestone" || i.ownerId === "sara"));
  assert.ok(mine.some((i) => i.kind === "milestone"));
  const tasksOnly = filterAgenda(items, { days: 30, kinds: new Set(["task"]) }, now);
  assert.ok(tasksOnly.every((i) => i.kind === "task"));
  assert.equal(filterAgenda(items, { days: 30, exhibitionId: "nope" }, now).length, 0);
});

test("handover lines collapse to one row per exhibition, kind and day", () => {
  const items = collapseHandovers(buildAgenda(input, now));
  const deliveries = items.filter((i) => i.kind === "delivery");
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].ref.quantity, 5);
  assert.equal(deliveries[0].ref.booths, 2);
  assert.equal(deliveries[0].ref.lines, 2);
  assert.equal(deliveries[0].at, iso(2026, 11, 9, 9));
});

test("days group upcoming work; overdue stays out of the day list", () => {
  const days = groupByDay(filterAgenda(buildAgenda(input, now), { days: 30 }, now));
  assert.equal(days[0].key, "2026-11-04");
  assert.ok(days.every((d) => d.items.every((i) => !i.overdue)));
});

test("season bars place build, show and strike inside the window", () => {
  const { bars } = seasonBars(input.exhibitions, now, 6);
  assert.equal(bars.length, 1);
  const [b] = bars;
  assert.ok(b.build[0] < b.show[0] && b.show[1] <= b.strike[1]);
  assert.ok(b.show[0] > 0 && b.strike[1] < 100);
});

test("agenda calendar file has one event per row", () => {
  const ics = agendaIcs([{ id: "t:1", at: dayAt("2026-11-04"), title: "Call, Pars; now", url: "https://x.test" }], now);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.ok(ics.includes("SUMMARY:Call\\, Pars\\; now"));
});
