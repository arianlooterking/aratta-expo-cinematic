import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const content = await readFile(new URL("../src/data/aratta-content.ts", import.meta.url), "utf8");
const routedPage = await readFile(new URL("../src/app/[lang]/[page]/page.tsx", import.meta.url), "utf8");

test("published exhibitions are explicitly archived", () => {
  assert.match(content, /type ExhibitionStatus = "archived"/);
  assert.doesNotMatch(content, /status:\s*"upcoming"/);
  assert.equal((content.match(/status:\s*"archived"/g) ?? []).length, 6);
});

test("bilingual navigation preserves all current public tabs", () => {
  for (const id of [
    "home",
    "about",
    "exhibitions",
    "registration",
    "forms",
    "equipment",
    "participants",
    "news",
    "gallery",
    "contact",
  ]) {
    assert.match(content, new RegExp(`id: "${id}"`));
  }
});

test("official download links remain connected to Aratta source files", () => {
  assert.match(content, /kimex-2025-v7\.pdf/);
  assert.match(content, /kimex2025-V7\.pdf/);
  assert.match(content, /%D8%AA%D8%AC%D9%87%DB%8C%D8%B2%D8%A7%D8%AA-scaled\.jpg/);
});

test("contact uses real Google Maps data", () => {
  assert.match(content, /8322%2BPQ5/);
  assert.match(content, /maps\.google\.com\/maps/);
  assert.match(content, /google\.com\/maps\/dir/);
});

test("equipment rental route alias stays live", () => {
  assert.match(routedPage, /"equipment-rental"/);
  assert.match(routedPage, /page === "equipment-rental" \? "equipment" : page/);
});
