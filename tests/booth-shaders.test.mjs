import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

// The desktop tier renders into a float buffer and blurs it for the bloom. One
// invalid pixel (NaN) is then spread into a screen-sized black block. Software
// rendering does not produce such pixels where real graphics drivers do, so
// these rules are checked in the source rather than in a screenshot.
const dir = new URL("../src/components/booth3d/", import.meta.url);
const files = (await readdir(dir)).filter((name) => name.endsWith(".ts"));
const sources = Object.fromEntries(await Promise.all(files.map(async (name) => [name, await readFile(new URL(name, dir), "utf8")])));

test("shaders never raise a possibly negative value to a power", () => {
  for (const [name, source] of Object.entries(sources)) {
    for (const [index, line] of source.split("\n").entries()) {
      if (line.trim().startsWith("//")) continue;
      const calls = [...line.matchAll(/(?<![.\w])pow\(/g)];
      for (const call of calls) {
        const rest = line.slice(call.index);
        assert.match(rest, /^pow\(\s*max\(/, `${name}:${index + 1} uses pow() without max() on its base: use x * x, or pow(max(x, 0.0001), e)`);
      }
    }
  }
});

test("the bloom is fed through the guard pass", () => {
  const scene = sources["booth-scene.ts"];
  const guard = scene.indexOf("composer.addPass(guard)");
  const bloom = scene.indexOf("composer.addPass(bloom)");
  assert.ok(guard > 0, "the guard pass is added to the composer");
  assert.ok(guard < bloom, "the guard pass runs before the bloom");
  assert.match(scene, /float safe\(float v\) \{ return v > 0\.0 \? min\(v, 64\.0\) : 0\.0; \}/);
});

test("the dark hall keeps its original blue aisle carpet", () => {
  // #27405e over the light grey pile texture (#dcdcdc) gives the original #203650.
  assert.match(sources["materials.ts"], /export const AISLE = \{ dark: "#27405e", light: "#8e1820" \}/);
});
