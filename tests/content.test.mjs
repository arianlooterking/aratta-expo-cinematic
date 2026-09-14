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
const boothScenes = await readFile(new URL("../src/lib/booth-scenes.ts", import.meta.url), "utf8");
const boothHero = await readFile(new URL("../src/components/BoothBuildHero.tsx", import.meta.url), "utf8");
const homeSections = await readFile(new URL("../src/components/HomeSections.tsx", import.meta.url), "utf8");
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
  assert.match(content, /آغاز از صحنه خالص/);
  assert.match(content, /نقشه فنی و مسیر حرکت/);
  assert.match(content, /فضای آماده مذاکره/);
  assert.match(content, /From blank hall to intent/);
  assert.match(content, /Ready for business conversations/);
  assert.doesNotMatch(content, /سالن خام و نور محیط/);
  assert.doesNotMatch(content, /Clean hall and ambient light/);
});

test("link previews use localized professional metadata and booth image", () => {
  assert.match(seo, /https:\/\/arattaexpo\.arianai\.chatgpt\.site/);
  assert.match(seo, /aratta-expo-booth-preview-v2\.png/);
  assert.match(seo, /width: 1672/);
  assert.match(seo, /height: 941/);
  assert.match(seo, /شرکت توسعه تجارت اَرَت \| سامانه نمایشگاه های صنعتی/);
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

test("landing hero uses a pinned HQ stage scroll sequence", () => {
  for (const file of [
    "desktop/stage-01.webp",
    "desktop/stage-02.webp",
    "desktop/stage-03.webp",
    "desktop/stage-04.webp",
    "desktop/stage-05.webp",
    "desktop/stage-06.webp",
  ]) {
    assert.match(boothScenes, new RegExp(file));
  }
  for (const file of [
    "mobile/stage-01.webp",
    "mobile/stage-02.webp",
    "mobile/stage-03.webp",
    "mobile/stage-04.webp",
    "mobile/stage-05.webp",
    "mobile/stage-06.webp",
  ]) {
    assert.match(boothScenes, new RegExp(file));
  }
  assert.match(boothHero, /h-\[720svh\]/);
  assert.match(boothHero, /md:h-\[620svh\]/);
  assert.match(boothHero, /md:hidden/);
  assert.match(boothHero, /mobileBoothStageFrames/);
  assert.match(boothHero, /mobileCtas/);
  assert.match(boothHero, /data-mobile-hero-card/);
  assert.match(boothHero, /grid-cols-2/);
  assert.match(boothHero, /min-h-11/);
  assert.match(boothHero, /text-\[clamp\(0\.92rem,4\.55vw,1\.08rem\)\]/);
  assert.match(boothHero, /hero-copy-scrim pointer-events-none absolute inset-0/);
  assert.match(boothHero, /transition: "opacity 360ms ease-out"/);
  assert.doesNotMatch(boothHero, /saturate\(/);
  assert.doesNotMatch(boothHero, /scale\(\$\{scale/);
  assert.match(boothHero, /sticky top-0 h-\[100svh\]/);
  assert.match(boothHero, /data-hero-loader/);
  assert.match(boothHero, /prefers-reduced-motion: reduce/);
  assert.match(boothHero, /hero-stage-copy/);
  assert.doesNotMatch(boothHero, /hero-brand-lockup--late/);
  assert.doesNotMatch(boothHero, /aratta-logo-en-horizontal/);
  assert.match(globalStyles, /@keyframes hero-loader-scan/);
  assert.match(globalStyles, /@keyframes hero-stage-copy-in/);
  assert.match(globalStyles, /@media \(max-width: 767px\)/);
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(boothHero, /opacity/);
  assert.doesNotMatch(boothHero, /process-row-inner/);
  assert.doesNotMatch(boothHero, /process-bubble-row/);
  assert.doesNotMatch(boothHero, /dashboard-card/);
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

  assert.equal((boothScenes.match(/hero-v6\//g) ?? []).length, 12);
  assert.match(boothHero, /unoptimized/);
  assert.match(animatedTabs, /unoptimized/);
  assert.match(aboutExperience, /unoptimized/);
  assert.match(routedPage, /unoptimized/);
  assert.match(homeSections, /src=\{event\.image\}[\s\S]*?unoptimized/);
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
