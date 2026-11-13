import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

// surroundings-timeline.ts imports "./timeline" without an extension (bundler style).
registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        // fall through
      }
    }
    return next(specifier, context);
  },
});

const S = await import("../src/components/booth3d/surroundings-timeline.ts");
const { FINALE_AT } = await import("../src/components/booth3d/timeline.ts");

const stands = ["rotunda", "portal", "ribbon", "pergola", "dome", "mediaLeft", "twinRight", "sideLeft", "sideRight", "pavilion"];

test("every neighbour builds in phases spread over the chapters, lit and dressed by the finale", () => {
  const starts = [];
  for (const name of stands) {
    const plan = S.SURROUNDINGS[name];
    assert.ok(plan, `${name} has a plan`);
    for (const [phase, win] of Object.entries(plan)) {
      assert.ok(win[0] < win[1], `${name}.${phase} runs forward`);
      assert.ok(win[1] <= FINALE_AT + 1e-9, `${name}.${phase} ends by the finale`);
    }
    assert.ok(plan.lights[1] <= FINALE_AT, `${name} is lit by the finale`);
    if (plan.dress) assert.ok(plan.dress[1] <= FINALE_AT + 1e-9, `${name} is dressed by the finale`);
    const ends = Object.values(plan).map((w) => w[1]);
    // Each build lasts across several chapters, not one burst.
    assert.ok(Math.max(...ends) - Math.min(...Object.values(plan).map((w) => w[0])) > 0.35, `${name} builds over several chapters`);
    starts.push(Math.min(...Object.values(plan).map((w) => w[0])));
  }
  // The builds start at different times (the hall fills up in step with our build).
  const sorted = [...starts].sort((a, b) => a - b);
  assert.ok(sorted.at(-1) - sorted[0] > 0.4, "the neighbours start their builds in different chapters");
});

test("something is always quietly happening in the background until the hosting chapter", () => {
  const windows = S.surroundingWindows();
  for (let p = 0.0; p <= 0.86; p += 0.005) {
    const busy = windows.some(([a, b]) => p >= a - 0.02 && p <= b + 0.02);
    assert.ok(busy, `nothing moves around the stand at p = ${p.toFixed(3)}`);
  }
});

test("lights come on stand after stand, never all at once", () => {
  const lightStarts = stands.map((name) => S.SURROUNDINGS[name].lights[0]).sort((a, b) => a - b);
  for (let i = 1; i < lightStarts.length; i += 1) assert.ok(lightStarts[i] - lightStarts[i - 1] >= 0.005, "lights are staggered");
  for (const name of stands) {
    const [a, b] = S.SURROUNDINGS[name].lights;
    assert.ok(b - a >= 0.03, `${name}'s lights fade up slowly (no flash)`);
  }
  const groups = S.SURROUNDINGS.far.groups;
  assert.equal(groups.length, 3);
  for (const [a, b] of groups) assert.ok(b - a >= 0.04, "far rows fade up slowly");
});

test("work gear arrives and leaves during the build and is gone before the finale", () => {
  assert.ok(S.GEAR.length >= 6);
  const kinds = new Set(S.GEAR.map((g) => g.kind));
  for (const kind of ["pallet", "crates", "lift", "truck"]) assert.ok(kinds.has(kind), `${kind} on site`);
  for (const g of S.GEAR) {
    assert.ok(g.in[1] < g.out[0], "arrives before it leaves");
    assert.ok(g.out[1] < FINALE_AT, "gone before the finale");
    assert.equal(S.onSite(FINALE_AT, g.in, g.out), 0);
  }
});

test("keep-clear: nothing tall stands in the camera's sector in front of the stand", () => {
  // The sector itself: 60 degrees either side of the front axis, out to 40 m.
  assert.equal(S.inKeepClear(0, 20), true);
  assert.equal(S.inKeepClear(30, 18), true);
  assert.equal(S.inKeepClear(-20, 5), false);
  assert.equal(S.inKeepClear(0, -10), false);
  assert.equal(S.inKeepClear(10, 50), false);
  for (const f of S.NEIGHBOUR_FOOTPRINTS) {
    if (f.h <= 0.5) continue;
    for (const [x, z] of S.footprintCorners(f)) assert.equal(S.inKeepClear(x, z), false, `${f.name} corner (${x.toFixed(1)}, ${z.toFixed(1)}) is in the camera's sector`);
  }
});

test("no stand overlaps another or the plot", () => {
  const boxes = S.NEIGHBOUR_FOOTPRINTS.map((f) => {
    const c = S.footprintCorners(f);
    const xs = c.map((p) => p[0]);
    const zs = c.map((p) => p[1]);
    return { name: f.name, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  });
  const plot = { name: "plot", x0: -7, x1: 7, z0: -5.5, z1: 5.5 };
  const stand = boxes.filter((b) => !b.name.startsWith("gear"));
  for (const a of [...stand, plot]) {
    for (const b of stand) {
      if (a === b) continue;
      const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
      assert.equal(overlap, false, `${a.name} overlaps ${b.name}`);
    }
  }
});

test("the hall carries no lettering: no hall name, zone letters or stand numbers", async () => {
  const hall = await readFile(new URL("../src/components/booth3d/hall-architecture.ts", import.meta.url), "utf8");
  const neighbours = await readFile(new URL("../src/components/booth3d/neighbours.ts", import.meta.url), "utf8");
  for (const [name, source] of [["hall-architecture.ts", hall], ["neighbours.ts", neighbours]]) {
    assert.doesNotMatch(source, /fillText\(/, `${name} draws no text`);
    assert.doesNotMatch(source, /سالن|HALL 3/, `${name} names no hall`);
  }
});
