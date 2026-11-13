import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

import { THEME_STORAGE_KEY, themeInitScript } from "../src/lib/theme-script.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const globals = await read("src/app/globals.css");
const themeStore = await read("src/lib/theme.ts");
const themeSwitch = await read("src/components/ThemeSwitch.tsx");
const siteChrome = await read("src/components/SiteChrome.tsx");
const documentShell = await read("src/components/DocumentShell.tsx");

function memoryStorage({ blocked = false } = {}) {
  const values = new Map();
  return {
    getItem(key) {
      if (blocked) throw new Error("SecurityError");
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (blocked) throw new Error("SecurityError");
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function installDom({ blocked = false } = {}) {
  const target = new EventTarget();
  const storage = memoryStorage({ blocked });
  globalThis.window = {
    localStorage: storage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  globalThis.document = { documentElement: { dataset: {} } };
  return { storage, html: globalThis.document.documentElement };
}

// The store module touches window/document only inside its functions.
const store = await import("../src/lib/theme.ts");

test("theme store defaults to dark, whatever the OS prefers", () => {
  installDom();
  assert.equal(store.getTheme(), "dark");
  assert.equal(store.readStoredTheme(), null);
  store.restoreTheme();
  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.doesNotMatch(themeStore + themeInitScript, /prefers-color-scheme/);
});

test("setTheme writes <html data-theme>, storage and a window event", () => {
  const { storage, html } = installDom();
  const seen = [];
  const events = [];
  window.addEventListener("aratta-theme", (event) => events.push(event.detail));
  const unsubscribe = store.subscribeTheme((theme) => seen.push(theme));

  store.setTheme("light");
  assert.equal(html.dataset.theme, "light");
  assert.equal(storage.getItem(THEME_STORAGE_KEY), "light");
  assert.equal(store.getTheme(), "light");
  assert.deepEqual(events, ["light"]);
  assert.deepEqual(seen, ["light"]);

  store.toggleTheme();
  assert.equal(store.getTheme(), "dark");
  assert.deepEqual(seen, ["light", "dark"]);

  unsubscribe();
  store.setTheme("light");
  assert.deepEqual(seen, ["light", "dark"]);

  store.setTheme("sepia");
  assert.equal(store.getTheme(), "light", "unknown values are ignored");
});

test("another tab's choice arrives through the storage event", () => {
  const { html } = installDom();
  const seen = [];
  const unsubscribe = store.subscribeTheme((theme) => seen.push(theme));
  const event = new Event("storage");
  Object.assign(event, { key: THEME_STORAGE_KEY, newValue: "light" });
  window.dispatchEvent(event);
  assert.equal(html.dataset.theme, "light");
  assert.deepEqual(seen, ["light"]);
  unsubscribe();
});

test("the switch still works with storage blocked", () => {
  const { html } = installDom({ blocked: true });
  assert.equal(store.readStoredTheme(), null);
  assert.doesNotThrow(() => store.setTheme("light"));
  assert.equal(html.dataset.theme, "light");
  store.restoreTheme();
  assert.equal(html.dataset.theme, "dark");
});

test("restore and clear hand <html> between the public pages and the portal", () => {
  const { storage, html } = installDom();
  storage.setItem(THEME_STORAGE_KEY, "light");
  store.restoreTheme();
  assert.equal(html.dataset.theme, "light");
  store.clearTheme();
  assert.equal(html.dataset.theme, undefined);
  assert.equal(store.getTheme(), "dark");
});

function runInitScript(pathname, storage) {
  const attributes = {};
  const context = {
    location: { pathname },
    localStorage: storage,
    document: { documentElement: { setAttribute: (name, value) => (attributes[name] = value) } },
  };
  vm.runInNewContext(themeInitScript, context);
  return attributes["data-theme"];
}

test("no-flash script applies the stored theme before first paint", () => {
  const stored = memoryStorage();
  stored.setItem(THEME_STORAGE_KEY, "light");
  assert.equal(runInitScript("/fa", stored), "light");
  assert.equal(runInitScript("/en/registration", stored), "light");
  assert.equal(runInitScript("/fa", memoryStorage()), "dark");
  assert.equal(runInitScript("/fa", memoryStorage({ blocked: true })), "dark");
  stored.setItem(THEME_STORAGE_KEY, "<script>");
  assert.equal(runInitScript("/fa", stored), "dark");
});

test("no-flash script leaves the staff portal and admin palette alone", () => {
  const stored = memoryStorage();
  stored.setItem(THEME_STORAGE_KEY, "light");
  for (const path of ["/fa/staff", "/en/staff/sign-in", "/staff", "/admin", "/fa/admin/content"]) {
    assert.equal(runInitScript(path, stored), undefined, path);
  }
  assert.equal(runInitScript("/fa/staffing-news", stored), "light");
});

test("the document shell inlines the script with identical server markup", () => {
  assert.match(documentShell, /themeInitScript/);
  assert.match(documentShell, /<body[^>]*>\s*<script dangerouslySetInnerHTML=\{\{ __html: themeInitScript \}\} \/>/);
  assert.match(documentShell, /suppressHydrationWarning/);
  assert.doesNotMatch(documentShell, /data-theme=/);
  assert.match(themeStore, /useSyncExternalStore\(subscribeTheme, getTheme, getServerTheme\)/);
});

test("the header switch is a labelled sun/moon button in both languages", () => {
  assert.match(themeSwitch, /<button[\s\S]*type="button"[\s\S]*aria-pressed=\{light\}[\s\S]*aria-label=\{label\}/);
  assert.match(themeSwitch, /import \{ Moon, Sun \} from "lucide-react"/);
  for (const label of ["حالت روشن", "حالت تیره", "Light theme", "Dark theme"]) {
    assert.ok(themeSwitch.includes(label), label);
  }
  assert.match(themeSwitch, /liquid-button/);
  assert.match(siteChrome, /<ThemeSwitch lang=\{lang\} \/>/);
  assert.match(siteChrome, /restoreTheme\(\);\s*return clearTheme;/);
  assert.match(globals, /:root\[data-theme="light"\] \.theme-switch__sun \{\s*opacity: 1;/);
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\) \{\s*\.theme-switch__icon/);
});

test("light tokens: ivory page, warm ink, carpet red, contrast-safe gold", () => {
  const light = globals.match(/:root\[data-theme="light"\] \{([\s\S]*?)\n\}/)[1];
  for (const [name, value] of [
    ["--background", "#f4efe6"],
    ["--foreground", "#1d1812"],
    ["--carpet", "#9e1b24"],
    ["--gold", "#845a12"],
    ["--cyan", "#0e6670"],
    ["--ink", "#1d1812"],
    ["--ink-floor", "40%"],
  ]) {
    assert.match(light, new RegExp(`${name}: ${value};`), name);
  }
  assert.match(light, /color-scheme: light;/);
  assert.match(globals, /:root\[data-theme="dark"\] \{\s*color-scheme: dark;/);
  assert.match(globals, /--gold-fill: #d6ae65;/);
  assert.match(globals, /@utility text-ink-\*/);
  // Dark token values equal the utilities they replaced, so dark is unchanged.
  assert.match(globals, /:root,\n\.on-photo \{\n  --ink: #fff;\n  --ink-floor: 0%;\n  --shade: #000;/);
});

test("light liquid glass is frosted white and the gold call-to-action stays gold", () => {
  assert.match(globals, /:root\[data-theme="light"\] \{\n  --glass-fill: rgba\(255, 255, 255, 0\.6\);/);
  assert.match(globals, /:root\[data-theme="light"\] \.glass-header\[data-scrolled="true"\]/);
  assert.match(globals, /:root\[data-theme="light"\] \.liquid-button:not\(\.liquid-button--gold/);
  assert.match(globals, /@media \(prefers-reduced-transparency: reduce\) \{\n  :root\[data-theme="light"\]/);
  assert.match(globals, /\.liquid-button--gold \{\n  color: #17120a;/);
  // The link colour rule stays in the base layer.
  assert.match(globals, /@layer base \{\s*a \{\s*color: inherit;/);
});

test("public components use theme tokens instead of hard-coded white text", async () => {
  const files = [
    "HomeSections", "UpcomingExhibitions", "AboutExperience", "AnimatedTabs", "PartnersSection",
    "SiteGuides", "RequestBuilders", "InquiryForm", "GoogleMapPanel", "BlogCards",
    "ArchiveSections", "SiteFooter", "SiteChrome",
  ];
  for (const name of files) {
    const source = await read(`src/components/${name}.tsx`);
    assert.doesNotMatch(source, /\btext-white\b/, name);
    assert.doesNotMatch(source, /\bborder-white\//, name);
  }
  const lightbox = await read("src/components/GalleryLightbox.tsx");
  assert.match(lightbox, /on-photo fixed inset-0[^"]*bg-black\/95[^"]*text-white/);
});
