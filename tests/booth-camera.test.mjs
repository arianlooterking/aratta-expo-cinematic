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

const LANDSCAPE = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2000, 987],
  [2560, 1080],
  [1100, 800],
];
const BAND = [0.12, 0.76];
/** Where the whole stand is framed: between the two moves in, and through the finale. */
const WHOLE_AT = [0.6, 0.63, 0.83, 0.84];

const rigFor = (w, h) => {
  const rig = cam.createCameraRig(new THREE.PerspectiveCamera());
  if (w > h) rig.setChapterBand(...BAND);
  else rig.setFreeBand(0.1, 0.62);
  rig.setSafeBand(0.1, 0.62);
  return rig;
};
const pose = () => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 });
const view = (q) => q.tgt.clone().sub(q.pos).normalize();
const pitch = (q) => -THREE.MathUtils.radToDeg(Math.asin(view(q).y));
const azimuth = (q) => THREE.MathUtils.radToDeg(Math.atan2(q.pos.x, q.pos.z));

test("landscape: the part in focus stays centred in the band, the whole stand between moves and at the end", () => {
  for (const [w, h] of LANDSCAPE) {
    const rig = rigFor(w, h);
    for (let i = 0; i <= 200; i += 1) {
      const p = i / 200;
      const f = rig.subjectBounds(p, w, h, "focus");
      assert.ok(Math.abs(f.centreX - 0.5) <= 0.025, `${w}x${h} p=${p} focus centre ${f.centreX}`);
      if (p < cam.FINALE_BLEND[0]) {
        // The rise over the plan is a straight glide: the framing is solved at both ends of it.
        const glide = cam.LAND_GLIDES.some(([a, b, kind]) => kind === "line" && p > a && p < b);
        if (!glide) assert.ok(f.top >= BAND[0] - 0.01 && f.bottom <= BAND[1] + 0.01, `${w}x${h} p=${p} focus outside the band ${f.top}..${f.bottom}`);
      }
    }
    for (const p of WHOLE_AT) {
      const b = rig.subjectBounds(p, w, h, "whole");
      assert.ok(Math.abs(b.centreX - 0.5) <= 0.015 && b.top >= BAND[0] - 0.01 && b.bottom <= BAND[1] + 0.01 && b.left >= 0.04 && b.right <= 0.96, `${w}x${h} p=${p} whole stand not whole and centred`);
    }
    for (let i = 0; i <= 20; i += 1) {
      const p = cam.FINALE_BLEND[1] + ((1 - cam.FINALE_BLEND[1]) * i) / 20;
      const b = rig.subjectBounds(p, w, h, "whole");
      assert.ok(Math.abs(b.centreX - 0.5) <= 0.015 && b.left >= 0.04 && b.right <= 0.96, `${w}x${h} finale p=${p}`);
    }
  }
});

test("landscape: the plan is seen from nearly straight above, upright, large in the band", () => {
  for (const [w, h] of LANDSCAPE) {
    const rig = rigFor(w, h);
    for (const p of [0.16, 0.18, 0.195]) {
      const q = rig.at(p, w, h, pose());
      assert.ok(pitch(q) >= 54, `${w}x${h} p=${p} looks down only ${pitch(q)} deg`);
      // Upright: the camera faces the plot from its front (screen up is the back of the stand).
      assert.ok(Math.abs(azimuth(q)) <= 3, `${w}x${h} p=${p} plan turned ${azimuth(q)} deg`);
      const f = rig.subjectBounds(p, w, h, "focus");
      assert.ok((f.bottom - f.top) / (BAND[1] - BAND[0]) >= 0.8, `${w}x${h} p=${p} plan small`);
    }
    // Back to a three-quarter view once the floor is in.
    const q = rig.at(0.34, w, h, pose());
    assert.ok(azimuth(q) >= 15 && pitch(q) <= 25, `${w}x${h} three-quarter view after the plan`);
  }
});

test("the path is smooth, bounded and keeps clear of the stand and the roof", () => {
  for (const [w, h] of [...LANDSCAPE, [390, 844], [820, 1180]]) {
    const rig = rigFor(w, h);
    const a = rig.at(0, w, h, pose());
    // The opening frame is shared with the hall: about (9, 8.4, 31) looking at (0, 3, 0).
    assert.ok(a.pos.distanceTo(new THREE.Vector3(9, 8.4, 31)) < (w > h ? 0.05 : 12), `${w}x${h} opening moved`);
    const b = pose();
    let worst = 0;
    let worstPitch = 0;
    let worstOff = 0;
    for (let i = 1; i <= 1000; i += 1) {
      rig.at(i / 1000, w, h, b);
      worst = Math.max(worst, b.pos.distanceTo(a.pos));
      worstPitch = Math.max(worstPitch, THREE.MathUtils.radToDeg(view(a).angleTo(view(b))));
      worstOff = Math.max(worstOff, Math.hypot((b.offX - a.offX) / w, (b.offY - a.offY) / h));
      // At least 1.5 m from the stand's box (with the rig and sign to 8 m), under the roof steel.
      const p = b.pos;
      const gap = Math.hypot(Math.max(-6.05 - p.x, 0, p.x - 6.05), Math.max(0, p.y - 8), Math.max(-4.5 - p.z, 0, p.z - 4.5));
      assert.ok(gap >= 1.5 && p.y <= cam.LAND_CEILING + 0.05, `${w}x${h} p=${i / 1000} too close (${gap.toFixed(2)} m, y ${p.y.toFixed(2)})`);
      // In the front sector kept clear of tall objects: within 60 deg of the front axis, inside 40 m.
      assert.ok(Math.abs(azimuth(b)) <= 60 && Math.hypot(p.x, p.z) <= 40, `${w}x${h} p=${i / 1000} leaves the front sector`);
      a.pos.copy(b.pos);
      a.tgt.copy(b.tgt);
      a.offX = b.offX;
      a.offY = b.offY;
    }
    assert.ok(worst <= 0.2, `${w}x${h} step ${worst} m per 0.001`);
    assert.ok(worstPitch <= 0.55, `${w}x${h} turn ${worstPitch} deg per 0.001`);
    assert.ok(worstOff <= 0.003, `${w}x${h} lens shift ${worstOff} per 0.001`);
  }
});

