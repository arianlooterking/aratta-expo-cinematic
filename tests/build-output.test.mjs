import { readdir, readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const staticDir = fileURLToPath(new URL("../.next/static/", import.meta.url));

async function scripts(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await scripts(path)));
    else if (entry.name.endsWith(".js")) out.push(path);
  }
  return out;
}

// A script the browser cannot parse never runs, and nothing in lint, type check or
// build reports it. On 2026-11-12 the minifier produced such a chunk for the 3D
// booth, so the booth loaded in development and stayed blank in the published build.
test("every script in the production build parses", async (t) => {
  const built = await stat(staticDir).then((s) => s.isDirectory(), () => false);
  if (!built) {
    t.skip("no production build here; run npm run build:next first");
    return;
  }
  const broken = [];
  for (const file of await scripts(staticDir.replace(/\/$/, ""))) {
    try {
      new vm.Script(await readFile(file, "utf8"), { filename: file });
    } catch (error) {
      broken.push(`${file.slice(staticDir.length)}: ${error.message}`);
    }
  }
  assert.deepEqual(broken, []);
});
