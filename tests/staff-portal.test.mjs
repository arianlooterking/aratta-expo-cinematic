import assert from "node:assert/strict";
import { test } from "node:test";

import {
  advanceEquipmentStage,
  calculateBoothAreaFromGeometry,
  calculateDimensionsForTargetArea,
  calculateGeometryFromMetricDimensions,
  calculateMetricDimensionsFromGeometry,
  calculatePortalMetrics,
  clonePortalState,
  createAuditEvent,
  detachTasksFromMissingBooths,
  exportPublicSafeHall,
  findHallContainingBooth,
  formatIstanbulDateTime,
  getNextEquipmentLineStage,
  getActiveHall,
  getActiveExhibition,
  getExhibitionHalls,
  importBoothsFromCsv,
  parseMetricDimensionExpression,
  prependAuditEvent,
  upgradePortalSnapshot,
  validatePortalSnapshot,
} from "../src/lib/staff-portal.ts";
import {
  calculateCommercialAccount,
  getDefaultPaymentDueDate,
  getHandoverDecision,
} from "../src/lib/staff-commercial.ts";
import {
  formatStaffCalendarDate,
  getStaffCalendarDateParts,
  getStaffCalendarMonthName,
  staffCalendarMonthOverlaps,
  staffCalendarYearOverlaps,
} from "../src/lib/staff-calendar.ts";
import {
  calculatePointerRotation,
  normalizeRotationDegrees,
} from "../src/lib/staff-map-geometry.ts";
import {
  normalizeVisionPlan,
  parsePlanRows,
} from "../src/lib/staff-plan-import.ts";
import {
  staffPortalCatalog,
  staffPortalSeed,
} from "../src/data/staff-portal.ts";

