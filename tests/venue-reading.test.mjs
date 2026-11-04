import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blankHall,
  matchesVenueSignature,
  MAX_HALLS,
  normalizeVenueReading,
  resolvedSize,
} from "../src/lib/portal/venue-reading.ts";

test("cleans a model reading into editable hall drafts", () => {
  const reading = normalizeVenueReading({
    summary: "  سه سالن  ",
    confidence: 1.4,
    halls: [
      { name_fa: "سالن خواجوی کرمانی", name_en: "Khajoo Hall", width_m: 72, depth_m: 40, box: { x: 0.1, y: 0.2, w: 0.3, h: 0.25 }, page: null, booths: 48, note: "" },
      { name_fa: "", name_en: "Copper Hall", width_m: -5, depth_m: 99999, box: { x: 50, y: 10, w: 40, h: 30 }, page: 2, booths: 0, note: "x" },
      { name_fa: "", name_en: "", width_m: null, depth_m: null, box: null, page: null, booths: null, note: "" },
      "junk",
    ],
  });
  assert.equal(reading.summary, "سه سالن");
  assert.equal(reading.confidence, 1);
  assert.equal(reading.halls.length, 2);
  const [a, b] = reading.halls;
  assert.equal(a.name_fa, "سالن خواجوی کرمانی");
  assert.equal(a.width_m, 72);
  assert.equal(a.booths, 48);
  assert.equal(a.source, "read");
  // English-only name fills the Persian field; bad sizes are dropped; percent boxes become fractions.
  assert.equal(b.name_fa, "Copper Hall");
  assert.equal(b.width_m, null);
  assert.equal(b.depth_m, null);
  assert.deepEqual(b.box, { x: 0.5, y: 0.1, w: 0.4, h: 0.3 });
  assert.equal(b.page, 2);
  assert.equal(b.booths, null);
  assert.notEqual(a.key, b.key);
});

test("rejects shapes that aren't a reading and caps the hall count", () => {
  assert.equal(normalizeVenueReading(null), null);
  assert.equal(normalizeVenueReading({ halls: "no" }), null);
  const many = normalizeVenueReading({ halls: Array.from({ length: 80 }, (_, i) => ({ name_fa: `سالن ${i}` })) });
  assert.equal(many.halls.length, MAX_HALLS);
});

test("fills in a hall size from what is known", () => {
  assert.deepEqual(resolvedSize({ width_m: null, depth_m: null, box: null }), { width_m: 60, depth_m: 36 });
  assert.deepEqual(resolvedSize({ width_m: 50, depth_m: 20, box: null }), { width_m: 50, depth_m: 20 });
  // A square outline on a 2:1 landscape image is twice as wide as deep.
  assert.deepEqual(resolvedSize({ width_m: 80, depth_m: null, box: { x: 0, y: 0, w: 0.25, h: 0.5 } }, 0.5), { width_m: 80, depth_m: 80 });
  assert.deepEqual(resolvedSize({ width_m: null, depth_m: null, box: { x: 0, y: 0, w: 0.5, h: 0.25 } }, 1), { width_m: 60, depth_m: 30 });
});

test("blank halls are numbered in Persian", () => {
  assert.equal(blankHall(2, "fa").name_fa, "سالن ۳");
  assert.equal(blankHall(0, "en").name_en, "Hall 1");
});

test("file signatures", () => {
  assert.equal(matchesVenueSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), "application/pdf"), true);
  assert.equal(matchesVenueSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(matchesVenueSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/png"), false);
});
