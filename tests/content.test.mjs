import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { execFileSync } from "node:child_process";

const content = await readFile(new URL("../src/data/aratta-content.ts", import.meta.url), "utf8");
const rootPage = await readFile(new URL("../src/app/(default)/page.tsx", import.meta.url), "utf8");
const rootLayout = await readFile(new URL("../src/components/DocumentShell.tsx", import.meta.url), "utf8");
const languageLayout = await readFile(new URL("../src/app/[lang]/layout.tsx", import.meta.url), "utf8");
const langPage = await readFile(new URL("../src/app/[lang]/page.tsx", import.meta.url), "utf8");
const routedPage = await readFile(new URL("../src/app/[lang]/[page]/page.tsx", import.meta.url), "utf8");
const brandAssets = await readFile(new URL("../src/lib/brand-assets.ts", import.meta.url), "utf8");
const seo = await readFile(new URL("../src/lib/seo.ts", import.meta.url), "utf8");
const ogPreview = await stat(new URL("../public/og/aratta-expo-booth-preview-v2.png", import.meta.url));
const siteChrome = await readFile(new URL("../src/components/SiteChrome.tsx", import.meta.url), "utf8");
const mapPanel = await readFile(new URL("../src/components/GoogleMapPanel.tsx", import.meta.url), "utf8");
const boothHero = await readFile(new URL("../src/components/BoothBuildHero.tsx", import.meta.url), "utf8");
const homeSections = await readFile(new URL("../src/components/HomeSections.tsx", import.meta.url), "utf8");
const upcomingExhibitions = await readFile(new URL("../src/components/UpcomingExhibitions.tsx", import.meta.url), "utf8");
const blogCards = await readFile(new URL("../src/components/BlogCards.tsx", import.meta.url), "utf8");
const blogPage = await readFile(new URL("../src/app/[lang]/blog/page.tsx", import.meta.url), "utf8");
const blogArticlePage = await readFile(new URL("../src/app/[lang]/blog/[slug]/page.tsx", import.meta.url), "utf8");
const galleryLightbox = await readFile(new URL("../src/components/GalleryLightbox.tsx", import.meta.url), "utf8");
const adminPanel = await readFile(new URL("../src/components/AdminPanel.tsx", import.meta.url), "utf8");
const staffPortal = await readFile(new URL("../src/components/staff/StaffPortal.tsx", import.meta.url), "utf8");
const adminApi = await readFile(new URL("../src/app/api/admin/content/route.ts", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../src/app/(default)/admin/page.tsx", import.meta.url), "utf8");
const robots = await readFile(new URL("../src/app/robots.ts", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
const globalStyles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
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
  for (const cover of [
    "mining-machinery-archive.webp",
    "steel-copper-energy-archive.webp",
    "mineral-production-archive.webp",
  ]) {
    assert.match(content, new RegExp(cover));
  }
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
    "industry-news",
    "blog",
    "gallery",
    "contact",
  ]) {
    assert.match(content, new RegExp(`id: "${id}"`));
  }
});

test("root route opens Persian by default", () => {
  assert.match(rootPage, /redirect\("\/fa"\)/);
  assert.doesNotMatch(rootPage, /redirect\("\/en"\)/);
  assert.match(rootLayout, /Vazirmatn/);
});

test("language routes own the document language and direction", () => {
  assert.match(languageLayout, /<DocumentShell lang=\{lang\}>/);
  assert.match(rootLayout, /lang=\{lang\}/);
  assert.match(rootLayout, /dir=\{lang === "fa" \? "rtl" : "ltr"\}/);
});

test("hero stage captions use polished bilingual production copy", () => {
  assert.match(content, /نمایشگاه‌های صنعت و معدن/);
  assert.match(content, /Industry & mining exhibitions/);
  assert.match(content, /یک زمین خالی، یک نقشهٔ دقیق/);
  assert.match(content, /اول، آنچه از سقف می‌آویزد/);
  assert.match(content, /آمادهٔ میزبانی و مذاکره/);
  assert.match(content, /An empty plot and an exact plan/);
  assert.match(content, /First, everything that hangs/);
  assert.match(content, /Ready to host and to negotiate/);
  assert.match(content, /scrollHint/);
  assert.match(content, /finale:/);
});

