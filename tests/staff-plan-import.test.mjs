import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyPlanReconstruction,
  normalizeVisionPlan,
  parsePlanRows,
  validateApplicablePlan,
} from "../src/lib/staff-plan-import.ts";
import { staffPortalSeed } from "../src/data/staff-portal.ts";

const importedAt = "2026-07-16T10:00:00.000Z";

test("metric parsing handles blank coordinates and Arabic digits without turning blanks into zero", () => {
  const hall = staffPortalSeed.halls[0];
  const result = parsePlanRows([
    ["type", "code", "x m", "y m", "width m", "depth m", "area m2"],
    ["booth", "", "", "  ", "٨", "", "٤٠"],
  ], { hall, updatedAt: importedAt });

  assert.equal(result.booths.length, 1);
  assert.equal(result.booths[0].code, "AI-001");
  assert.equal(result.booths[0].width, 160);
  assert.equal(result.booths[0].height, 100);
  assert.equal(result.booths[0].area, 40);
  assert.ok(result.booths[0].x > 0);
  assert.ok(result.booths[0].y > 0);
  assert.match(result.warnings.join("\n"), /generated AI-001/);
});

test("area derivation preserves whichever metric dimension was supplied", () => {
  const hall = staffPortalSeed.halls[0];
  const result = parsePlanRows([
    ["type", "code", "x m", "y m", "width m", "depth m", "area m2"],
    ["booth", "W-1", 1, 1, 8, "", 40],
    ["booth", "H-1", 12, 1, "", 5, 40],
  ], { hall, updatedAt: importedAt });

  assert.deepEqual(result.booths.map((booth) => ({ width: booth.width, height: booth.height, area: booth.area })), [
    { width: 160, height: 100, area: 40 },
    { width: 160, height: 100, area: 40 },
  ]);
});

test("explicit feature records remain features with codes and generated IDs never collide", () => {
  const hall = staffPortalSeed.halls[0];
  const result = parsePlanRows([
    ["type", "code", "label", "kind", "x m", "y m", "width m", "depth m"],
    ["feature", "C1", "ستون C1", "column", 1, 1, 1, 1],
    ["booth", "A/1", "", "", 3, 1, 2, 2],
    ["booth", "A+1", "", "", 6, 1, 2, 2],
  ], { hall, updatedAt: importedAt });

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].kind, "column");
  assert.equal(result.features[0].label.en, "ستون C1");
  assert.equal(result.booths.length, 2);
  assert.equal(new Set(result.booths.map((booth) => booth.id)).size, 2);
  assert.match(result.booths[1].id, /-2$/);
});

test("vision confidence is clamped to its supported range and invalid values are ignored", () => {
  const hall = staffPortalSeed.halls[0];
  const baseItem = { type: "booth", code: "AI-1", x: 1, y: 1, width: 2, height: 2, area: 4 };
  const clamped = normalizeVisionPlan({ confidence: "۱٫۴", items: [baseItem] }, { hall, updatedAt: importedAt });
  const invalid = normalizeVisionPlan({ confidence: "unknown", items: [baseItem] }, { hall, updatedAt: importedAt });

  assert.equal(clamped.confidence, 1);
  assert.match(clamped.warnings.join("\n"), /clamped/);
  assert.equal(invalid.confidence, undefined);
  assert.match(invalid.warnings.join("\n"), /invalid/);
});

test("a feature-only reconstruction cannot be applied as an editable hall plan", () => {
  const result = validateApplicablePlan({
    booths: [],
    features: [{ id: "feature-only", kind: "column", x: 1, y: 1, width: 1, height: 1, label: { fa: "ستون", en: "Column" } }],
    warnings: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /at least one editable booth/);
});

test("merge updates native geometry while preserving operational booth data and stable IDs", () => {
  const state = structuredClone(staffPortalSeed);
  const hall = state.halls[0];
  const existing = hall.booths[0];
  const originalOtherHall = structuredClone(state.halls[1]);
  const incoming = {
    ...structuredClone(existing),
    id: "provider-generated-id",
    code: existing.code.toLocaleLowerCase("en"),
    x: existing.x + 20,
    width: existing.width + 10,
    area: existing.area + 5,
    status: "available",
    company: null,
    owner: "",
    notes: "provider text must not overwrite operations",
    equipment: [],
    updatedAt: importedAt,
  };

  const next = applyPlanReconstruction(state, {
    hallId: hall.id,
    mode: "merge",
    plan: { booths: [incoming], features: [], warnings: [] },
  });
  const merged = next.halls[0].booths.find((booth) => booth.code === existing.code);

  assert.equal(merged.id, existing.id);
  assert.equal(merged.x, incoming.x);
  assert.equal(merged.width, incoming.width);
  assert.equal(merged.status, existing.status);
  assert.equal(merged.company, existing.company);
  assert.equal(merged.owner, existing.owner);
  assert.equal(merged.notes, existing.notes);
  assert.deepEqual(merged.equipment, existing.equipment);
  assert.deepEqual(next.halls[1], originalOtherHall);
  assert.equal(state.halls[0].booths[0].x, existing.x);
});

test("replace targets the captured hall and detaches tasks from booths it removed", () => {
  const state = structuredClone(staffPortalSeed);
  const hall = state.halls[0];
  const removedBooth = hall.booths[0];
  state.tasks.push({
    id: "task-plan-replace",
    title: { fa: "کار غرفه حذف شده", en: "Removed booth task" },
    boothId: removedBooth.id,
    owner: "operations",
    dueAt: importedAt,
    status: "open",
    priority: "medium",
    notes: "",
  });
  const replacement = {
    ...structuredClone(removedBooth),
    id: `${hall.id}-import-booth-new-1`,
    code: "NEW-1",
    equipment: [],
  };

  const next = applyPlanReconstruction(state, {
    hallId: hall.id,
    mode: "replace",
    plan: { booths: [replacement], features: [], warnings: [] },
  });

  assert.deepEqual(next.halls[0].booths.map((booth) => booth.code), ["NEW-1"]);
  assert.equal(next.tasks.find((task) => task.id === "task-plan-replace").boothId, undefined);
  assert.equal(state.tasks.find((task) => task.id === "task-plan-replace").boothId, removedBooth.id);
});