test("the fixed local snapshot contains an annual demo schedule and validates at runtime", () => {
  const result = validatePortalSnapshot(staffPortalSeed, staffPortalCatalog);

  assert.equal(result.valid, true, result.valid ? undefined : result.errors.join("\n"));
  assert.equal(staffPortalSeed.halls.length, 13);
  assert.equal(staffPortalSeed.exhibitions.length, 3);
  assert.deepEqual(staffPortalSeed.exhibitions.map((item) => item.hallIds.length), [2, 3, 8]);
  assert.equal(staffPortalSeed.eventStatus, "archived-template");
  assert.equal(staffPortalSeed.leads.length, 5);
  assert.equal(staffPortalSeed.commercialAccounts.length, 3);
  assert.equal(staffPortalSeed.companies.length, 8);
  assert.equal(staffPortalSeed.staffUsers.length, 5);
  assert.equal(
    staffPortalSeed.companies.find((company) => company.id === "company-novametal")?.participations.length,
    2,
  );
  assert.deepEqual(
    new Set(staffPortalSeed.halls.flatMap((hall) => hall.features.map((item) => item.kind))),
    new Set(["column", "door", "zone", "aisle", "loading", "utility", "entrance", "wall", "label"]),
  );
  assert.equal(staffPortalCatalog.length, 10);
  assert.deepEqual(
    new Set(staffPortalCatalog.map((item) => item.category)),
    new Set(["furniture", "av", "cooling", "appliance", "electrical", "connectivity", "support"]),
  );

  const serialized = JSON.stringify(staffPortalSeed);
  assert.doesNotMatch(serialized, /@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(serialized, /(?:\+98|0098|09)\d{9}/);
});

test("the annual workspace can group the same event by Gregorian or Persian calendar", () => {
  assert.deepEqual(getStaffCalendarDateParts("2026-07-15", "persian"), {
    year: 1405,
    month: 4,
    day: 24,
  });
  assert.equal(getStaffCalendarMonthName(3, "persian", "fa"), "تیر");
  assert.equal(staffCalendarYearOverlaps("2026-07-14", "2026-07-16", 1405, "persian"), true);
  assert.equal(staffCalendarMonthOverlaps("2026-07-14", "2026-07-16", 1405, 3, "persian"), true);
  assert.equal(staffCalendarMonthOverlaps("2026-07-14", "2026-07-16", 2026, 6, "gregorian"), true);
  assert.match(formatStaffCalendarDate("2026-07-15", "persian", "fa"), /۱۴۰۵/);
});

test("map rotation gestures resolve touch or mouse pointer angles and snap cleanly", () => {
  assert.equal(
    calculatePointerRotation({
      center: { x: 100, y: 100 },
      startPointer: { x: 100, y: 50 },
      currentPointer: { x: 150, y: 100 },
    }),
    90,
  );
  assert.equal(
    calculatePointerRotation({
      center: { x: 0, y: 0 },
      startPointer: { x: 1, y: 0 },
      currentPointer: { x: Math.cos((43 * Math.PI) / 180), y: Math.sin((43 * Math.PI) / 180) },
      initialRotation: 10,
      snapIncrement: 5,
    }),
    55,
  );
  assert.equal(normalizeRotationDegrees(370), 10);
  assert.equal(normalizeRotationDegrees(-190), 170);
  assert.throws(
    () =>
      calculatePointerRotation({
        center: { x: 0, y: 0 },
        startPointer: { x: 1, y: 0 },
        currentPointer: { x: 0, y: 1 },
        snapIncrement: -1,
      }),
    /between 0 and 180/,
  );
});

test("clonePortalState returns an independent deep clone", () => {
  const clone = clonePortalState(staffPortalSeed);
  clone.activeHallId = "hall-mes";
  clone.halls[0].booths[0].equipment[0].quantity = 99;

  assert.equal(staffPortalSeed.activeHallId, "hall-khajavi");
  assert.equal(staffPortalSeed.halls[0].booths[0].equipment[0].quantity, 2);
});

test("legacy snapshots migrate into one archived exhibition without losing halls", () => {
  const legacy = structuredClone(staffPortalSeed);
  delete legacy.exhibitions;
  delete legacy.activeExhibitionId;
  delete legacy.leads;
  delete legacy.commercialAccounts;

  const upgraded = upgradePortalSnapshot(legacy);
  const result = validatePortalSnapshot(upgraded, staffPortalCatalog);

  assert.equal(result.valid, true, result.valid ? undefined : result.errors.join("\n"));
  assert.equal(upgraded.exhibitions.length, 1);
  assert.equal(upgraded.exhibitions[0].status, "archived");
  assert.deepEqual(upgraded.exhibitions[0].hallIds, legacy.halls.map((hall) => hall.id));
  assert.equal(upgraded.activeHallId, legacy.activeHallId);
  assert.deepEqual(upgraded.leads, []);
  assert.deepEqual(upgraded.commercialAccounts, []);
  assert.equal(upgraded.version, 3);
  assert.ok(upgraded.staffUsers.length >= 1);
});

test("CRM directory validation rejects hierarchy cycles and missing owners", () => {
  const invalid = structuredClone(staffPortalSeed);
  invalid.staffUsers[0].managerId = invalid.staffUsers[1].id;
  invalid.staffUsers[1].managerId = invalid.staffUsers[0].id;
  invalid.staffUsers.forEach((staff) => { staff.accessRole = "member"; });

  const result = validatePortalSnapshot(invalid, staffPortalCatalog);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /hierarchy contains a cycle/);
  assert.match(result.errors.join("\n"), /at least one owner/);
});

test("Excel-style plan rows reconstruct editable booths and structural features in metric scale", () => {
  const hall = staffPortalSeed.halls[0];
  const rows = [
    ["type", "code", "label", "kind", "x m", "y m", "width m", "depth m", "area m2", "company", "zone"],
    ["booth", "X-101", "", "", 2, 3, 6, 4, 24, "Demo Exhibitor", "North"],
    ["feature", "", "ستون مرکزی", "column", 12, 8, 1, 1, 1, "", ""],
  ];

  const result = parsePlanRows(rows, { hall, updatedAt: "2026-07-15T10:00:00.000Z", sourceName: "plan.xlsx" });

  assert.equal(result.booths.length, 1);
  assert.equal(result.features.length, 1);
  assert.equal(result.booths[0].code, "X-101");
  assert.equal(result.booths[0].area, 24);
  assert.equal(result.booths[0].x, 40);
  assert.equal(result.booths[0].width, 120);
  assert.equal(result.features[0].kind, "column");
});

test("vision plan normalization applies the same bounded import contract", () => {
  const hall = staffPortalSeed.halls[0];
  const result = normalizeVisionPlan({
    summary: "Two clear editable objects",
    confidence: 0.88,
    items: [
      { type: "booth", code: "AI-01", label: null, kind: null, x: 1, y: 1, width: 4, height: 3, area: 12, rotation: 0, company: null, zone: "A", notes: null },
      { type: "feature", code: null, label: "Main entrance", kind: "entrance", x: 0, y: 10, width: 2, height: 1, area: 2, rotation: 0, company: null, zone: null, notes: null },
    ],
  }, { hall, updatedAt: "2026-07-15T10:00:00.000Z" });

  assert.equal(result.booths[0].code, "AI-01");
  assert.equal(result.features[0].kind, "entrance");
  assert.equal(result.confidence, 0.88);
});