test("hero build chapters stay in Persian and English parity, in the real build order", () => {
  const blocks = [...content.matchAll(/stages: \[([\s\S]*?)\n    \],/g)].map((m) => [...m[1].matchAll(/label: "([^"]+)"/g)].map((l) => l[1]));
  assert.equal(blocks.length, 2);
  const [fa, en] = blocks;
  assert.equal(fa.length, 8);
  assert.equal(en.length, 8);
  assert.deepEqual(en, ["Plot", "Rigging", "Floor", "Structure", "Walls", "Light", "Brand", "Hosting"]);
  assert.deepEqual(fa, ["زمین", "آویز", "کف", "سازه", "دیوار", "نور", "هویت", "میزبانی"]);
});

test("link previews use localized professional metadata and booth image", () => {
  assert.match(seo, /https:\/\/arattaexpo\.arianai\.chatgpt\.site/);
  assert.match(seo, /aratta-expo-booth-preview-v2\.png/);
  assert.match(seo, /width: 1672/);
  assert.match(seo, /height: 941/);
  assert.match(seo, /شرکت توسعه تجارت اَرَتَ \| سامانه نمایشگاه های صنعتی/);
  assert.match(seo, /Aratta Expo \| Industrial & Mining Exhibition Systems/);
  assert.match(rootLayout, /metadataBase: new URL\(siteUrl\)/);
  assert.match(langPage, /twitter:\s*\{/);
  assert.match(routedPage, /socialPreviewImage/);
  assert.ok(ogPreview.size > 1_000_000);
});

test("separate hosts can set canonical URLs without changing the Sites default", () => {
  const moduleUrl = new URL("../src/lib/seo.ts", import.meta.url).href;
  const evaluateUrl = (url) => execFileSync(process.execPath, [
    "--input-type=module", "-e",
    `import { siteUrl } from ${JSON.stringify(moduleUrl)}; process.stdout.write(siteUrl);`,
  ], { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_SITE_URL: url } });

  assert.equal(evaluateUrl(""), "https://arattaexpo.arianai.chatgpt.site");
  assert.equal(evaluateUrl("https://arattaexpo.netlify.app/"), "https://arattaexpo.netlify.app");
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
  assert.match(mapPanel, /min-h-\[560px\]/);
  assert.match(mapPanel, /min-h-\[520px\]/);
  assert.match(mapPanel, /transparent_72%/);
});

test("equipment rental route alias stays live", () => {
  assert.match(routedPage, /"equipment-rental"/);
  assert.match(routedPage, /page === "equipment-rental" \? "equipment" : page/);
});

test("official language-specific brand assets are wired into chrome and map", () => {
  assert.match(brandAssets, /brand-v2\/aratta-tab\.png/);
  assert.match(brandAssets, /brand-v2\/aratta-logo-en-horizontal\.png/);
  assert.match(siteChrome, /getBrandAssets\(content\.lang\)/);
  assert.match(mapPanel, /src=\{brand\.pin\}/);
});

test("landing hero builds a real 3D booth while the visitor scrolls", async () => {
  const dir = new URL("../src/components/booth3d/", import.meta.url);
  const modules = ["booth-scene", "core", "materials", "hall", "rigging", "floor", "structure", "walls", "light", "identity", "furniture", "camera"];
  const sources = Object.fromEntries(await Promise.all(modules.map(async (name) => [name, await readFile(new URL(`${name}.ts`, dir), "utf8")])));
  const scene = Object.values(sources).join("\n");
  const timeline = await readFile(new URL("timeline.ts", dir), "utf8");
  // Eight chapters in the real build order, one timeline shared by the scene and the copy.
  assert.match(timeline, /CHAPTER_STARTS = \[0, 0\.11, 0\.22, 0\.33, 0\.44, 0\.55, 0\.66, 0\.77\]/);
  assert.match(timeline, /FINALE_AT = 0\.9/);
  for (const part of ["tape", "plan", "truss", "fixtures", "chains", "rigRise", "pedestals", "panels", "finish", "columns", "deck", "balustrade", "deckLift", "stair", "towerFrames", "frames", "cladding", "slats", "glass", "power", "ledLines", "lightboxes", "spots", "ledTiles", "mark", "sign", "counter", "vitrines", "plants"]) {
    assert.match(timeline, new RegExp(`\\b${part}: \\[`));
  }
  // Rigging comes before the floor, the deck is lifted after its balustrade is fitted.
  const start = (name) => Number(timeline.match(new RegExp(`\\b${name}: \\[([0-9.]+)`))[1]);
  assert.ok(start("rigRise") < start("pedestals"));
  assert.ok(start("balustrade") < start("deckLift"));
  assert.ok(start("frames") < start("power") && start("spots") < start("ledTiles") && start("ledTiles") < start("counter"));
  assert.match(sources["booth-scene"], /from "three"/);
  assert.match(scene, /MARK_BLOCKS/);
  assert.match(scene, /اَرَتَ/);
  assert.match(scene, /InstancedMesh/);
  assert.match(scene, /RoundedBoxGeometry/);
  assert.match(sources["booth-scene"], /setPixelRatio\(Math\.min/);
  assert.match(sources["booth-scene"], /shadowMap\.enabled = !compact/);
  assert.match(sources["booth-scene"], /UnrealBloomPass/);
  assert.match(sources["booth-scene"], /PMREMGenerator/);
  assert.match(sources["booth-scene"], /setTarget\(progress, immediate\)/);
  assert.match(sources["booth-scene"], /setActive\(value\)/);
  assert.match(sources.materials, /transmission|MeshPhysicalMaterial/);
  // The 3D code loads on demand, and the hero keeps a still image when WebGL is missing.
  assert.match(boothHero, /import\("@\/components\/booth3d\/booth-scene"\)/);
  assert.match(boothHero, /hero-v6\/desktop\/stage-06\.webp/);
  assert.match(boothHero, /ScrollTrigger\.create/);
  assert.match(boothHero, /sticky top-0 h-\[100svh\]/);
  assert.match(boothHero, /h-\[840svh\]/);
  assert.match(boothHero, /grid-cols-8/);
  assert.match(boothHero, /data-mobile-hero-card/);
  assert.match(boothHero, /data-hero-loader/);
  assert.match(boothHero, /prefers-reduced-motion: reduce/);
  assert.match(boothHero, /hero-stage-copy/);
  assert.match(boothHero, /className="sr-only"/);
  assert.match(globalStyles, /@keyframes hero-loader-scan/);
  assert.match(globalStyles, /@keyframes hero-stage-copy-in/);
  assert.match(globalStyles, /\.booth3d__chapter/);
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("hero sequence ships responsive 4K assets and keeps generated masters outside public", async () => {
  assert.match(nextConfig, /unoptimized:\s*true/);
  for (let stage = 1; stage <= 6; stage += 1) {
    const number = String(stage).padStart(2, "0");
    const desktopWeb = await sharp(
      fileURLToPath(new URL(`../public/hero-v6/desktop/stage-${number}.webp`, import.meta.url)),
    ).metadata();
    const mobileWeb = await sharp(
      fileURLToPath(new URL(`../public/hero-v6/mobile/stage-${number}.webp`, import.meta.url)),
    ).metadata();
    const desktopMaster = await sharp(
      fileURLToPath(
        new URL(`../assets/hero-v6-sources/desktop/stage-${number}.png`, import.meta.url),
      ),
      { limitInputPixels: false },
    ).metadata();
    const mobileMaster = await sharp(
      fileURLToPath(
        new URL(`../assets/hero-v6-sources/mobile/stage-${number}.png`, import.meta.url),
      ),
      { limitInputPixels: false },
    ).metadata();

    assert.deepEqual([desktopWeb.width, desktopWeb.height], [3840, 2160]);
    assert.deepEqual([mobileWeb.width, mobileWeb.height], [2160, 3840]);
    assert.deepEqual([desktopMaster.width, desktopMaster.height], [1672, 941]);
    assert.deepEqual([mobileMaster.width, mobileMaster.height], [941, 1672]);
  }

  const finalDesktop = await sharp(
    fileURLToPath(new URL("../public/hero-v6/desktop/stage-06.webp", import.meta.url)),
  ).metadata();
  const finalMobile = await sharp(
    fileURLToPath(new URL("../public/hero-v6/mobile/stage-06.webp", import.meta.url)),
  ).metadata();
  const finalDesktopMaster = await sharp(
    fileURLToPath(
      new URL(
        "../assets/hero-v6-sources/desktop/stage-06.png",
        import.meta.url,
      ),
    ),
    { limitInputPixels: false },
  ).metadata();
  const finalMobileMaster = await sharp(
    fileURLToPath(
      new URL(
        "../assets/hero-v6-sources/mobile/stage-06.png",
        import.meta.url,
      ),
    ),
    { limitInputPixels: false },
  ).metadata();

  assert.match(boothHero, /unoptimized/);
  assert.match(animatedTabs, /unoptimized/);
  assert.match(aboutExperience, /unoptimized/);
  assert.match(routedPage, /unoptimized/);
  assert.match(upcomingExhibitions, /src=\{item\.image\}[\s\S]*?unoptimized/);
  assert.match(galleryLightbox, /unoptimized/);
  assert.match(mapPanel, /unoptimized/);
  assert.match(siteChrome, /unoptimized/);
  assert.deepEqual([finalDesktop.width, finalDesktop.height], [3840, 2160]);
  assert.deepEqual([finalMobile.width, finalMobile.height], [2160, 3840]);
  assert.deepEqual([finalDesktopMaster.width, finalDesktopMaster.height], [1672, 941]);
  assert.deepEqual([finalMobileMaster.width, finalMobileMaster.height], [941, 1672]);
});

test("both languages use the supplied official Aratta logo system", async () => {
  const tab = await sharp(
    fileURLToPath(new URL("../public/brand-v2/aratta-tab.png", import.meta.url)),
  ).metadata();
  assert.deepEqual([tab.width, tab.height], [512, 512]);
  assert.equal((brandAssets.match(/brand-v2\/aratta-tab\.png/g) ?? []).length, 12);
  assert.match(siteChrome, />\s*Aratta Expo\s*</);
  assert.match(boothHero, /brand-v2\/aratta-official-mark\.png/);
  assert.doesNotMatch(boothHero, /brand-v2\/aratta-logo-en-horizontal\.png/);
});

test("landing page does not render the duplicate build-stage showcase", () => {
  assert.doesNotMatch(homeSections, /BuildStageShowcase/);
});

test("related industry news is a dedicated bilingual public section", () => {
  assert.match(content, /relatedTitle/);
  assert.match(content, /relatedItems/);
  assert.match(content, /اخبار مرتبط با معدن، فولاد، مس و زنجیره تامین/);
  assert.match(content, /Related news for mining, steel, copper, and supply-chain markets/);
  assert.match(routedPage, /"industry-news"/);
  assert.match(routedPage, /RelatedNewsPage/);
  assert.match(homeSections, /RelatedNewsSection/);
  assert.match(homeSections, /href=\{`\/\$\{content\.lang\}\/industry-news`\}/);
});

test("admin panel exists but production writes require server configuration", () => {
  assert.match(adminPage, /robots:\s*\{\s*index:\s*false/);
  assert.match(adminPanel, /Save local draft/);
  assert.match(adminPanel, /Raw selected-language JSON/);
  assert.match(adminPanel, /Publish through backend/);
  assert.match(adminPanel, /const Root = embedded \? "section" : "main"/);
  assert.match(adminPanel, /type="password"/);
  assert.match(adminApi, /ADMIN_WRITE_TOKEN/);
  assert.match(adminApi, /ADMIN_CONTENT_WEBHOOK_URL/);
  assert.match(adminApi, /ADMIN_BACKEND_NOT_CONFIGURED/);
  assert.match(readme, /Admin Publish Backend/);
  assert.match(envExample, /ADMIN_WRITE_TOKEN=/);
  assert.match(envExample, /ADMIN_CONTENT_WEBHOOK_URL=/);
  assert.doesNotMatch(adminPanel, /Production content updated successfully/);
});

test("bilingual blog publishes safe public routes and remains editable from staff", () => {
  assert.equal((content.match(/slug: "exhibition-booth-readiness-checklist"/g) ?? []).length, 2);
  assert.equal((content.match(/slug: "equipment-logistics-without-shortages"/g) ?? []).length, 2);
  assert.equal((content.match(/slug: "from-lead-to-booth-handover"/g) ?? []).length, 2);
  assert.match(content, /getPublishedBlogPosts/);
  assert.match(content, /post\.status === "published"/);
  assert.match(homeSections, /<BlogSection content=\{content\}/);
  assert.match(blogCards, /href=\{`\/\$\{content\.lang\}\/blog\/\$\{post\.slug\}`\}/);
  assert.match(blogPage, /getPublishedBlogPosts/);
  assert.match(blogArticlePage, /getPublishedBlogPost/);
  assert.match(blogArticlePage, /notFound\(\)/);
  assert.match(adminPanel, /function BlogEditor/);
  assert.match(adminPanel, /Publication status/);
  assert.match(adminPanel, /status: "draft"/);
  assert.match(staffPortal, /<AdminPanel embedded initialLang=\{locale\}/);
  assert.match(adminApi, /lowercase URL-safe slug/);
  assert.match(sitemap, /getPublishedBlogPosts/);
});

test("staff content studio exposes structured controls for every public content group", () => {
  for (const field of [
    "next.news.kicker",
    "next.exhibitions.kicker",
    "next.gallery.kicker",
    "next.contact.kicker",
    "next.contact.addressLabel",
    "next.contact.emailLabel",
    "next.contact.phoneLabel",
    "next.contact.mapLabel",
    "next.blog.emptyLabel",
    "next.blog.readMoreLabel",
    "next.blog.featuredLabel",
  ]) {
    assert.match(adminPanel, new RegExp(field.replaceAll(".", "\\.")));
  }
  assert.match(adminPanel, /function makeDownload/);
  assert.match(adminPanel, /category: value as typeof item\.category/);
  assert.match(adminPanel, /confirmMessage/);
  assert.match(adminPanel, /window\.confirm\(confirmMessage\)/);
});

test("robots and sitemap handle admin and public pages correctly", () => {
  for (const privateRoute of ["/admin", "/api/admin", "/staff", "/*/staff"]) {
    assert.match(robots, new RegExp(privateRoute.replace(/[/*]/g, "\\$&")));
  }
  assert.match(sitemap, /"industry-news"/);
  assert.match(sitemap, /"blog"/);
  assert.match(sitemap, /siteUrl/);
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