test("glides ease in and out and cruise evenly", () => {
  assert.equal(cam.glideEase(0), 0);
  assert.equal(cam.glideEase(1), 1);
  let prev = 0;
  let peak = 0;
  for (let i = 1; i <= 1000; i += 1) {
    const v = cam.glideEase(i / 1000);
    assert.ok(v >= prev);
    peak = Math.max(peak, (v - prev) * 1000);
    prev = v;
  }
  assert.ok(peak < 1.25, `peak speed ${peak}x the average`);
  assert.ok(cam.glideEase(0.001) < 1e-4 && 1 - cam.glideEase(0.999) < 1e-4, "glides start and end at rest");
});

/** A long fast flick down the page at 60 fps; returns when the stand is complete and when the hero is gone. */
function flick(w, h, pxPerSecond, buildShare = 0.92) {
  const camera = new THREE.PerspectiveCamera();
  const rig = rigFor(w, h);
  const play = { current: 0, velocity: 0, catchUp: false };
  const limit = () => {
    const r = rig.pathRate(play.current, w, h);
    return Math.min(cam.CAMERA_SPEED.metres / Math.max(1e-6, r.metres), cam.CAMERA_SPEED.degrees / Math.max(1e-6, r.degrees));
  };
  const real = cam.createCameraRig(camera);
  if (w > h) real.setChapterBand(...BAND);
  else real.setFreeBand(0.1, 0.62);
  real.setSafeBand(0.1, 0.62);
  const pin = 9 * h;
  const leave = 10 * h;
  const dt = 1 / 60;
  let y = 0;
  let done = null;
  let gone = null;
  let last = null;
  let fastest = 0;
  for (let t = 0; t < 10; t += dt) {
    y += pxPerSecond * dt;
    const target = Math.min(1, Math.min(1, y / pin) / buildShare);
    cam.playbackStep(play, target, dt, limit);
    real.apply(play.current, dt, w, h, new THREE.Vector2(), play.catchUp);
    if (last) fastest = Math.max(fastest, camera.position.distanceTo(last) / dt);
    last = camera.position.clone();
    if (done === null && play.current >= cam.FINALE_BLEND[1]) done = t;
    if (gone === null && y >= leave) gone = t;
    if (gone !== null && done !== null && !real.gliding) break;
  }
  return { done, gone, fastest };
}

test("a long fast scroll still shows the finished stand before the hero scrolls away, with no camera whip", () => {
  for (const [w, h] of [
    [2000, 987],
    [1280, 720],
    [390, 844],
  ]) {
    for (const speed of [2500, 6000, 10000]) {
      const r = flick(w, h, speed);
      assert.ok(r.done !== null && r.gone !== null && r.done < r.gone, `${w}x${h} ${speed}px/s: done ${r.done} gone ${r.gone}`);
      assert.ok(r.fastest <= cam.CAMERA_SPEED.metres + 0.3, `${w}x${h} ${speed}px/s camera ${r.fastest} m/s`);
    }
  }
});

test("slow scrolling plays 1:1 and the playback never runs faster than the camera may move", () => {
  const rig = rigFor(2000, 987);
  const limit = () => {
    const r = rig.pathRate(play.current, 2000, 987);
    return Math.min(cam.CAMERA_SPEED.metres / Math.max(1e-6, r.metres), cam.CAMERA_SPEED.degrees / Math.max(1e-6, r.degrees));
  };
  const play = { current: 0, velocity: 0, catchUp: false };
  const dt = 1 / 60;
  let target = 0;
  const a = pose();
  const b = pose();
  rig.at(0, 2000, 987, a);
  for (let i = 0; i < 60 * 40; i += 1) {
    target = Math.min(1, target + 0.03 * dt);
    cam.playbackStep(play, target, dt, limit);
    assert.ok(!play.catchUp, "a slow scroll never triggers the catch-up");
    rig.at(play.current, 2000, 987, b);
    assert.ok(b.pos.distanceTo(a.pos) / dt <= cam.CAMERA_SPEED.metres * 1.05, `camera ${b.pos.distanceTo(a.pos) / dt} m/s at ${play.current}`);
    a.pos.copy(b.pos);
    a.tgt.copy(b.tgt);
  }
  assert.ok(Math.abs(play.current - target) < 0.08, "the slow-motion playback keeps up with a slow scroll");
  // Scrolling back up mirrors it.
  const back = { current: 1, velocity: 0, catchUp: false };
  let caught = false;
  for (let i = 0; i < 60 * 2; i += 1) caught = cam.playbackStep(back, 0, dt, () => 1).catchUp || caught;
  assert.ok(caught && back.current === 0, "a fast scroll back up catches up too");
});
