import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { primaryNav, navGroups } from "../src/data/site-nav.ts";
import { kimex2025Halls, standKinds, standBuilds, standOpenSides, standSizes, KIMEX_2025_LIST_PDF, KIMEX_2025_FORM_PDF } from "../src/data/plans.ts";
import { hallPlanRequestDraft, OFFICE_EMAIL } from "../src/lib/public-requests.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = async (publicPath) => (await stat(new URL(`../public${publicPath}`, import.meta.url))).size > 0;

const content = await read("src/data/aratta-content.ts");
const sitemap = await read("src/app/sitemap.ts");
const routedPage = await read("src/app/[lang]/[page]/page.tsx");
const motifs = await read("src/components/backdrops/motifs.tsx");

const routeSlugs = [...routedPage.match(/const canonicalPageSlugs = \[([\s\S]*?)\]/)[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
const knownRoutes = new Set([...routeSlugs, "home", "blog", "archive"]);

test("plans is a routed page in the top bar, the all-pages menu, the content nav and the sitemap", () => {
  assert.ok(routeSlugs.includes("plans"));
  assert.ok(primaryNav.some((item) => item.id === "plans"));
  assert.ok(navGroups.some((group) => group.links.some((link) => link.id === "plans")));
  // Persian and English content navs both list it (the search page links come from these).
  assert.equal((content.match(/\{ id: "plans", label: "[^"]+" \}/g) ?? []).length, 2);
  assert.match(sitemap, /"plans"/);
});

test("every header and menu link resolves to a real route, with Persian and English labels", () => {
  for (const link of [...primaryNav, ...navGroups.flatMap((group) => group.links)]) {
    assert.ok(knownRoutes.has(link.id), `${link.id} has no route`);
    assert.ok(link.label.fa.trim() && link.label.en.trim(), `${link.id} label parity`);
    if (link.hint) assert.ok(link.hint.fa.trim() && link.hint.en.trim(), `${link.id} hint parity`);
  }
  // Eight inline items is the most the 1280 px header holds.
  assert.ok(primaryNav.length <= 8);
});

test("plans material comes from the official KIMEX 2025 files, which still resolve", async () => {
  assert.ok(await exists(KIMEX_2025_LIST_PDF));
  assert.ok(await exists(KIMEX_2025_FORM_PDF));
  assert.deepEqual(
    kimex2025Halls.map((hall) => `${hall.prefix}${hall.first}-${hall.prefix}${hall.last}`),
    ["K1-K26", "B1-B13", "M1-M16", "H1-H8"],
  );
  for (const hall of kimex2025Halls) {
    assert.ok(await exists(hall.image), hall.image);
    assert.ok(hall.name.fa && hall.name.en);
  }
});

test("the stand guide keeps Persian and English in parity and never states a price", () => {
  for (const item of [...standKinds, ...standBuilds]) {
    assert.ok(item.name.fa && item.name.en);
    assert.ok(item.points.length > 0);
    for (const point of item.points) {
      assert.ok(point.fa.trim() && point.en.trim());
      assert.doesNotMatch(point.fa + point.en, /تومان|ریال|rial|toman|euro|یورو|\bprice\b|قیمت/i);
    }
  }
  assert.deepEqual(Object.keys(standOpenSides).sort(), standKinds.map((k) => k.id).sort());
  for (const [kind, sides] of Object.entries(standOpenSides)) {
    const open = sides.filter(Boolean).length;
    assert.equal(open, { inline: 1, corner: 2, peninsula: 3, island: 4 }[kind]);
  }
  assert.ok(standSizes.every((s) => s.w <= 12 && s.d <= 6), "sizes fit the drawing canvas");
});

test("hall plan requests are an email draft to the office, not a booking", () => {
  for (const lang of ["fa", "en"]) {
    const draft = hallPlanRequestDraft(lang, "KIMEX");
    assert.ok(draft.mailto.startsWith(`mailto:${OFFICE_EMAIL}?subject=`));
    assert.match(draft.subject, /KIMEX/);
    assert.match(draft.body, lang === "fa" ? /رزرو یا تخصیص غرفه نیست/ : /not a booking or a stand allocation/);
  }
});

test("no build backdrop repeats on the home page, and every motif in use exists", async () => {
  const files = [
    "src/components/HomeSections.tsx",
    "src/components/AboutExperience.tsx",
    "src/components/PartnersSection.tsx",
    "src/components/AnimatedTabs.tsx",
    "src/components/SiteFooter.tsx",
  ];
  const used = [];
  for (const file of files) used.push(...[...(await read(file)).matchAll(/motif="([a-z]+)"/g)].map((m) => m[1]));
  assert.equal(new Set(used).size, used.length, `repeated: ${used.join(", ")}`);
  const registry = new Set([...motifs.matchAll(/^ {2}([a-z]+): \{ w: \d+, h: \d+, render/gm)].map((m) => m[1]));
  const pageMotifs = [...routedPage.matchAll(/motif: "([a-z]+)"/g)].map((m) => m[1]);
  for (const motif of [...used, ...pageMotifs]) assert.ok(registry.has(motif), `${motif} is not a motif`);
  // Each inner page header has its own drawing.
  assert.equal(new Set(pageMotifs).size, pageMotifs.length);
});