test("commercial balances drive handover decisions and preserve approved exceptions", () => {
  const [blockedAccount, eligibleAccount, exceptionAccount] = staffPortalSeed.commercialAccounts;

  assert.deepEqual(calculateCommercialAccount(blockedAccount), {
    paid: 1200000000,
    outstanding: 1200000000,
    percentPaid: 50,
  });
  assert.equal(getHandoverDecision(blockedAccount, "2026-07-15T08:00:00.000Z").status, "blocked");
  assert.equal(getHandoverDecision(blockedAccount, "2026-07-15T08:00:00.000Z").overdue, true);
  assert.equal(getHandoverDecision(eligibleAccount, "2026-07-15T08:00:00.000Z").status, "eligible");
  assert.equal(getHandoverDecision(exceptionAccount, "2026-07-15T08:00:00.000Z").status, "exception");
  assert.equal(getDefaultPaymentDueDate("2026-09-20"), "2026-09-19");
  assert.throws(() => getDefaultPaymentDueDate("not-a-date"), /valid exhibition/);
});

test("tasks keep their history when a referenced booth is removed", () => {
  const tasks = [
    {
      id: "task-linked",
      title: { fa: "کار غرفه", en: "Booth task" },
      boothId: "booth-removed",
      owner: "operations",
      dueAt: "2026-07-15T09:00:00.000Z",
      status: "open",
      priority: "high",
      notes: "",
    },
    {
      id: "task-valid",
      title: { fa: "کار معتبر", en: "Valid task" },
      boothId: "booth-kept",
      owner: "operations",
      dueAt: "2026-07-15T10:00:00.000Z",
      status: "open",
      priority: "medium",
      notes: "",
    },
  ];

  const detached = detachTasksFromMissingBooths(tasks, ["booth-kept"]);

  assert.equal(detached[0].boothId, undefined);
  assert.equal(detached[1].boothId, "booth-kept");
  assert.notEqual(detached[0], tasks[0]);
  assert.equal(tasks[0].boothId, "booth-removed");
});

test("cross-hall booth lookup and generated booth area use canonical hall geometry", () => {
  const secondHallBooth = staffPortalSeed.halls[1].booths[0];
  assert.equal(
    findHallContainingBooth(staffPortalSeed, secondHallBooth.id)?.id,
    staffPortalSeed.halls[1].id,
  );
  assert.equal(findHallContainingBooth(staffPortalSeed, "missing-booth"), undefined);
  assert.equal(
    calculateBoothAreaFromGeometry(staffPortalSeed.halls[0], 150, 110),
    41.25,
  );
  assert.throws(
    () => calculateBoothAreaFromGeometry(staffPortalSeed.halls[0], 0, 110),
    /positive finite/,
  );
});

test("metric booth dimensions convert in both directions and support target-area sizing", () => {
  const hall = staffPortalSeed.halls[0];
  assert.deepEqual(calculateGeometryFromMetricDimensions(hall, 2, 4), {
    width: 40,
    height: 80,
  });
  assert.deepEqual(calculateMetricDimensionsFromGeometry(hall, 160, 100), {
    widthMeters: 8,
    depthMeters: 5,
    areaSquareMeters: 40,
  });

  const target = calculateDimensionsForTargetArea(40, 8 / 5);
  assert.ok(Math.abs(target.widthMeters - 8) < 1e-9);
  assert.ok(Math.abs(target.depthMeters - 5) < 1e-9);
  assert.throws(() => calculateDimensionsForTargetArea(0, 1), /positive finite/);
  assert.throws(() => calculateGeometryFromMetricDimensions(hall, 2, Number.NaN), /positive finite/);
});

test("dimension shorthand accepts common Latin and Persian forms", () => {
  assert.deepEqual(parseMetricDimensionExpression("2 × 4"), {
    widthMeters: 2,
    depthMeters: 4,
  });
  assert.deepEqual(parseMetricDimensionExpression("2 by 4"), {
    widthMeters: 2,
    depthMeters: 4,
  });
  assert.deepEqual(parseMetricDimensionExpression("۲٫۵ در ۴"), {
    widthMeters: 2.5,
    depthMeters: 4,
  });
  assert.equal(parseMetricDimensionExpression("2 ×"), null);
  assert.equal(parseMetricDimensionExpression("0 × 4"), null);
});

