import assert from "node:assert/strict";
import { test } from "node:test";

import { summariseEquipment } from "../src/lib/portal/metrics.ts";
import { carryFurniture, deriveProblem } from "../src/lib/portal/rules.ts";
import { boothWorkflow, lineProblemStep, nextStep, progressTone, readSteps, stepsPatch, workflowShare } from "../src/lib/portal/workflow.ts";

const line = (over = {}) => ({ item_id: "chair", quantity: 4, stage: "requested", delivered_qty: 0, collected_qty: 0, damaged_qty: 0, ...over });
const eq = (lines) => summariseEquipment(lines, () => true);
const deal = (over = {}) => ({ furniture_confirmed_at: null, furniture_confirmed_by: null, ...over });
const state = (flow, step) => flow.find((s) => s.step === step).state;

test("a fresh sold booth starts at the furniture list", () => {
  const flow = boothWorkflow({ steps: {}, deal: deal(), equipment: undefined, problems: [] });
  assert.equal(nextStep(flow), "furniture_list");
  assert.equal(progressTone(flow, true, "planning", 0), "prep");
  assert.equal(state(flow, "delivery"), "todo", "furniture not agreed yet, so delivery is still open");
});

test("a booth with no company skips the furniture list", () => {
  const flow = boothWorkflow({ steps: {}, deal: null, equipment: undefined, problems: [] });
  assert.equal(state(flow, "furniture_list"), "skip");
  assert.equal(progressTone(flow, false, "build", 0), "none");
});

test("agreed with nothing to deliver skips both furniture steps", () => {
  const flow = boothWorkflow({ steps: {}, deal: deal({ furniture_confirmed_at: "2026-11-01T10:00:00Z" }), equipment: undefined, problems: [] });
  assert.equal(state(flow, "delivery"), "skip");
  assert.equal(state(flow, "collection"), "skip");
});

test("deliveries fill the delivery step in, piece by piece", () => {
  const d = deal({ furniture_confirmed_at: "2026-11-01T10:00:00Z" });
  const steps = { build: { at: "2026-11-02T08:00:00Z", by: "s1" }, power: { at: "2026-11-02T09:00:00Z" } };
  const half = boothWorkflow({ steps, deal: d, equipment: eq([line({ stage: "delivered", delivered_qty: 4 }), line({ item_id: "table", quantity: 2 })]), problems: [] });
  assert.equal(state(half, "delivery"), "todo");
  assert.deepEqual(half.find((s) => s.step === "delivery").count, { done: 4, total: 6 });
  assert.equal(progressTone(half, true, "build", 0), "delivery");

  const all = boothWorkflow({ steps, deal: d, equipment: eq([line({ stage: "delivered", delivered_qty: 4 })]), problems: [] });
  assert.equal(state(all, "delivery"), "done");
  assert.equal(nextStep(all), "handover");
  assert.equal(progressTone(all, true, "build", 0), "handover");
});

test("collection only counts as pending once the show is over", () => {
  const d = deal({ furniture_confirmed_at: "2026-11-01T10:00:00Z" });
  const steps = { build: { at: "x" }, power: { at: "x" }, handover: { at: "x" } };
  const out = eq([line({ stage: "delivered", delivered_qty: 4 })]);
  const flow = boothWorkflow({ steps, deal: d, equipment: out, problems: [] });
  assert.equal(nextStep(flow), "collection");
  assert.equal(progressTone(flow, true, "show", 0), "open");
  assert.equal(progressTone(flow, true, "strike", 0), "strike");

  const back = eq([line({ stage: "collected", delivered_qty: 4, collected_qty: 4 })]);
  const done = boothWorkflow({ steps: { ...steps, clearance: { at: "x" } }, deal: d, equipment: back, problems: [] });
  assert.equal(state(done, "collection"), "done");
  assert.equal(nextStep(done), null);
  assert.equal(progressTone(done, true, "after", 0), "done");
  assert.deepEqual(workflowShare(done), { done: 7, total: 7, share: 1 });
});

