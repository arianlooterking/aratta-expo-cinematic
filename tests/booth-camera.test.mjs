import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// camera.ts imports "./timeline" without an extension (bundler style); resolve it to the .ts file.
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

const THREE = await import("three");
const cam = await import("../src/components/booth3d/camera.ts");

const SIZES = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2000, 987],
  [2560, 1080],
  [1100, 800],
];

test("landscape chapters keep the whole subject box centred inside the free band", () => {
  for (const [w, h] of SIZES) {
    const rig = cam.createCameraRig(new THREE.PerspectiveCamera());
    rig.setChapterBand(0.12, 0.76);
    rig.setSafeBand(0.1, 0.62);
    for (let i = 0; i <= 100; i += 1) {
      const p = i / 100;
      const b = rig.subjectBounds(p, w, h);
      assert.ok(Math.abs(b.centreX - 0.5) <= 0.015, `${w}x${h} p=${p} centre ${b.centreX}`);
      assert.ok(b.left >= 0.04 && b.right <= 0.96, `${w}x${h} p=${p} edges ${b.left}..${b.right}`);
      if (p < cam.FINALE_BLEND[0]) {
        assert.ok(b.inBand, `${w}x${h} p=${p} outside the band ${b.top}..${b.bottom}`);
        if (p >= 0.22) assert.ok(b.fillBand <= 0.92 && b.fillWidth <= 0.66, `${w}x${h} p=${p} overfills`);
      }
    }
    const st = cam.pathStats(rig.at, w, h, 0.002);
    assert.ok(st.azimuthMonotone && st.heightMonotone, `${w}x${h} reverses`);
  }
});

test("the subject grows smoothly with the rig and the arc is even", () => {
  let prev = cam.subjectHeight(0);
  assert.ok(Math.abs(prev - 1.2) < 1e-9);
  for (let i = 1; i <= 1000; i += 1) {
    const h = cam.subjectHeight(i / 1000);
    assert.ok(h >= prev && h - prev < 0.12);
    prev = h;
  }
  assert.ok(Math.abs(cam.subjectHeight(0.22) - 7.15) < 1e-9);
  const starts = [0, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.9];
  for (let i = 0; i + 1 < starts.length; i += 1) {
    const arc = cam.landAzimuth(starts[i]) - cam.landAzimuth(starts[i + 1]);
    assert.ok(arc >= 4 && arc <= 7, `chapter ${i + 1} sweeps ${arc} deg`);
  }
});