test("Istanbul formatting is deterministic across a UTC day boundary", () => {
  const instant = "2026-01-01T21:30:00.000Z";

  assert.equal(formatIstanbulDateTime(instant, "en"), "2 Jan 2026, 00:30 Istanbul");
  assert.equal(formatIstanbulDateTime(instant, "fa"), "۲ ژانویه ۲۰۲۶، ۰۰:۳۰ به وقت استانبول");
  assert.throws(() => formatIstanbulDateTime("not-a-date"), /valid date/);
});

test("active hall lookup and operational metrics derive from canonical records", () => {
  assert.equal(getActiveHall(staffPortalSeed)?.id, "hall-khajavi");
  assert.equal(getActiveExhibition(staffPortalSeed)?.id, "exhibition-industrial-demo");
  assert.deepEqual(getExhibitionHalls(staffPortalSeed).map((hall) => hall.id), [
    "hall-khajavi",
    "hall-mes",
  ]);

  const metrics = calculatePortalMetrics(staffPortalSeed);
  assert.deepEqual(
    {
      halls: metrics.hallCount,
      booths: metrics.boothCount,
      allocatable: metrics.allocatableBoothCount,
      booked: metrics.bookedBoothCount,
      occupancy: metrics.occupancyPercent,
      equipmentLines: metrics.equipmentLineCount,
      equipmentUnits: metrics.equipmentUnitCount,
      openTasks: metrics.openTaskCount,
      overdueTasks: metrics.overdueTaskCount,
    },
    {
      halls: 13,
      booths: 11,
      allocatable: 10,
      booked: 6,
      occupancy: 60,
      equipmentLines: 13,
      equipmentUnits: 36,
      openTasks: 3,
      overdueTasks: 1,
    },
  );
  assert.equal(metrics.boothStatuses.attention, 1);
  assert.equal(metrics.equipmentStages.issue, 1);
});

test("equipment stages advance safely and stop at terminal or issue states", () => {
  assert.equal(advanceEquipmentStage("requested"), "preparing");
  assert.equal(advanceEquipmentStage("preparing", 2), "delivered");
  assert.equal(advanceEquipmentStage("collected", 4), "collected");
  assert.equal(advanceEquipmentStage("issue"), "issue");
  assert.throws(() => advanceEquipmentStage("requested", -1), /non-negative integer/);
});

test("equipment line progression respects returnable and service lifecycles", () => {
  assert.equal(
    getNextEquipmentLineStage({ stage: "delivered", returnable: true }),
    "collected",
  );
  assert.equal(
    getNextEquipmentLineStage({ stage: "delivered", returnable: false }),
    "delivered",
  );
  assert.equal(
    getNextEquipmentLineStage({ stage: "issue", returnable: true }),
    "issue",
  );
  assert.equal(
    getNextEquipmentLineStage({ stage: "collected", returnable: true }),
    "collected",
  );
});

test("CSV booth import handles commas, escaped quotes, quoted newlines, and row errors", () => {
  const csv = [
    "code,x,y,width,height,area,status,zone,company_fa,company_en,owner,notes",
    'C-101,10,20,120,80,24,confirmed,north,"شرکت نمونه، آلفا","Alpha, Demo",sales-team-a,"Needs a 55"" TV"',
    'C-102,150,20,120,80,24,available,north,,,operations,"Two-line\nnote"',
    "C-102,300,20,-10,80,24,unknown,north,,,,",
  ].join("\r\n");

  const result = importBoothsFromCsv(csv, {
    idPrefix: "imported",
    updatedAt: "2026-07-14T09:30:00.000Z",
  });

  assert.equal(result.booths.length, 2);
  assert.equal(result.errors.length, 1);
  assert.equal(result.booths[0].company, "Alpha, Demo");
  assert.equal(result.booths[0].notes, 'Needs a 55" TV');
  assert.equal(result.booths[1].notes, "Two-line\nnote");
  assert.match(result.errors[0].message, /duplicated|positive|invalid/);
  assert.equal(result.booths[0].id, "imported-c-101-2");
});

