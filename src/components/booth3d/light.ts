// Chapter 6: power and light, and the light arc of the whole film.
// Chapters 1-5 are a build-up day: hall work lights on, neutral and slightly
// cool, plus tripod LED floods on the plot. Chapter 6 is the turn: the hall
// dims to about a third, the distribution board goes live and a pulse runs
// along the cable routes; each fixture fires as the pulse reaches it (cove
// strips, lightboxes, then the truss spots one by one round the truss).
// Chapters 7, 8 and the finale are show state: the stand is the brightest,
// warmest thing in the hall, which stays visible in a dimmed blue-grey.

import * as THREE from "three";
import { merge, type Ctx, type V3 } from "./core";
import { FLOOR_TOP } from "./floor";
import { RIG, type Fixture } from "./rigging";
import { DECK } from "./structure";
import {
  BOOTH_TIMELINE as T,
  SPOT_ORDER,
  hallLight,
  ledLevel,
  ledSweep,
  lightboxLevel,
  powerLevel,
  showLight,
  spotLevel,
  trussPulse,
  window01,
} from "./timeline";

const WARM = new THREE.Color("#ffd2a1"); // ~3000 K
const WORK = new THREE.Color("#e8eff5"); // hall work light, ~5000 K
const AIR_BUILD = new THREE.Color("#3d444b");
const AIR_SHOW = new THREE.Color("#161c23");
const SKY_BUILD = new THREE.Color("#dfe6ec");
const SKY_SHOW = new THREE.Color("#8ea2b6");

/** Floods are on from the rigging until the board goes live. */
export const floodLevel = (p: number) => (p < 0.112 ? 0.6 : 1) * (1 - window01(p, T.power[0], T.power[1] + 0.006));

/** Distance along a polyline, and points every `step` metres along it. */
function walk(points: V3[], step: number) {
  const out: Array<{ p: V3; s: number }> = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const len = a.distanceTo(b);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k += 1) {
      const q = a.clone().lerp(b, k / n);
      out.push({ p: [q.x, q.y, q.z], s: total + (len * k) / n });
    }
    total += len;
  }
  return { out, total };
}