test("an open problem wins over everything, and only while it is open", () => {
  const d = deal({ furniture_confirmed_at: "2026-11-01T10:00:00Z" });
  const steps = { build: { at: "x" } };
  const open = boothWorkflow({ steps, deal: d, equipment: undefined, problems: [{ step: "build", resolved_at: null }] });
  assert.equal(state(open, "build"), "problem");
  assert.equal(nextStep(open), "build");
  assert.equal(progressTone(open, true, "build", 1), "problem");
  const fixed = boothWorkflow({ steps, deal: d, equipment: undefined, problems: [{ step: "build", resolved_at: "2026-11-03T10:00:00Z" }] });
  assert.equal(state(fixed, "build"), "done");
});

test("ticking a step keeps the others and ignores junk", () => {
  const ticked = stepsPatch({ build: { at: "a", by: "s1" }, extra: 1 }, "power", true, "s2", "b");
  assert.deepEqual(ticked, { build: { at: "a", by: "s1" }, extra: 1, power: { at: "b", by: "s2" } });
  assert.deepEqual(stepsPatch(ticked, "build", false, "s2"), { extra: 1, power: { at: "b", by: "s2" } });
  assert.deepEqual(stepsPatch([], "build", true, null, "c"), { build: { at: "c", by: null } });
  assert.deepEqual(readSteps({ build: { at: 5 }, power: "yes", handover: { at: "d" } }), { handover: { at: "d", by: null } });
  assert.deepEqual(readSteps(null), {});
});

test("a problem on a furniture line belongs to delivery or collection", () => {
  assert.equal(lineProblemStep({ delivered_qty: 0, stage: "reserved" }), "delivery");
  assert.equal(lineProblemStep({ delivered_qty: 2, stage: "delivered" }), "collection");
});

test("a problem finds its booth, deal and exhibition, and resolving stamps who", () => {
  const lookup = {
    order: (id) => (id === "o1" ? { booth_id: "b1", deal_id: null, exhibition_id: "e1" } : undefined),
    booth: (id) => (id === "b1" ? { exhibition_id: "e1", deal_id: "d1" } : undefined),
    deal: (id) => (id === "d2" ? { exhibition_id: "e2" } : undefined),
  };
  const base = { exhibition_id: "x", booth_id: null, deal_id: null, order_id: null, note: null, resolved_at: null, resolved_by: null, resolution: null };
  const fromLine = deriveProblem({ ...base, order_id: "o1", note: "  " }, undefined, lookup, "me");
  assert.deepEqual([fromLine.booth_id, fromLine.deal_id, fromLine.exhibition_id, fromLine.note], ["b1", "d1", "e1", null]);
  const fromDeal = deriveProblem({ ...base, deal_id: "d2" }, undefined, lookup, "me");
  assert.equal(fromDeal.exhibition_id, "e2");
  const resolved = deriveProblem({ ...base, resolved_at: "t", resolution: " sent " }, { resolved_at: null }, lookup, "me");
  assert.deepEqual([resolved.resolved_by, resolved.resolution], ["me", "sent"]);
  const reopened = deriveProblem({ ...resolved, resolved_at: null }, resolved, lookup, "me");
  assert.deepEqual([reopened.resolved_by, reopened.resolution], [null, null]);
});

test("a company's waiting furniture follows it onto its booth and back", () => {
  const orders = [
    { id: "w", booth_id: null, deal_id: "d1", exhibition_id: "e1", delivered_qty: 0, stage: "requested" },
    { id: "other", booth_id: null, deal_id: "d2", exhibition_id: "e1", delivered_qty: 0, stage: "requested" },
  ];
  const on = carryFurniture({ id: "b1", exhibition_id: "e1", deal_id: "d1" }, null, orders);
  assert.deepEqual(on.map((o) => [o.id, o.booth_id]), [["w", "b1"]]);
  const placed = [
    { ...orders[0], booth_id: "b1" },
    { id: "out", booth_id: "b1", deal_id: "d1", exhibition_id: "e1", delivered_qty: 2, stage: "delivered" },
  ];
  const off = carryFurniture({ id: "b1", exhibition_id: "e1", deal_id: null }, "d1", placed);
  assert.deepEqual(off.map((o) => [o.id, o.booth_id]), [["w", null]], "lines already at the booth stay there to be collected");
  assert.deepEqual(carryFurniture({ id: "b1", exhibition_id: "e1", deal_id: "d1" }, "d1", placed), []);
});