test("public hall export exposes occupancy geometry without finance or logistics data", () => {
  const internalHall = structuredClone(staffPortalSeed.halls[0]);
  internalHall.internalNotes = "staff-only hall note";
  internalHall.features[0].staffOnly = "internal feature instruction";
  const publicHall = exportPublicSafeHall(internalHall);
  const publicBooth = publicHall.booths[0];

  assert.equal(Object.hasOwn(publicBooth, "company"), false);
  assert.equal(Object.hasOwn(publicBooth, "owner"), false);
  assert.equal(Object.hasOwn(publicBooth, "notes"), false);
  assert.equal(Object.hasOwn(publicBooth, "status"), false);
  assert.equal(Object.hasOwn(publicBooth, "equipment"), false);
  assert.equal(Object.hasOwn(publicBooth, "updatedAt"), false);
  assert.equal(Object.hasOwn(publicHall, "internalNotes"), false);
  assert.equal(Object.hasOwn(publicHall.features[0], "staffOnly"), false);
  assert.equal(publicBooth.occupancy, "occupied");
  assert.equal(
    publicHall.booths.find((booth) => booth.code === "A-104").occupancy,
    "available",
  );
  assert.equal(
    publicHall.booths.find((booth) => booth.code === "A-202").occupancy,
    "unavailable",
  );
  assert.match(internalHall.booths[0].company, /Alpha Mining Systems \(Demo\)/);
  assert.equal(Object.hasOwn(internalHall.booths[0].equipment[0], "notes"), true);
});

test("runtime validation rejects unsafe references, duplicate IDs, and out-of-bounds geometry", () => {
  const invalid = clonePortalState(staffPortalSeed);
  invalid.activeHallId = "missing-hall";
  invalid.activeExhibitionId = "missing-exhibition";
  invalid.halls[0].booths[1].id = invalid.halls[0].booths[0].id;
  invalid.halls[0].booths[0].x = invalid.halls[0].width;
  invalid.halls[0].booths[0].equipment[0].catalogItemId = "missing-catalog-item";
  invalid.halls[0].features[0].x = invalid.halls[0].width;
  invalid.halls[0].booths[1].equipment[0].id =
    invalid.halls[0].booths[0].equipment[0].id;
  invalid.tasks[1].id = invalid.tasks[0].id;
  invalid.audit[1].id = invalid.audit[0].id;

  const result = validatePortalSnapshot(invalid, staffPortalCatalog);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /activeHallId/);
  assert.match(result.errors.join("\n"), /activeExhibitionId/);
  assert.match(result.errors.join("\n"), /globally unique/);
  assert.match(result.errors.join("\n"), /exceeds the hall width/);
  assert.match(result.errors.join("\n"), /features\[0\] exceeds the hall width/);
  assert.match(result.errors.join("\n"), /does not exist in the catalog/);
  assert.match(result.errors.join("\n"), /equipment\[0\]\.id must be globally unique/);
  assert.match(result.errors.join("\n"), /tasks\[1\]\.id must be unique/);
  assert.match(result.errors.join("\n"), /audit\[1\]\.id must be unique/);
});

test("audit event construction validates input and creates deterministic local IDs", () => {
  const event = createAuditEvent({
    action: "booth.status.changed",
    entityType: "booth",
    entityId: "booth-a-102",
    actor: "local-demo:operations",
    summary: {
      fa: "وضعیت غرفه به تأییدشده تغییر کرد.",
      en: "Booth status changed to confirmed.",
    },
    timestamp: "2026-07-14T12:15:00+03:00",
  });

  assert.equal(
    event.id,
    "audit-20260714121500-booth-booth-a-102-booth-status-changed",
  );
  assert.equal(event.timestamp, "2026-07-14T09:15:00.000Z");
  assert.throws(
    () => createAuditEvent({ ...event, id: undefined, actor: "" }),
    /actor is required/,
  );
});

test("audit history keeps the newest event and enforces its storage cap", () => {
  const newest = {
    ...staffPortalSeed.audit[0],
    id: "audit-newest",
    timestamp: "2026-07-14T13:00:00.000Z",
  };
  const existing = Array.from({ length: 120 }, (_, index) => ({
    ...staffPortalSeed.audit[0],
    id: `audit-existing-${index}`,
  }));

  const capped = prependAuditEvent(existing, newest);

  assert.equal(capped.length, 120);
  assert.equal(capped[0].id, "audit-newest");
  assert.equal(capped.some((event) => event.id === "audit-existing-119"), false);
  assert.throws(() => prependAuditEvent(existing, newest, 0), /positive integer/);
});