export function buildLight(ctx: Ctx, options: { realSpots: boolean }) {
  const { mats, root, scene, track, parts, decals, sparkles } = ctx;

  // ---- real lights (created once; levels change, counts never do).
  const hemi = new THREE.HemisphereLight(SKY_BUILD, 0x5b5650, 1.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(WORK, 2.4);
  key.position.set(9, 16, 12);
  key.target.position.set(0, 1.5, 0);
  if (ctx.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const cam = key.shadow.camera;
    cam.left = -9.5;
    cam.right = 9.5;
    cam.top = 8;
    cam.bottom = -7;
    cam.near = 8;
    cam.far = 38;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
  }
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb8c4, 0.5);
  rim.position.set(-12, 9, -12);
  scene.add(rim);
  // The tripod floods' throw: low, from the open front, no shadow.
  const flood = new THREE.DirectionalLight(0xf2f5f8, 1.2);
  flood.position.set(5, 4, 14);
  flood.target.position.set(-1, 1, -2);
  scene.add(flood, flood.target);
  // Warm fills: under the deck (meeting room + bar), upstairs and the front.
  const fillLow = new THREE.PointLight(WARM, 0, 7, 1.6);
  fillLow.position.set(-3.6, 2.4, -2.6);
  const fillUp = new THREE.PointLight(WARM, 0, 7, 1.6);
  fillUp.position.set(-3.5, 5.2, -2.8);
  const fillFront = new THREE.PointLight(WARM, 0, 13, 1.4);
  // Low and to the left: from here its highlight never lands on the brass mark.
  fillFront.position.set(-2.0, 3.2, 4.5);
  scene.add(fillLow, fillUp, fillFront);

  // ---- spot order: where each fixture sits on the pulse's run round the truss.
  const fixtures = ctx.hooks.fixtures as Fixture[];
  const n = fixtures.length;
  const perimeter = 4 * (RIG.x + RIG.z);
  const along = (x: number, z: number) => {
    // Clockwise from the front-left corner: front, right, back, left.
    const dx = Math.abs(Math.abs(x) - RIG.x);
    const dz = Math.abs(Math.abs(z) - RIG.z);
    if (dz <= dx && z > 0) return x + RIG.x;
    if (dx < dz && x > 0) return 2 * RIG.x + (RIG.z - z);
    if (dz <= dx && z < 0) return 2 * RIG.x + 2 * RIG.z + (RIG.x - x);
    return 4 * RIG.x + 2 * RIG.z + (z + RIG.z);
  };
  SPOT_ORDER.length = 0;
  for (const f of fixtures) SPOT_ORDER.push(along(f.world.x, f.world.z) / perimeter);

  // A few real spotlights on desktop, following their truss fixtures.
  const realSpots: Array<{ light: THREE.SpotLight; index: number }> = [];
  if (options.realSpots) {
    // (none aimed at the brass mark: a real spot there burns a hotspot into it)
    for (const index of [2, 3, 12]) {
      const f = fixtures[index];
      const light = new THREE.SpotLight(WARM, 0, 16, 0.32, 0.55, 1.2);
      light.position.copy(f.world);
      light.target.position.copy(f.target);
      scene.add(light, light.target);
      realSpots.push({ light, index });
    }
  }

  // ---- distribution board under the stair, fed from the trunking.
  const db = new THREE.Group();
  const cabinet = ctx.mesh(ctx.rbox(0.5, 0.7, 0.22, 0.012), mats.galv);
  cabinet.position.y = 0.35;
  const door = ctx.mesh(ctx.rbox(0.46, 0.66, 0.01, 0.004), mats.greige);
  door.position.set(0, 0.35, 0.115);
  db.add(cabinet, door);
  db.position.set(-5.4, FLOOR_TOP, 0.9);
  db.rotation.y = Math.PI / 2;
  root.add(db);
  parts.object(db, [T.power[0] - 0.006, T.power[0]], { from: [0.8, 0, 0], glint: [-5.25, FLOOR_TOP + 0.5, 0.9] });
  const feed = ctx.mesh(track(merge([new THREE.CylinderGeometry(0.016, 0.016, 1.95, 6).rotateZ(Math.PI / 2).translate(-4.4, FLOOR_TOP + 0.02, 1.0)])), mats.cableOrange, false);
  root.add(feed);
  parts.object(feed, [T.power[0] - 0.004, T.power[0] + 0.002], { scaleFrom: [0.01, 1, 1], from: [0.97, 0, 0], ease: (t) => t });
  // Indicator lamps turn teal as the board goes live.
  for (let i = 0; i < 4; i += 1) {
    const z = 0.82 + i * 0.05;
    sparkles.add([-5.27, FLOOR_TOP + 0.62, z], 0.06, new THREE.Color(0.3, 1.6, 1.2), (p) => (powerLevel(p) > (i + 1) / 5 ? 1 : 0));
  }
  // Feeder cable dropped from the truss corner to the board's floor run.
  const feederX = -RIG.x + 0.12;
  const feederZ = RIG.z - 0.14;
  const feederTop = RIG.height - 0.16;
  const feeder = ctx.mesh(track(new THREE.CylinderGeometry(0.014, 0.014, feederTop - FLOOR_TOP, 6).translate(0, (feederTop - FLOOR_TOP) / 2, 0)), mats.cable, false);
  feeder.position.set(feederX, FLOOR_TOP, feederZ);
  root.add(feeder);
  parts.object(feeder, [T.power[0] - 0.004, T.power[0] + 0.004], { scaleFrom: [1, 0.01, 1], ease: (t) => t });

  // ---- the travelling pulse: a bright head with a short tail on the cable routes.
  const y0 = FLOOR_TOP + 0.03;
  const legA = walk(
    [
      [-5.27, FLOOR_TOP + 0.4, 0.9],
      [-5.0, y0, 0.9],
      [-1.3, y0, 0.9],
      [-1.3, y0, -3.55],
      [5.9, y0, -3.55],
    ],
    0.12,
  );
  const trussY = RIG.height - 0.15;
  const legB = walk(
    [
      [-5.27, FLOOR_TOP + 0.4, 0.95],
      [-5.27, y0, 1.1],
      [feederX, y0, feederZ],
      [feederX, trussY, feederZ],
    ],
    0.14,
  );
  const ring = walk(
    [
      [-RIG.x, trussY, RIG.z],
      [RIG.x, trussY, RIG.z],
      [RIG.x, trussY, -RIG.z],
      [-RIG.x, trussY, -RIG.z],
      [-RIG.x, trussY, RIG.z],
    ],
    0.2,
  );
  const pulseColor = new THREE.Color(1.7, 1.35, 0.9);
  const addPulse = (leg: ReturnType<typeof walk>, front: (p: number) => number, size: number) => {
    for (const { p: at, s } of leg.out) {
      sparkles.add(at, size, pulseColor, (p) => {
        const f = front(p);
        if (f <= 0 || f >= 1.04) return 0;
        const d = f * leg.total - s;
        const head = Math.exp(-Math.pow(d / 0.32, 2));
        const tail = d > 0 ? 0.22 * Math.exp(-d / 1.8) : 0;
        return Math.min(1, head + tail) * (1 - window01(f, 0.98, 1.04));
      });
    }
  };
  addPulse(legA, (p) => window01(p, T.pulse[0], T.pulse[1]), 0.18);
  addPulse(legB, (p) => window01(p, T.feeder[0], T.feeder[1]), 0.18);
  addPulse(ring, trussPulse, 0.22);

  // ---- beams: one instanced cone per fixture, additive and view-softened.
  const coneGeo = new THREE.CylinderGeometry(1, 0.04, 1, ctx.rich ? 28 : 16, 1, true);
  coneGeo.translate(0, 0.5, 0);
  const level = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  level.setUsage(THREE.DynamicDrawUsage);
  coneGeo.setAttribute("aLevel", level);
  const beamMat = track(
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(1.0, 0.8, 0.56) }, uStrength: { value: ctx.rich ? 0.06 : 0.085 } },
      vertexShader: /* glsl */ `
        attribute float aLevel;
        varying float vLevel;
        varying float vAlong;
        varying float vEdge;
        void main() {
          vec4 p = vec4(position, 1.0);
          vec3 n = normal;
          #ifdef USE_INSTANCING
            p = instanceMatrix * p;
            n = mat3(instanceMatrix) * n;
          #endif
          vec4 mv = modelViewMatrix * p;
          vec3 vn = normalize(normalMatrix * n);
          vEdge = abs(dot(vn, normalize(-mv.xyz)));
          vAlong = uv.y;
          vLevel = aLevel;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        varying float vLevel;
        varying float vAlong;
        varying float vEdge;
        void main() {
          float a = vLevel * uStrength * pow(vEdge, 3.0) * (0.35 + 0.65 * (1.0 - vAlong)) * smoothstep(0.0, 0.08, vAlong) * (1.0 - smoothstep(0.7, 1.0, vAlong));
          gl_FragColor = vec4(uColor * a, 1.0);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  const beams = new THREE.InstancedMesh(track(coneGeo), beamMat, n);
  beams.frustumCulled = false;
  beams.renderOrder = 8;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const half = Math.tan(THREE.MathUtils.degToRad(11));
  fixtures.forEach((f, i) => {
    const dir = f.target.clone().sub(f.world);
    const len = dir.length();
    dir.normalize();
    const apex = f.world.clone().addScaledVector(dir, 0.16);
    q.setFromUnitVectors(up, dir);
    const r = (len - 0.16) * half;
    m.compose(apex, q, new THREE.Vector3(r, len - 0.16, r));
    beams.setMatrixAt(i, m);
    // Lens glow, and a pool on the floor (or deck) under what the beam lights.
    // Pools never sit at counter or plinth height: seen edge-on they read as streaks.
    sparkles.add([apex.x, apex.y, apex.z], 0.26, new THREE.Color(1.5, 1.15, 0.75), (p) => spotLevel(p, i, n) * 0.85);
    const onDeck = f.target.x > DECK.x0 && f.target.x < DECK.x1 && f.target.z > DECK.z0 && f.target.z < DECK.z1 && f.target.y > DECK.top;
    const onWall = f.target.z < -3.7 && !onDeck;
    if (!onWall) {
      const py = onDeck ? DECK.top + 0.004 : FLOOR_TOP + 0.0042;
      decals.add("pool", f.target.x, py, f.target.z, r * 2.2, r * 2.2, (p) => spotLevel(p, i, n) * 0.42);
    }
    const fire = T.spots[0] + SPOT_ORDER[i] * (T.spots[1] - T.spots[0] - 0.004);
    ctx.sparkles.glint([apex.x, apex.y, apex.z], fire + 0.003, 0.6);
  });
  root.add(beams);

  // ---- per-frame levels.
  const keyColor = new THREE.Color();
  const lampColor = new THREE.Color();
  const air = scene.background as THREE.Color;
  const fog = scene.fog as THREE.FogExp2;
  ctx.anims.push((p) => {
    const show = showLight(p);
    const hall = hallLight(p);
    const fl = floodLevel(p);
    // Work light (cool, generous) hands over to warm show light; the hall dims to a third.
    keyColor.copy(WORK).lerp(WARM, show);
    key.color.copy(keyColor);
    key.intensity = 0.9 + 1.5 * hall;
    hemi.color.copy(SKY_SHOW).lerp(SKY_BUILD, (hall - 0.32) / 0.68);
    hemi.intensity = 0.42 + 1.1 * hall;
    rim.intensity = 0.45 + show * 0.15;
    flood.intensity = fl * 1.3;
    scene.environmentIntensity = 0.32 + 0.6 * hall;
    air.copy(AIR_SHOW).lerp(AIR_BUILD, (hall - 0.32) / 0.68);
    fog.color.copy(air);

    const led = mats.led.uniforms;
    led.uSweep.value = ledSweep(p);
    led.uLevel.value = ledLevel(p);
    const lb = lightboxLevel(p);
    const downlights = window01(p, T.ledLines[0] + 0.006, T.ledLines[1]);
    lampColor.setRGB(1.6, 1.25, 0.85).multiplyScalar(downlights);
    mats.lamp.color.copy(lampColor);
    mats.lens.color.setRGB(0.05, 0.045, 0.04).lerp(new THREE.Color(0.5, 0.4, 0.28), window01(p, T.spots[1], T.spots[1] + 0.01));
    mats.tealGlow.color.setRGB(0.1, 0.55, 0.42).multiplyScalar(lb);
    fillLow.intensity = downlights * 7;
    fillUp.intensity = downlights * 5;
    fillFront.intensity = lb * 12;

    const array = level.array as Float32Array;
    let dirty = false;
    let lit = 0;
    for (let i = 0; i < n; i += 1) {
      const v = spotLevel(p, i, n);
      lit += v;
      if (array[i] !== v) {
        array[i] = v;
        dirty = true;
      }
    }
    if (dirty) level.needsUpdate = true;
    beams.visible = lit > 0;
    for (const spot of realSpots) spot.light.intensity = spotLevel(p, spot.index, n) * 45;
  });

  return {
    key,
    setShadows(enabled: boolean) {
      key.castShadow = enabled;
    },
  };
}
