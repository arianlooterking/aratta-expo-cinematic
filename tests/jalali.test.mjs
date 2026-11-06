import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isJalaliLeapYear,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  monthGrid,
  persianWeekColumn,
  shiftMonth,
} from "../src/lib/jalali.ts";

const intl = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });

function intlParts(date) {
  const parts = Object.fromEntries(intl.formatToParts(date).map((p) => [p.type, p.value]));
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

test("Jalali conversion matches the platform's Persian calendar for every day 1990-2045", () => {
  const start = Date.UTC(1990, 0, 1);
  const end = Date.UTC(2045, 11, 31);
  for (let t = start; t <= end; t += 86_400_000) {
    const date = new Date(t);
    const iso = date.toISOString().slice(0, 10);
    const expected = intlParts(date);
    assert.deepEqual(isoToJalali(iso), expected, iso);
    assert.equal(jalaliToIso(expected), iso);
  }
});

test("known dates and leap years", () => {
  assert.deepEqual(isoToJalali("2026-11-04"), { y: 1405, m: 8, d: 13 });
  assert.deepEqual(isoToJalali("2025-03-21"), { y: 1404, m: 1, d: 1 });
  assert.equal(jalaliToIso({ y: 1405, m: 5, d: 26 }), "2026-08-17");
  assert.equal(isJalaliLeapYear(1403), true);
  assert.equal(isJalaliLeapYear(1404), false);
  assert.equal(jalaliMonthLength(1403, 12), 30);
  assert.equal(jalaliMonthLength(1404, 12), 29);
  assert.equal(jalaliMonthLength(1404, 7), 30);
  assert.equal(isoToJalali("2026-02-30"), null);
});

test("month grid starts on Saturday and pads to whole weeks", () => {
  // 1 Aban 1405 = 23 Oct 2026, a Friday: last column.
  const grid = monthGrid("persian", 1405, 8);
  assert.equal(persianWeekColumn({ y: 2026, m: 10, d: 23 }), 6);
  assert.equal(grid.findIndex(Boolean), 6);
  assert.equal(grid[6].iso, "2026-10-23");
  assert.equal(grid.length % 7, 0);
  assert.equal(grid.filter(Boolean).length, 30);
  assert.deepEqual(shiftMonth({ year: 1405, month: 12 }, 1), { year: 1406, month: 1 });
  assert.deepEqual(shiftMonth({ year: 1405, month: 1 }, -1), { year: 1404, month: 12 });
});
