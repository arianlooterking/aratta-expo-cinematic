import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const content = await readFile(new URL("../src/data/aratta-content.ts", import.meta.url), "utf8");
const rootPage = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const langPage = await readFile(new URL("../src/app/[lang]/page.tsx", import.meta.url), "utf8");
const routedPage = await readFile(new URL("../src/app/[lang]/[page]/page.tsx", import.meta.url), "utf8");
const brandAssets = await readFile(new URL("../src/lib/brand-assets.ts", import.meta.url), "utf8");
const seo = await readFile(new URL("../src/lib/seo.ts", import.meta.url), "utf8");
const ogPreview = await stat(new URL("../public/og/aratta-expo-booth-preview.png", import.meta.url));
const siteChrome = await readFile(new URL("../src/components/SiteChrome.tsx", import.meta.url), "utf8");
const mapPanel = await readFile(new URL("../src/components/GoogleMapPanel.tsx", import.meta.url), "utf8");
const boothScenes = await readFile(new URL("../src/lib/booth-scenes.ts", import.meta.url), "utf8");
const boothHero = await readFile(new URL("../src/components/BoothBuildHero.tsx", import.meta.url), "utf8");
const homeSections = await readFile(new URL("../src/components/HomeSections.tsx", import.meta.url), "utf8");
const animatedTabs = await readFile(
  new URL("../src/components/AnimatedTabs.tsx", import.meta.url),
  "utf8",
);
const aboutExperience = await readFile(
  new URL("../src/components/AboutExperience.tsx", import.meta.url),
  "utf8",
);

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

test("root route opens Persian by default", () => {
  assert.match(rootPage, /redirect\("\/fa"\)/);
  assert.doesNotMatch(rootPage, /redirect\("\/en"\)/);
});

test("hero stage captions use polished bilingual production copy", () => {
  assert.match(content, /آغاز از صحنه خالص/);
  assert.match(content, /نقشه فنی و مسیر حرکت/);
  assert.match(content, /فضای آماده مذاکره/);
  assert.match(content, /From blank hall to intent/);
  assert.match(content, /Ready for business conversations/);
  assert.doesNotMatch(content, /سالن خام و نور محیط/);
  assert.doesNotMatch(content, /Clean hall and ambient light/);
});

test("link previews use localized professional metadata and booth image", () => {
  assert.match(seo, /siteUrl = "https:\/\/aratta-expo-cinematic\.vercel\.app"/);
  assert.match(seo, /aratta-expo-booth-preview\.png/);
  assert.match(seo, /width: 1672/);
  assert.match(seo, /height: 941/);
  assert.match(seo, /شرکت توسعه تجارت اَرَت \| سامانه نمایشگاه های صنعتی/);
  assert.match(seo, /Aratta Expo \| Industrial & Mining Exhibition Systems/);
  assert.match(rootLayout, /metadataBase: new URL\(siteUrl\)/);
  assert.match(langPage, /twitter:\s*\{/);
  assert.match(routedPage, /socialPreviewImage/);
  assert.ok(ogPreview.size > 1_000_000);
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
  assert.match(brandAssets, /aratta-logo-fa-lockup-dark\.png/);
  assert.match(brandAssets, /aratta-logo-en-lockup-dark\.png/);
  assert.match(brandAssets, /aratta-tab-fa-dark\.png/);
  assert.match(brandAssets, /aratta-tab-en-dark\.png/);
  assert.match(siteChrome, /getBrandAssets\(content\.lang\)/);
  assert.match(mapPanel, /src=\{brand\.pin\}/);
});

test("landing hero uses a pinned HQ stage scroll sequence", () => {
  for (const file of [
    "hq-stage-01-logo-hall.png",
    "hq-stage-02-blueprint.png",
    "hq-stage-03-assembly.png",
    "hq-stage-04-structure.png",
    "hq-stage-05-branding.png",
    "hq-stage-06-live-booth.png",
  ]) {
    assert.match(boothScenes, new RegExp(file));
  }
  for (const file of [
    "mobile-stage-01.png",
    "mobile-stage-02.png",
    "mobile-stage-03.png",
    "mobile-stage-04.png",
    "mobile-stage-05.png",
    "mobile-stage-06.png",
  ]) {
    assert.match(boothScenes, new RegExp(file));
  }
  assert.match(boothHero, /h-\[620svh\]/);
  assert.match(boothHero, /md:hidden/);
  assert.match(boothHero, /mobileBoothStageFrames/);
  assert.match(boothHero, /sticky top-0 h-\[100svh\]/);
  assert.match(boothHero, /opacity/);
  assert.doesNotMatch(boothHero, /process-row-inner/);
  assert.doesNotMatch(boothHero, /process-bubble-row/);
  assert.doesNotMatch(boothHero, /dashboard-card/);
});

test("landing page does not render the duplicate build-stage showcase", () => {
  assert.doesNotMatch(homeSections, /BuildStageShowcase/);
});

test("about section is an animated capability experience", () => {
  assert.match(homeSections, /AboutExperience/);
  assert.match(aboutExperience, /motion\./);
  assert.match(aboutExperience, /boothStageFrames/);
  assert.match(aboutExperience, /mobileBoothStageFrames/);
  for (const route of ["exhibitions", "equipment", "participants"]) {
    assert.match(aboutExperience, new RegExp(route));
  }
});

test("operating system section uses stage imagery and real route links", () => {
  assert.match(animatedTabs, /boothStageFrames/);
  for (const route of ["exhibitions", "forms", "equipment", "gallery"]) {
    assert.match(animatedTabs, new RegExp(`route: "${route}"`));
  }
  assert.match(animatedTabs, /href=\{`\/\$\{content\.lang\}\/\$\{activeMeta\.route\}`\}/);
});
