import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const content = await readFile(new URL("../src/data/aratta-content.ts", import.meta.url), "utf8");
const routedPage = await readFile(new URL("../src/app/[lang]/[page]/page.tsx", import.meta.url), "utf8");
const brandAssets = await readFile(new URL("../src/lib/brand-assets.ts", import.meta.url), "utf8");
const siteChrome = await readFile(new URL("../src/components/SiteChrome.tsx", import.meta.url), "utf8");
const mapPanel = await readFile(new URL("../src/components/GoogleMapPanel.tsx", import.meta.url), "utf8");
const boothScenes = await readFile(new URL("../src/lib/booth-scenes.ts", import.meta.url), "utf8");
const boothHero = await readFile(new URL("../src/components/BoothBuildHero.tsx", import.meta.url), "utf8");

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

test("official language-specific brand assets are wired into chrome and map", () => {
  assert.match(brandAssets, /aratta-logo-fa-lockup\.png/);
  assert.match(brandAssets, /aratta-logo-en-lockup\.png/);
  assert.match(brandAssets, /aratta-tab-fa\.png/);
  assert.match(brandAssets, /aratta-tab-en\.png/);
  assert.match(siteChrome, /getBrandAssets\(content\.lang\)/);
  assert.match(mapPanel, /src=\{brand\.pin\}/);
});

test("landing hero uses the HQ process filmstrip and liquid process bubbles", () => {
  for (const file of [
    "hq-stage-01-clean-hall.png",
    "hq-stage-02-blueprint.png",
    "hq-stage-03-assembly.png",
    "hq-stage-04-structure.png",
    "hq-stage-05-branding.png",
    "hq-stage-06-live-booth.png",
  ]) {
    assert.match(boothScenes, new RegExp(file));
  }
  assert.match(boothHero, /process-row-inner/);
  assert.match(boothHero, /process-bubble-row/);
  assert.doesNotMatch(boothHero, /dashboard-card/);
});
