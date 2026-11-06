// dopa — procedural 3D product models.
// Every product is built from primitives at runtime, so the app ships no image assets.
// Convention: +y is up, the "front" of a product faces +z.
import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { mergeVertices, mergeGeometries } from '../vendor/BufferGeometryUtils.js';

const TAU = Math.PI * 2, PI = Math.PI;
const SRGB = THREE.SRGBColorSpace;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------------- color ---------------- */
export function hsl(c, dh = 0, ds = 0, dl = 0) {
  const o = new THREE.Color(c), t = {};
  o.getHSL(t, SRGB);
  return o.setHSL((t.h + dh + 1) % 1, clamp01(t.s + ds), clamp01(t.l + dl), SRGB);
}
export function mix(a, b, t) {
  const A = new THREE.Color(a).getRGB({}, SRGB), B = new THREE.Color(b).getRGB({}, SRGB);
  return new THREE.Color().setRGB(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t, SRGB);
}
export const hex = (c) => '#' + new THREE.Color(c).getHexString();
const lum = (c) => { const o = new THREE.Color(c).getRGB({}, SRGB); return 0.299 * o.r + 0.587 * o.g + 0.114 * o.b; };

const WHITE = '#f6f6f8', DARK = '#26252c', GOLD = '#e9c07c', SILVER = '#dde1e8', WOOD = '#cf9563';
const SPRINKLES = ['#ff5c8a', '#ffd23f', '#3ec1ff', '#7be495', '#ffffff', '#b07cff'];

/* ---------------- materials ---------------- */
const mat = {
  gloss: (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.12, ...o }),
  satin: (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.35, ...o }),
  matte: (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o }),
  soft: (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.82, sheen: 1, sheenRoughness: 0.5, sheenColor: mix(c, '#ffffff', 0.45), ...o }),
  metal: (c = SILVER, r = 0.2, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: r, ...o }),
  glass: (tint = '#ffffff', o = {}) => new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, roughness: 0.03, thickness: 0.6, ior: 1.5,
    attenuationColor: tint, attenuationDistance: 1.5, specularIntensity: 1, ...o,
  }),
  jelly: (c, o = {}) => new THREE.MeshPhysicalMaterial({
    color: mix(c, '#ffffff', 0.25), transmission: 0.92, roughness: 0.16, thickness: 1.1, ior: 1.42,
    attenuationColor: c, attenuationDistance: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, ...o,
  }),
  glow: (c, i = 2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 }),
  bubble: () => new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.32, depthWrite: false,
    iridescence: 1, iridescenceIOR: 1.33, iridescenceThicknessRange: [180, 820], envMapIntensity: 2.2,
  }),
};

/* ---------------- geometry helpers ---------------- */
function lathe(pts, { n = 0, segs = 64, smooth: sm = true } = {}) {
  let p;
  if (sm) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
    p = curve.getPoints(n || Math.max(32, pts.length * 10)).map((v) => new THREE.Vector2(Math.max(0, v.x), v.y));
  } else p = pts.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(p, segs);
}
const rbox = (w, h, d, r = 0.08, seg = 5) => new RoundedBoxGeometry(w, h, d, seg, r);
const cyl = (rt, rb, h, seg = 48, hs = 1, open = false, ts = 0, tl = TAU) => new THREE.CylinderGeometry(rt, rb, h, seg, hs, open, ts, tl);
const sph = (r, ws = 48, hs = 32, ...rest) => new THREE.SphereGeometry(r, ws, hs, ...rest);
const tor = (R, r, rs = 20, ts = 64, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc);
const cap = (r, len, cs = 10, rs = 24) => new THREE.CapsuleGeometry(r, len, cs, rs);
const tube = (pts, r, ts = 64, rs = 16) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), ts, r, rs, false);

// Polygon with rounded corners → Shape (or Path for holes).
function rpoly(pts, r, target = new THREE.Shape()) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const rr = Array.isArray(r) ? r[i] : r;
    const d1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.min(rr, d1 / 2, d2 / 2);
    const a = [p1[0] + ((p0[0] - p1[0]) / d1) * k, p1[1] + ((p0[1] - p1[1]) / d1) * k];
    const b = [p1[0] + ((p2[0] - p1[0]) / d2) * k, p1[1] + ((p2[1] - p1[1]) / d2) * k];
    if (i === 0) target.moveTo(a[0], a[1]); else target.lineTo(a[0], a[1]);
    target.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
  }
  target.closePath();
  return target;
}
const starPts = (n, R, r, rot = -PI / 2) =>
  Array.from({ length: n * 2 }, (_, i) => { const a = rot + (i * PI) / n, rr = i % 2 ? r : R; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
const ngon = (n, R, rot = 0) => Array.from({ length: n }, (_, i) => [Math.cos(rot + (i * TAU) / n) * R, Math.sin(rot + (i * TAU) / n) * R]);

// Extrude a shape along z (centered), optionally merging vertices for soft, puffy shading.
function ext(shape, depth, { bevel = 0.04, seg = 5, curve = 24, soft = true } = {}) {
  let g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: curve,
  });
  g.translate(0, 0, -depth / 2);
  if (soft) {
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-4); g.computeVertexNormals();
  }
  return g;
}
function deform(geo, fn, normals = true) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v, i); p.setXYZ(i, v.x, v.y, v.z); }
  p.needsUpdate = true;
  if (normals) geo.computeVertexNormals();
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
// Superellipsoid: a soft "pebble box". e→0 boxy, e=1 sphere.
function pebble(w, h, d, e = 0.35, ey = e, ws = 64, hs = 48) {
  const g = sph(1, ws, hs);
  return deform(g, (v) => {
    const f = (c, k) => Math.sign(c) * Math.pow(Math.abs(c), k);
    v.set(f(v.x, e) * w / 2, f(v.y, ey) * h / 2, f(v.z, e) * d / 2);
  });
}
const _o = new THREE.Object3D(), _t = new THREE.Vector3();
// Merge many transformed copies of one geometry into a single geometry (cheap sprinkles, pips, seeds).
function scatter(geo, items) {
  if (!items.length) return new THREE.BufferGeometry();
  const list = items.map((it) => {
    _o.position.set(it.p[0], it.p[1], it.p[2]);
    _o.rotation.set(0, 0, 0); _o.quaternion.identity();
    if (it.n) { _t.set(it.p[0] + it.n[0], it.p[1] + it.n[1], it.p[2] + it.n[2]); _o.lookAt(_t); }
    if (it.r) _o.rotation.set(it.r[0], it.r[1], it.r[2]);
    if (it.spin) _o.rotateZ(it.spin);
    const s = it.s ?? 1; if (typeof s === 'number') _o.scale.setScalar(s); else _o.scale.set(s[0], s[1], s[2]);
    _o.updateMatrix();
    return geo.clone().applyMatrix4(_o.matrix);
  });
  return mergeGeometries(list);
}
function surfacePts(geo, count, rnd, filter = () => true) {
  const p = geo.attributes.position, n = geo.attributes.normal, out = [], P = new THREE.Vector3(), N = new THREE.Vector3();
  let guard = 0;
  while (out.length < count && guard++ < count * 80) {
    const i = Math.floor(rnd() * p.count);
    P.fromBufferAttribute(p, i); N.fromBufferAttribute(n, i);
    if (filter(P, N)) out.push({ p: P.toArray(), n: N.toArray(), spin: rnd() * TAU });
  }
  return out;
}
function vcolor(geo, fn) {
  const p = geo.attributes.position, arr = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = new THREE.Color(fn(v, i)); arr.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function place(o, p, r, s) {
  if (p) o.position.set(p[0], p[1], p[2]);
  if (r) o.rotation.set(r[0], r[1], r[2]);
  if (s !== undefined) { if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]); }
  return o;
}
const M = (geo, material, p, r, s) => place(new THREE.Mesh(geo, material), p, r, s);
const G = (children, p, r, s) => { const g = new THREE.Group(); children.flat().forEach((c) => c && g.add(c)); return place(g, p, r, s); };

function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- canvas textures ---------------- */
const FONT = '"Helvetica Neue", Arial, "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
function ctex(w, h, draw, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opts.data ? THREE.NoColorSpace : SRGB; t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  if (opts.wrapS) t.wrapS = THREE.RepeatWrapping;
  if (opts.offset) t.offset.set(opts.offset[0], opts.offset[1]);
  return t;
}
function txt(g, s, x, y, size, color, { weight = 800, maxW = 0, align = 'center', font = FONT, rot = 0 } = {}) {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  let px = size;
  g.font = `${weight} ${px}px ${font}`;
  if (maxW) while (g.measureText(s).width > maxW && px > 8) { px -= 2; g.font = `${weight} ${px}px ${font}`; }
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, 0, 0);
  g.restore();
}
function noiseTex(size = 256, seed = 1, blobs = 900, rmax = 3) {
  const r = rng(seed);
  return ctex(size, size, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < blobs; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
      g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * rmax, 0, TAU); g.fill();
    }
  }, { data: true, repeat: [3, 3] });
}
// A printed label: background, accent band, title & subtitle. Centered horizontally on the canvas.
function labelTex({ aspect = 0, w = 1024, h = 240, bg = '#ffffff', ink = '#222', accent = '#ff4d6d', title = '', sub = '', band = true, dots = false, front = 0.24 }) {
  if (aspect) w = Math.min(2048, Math.round(h * aspect));
  return ctex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (band) { g.fillStyle = accent; g.fillRect(0, h * 0.78, w, h * 0.12); g.fillRect(0, h * 0.06, w, h * 0.05); }
    if (dots) { const r = rng(9); g.fillStyle = hex(mix(accent, bg, 0.6)); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r() * w, r() * h, 4 + r() * 14, 0, TAU); g.fill(); } }
    txt(g, title, w / 2, h * 0.42, h * 0.32, ink, { weight: 900, maxW: w * front });
    if (sub) txt(g, sub, w / 2, h * 0.65, h * 0.12, accent, { weight: 700, maxW: w * front });
  });
}

// Largest radius of a lathe between two heights (so printed labels sit just outside the body).
function radiusAt(geo, y0, y1) {
  const p = geo.attributes.position; let r = 0;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y >= y0 && y <= y1) r = Math.max(r, Math.hypot(p.getX(i), p.getZ(i))); }
  return r;
}
// A wrap-around label band for a lathe body.
// `turn` rotates the print so its center faces the camera at the model's default yaw.
function wrapLabel(body, y0, y1, { turn = 0.45, ...opts } = {}) {
  const r = radiusAt(body, y0 - 0.01, y1 + 0.01) + 0.004, h = y1 - y0;
  return M(cyl(r, r, h, 96, 1, true, -PI, TAU), mat.satin('#ffffff', { map: labelTex({ aspect: (TAU * r) / h, ...opts }), roughness: 0.45 }), [0, (y0 + y1) / 2, 0], [0, turn, 0]);
}

/* =========================================================
   MODELS
   ========================================================= */
export const MODELS = {};
function reg(key, build, view = {}) { MODELS[key] = { build, ...view }; }

/* ---------- small reusable parts ---------- */
function strawberry(c = '#ff2f4b') {
  const body = lathe([[0, 0], [0.05, 0.02], [0.115, 0.09], [0.14, 0.17], [0.125, 0.235], [0.06, 0.27], [0, 0.272]]);
  const seeds = scatter(sph(0.009, 6, 4), surfacePts(body, 26, rng(4), (p) => p.y > 0.03 && p.y < 0.22));
  const leaves = ext(rpoly(starPts(5, 0.11, 0.035), 0.01), 0.006, { bevel: 0.008, seg: 2 });
  return G([
    M(body, mat.gloss(c, { roughness: 0.2, clearcoat: 1 })),
    M(seeds, mat.gloss('#ffe17a')),
    M(leaves, mat.gloss('#3fa34d'), [0, 0.272, 0], [-PI / 2, 0, 0]),
  ]);
}
function cherry() {
  return G([
    M(sph(0.1), mat.gloss('#e5132e', { clearcoat: 1, roughness: 0.12 })),
    M(tube([[0, 0.07, 0], [0.03, 0.2, 0], [0.11, 0.3, 0.01]], 0.012, 16, 6), mat.matte('#5b8c2a')),
  ]);
}
function swirl(r, h, color) {
  const g = lathe([[0, 0], [r, 0.02], [r * 1.08, h * 0.2], [r * 0.8, h * 0.4], [r * 0.82, h * 0.52], [r * 0.5, h * 0.75], [r * 0.18, h * 0.95], [0, h]], { segs: 72 });
  deform(g, (v) => { const th = Math.atan2(v.z, v.x), k = 1 + 0.08 * Math.sin(3 * th + (v.y / h) * 14); v.x *= k; v.z *= k; });
  return M(g, mat.satin(color, { roughness: 0.4 }));
}

/* ================= FOOD ================= */
reg('apple', ({ c = '#ff3b3b' }) => {
  const body = lathe([[0, 0.07], [0.16, 0.015], [0.42, 0.01], [0.64, 0.17], [0.73, 0.42], [0.67, 0.72], [0.46, 0.92], [0.2, 0.91], [0.06, 0.84], [0, 0.82]]);
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.17, 0.15, 0.4, 0); leaf.quadraticCurveTo(0.17, -0.15, 0, 0);
  return G([
    M(body, mat.gloss(c, { roughness: 0.22, clearcoat: 1 })),
    M(tube([[0, 0.8, 0], [0.01, 0.95, 0], [0.07, 1.1, 0.02]], 0.028, 24, 10), mat.matte('#6d4426')),
    M(ext(leaf, 0.008, { bevel: 0.012, seg: 3 }), mat.gloss('#47b25a'), [0.05, 1.0, 0.02], [0.2, -0.4, 0.55]),
  ]);
});

reg('donut', ({ c = '#ff7eb6' }) => {
  const R = 0.62, r = 0.31, ys = 0.8;
  const dough = tor(R, r, 40, 96); dough.rotateX(PI / 2); deform(dough, (v) => { v.y *= ys; });
  const icing = tor(R, r * 1.05, 40, 96); icing.rotateX(PI / 2);
  deform(icing, (v) => {
    const th = Math.atan2(v.z, v.x), cx = Math.cos(th) * R, cz = Math.sin(th) * R;
    const thr = -0.05 + 0.07 * Math.sin(th * 5 + 1) + 0.035 * Math.sin(th * 11);
    if (v.y < thr) { v.x = cx + (v.x - cx) * 0.86; v.z = cz + (v.z - cz) * 0.86; v.y *= 0.86; }
    v.y *= ys;
  });
  const rnd = rng(7), byColor = {};
  for (let i = 0; i < 90; i++) {
    const th = rnd() * TAU, a = (rnd() - 0.5) * 2.4, rr = r * 1.05;
    const n = [Math.cos(th) * Math.sin(a), Math.cos(a), Math.sin(th) * Math.sin(a)];
    const p = [Math.cos(th) * R + n[0] * rr, n[1] * rr * ys, Math.sin(th) * R + n[2] * rr];
    if (p[1] < 0.12) continue;
    (byColor[SPRINKLES[i % SPRINKLES.length]] ||= []).push({ p, n, spin: rnd() * TAU });
  }
  const sp = cap(0.02, 0.07, 4, 8);
  return G([
    M(dough, mat.satin('#e7a35f', { roughness: 0.6 })),
    M(icing, mat.gloss(c, { roughness: 0.18, clearcoat: 1 })),
    Object.entries(byColor).map(([col, list]) => M(scatter(sp, list), mat.gloss(col, { roughness: 0.3 }))),
  ]);
}, { elev: 0.5 });

function macaron(c) {
  const shell = lathe([[0, 0], [0.47, 0], [0.5, 0.05], [0.47, 0.13], [0.34, 0.2], [0.16, 0.235], [0, 0.24]]);
  const foot = tor(0.465, 0.05, 12, 96); foot.rotateX(PI / 2);
  deform(foot, (v) => { const th = Math.atan2(v.z, v.x); v.y *= 1 + 0.35 * Math.sin(th * 33) * Math.sin(th * 7); });
  const sm = mat.satin(c, { roughness: 0.55 }), cream = mat.satin(mix(c, '#ffffff', 0.72), { roughness: 0.6 });
  return G([
    M(shell, sm, [0, 0.12, 0]), M(foot, sm, [0, 0.105, 0]),
    M(cyl(0.43, 0.43, 0.1, 48), cream),
    M(shell, sm, [0, -0.12, 0], [PI, 0, 0]), M(foot, sm, [0, -0.105, 0]),
  ]);
}
reg('macaron', ({ c = '#b99cff' }) => G([
  G([macaron(c)], [0, 0.37, 0]),
  G([macaron(hsl(c, 0.12, 0, 0.04))], [0.06, 1.09, -0.04], [0.06, 0.8, -0.05]),
  G([macaron(hsl(c, -0.14, 0, 0.02))], [0.86, 0.5, 0.25], [PI / 2 - 0.12, 0.5, 0]),
]));

reg('cupcake', ({ c = '#ff8fb8', c2 }) => {
  const liner = cyl(0.5, 0.36, 0.55, 168, 1); liner.translate(0, 0.275, 0);
  deform(liner, (v) => { const th = Math.atan2(v.z, v.x), k = 1 + 0.035 * Math.abs(Math.sin(th * 14)); v.x *= k; v.z *= k; });
  const fro = lathe([[0, 0.5], [0.5, 0.53], [0.57, 0.62], [0.52, 0.73], [0.44, 0.77], [0.46, 0.83], [0.38, 0.93], [0.3, 0.96], [0.31, 1.01], [0.22, 1.1], [0.15, 1.14], [0.14, 1.19], [0.06, 1.28], [0, 1.31]], { segs: 96, n: 160 });
  deform(fro, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z), k = 1 + 0.07 * Math.sin(3 * th + v.y * 16) * Math.min(1, r * 4); v.x *= k; v.z *= k; });
  const rnd = rng(11), sp = cap(0.017, 0.06, 4, 8);
  const pts = surfacePts(fro, 60, rnd, (p) => p.y > 0.62 && p.y < 1.2);
  const byColor = {}; pts.forEach((p, i) => (byColor[SPRINKLES[i % 6]] ||= []).push(p));
  return G([
    M(liner, mat.gloss(c, { roughness: 0.32 })),
    M(fro, mat.satin(c2 || mix(c, '#ffffff', 0.58), { roughness: 0.32, clearcoat: 0.5 })),
    Object.entries(byColor).map(([col, list]) => M(scatter(sp, list), mat.gloss(col))),
    G([cherry()], [0.02, 1.38, 0.02]),
  ]);
});

reg('icecream', ({ c = '#ff9ec4', c2 = '#fff1d6' }) => {
  const waffle = ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#e2a75e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9783a'; g.lineWidth = 9;
    for (let i = -w; i < w * 2; i += 52) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
  }, { repeat: [4, 3] });
  const cone = cyl(0.34, 0.03, 1.05, 48, 6); cone.translate(0, 0.525, 0);
  const rim = tor(0.345, 0.05, 12, 64); rim.rotateX(PI / 2);
  const scoop = (col, s) => {
    const g = sph(0.4, 64, 40);
    deform(g, (v) => { v.multiplyScalar(1 + 0.025 * Math.sin(v.x * 14) * Math.sin(v.z * 13 + v.y * 6)); if (v.y < -0.12) v.y = -0.12 + (v.y + 0.12) * 0.35; });
    const drip = tor(0.38, 0.07, 16, 72); drip.rotateX(PI / 2);
    deform(drip, (v) => { const th = Math.atan2(v.z, v.x); v.y -= Math.max(0, Math.sin(th * 5) * Math.sin(th * 3 + 1)) * 0.12; });
    const m = mat.satin(col, { roughness: 0.5 });
    return G([M(g, m), M(drip, m, [0, -0.13, 0])], null, null, s);
  };
  return G([
    M(cone, mat.matte('#ffffff', { map: waffle, roughness: 0.75 })),
    M(rim, mat.matte('#e2a75e', { roughness: 0.7 })),
    G([scoop(c, 1)], [0, 1.25, 0]),
    G([scoop(c2, 0.85)], [0.02, 1.76, 0]),
    G([cherry()], [0.03, 2.08, 0.02]),
  ]);
});

reg('burger', ({ c = '#ffc533' }) => {
  const bunM = mat.gloss('#eda14f', { roughness: 0.4, clearcoat: 0.4 });
  const bottom = lathe([[0, 0], [0.62, 0], [0.7, 0.06], [0.7, 0.16], [0.66, 0.2], [0, 0.2]]);
  const lettuce = cyl(0.78, 0.78, 0.05, 128, 1);
  deform(lettuce, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); if (r > 0.5) v.y += 0.04 * Math.sin(th * 11) * (r - 0.5) * 3; const k = 1 + 0.04 * Math.sin(th * 23); v.x *= k; v.z *= k; });
  const patty = lathe([[0, 0], [0.66, 0], [0.73, 0.09], [0.66, 0.19], [0, 0.19]]);
  const cheese = new THREE.BoxGeometry(1.2, 0.035, 1.2, 24, 1, 24);
  deform(cheese, (v) => { const d = Math.max(Math.abs(v.x), Math.abs(v.z)); if (d > 0.5) v.y -= (d - 0.5) ** 2 * 1.3; });
  const top = lathe([[0, 0], [0.7, 0], [0.74, 0.06], [0.7, 0.2], [0.55, 0.38], [0.3, 0.48], [0, 0.5]]);
  const rnd = rng(5);
  const sesame = scatter(sph(0.032, 10, 6), surfacePts(top, 30, rnd, (p) => p.y > 0.15).map((o) => ({ ...o, s: [1, 0.55, 0.6] })));
  return G([
    M(bottom, bunM),
    M(lettuce, mat.gloss('#6cc04a', { roughness: 0.35 }), [0, 0.23, 0]),
    M(patty, mat.satin('#6a3b22', { roughness: 0.75 }), [0, 0.25, 0]),
    M(cheese, mat.gloss(c, { roughness: 0.3 }), [0, 0.46, 0], [0, PI / 4, 0]),
    M(cyl(0.6, 0.6, 0.07, 64), mat.gloss('#ff4d3d', { roughness: 0.25 }), [0, 0.5, 0]),
    G([M(top, bunM), M(sesame, mat.satin('#fff3d6'))], [0, 0.54, 0]),
  ]);
});

reg('milk', ({ c = '#3b82f6', label = 'MILK', sub = '牛乳' }) => {
  const W = 0.7, H = 1.0;
  const tri = new THREE.Shape(); tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, 0.3); tri.closePath();
  const gable = new THREE.ExtrudeGeometry(tri, { depth: W * 0.98, bevelEnabled: false }); gable.translate(0, 0, -W * 0.49); gable.rotateY(PI / 2);
  const tex = ctex(512, 730, (g, w, h) => {
    g.fillStyle = '#fbfbfd'; g.fillRect(0, 0, w, h);
    g.fillStyle = c; g.beginPath(); g.moveTo(0, h * 0.44); g.bezierCurveTo(w * 0.3, h * 0.33, w * 0.62, h * 0.54, w, h * 0.41); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    txt(g, 'dopa farm', w / 2, h * 0.16, 52, c, { weight: 800 });
    txt(g, '♥', w / 2, h * 0.29, 70, hex(mix(c, '#fff', 0.5)));
    txt(g, label, w / 2, h * 0.66, 130, '#ffffff', { weight: 900, maxW: w * 0.86 });
    txt(g, sub, w / 2, h * 0.83, 62, '#ffffff', { weight: 800, maxW: w * 0.8 });
  });
  const face = (ry, x, z) => M(new THREE.PlaneGeometry(W * 0.94, H * 0.94), mat.satin('#ffffff', { map: tex, roughness: 0.5 }), [x, H / 2, z], [0, ry, 0]);
  return G([
    M(rbox(W, H, W, 0.03, 3), mat.satin(WHITE, { roughness: 0.5 }), [0, H / 2, 0]),
    M(gable, mat.satin(c, { roughness: 0.45 }), [0, H, 0]),
    M(rbox(W * 0.98, 0.1, 0.035, 0.012, 2), mat.satin(c), [0, H + 0.33, 0]),
    face(0, 0, W / 2 + 0.003), face(PI / 2, W / 2 + 0.003, 0),
  ]);
});

reg('soda', ({ c = '#ff4d6d', label = 'FIZZ' }) => {
  const tex = ctex(1024, 360, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, hex(hsl(c, 0, 0, 0.1))); grd.addColorStop(1, hex(hsl(c, 0, 0, -0.08)));
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const r = rng(5); g.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 0; i < 46; i++) { g.beginPath(); g.arc(r() * w, r() * h, 4 + r() * 18, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(0, h * 0.76, w, h * 0.05);
    txt(g, label, w / 2, h * 0.44, 130, '#ffffff', { weight: 900, maxW: w * 0.3 });
    txt(g, 'SPARKLING · dopa', w / 2, h * 0.65, 28, '#ffffff', { weight: 700 });
  });
  const top = lathe([[0, 0.98], [0.4, 0.98], [0.39, 1.04], [0.34, 1.12], [0.33, 1.15], [0.31, 1.14], [0.29, 1.11], [0, 1.11]], { smooth: false });
  const bot = lathe([[0, 0.05], [0.3, 0.0], [0.36, 0.02], [0.4, 0.08], [0.4, 0.12], [0, 0.12]]);
  return G([
    M(cyl(0.4, 0.4, 0.88, 96, 1, true, -PI, TAU), mat.gloss('#ffffff', { map: tex, metalness: 0.35, roughness: 0.25, clearcoat: 1 }), [0, 0.55, 0], [0, 0.45, 0]),
    M(top, mat.metal(SILVER, 0.22)), M(bot, mat.metal(SILVER, 0.25)),
    M(rbox(0.14, 0.015, 0.22, 0.006, 2), mat.metal(SILVER, 0.2), [0, 1.12, 0.05]),
  ]);
});

function nigiri(v) {
  const kind = v.kind || 'maguro', c = v.c || '#d81e3f';
  const rice = pebble(0.46, 0.32, 0.88, 0.45, 0.6);
  const neta = rbox(0.56, 0.08, 1.04, 0.035, 3);
  deform(neta, (p) => { p.y -= (p.x / 0.28) ** 2 * 0.07; p.y -= Math.max(0, Math.abs(p.z) - 0.35) ** 2 * 0.25; }, false);
  const stripes = ctex(256, 512, (g, w, h) => {
    g.fillStyle = hex(c); g.fillRect(0, 0, w, h);
    if (kind !== 'tamago') {
      g.strokeStyle = kind === 'salmon' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)'; g.lineWidth = kind === 'salmon' ? 14 : 8;
      for (let y = -h; y < h * 2; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 120); g.stroke(); }
    }
  });
  const parts = [
    M(rice, mat.satin('#fbf8f0', { roughness: 0.85, bumpMap: noiseTex(256, 3, 1400, 4), bumpScale: 1.2 }), [0, 0.16, 0]),
    M(neta, mat.gloss('#ffffff', { map: stripes, roughness: 0.18, clearcoat: 1 }), [0, 0.35, 0]),
  ];
  if (kind === 'tamago') parts.push(M(rbox(0.6, 0.48, 0.16, 0.02, 2), mat.satin('#1d2a1c', { roughness: 0.6 }), [0, 0.2, 0]));
  return G(parts);
}
reg('sushi', (v) => {
  const board = G([
    M(rbox(2.0, 0.1, 1.0, 0.03, 3), mat.satin(WOOD, { roughness: 0.6 }), [0, 0.2, 0]),
    M(rbox(0.12, 0.15, 0.95, 0.02, 2), mat.satin('#b97f4f'), [-0.7, 0.075, 0]),
    M(rbox(0.12, 0.15, 0.95, 0.02, 2), mat.satin('#b97f4f'), [0.7, 0.075, 0]),
  ]);
  return G([board, G([nigiri(v)], [-0.36, 0.25, 0], [0, 0.12, 0]), G([nigiri(v)], [0.36, 0.25, 0.02], [0, -0.1, 0]),
    M(pebble(0.3, 0.12, 0.22, 0.6), mat.satin('#9ccf5a', { roughness: 0.7 }), [0.82, 0.3, 0.3])]);
}, { elev: 0.55 });

reg('onigiri', ({ c = '#e8394d' }) => {
  const tri = rpoly([[-0.55, -0.45], [0.55, -0.45], [0, 0.55]], [0.24, 0.24, 0.26]);
  const rice = ext(tri, 0.3, { bevel: 0.14, seg: 8 });
  return G([
    M(rice, mat.satin('#fbf8f0', { roughness: 0.85, bumpMap: noiseTex(256, 5, 1500, 4), bumpScale: 1.4 }), [0, 0.6, 0]),
    M(rbox(0.44, 0.44, 0.62, 0.03, 2), mat.satin('#1d2a1c', { roughness: 0.55 }), [0, 0.38, 0]),
    M(pebble(0.2, 0.12, 0.08, 0.7), mat.gloss(c, { roughness: 0.3 }), [0, 0.98, 0.25], [-0.5, 0, 0]),
  ]);
});

reg('pudding', ({ c = '#ffd36a', s = '#8a4a1c' }) => {
  const plate = lathe([[0, 0], [0.7, 0], [0.8, 0.04], [0.84, 0.08], [0.76, 0.065], [0, 0.04]]);
  const body = lathe([[0, 0.04], [0.47, 0.04], [0.49, 0.08], [0.39, 0.58], [0.35, 0.62], [0, 0.63]]);
  const sauce = lathe([[0, 0.6], [0.36, 0.6], [0.385, 0.53], [0.4, 0.55], [0.37, 0.63], [0.3, 0.665], [0, 0.67]]);
  const rnd = rng(3), drips = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + rnd() * 0.4, l = 0.06 + rnd() * 0.12, r = 0.392; drips.push({ p: [Math.cos(a) * r, 0.52 - l / 2, Math.sin(a) * r], r: [0, 0, 0], s: [1, 1 + l * 6, 1] }); }
  const sm = mat.gloss(s, { roughness: 0.1, clearcoat: 1 });
  return G([
    M(plate, mat.gloss('#ffffff', { roughness: 0.2 })),
    M(body, mat.gloss(c, { roughness: 0.16, clearcoat: 1 })),
    M(sauce, sm), M(scatter(cap(0.032, 0.04, 4, 10), drips), sm),
    swirl(0.16, 0.22, '#fffaf2').translateY(0.66),
    G([cherry()], [0.04, 0.98, 0.0]),
  ]);
}, { elev: 0.42 });

reg('coffee', ({ c = '#c48a55', c2 = '#ffffff' }) => {
  const cup = lathe([[0, 0], [0.3, 0], [0.32, 0.02], [0.41, 0.96], [0, 0.96]], { smooth: false });
  const lid = lathe([[0, 0.95], [0.43, 0.95], [0.445, 0.99], [0.43, 1.04], [0.39, 1.06], [0.37, 1.12], [0.34, 1.13], [0, 1.135]]);
  const y0 = 0.24, y1 = 0.66, rAt = (y) => 0.32 + (0.09 * (y - 0.02)) / 0.94 + 0.012;
  const logo = ctex(1100, 200, (g, w, h) => { g.fillStyle = hex(c); g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h / 2, 62, 0, TAU); g.fill(); txt(g, 'd', w / 2, h / 2 + 2, 92, hex(c), { weight: 900 }); }, { wrapS: true });
  return G([
    M(cup, mat.satin('#fbfbfc', { roughness: 0.4 })),
    M(cyl(rAt(y1), rAt(y0), y1 - y0, 96, 1, true, -PI, TAU), mat.satin('#ffffff', { map: logo, roughness: 0.75 }), [0, (y0 + y1) / 2, 0], [0, 0.45, 0]),
    M(lid, mat.satin(c2, { roughness: 0.35 })),
    M(rbox(0.12, 0.03, 0.05, 0.012, 2), mat.matte(DARK), [0, 1.135, 0.24]),
  ]);
});

reg('bottle', ({ c = '#a6d36a', label = 'GREEN TEA', sub = '緑茶' }) => {
  const body = lathe([[0, 0], [0.3, 0], [0.36, 0.04], [0.37, 0.1], [0.36, 0.45], [0.34, 0.5], [0.36, 0.55], [0.37, 0.85], [0.34, 1.0], [0.2, 1.2], [0.15, 1.28], [0.15, 1.36], [0, 1.36]]);
  const capG = cyl(0.165, 0.165, 0.16, 96, 1); deform(capG, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); if (r > 0.1) { const k = 1 + 0.025 * Math.cos(th * 40); v.x *= k; v.z *= k; } });
  return G([
    M(body, mat.glass(c, { attenuationDistance: 0.45, thickness: 0.9 })),
    wrapLabel(body, 0.56, 0.84, { title: label, sub, accent: hex(hsl(c, 0, 0.05, -0.12)), ink: hex(hsl(c, 0, 0.1, -0.3)) }),
    M(capG, mat.gloss(hsl(c, 0, 0, -0.18), { roughness: 0.35 }), [0, 1.44, 0]),
  ]);
});

reg('chocolate', ({ c = '#e63946', label = 'CHOCO' }) => {
  const choc = mat.gloss('#5b3220', { roughness: 0.3, clearcoat: 0.6 });
  const chunks = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) chunks.push({ p: [(i - 1) * 0.3, 0.06, -0.62 + j * 0.31] });
  const wrapTex = ctex(512, 512, (g, w, h) => {
    g.fillStyle = hex(c); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, h * 0.62, w, h * 0.06);
    txt(g, label, w / 2, h * 0.42, 120, '#ffffff', { weight: 900, maxW: w * 0.84 });
    txt(g, 'CACAO 72%', w / 2, h * 0.8, 46, '#ffffff', { weight: 700 });
  });
  const bar = G([
    M(rbox(0.92, 0.07, 1.4, 0.025, 2), choc),
    M(scatter(rbox(0.27, 0.08, 0.28, 0.035, 3), chunks), choc),
    M(rbox(0.97, 0.12, 0.8, 0.03, 2), mat.metal('#d8dbe2', 0.32), [0, 0.02, 0.32]),
    M(rbox(1.0, 0.16, 0.66, 0.04, 3), mat.gloss('#ffffff', { map: wrapTex, roughness: 0.3 }), [0, 0.03, 0.4]),
  ], null, [1.05, 0, 0]);
  return G([bar]);
}, { yaw: -0.35 });

reg('cake', ({ c = '#ff2f4b' }) => {
  const wedge = new THREE.Shape(); wedge.moveTo(0, 0); wedge.lineTo(1.0, -0.36); wedge.quadraticCurveTo(1.1, 0, 1.0, 0.36); wedge.closePath();
  const layer = (h, col, y, m = mat.satin) => { const g = ext(wedge, h, { bevel: 0.018, seg: 3 }); g.rotateX(-PI / 2); return M(g, m(col, { roughness: 0.6 }), [-0.5, y + h / 2 + 0.018, 0]); };
  return G([
    M(lathe([[0, 0], [0.8, 0], [0.86, 0.04], [0.84, 0.06], [0, 0.04]]), mat.gloss('#ffffff'), [0, 0, 0], null, [1, 1, 0.8]),
    layer(0.2, '#f3d08a', 0.04), layer(0.06, '#fffaf2', 0.27), layer(0.2, '#f3d08a', 0.36), layer(0.07, '#fffaf2', 0.59),
    M(scatter(sph(0.07, 24, 16), [0.15, 0.4, 0.65].map((x) => ({ p: [x - 0.5, 0.33, 0], s: [1, 0.6, 1.0] })), { }), mat.gloss(c)),
    swirl(0.12, 0.16, '#fffaf2').translateX(0.32).translateY(0.7),
    G([strawberry(c)], [0.32, 0.84, 0], [0.25, 0, -0.2], 1.15),
    swirl(0.09, 0.12, '#fffaf2').translateX(-0.05).translateY(0.7),
  ]);
}, { yaw: -0.9 });

/* ================= FASHION ================= */
const fabric = (c, o) => mat.soft(c, o);
reg('tshirt', ({ c = '#7c5cff', c2 = '#ffffff' }) => {
  const shape = rpoly([[-0.2, 0.64], [-0.5, 0.57], [-0.86, 0.32], [-0.68, 0.06], [-0.47, 0.2], [-0.47, -0.68], [0.47, -0.68], [0.47, 0.2], [0.68, 0.06], [0.86, 0.32], [0.5, 0.57], [0.2, 0.64], [0, 0.44]],
    [0.05, 0.12, 0.08, 0.08, 0.06, 0.1, 0.1, 0.06, 0.08, 0.08, 0.12, 0.05, 0.22]);
  const g = ext(shape, 0.14, { bevel: 0.08, seg: 6 });
  deform(g, (v) => { v.z += 0.03 * Math.sin(v.y * 3.2 + v.x * 1.5); });
  const collar = tor(0.19, 0.035, 12, 40, PI); collar.rotateZ(PI);
  return G([
    M(g, fabric(c)),
    M(collar, fabric(hsl(c, 0, 0, -0.08)), [0, 0.6, 0.12], [0.35, 0, 0]),
    M(ext(rpoly(starPts(5, 0.11, 0.05), 0.012), 0.02, { bevel: 0.012, seg: 2 }), mat.satin(c2), [0.2, 0.28, 0.17]),
  ]);
}, { yaw: -0.3, elev: 0.15 });

reg('hoodie', ({ c = '#ffb84d', c2 = '#ffffff' }) => {
  const shape = rpoly([[-0.18, 0.62], [-0.5, 0.55], [-0.75, 0.26], [-0.9, -0.52], [-0.66, -0.58], [-0.55, -0.02], [-0.5, -0.7], [0.5, -0.7], [0.55, -0.02], [0.66, -0.58], [0.9, -0.52], [0.75, 0.26], [0.5, 0.55], [0.18, 0.62], [0, 0.48]],
    [0.05, 0.14, 0.12, 0.08, 0.06, 0.04, 0.08, 0.08, 0.04, 0.06, 0.08, 0.12, 0.14, 0.05, 0.2]);
  const g = ext(shape, 0.2, { bevel: 0.09, seg: 6 });
  deform(g, (v) => { v.z += 0.03 * Math.sin(v.y * 3 + v.x * 2); });
  const dk = hsl(c, 0, 0, -0.07);
  const pocket = ext(rpoly([[-0.34, -0.58], [0.34, -0.58], [0.25, -0.26], [-0.25, -0.26]], 0.06), 0.02, { bevel: 0.025, seg: 3 });
  return G([
    M(g, fabric(c)),
    M(pebble(0.62, 0.42, 0.3, 0.7), fabric(dk), [0, 0.66, -0.08]),
    M(tor(0.21, 0.07, 14, 48), fabric(dk), [0, 0.62, 0.06], [0.5, 0, 0], [1, 0.75, 1]),
    M(pocket, fabric(dk), [0, 0, 0.2]),
    M(rbox(1.0, 0.1, 0.42, 0.05, 3), fabric(dk), [0, -0.7, 0]),
    M(scatter(cap(0.016, 0.26, 4, 8), [{ p: [-0.08, 0.36, 0.22] }, { p: [0.08, 0.36, 0.22] }]), mat.satin(c2)),
  ]);
}, { yaw: -0.3, elev: 0.15 });

reg('sneaker', ({ c = '#ff5a5f', c2 = '#ffffff' }) => {
  const sole = ext(rpoly([[-1.0, 0], [0.95, 0], [1.06, 0.1], [1.02, 0.22], [-1.02, 0.22], [-1.07, 0.1]], 0.08), 0.62, { bevel: 0.04, seg: 4 });
  const upper = ext(rpoly([[-0.98, 0.18], [0.98, 0.18], [0.96, 0.36], [0.62, 0.52], [0.1, 0.82], [-0.5, 0.97], [-0.86, 0.97], [-1.0, 0.66]],
    [0.1, 0.15, 0.2, 0.25, 0.2, 0.15, 0.15, 0.22]), 0.5, { bevel: 0.08, seg: 6 });
  const taper = (k) => (v) => { v.z *= 1 - k * smooth(0.3, 1.05, v.x) - 0.08 * smooth(-0.6, -1.05, v.x); };
  deform(sole, taper(0.16)); deform(upper, taper(0.3));
  const stripe = new THREE.Shape(); stripe.moveTo(-0.72, 0.33); stripe.quadraticCurveTo(0, 0.2, 0.56, 0.6); stripe.lineTo(0.48, 0.66); stripe.quadraticCurveTo(0, 0.36, -0.72, 0.47); stripe.closePath();
  const sg = ext(stripe, 0.01, { bevel: 0.012, seg: 2 });
  const laces = [];
  const topY = (x) => (x > 0.1 ? 0.52 + ((0.62 - x) / 0.52) * 0.3 : 0.82 + ((0.1 - x) / 0.6) * 0.15);
  for (let i = 0; i < 5; i++) { const x = 0.44 - (i / 4) * 0.66; laces.push({ p: [x, topY(x) + 0.1, 0], r: [PI / 2, 0, x > 0.1 ? 0.52 : 0.25] }); }
  const opening = cyl(1, 1, 0.04, 40); opening.scale(0.36, 1, 0.19);
  const um = mat.satin(c, { roughness: 0.5 });
  return G([
    M(sole, mat.satin(WHITE, { roughness: 0.5 })),
    M(rbox(2.06, 0.06, 0.66, 0.03, 2), mat.satin(hsl(c, 0, -0.1, -0.15), { roughness: 0.8 }), [0, 0.02, 0]),
    M(upper, um),
    M(sg, mat.satin(c2), [0, 0, 0.335], [0, 0, 0]), M(sg, mat.satin(c2), [0, 0, -0.335], [0, 0, 0]),
    M(opening, mat.matte('#2a2830'), [-0.68, 1.045, 0]),
    M(tor(1, 0.07, 12, 48), mat.soft(hsl(c, 0, 0, 0.12)), [-0.68, 1.05, 0], [PI / 2, 0, 0], [0.4, 0.24, 1]),
    M(rbox(0.36, 0.1, 0.3, 0.05, 3), mat.soft(hsl(c, 0, 0, 0.06)), [-0.36, 1.06, 0], [0, 0, 0.2]),
    M(scatter(cap(0.032, 0.32, 4, 10), laces), mat.satin(WHITE)),
    M(rbox(0.1, 0.32, 0.2, 0.04, 2), mat.satin(c2), [-1.06, 0.74, 0], [0, 0, 0.1]),
  ]);
}, { yaw: -0.55, elev: 0.3 });

reg('cap', ({ c = '#22c55e', c2 = '#ffffff' }) => {
  const crown = sph(0.55, 64, 32, 0, TAU, 0, PI / 2); crown.scale(1, 0.82, 1);
  const brimS = new THREE.Shape(); brimS.moveTo(-0.54, 0); brimS.quadraticCurveTo(0, 1.9, 0.54, 0); brimS.quadraticCurveTo(0, 0.6, -0.54, 0);
  const brim = ext(brimS, 0.02, { bevel: 0.02, seg: 3 }); brim.rotateX(PI / 2);
  const m = fabric(c);
  return G([
    M(crown, m), M(tor(0.55, 0.025, 8, 64), m, [0, 0.01, 0], [PI / 2, 0, 0]),
    M(sph(0.05, 16, 12), m, [0, 0.45, 0], null, [1, 0.6, 1]),
    M(brim, fabric(hsl(c, 0, 0, -0.06)), [0, 0.03, 0.02], [0.14, 0, 0]),
    M(ext(rpoly(ngon(6, 0.11, PI / 2), 0.03), 0.015, { bevel: 0.012, seg: 2 }), mat.satin(c2), [0, 0.27, 0.47], [-0.55, 0, 0]),
  ]);
}, { yaw: -0.7, elev: 0.35 });

reg('handbag', ({ c = '#ff6b9a' }) => {
  const body = ext(rpoly([[-0.62, 0], [0.62, 0], [0.5, 0.72], [-0.5, 0.72]], [0.14, 0.14, 0.1, 0.1]), 0.32, { bevel: 0.07, seg: 5 });
  const flap = ext(rpoly([[-0.53, 0.73], [0.53, 0.73], [0.52, 0.34], [0, 0.22], [-0.52, 0.34]], [0.03, 0.03, 0.12, 0.2, 0.12]), 0.015, { bevel: 0.02, seg: 3 });
  const leather = mat.gloss(c, { roughness: 0.38, clearcoat: 0.5 });
  return G([
    M(body, leather),
    M(flap, mat.gloss(hsl(c, 0, 0, -0.06), { roughness: 0.38, clearcoat: 0.5 }), [0, 0, 0.245]),
    M(rbox(0.16, 0.11, 0.05, 0.02, 2), mat.metal(GOLD, 0.2), [0, 0.3, 0.27]),
    M(tor(0.34, 0.035, 14, 48, PI), leather, [0, 0.72, 0]),
    M(scatter(cyl(0.05, 0.05, 0.04, 16), [{ p: [-0.34, 0.74, 0] }, { p: [0.34, 0.74, 0] }]), mat.metal(GOLD)),
  ]);
}, { yaw: -0.45 });

reg('sunglasses', ({ c = '#ff4d6d', c2 = '#2b2140' }) => {
  const lensPts = [[-0.28, -0.2], [0.28, -0.2], [0.3, 0.2], [-0.3, 0.2]], lensR = [0.17, 0.17, 0.08, 0.08];
  const big = lensPts.map(([x, y]) => [x * 1.24, y * 1.32]);
  const frameShape = rpoly(big, lensR.map((r) => r * 1.25)); frameShape.holes.push(rpoly(lensPts, lensR, new THREE.Path()));
  const frame = ext(frameShape, 0.05, { bevel: 0.015, seg: 3 });
  const lens = ext(rpoly(lensPts, lensR), 0.01, { bevel: 0.01, seg: 2 });
  const fm = mat.gloss(c, { roughness: 0.2 }), lm = mat.gloss(c2, { metalness: 0.5, roughness: 0.05, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.6 });
  const side = (s) => G([M(frame, fm), M(lens, lm)], [s * 0.42, 0, 0]);
  const arm = (s) => M(rbox(0.04, 0.05, 1.0, 0.02, 2), fm, [s * 0.79, 0.14, -0.52], [0, s * -0.05, 0]);
  return G([side(-1), side(1), M(tor(0.1, 0.028, 10, 24, PI), fm, [0, 0.12, 0]), arm(-1), arm(1)]);
}, { yaw: -0.5, elev: 0.25 });

reg('watch', ({ c = '#ff8a3d', c2 = '#f8f8f8' }) => {
  const outer = new THREE.Shape(); outer.absellipse(0, 0, 0.44, 0.62, 0, TAU);
  const hole = new THREE.Path(); hole.absellipse(0, 0, 0.38, 0.56, 0, TAU); outer.holes.push(hole);
  const band = ext(outer, 0.32, { bevel: 0.03, seg: 3, curve: 48 }); band.rotateY(PI / 2);
  const dial = ctex(512, 512, (g, w, h) => {
    g.fillStyle = c2; g.fillRect(0, 0, w, h);
    g.fillStyle = hex(c);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.save(); g.translate(w / 2, h / 2); g.rotate(a); g.fillRect(-6, -220, 12, i % 3 ? 26 : 50); g.restore(); }
    txt(g, 'dopa', w / 2, h * 0.68, 46, DARK, { weight: 800 });
  });
  const hand = (len, wdt, ang, col, z) => { const g = rbox(wdt, len, 0.012, wdt / 2.2, 2); g.translate(0, len / 2 - 0.03, 0); return M(g, mat.gloss(col), [0, 0, z], [0, 0, ang]); };
  return G([
    M(band, mat.gloss(c, { roughness: 0.35 })),
    G([
      M(cyl(0.3, 0.3, 0.12, 64), mat.metal(SILVER, 0.18), [0, 0, 0], [PI / 2, 0, 0]),
      M(tor(0.3, 0.03, 12, 64), mat.metal(SILVER, 0.12), [0, 0, 0.06]),
      M(cyl(0.27, 0.27, 0.01, 64), mat.gloss('#ffffff', { map: dial, roughness: 0.3 }), [0, 0, 0.062], [PI / 2, 0, 0]),
      hand(0.16, 0.035, 1.05, DARK, 0.075), hand(0.23, 0.025, -0.55, DARK, 0.085), hand(0.24, 0.01, 2.6, c, 0.092),
      M(cyl(0.025, 0.025, 0.03, 16), mat.metal(SILVER), [0, 0, 0.09], [PI / 2, 0, 0]),
      M(cyl(0.04, 0.04, 0.07, 16), mat.metal(SILVER), [0.33, 0, 0], [0, 0, PI / 2]),
    ], [0, 0, 0.46]),
  ]);
}, { yaw: -0.4, elev: 0.25 });

reg('socks', ({ c = '#ff6b6b', c2 = '#ffd166' }) => {
  const tex = ctex(1024, 64, (g, w, h) => {
    g.fillStyle = hex(c); g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w * 0.1, h);
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffffff' : hex(c2); g.fillRect(w * (0.13 + i * 0.06), 0, w * 0.035, h); }
    g.fillStyle = hex(c2); g.fillRect(w * 0.6, 0, w * 0.1, h); g.fillRect(w * 0.9, 0, w * 0.1, h);
  });
  const sock = (flip) => {
    const path = [[0, 1.1, 0], [0, 0.55, 0], [0.02, 0.2, 0], [0.18, 0.02, 0], [0.5, -0.03, 0], [0.76, -0.02, 0]];
    const t = tube(path, 0.19, 120, 32);
    deform(t, (v) => { if (v.y < 0.25) v.z *= 0.86; });
    return G([
      M(t, fabric('#ffffff', { map: tex })),
      M(sph(0.19, 32, 20), fabric(c2), [0.76, -0.02, 0], null, [1, 1, 0.86]),
      M(tor(0.19, 0.035, 10, 48), fabric('#ffffff'), [0, 1.1, 0], [PI / 2, 0, 0]),
      M(cyl(0.17, 0.17, 0.01, 32), mat.matte(hsl(c, 0, 0, -0.25)), [0, 1.095, 0]),
    ], null, [0, flip, 0]);
  };
  return G([G([sock(0)], [-0.2, 0.21, 0.1]), G([sock(0)], [0.25, 0.21, -0.35], [0, -0.25, 0])]);
}, { yaw: -0.55 });

reg('beanie', ({ c = '#4cc9f0', c2 = '#ffffff' }) => {
  const dome = lathe([[0.5, 0.18], [0.51, 0.4], [0.44, 0.63], [0.3, 0.79], [0.12, 0.86], [0, 0.87]], { segs: 144 });
  deform(dome, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z), k = 1 + 0.03 * Math.cos(th * 36) * Math.min(1, r * 2.2); v.x *= k; v.z *= k; });
  const cuff = lathe([[0.5, 0], [0.54, 0.0], [0.565, 0.04], [0.57, 0.3], [0.55, 0.345], [0.5, 0.35]], { segs: 160 });
  deform(cuff, (v) => { const th = Math.atan2(v.z, v.x), k = 1 + 0.025 * Math.cos(th * 48); v.x *= k; v.z *= k; });
  const pom = new THREE.IcosahedronGeometry(0.2, 5); const r = rng(2);
  deform(pom, (v) => { v.multiplyScalar(1 + (Math.sin(v.x * 60) * Math.sin(v.y * 57) * Math.sin(v.z * 63)) * 0.08 + r() * 0.03); });
  return G([
    M(dome, fabric(c)), M(cuff, fabric(hsl(c, 0, 0, -0.04))),
    M(pom, fabric(c2, { roughness: 1 }), [0, 1.0, 0]),
    M(rbox(0.22, 0.12, 0.03, 0.012, 2), mat.satin(c2), [0, 0.17, 0.57]),
  ]);
});

reg('backpack', ({ c = '#ffd23f', c2 = '#26252c' }) => {
  const m = mat.satin(c, { roughness: 0.55 }), dk = mat.satin(hsl(c, 0, 0, -0.08), { roughness: 0.55 });
  return G([
    M(pebble(0.86, 1.08, 0.46, 0.35, 0.45), m, [0, 0.54, 0]),
    M(pebble(0.64, 0.46, 0.2, 0.35), dk, [0, 0.32, 0.25]),
    M(rbox(0.5, 0.025, 0.025, 0.012, 2), mat.metal(SILVER), [0, 0.5, 0.345]),
    M(rbox(0.04, 0.11, 0.02, 0.01, 2), mat.metal(SILVER), [0.18, 0.45, 0.36]),
    M(tor(0.12, 0.03, 10, 32, PI), dk, [0, 1.06, 0]),
    M(pebble(0.12, 0.38, 0.34, 0.4), dk, [-0.44, 0.3, 0]), M(pebble(0.12, 0.38, 0.34, 0.4), dk, [0.44, 0.3, 0]),
    M(cyl(0.08, 0.08, 0.02, 32), mat.satin(c2), [0, 0.86, 0.225], [PI / 2 - 0.25, 0, 0]),
    M(tube([[-0.25, 0.95, -0.2], [-0.32, 0.6, -0.36], [-0.3, 0.15, -0.24]], 0.04, 24, 8), dk),
    M(tube([[0.25, 0.95, -0.2], [0.32, 0.6, -0.36], [0.3, 0.15, -0.24]], 0.04, 24, 8), dk),
  ]);
}, { yaw: -0.5 });

/* ================= BEAUTY ================= */
reg('lipstick', ({ c = '#e11d48' }) => {
  const bullet = cyl(0.135, 0.135, 0.42, 64, 10);
  deform(bullet, (v) => { const lim = 0.21 - 0.24 * ((v.x + 0.135) / 0.27); if (v.y > lim) v.y = lim; });
  return G([
    M(cyl(0.21, 0.21, 0.62, 64), mat.gloss(DARK, { roughness: 0.15 }), [0, 0.31, 0]),
    M(tor(0.205, 0.012, 8, 64), mat.metal(GOLD), [0, 0.6, 0], [PI / 2, 0, 0]),
    M(cyl(0.165, 0.165, 0.22, 64), mat.metal(GOLD, 0.16), [0, 0.73, 0]),
    M(bullet, mat.satin(c, { roughness: 0.3, clearcoat: 0.6 }), [0, 1.05, 0]),
    G([
      M(cyl(0.22, 0.22, 0.58, 64), mat.gloss(DARK, { roughness: 0.15 })),
      M(tor(0.215, 0.012, 8, 64), mat.metal(GOLD), [0, -0.27, 0], [PI / 2, 0, 0]),
      M(cyl(0.12, 0.12, 0.01, 32), mat.gloss(c), [0, 0.29, 0]),
    ], [0.5, 0.22, 0.2], [0, 0.5, PI / 2]),
  ]);
}, { yaw: -0.6, elev: 0.3 });

reg('perfume', ({ c = '#ff8fab', c2 }) => {
  const gem = new THREE.IcosahedronGeometry(0.24, 1);
  return G([
    M(rbox(0.82, 0.82, 0.44, 0.15, 6), mat.glass(c, { attenuationDistance: 0.95, thickness: 1.3, roughness: 0.02 }), [0, 0.41, 0]),
    M(cyl(0.12, 0.12, 0.14, 32), mat.metal(GOLD, 0.15), [0, 0.88, 0]),
    M(gem, mat.glass(c2 || hsl(c, 0.05, 0, 0.05), { attenuationDistance: 0.25, thickness: 0.6, flatShading: true }), [0, 1.13, 0], [0.3, 0.2, 0]),
    M(rbox(0.36, 0.13, 0.012, 0.01, 2), mat.metal(GOLD, 0.15), [0, 0.42, 0.226]),
  ]);
}, { yaw: -0.5 });

reg('nailpolish', ({ c = '#ff3d7f' }) => G([
  M(lathe([[0, 0], [0.3, 0], [0.345, 0.03], [0.355, 0.12], [0.345, 0.42], [0.29, 0.5], [0.15, 0.54], [0, 0.55]]), mat.glass(c, { attenuationDistance: 0.12, thickness: 0.9 })),
  M(cyl(0.13, 0.13, 0.07, 32), mat.gloss('#ffffff'), [0, 0.58, 0]),
  M(cyl(0.12, 0.15, 0.7, 48), mat.gloss(DARK, { roughness: 0.12 }), [0, 0.96, 0]),
]));

reg('compact', ({ c = '#ffb3c7', c2 = '#e8c4a4' }) => {
  const shellG = lathe([[0, 0], [0.5, 0], [0.55, 0.03], [0.565, 0.09], [0.545, 0.13], [0, 0.135]]);
  const shell = mat.gloss(c, { metalness: 0.35, roughness: 0.22 });
  const pattern = ctex(256, 256, (g, w, h) => { g.fillStyle = hex(c2); g.fillRect(0, 0, w, h); g.strokeStyle = hex(hsl(c2, 0, 0, -0.06)); g.lineWidth = 6; for (let r = 20; r < 128; r += 22) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, TAU); g.stroke(); } });
  return G([
    M(shellG, shell),
    M(cyl(0.47, 0.47, 0.025, 64), mat.matte('#ffffff', { map: pattern }), [0, 0.135, 0]),
    G([
      M(shellG, shell, [0, 0, 0.53], [PI, 0, 0]),
      M(cyl(0.46, 0.46, 0.01, 64), mat.metal('#f4f6fb', 0.03), [0, -0.005, 0.53]),
    ], [0, 0.14, -0.53], [-1.95, 0, 0]),
    M(pebble(0.5, 0.12, 0.5, 0.8), mat.soft('#fff2f5'), [0.62, 0.06, 0.45]),
  ]);
}, { yaw: -0.35, elev: 0.4 });

reg('lotion', ({ c = '#9ad1d4', c2 = '#ffffff', label = 'MOIST' }) => G([
  M(lathe([[0, 0], [0.32, 0], [0.36, 0.04], [0.37, 0.9], [0.33, 1.0], [0.16, 1.06], [0, 1.07]]), mat.glass(c, { roughness: 0.32, thickness: 1.2, attenuationDistance: 0.8 })),
  M(cyl(0.375, 0.375, 0.34, 64, 1, true, -0.75, 1.5), mat.satin('#ffffff', { map: labelTex({ w: 512, h: 360, title: label, sub: 'skin lotion', accent: hex(hsl(c, 0, 0.05, -0.2)), ink: DARK, band: false }), side: THREE.DoubleSide }), [0, 0.45, 0]),
  M(cyl(0.17, 0.17, 0.13, 48), mat.gloss(c2), [0, 1.11, 0]),
  M(cyl(0.05, 0.05, 0.16, 16), mat.gloss(c2), [0, 1.24, 0]),
  M(rbox(0.22, 0.12, 0.22, 0.05, 3), mat.gloss(c2), [0, 1.36, 0]),
  M(rbox(0.07, 0.05, 0.22, 0.02, 2), mat.gloss(c2), [0, 1.37, 0.19]),
]), { yaw: -0.2 });

reg('handcream', ({ c = '#ffc6a5', label = 'HAND CREAM' }) => {
  const t = cyl(0.3, 0.3, 1.2, 64, 30);
  deform(t, (v) => { const s = smooth(0.0, 1.0, (v.y + 0.6) / 1.2); v.x *= 1 + 0.3 * s; v.z *= 1 - 0.84 * s; });
  const tex = ctex(512, 1024, (g, w, h) => {
    g.fillStyle = hex(c); g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(w * 0.42, 0, w * 0.16, h);
    txt(g, label, w / 2, h * 0.5, 64, hex(hsl(c, 0, 0.1, -0.35)), { weight: 900, rot: -PI / 2, maxW: h * 0.7 });
  }, { wrapS: true, offset: [0.5, 0] });
  return G([
    M(t, mat.gloss('#ffffff', { map: tex, roughness: 0.3 }), [0, 0.95, 0]),
    M(rbox(0.82, 0.1, 0.07, 0.03, 2), mat.gloss(c), [0, 1.57, 0]),
    M(lathe([[0.2, 0.22], [0.3, 0.33], [0.3, 0.36]]), mat.gloss(c)),
    M(cyl(0.2, 0.2, 0.24, 48), mat.gloss('#ffffff', { roughness: 0.25 }), [0, 0.12, 0]),
  ], null, [0, 0, 0.12]);
}, { yaw: -0.3 });

reg('brush', ({ c = '#ff9fbf' }) => {
  const brush = (s, col) => {
    const bristle = lathe([[0, 1.14], [0.125, 1.14], [0.17, 1.25], [0.19, 1.38], [0.15, 1.52], [0.08, 1.6], [0, 1.62]]);
    vcolor(bristle, (v) => mix('#f4e3d7', hsl(col, 0, -0.1, -0.25), smooth(1.25, 1.6, v.y)));
    return G([
      M(lathe([[0, 0], [0.05, 0], [0.065, 0.05], [0.08, 0.6], [0.085, 0.9], [0, 0.9]]), mat.gloss(col)),
      M(lathe([[0, 0.88], [0.085, 0.88], [0.11, 1.0], [0.125, 1.15], [0, 1.15]]), mat.metal('#ecc0a8', 0.18)),
      M(bristle, mat.soft('#ffffff', { vertexColors: true, roughness: 0.95 })),
    ], null, null, s);
  };
  return G([G([brush(1, c)], [-0.15, 0, 0], [0, 0, 0.32]), G([brush(0.75, hsl(c, 0.1, 0, 0.05))], [0.35, 0, 0.2], [0, 0, -0.25])]);
}, { yaw: -0.2 });

reg('palette', ({ c = '#f8b4c8' }) => {
  const shades = ['#f7c9b8', '#e98c7a', '#c7524f', '#7a2e3a', hex(hsl(c, 0, 0, 0.05)), hex(hsl(c, 0.05, 0.1, -0.15)), '#d4a373', '#5a3a2e'];
  const pans = shades.map((col, i) => M(cyl(0.14, 0.14, 0.035, 48), mat.satin(col, { metalness: 0.25, roughness: 0.45 }), [-0.5 + (i % 4) * 0.333, 0.14, i < 4 ? -0.19 : 0.19]));
  const lidG = rbox(1.5, 0.1, 1.0, 0.05, 3);
  return G([
    M(rbox(1.5, 0.12, 1.0, 0.05, 3), mat.gloss(c, { roughness: 0.22 }), [0, 0.06, 0]),
    M(rbox(1.38, 0.03, 0.86, 0.03, 2), mat.matte('#2b2830'), [0, 0.115, 0]),
    pans,
    G([M(lidG, mat.gloss(c, { roughness: 0.22 }), [0, 0.05, 0.5]), M(rbox(1.36, 0.01, 0.84, 0.005, 1), mat.metal('#f4f6fb', 0.03), [0, -0.004, 0.5])], [0, 0.12, -0.5], [-1.85, 0, 0]),
  ], null, [0.3, 0, 0]);
}, { yaw: -0.2, elev: 0.45 });

/* ================= HEALTH ================= */
function capsulePill(c, c2 = '#ffffff', r = 0.085, len = 0.22) {
  const g = cap(r, len, 8, 24); g.rotateZ(PI / 2);
  vcolor(g, (v) => (v.x > 0 ? c : c2));
  return g;
}
reg('blister', ({ c = '#ff5d73', c2 = '#ffffff' }) => {
  const bubbles = [], pills = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { const p = [(i - 0.5) * 0.48, 0.02, -0.51 + j * 0.34]; bubbles.push({ p, s: [1, 0.6, 1] }); pills.push({ p }); }
  const sheet = G([
    M(rbox(1.05, 0.035, 1.5, 0.03, 2), mat.metal('#e3e6ec', 0.32)),
    M(scatter(capsulePill(c, c2), pills), mat.gloss('#ffffff', { vertexColors: true, roughness: 0.18 })),
    M(scatter((() => { const g = cap(0.12, 0.26, 8, 24); g.rotateZ(PI / 2); return g; })(), bubbles), mat.glass('#ffffff', { thickness: 0.15, roughness: 0.05 })),
  ], [0, 0.72, 0], [1.1, 0, 0]);
  return G([sheet,
    M(capsulePill(c, c2, 0.1, 0.26), mat.gloss('#ffffff', { vertexColors: true, roughness: 0.18 }), [0.55, 0.1, 0.55], [0, 0.6, 0]),
    M(capsulePill(c, c2, 0.1, 0.26), mat.gloss('#ffffff', { vertexColors: true, roughness: 0.18 }), [0.15, 0.1, 0.75], [0, -0.4, 0])]);
}, { yaw: -0.35 });

reg('pillbottle', ({ c = '#ff9f1c', label = 'VITAMIN C', sub = '1000mg · 90粒' }) => {
  const capG = cyl(0.42, 0.42, 0.26, 128, 1); deform(capG, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); if (r > 0.3) { const k = 1 + 0.015 * Math.cos(th * 56); v.x *= k; v.z *= k; } });
  const body = lathe([[0, 0], [0.38, 0], [0.42, 0.04], [0.43, 0.1], [0.43, 0.82], [0.4, 0.9], [0.3, 0.94], [0, 0.95]]);
  return G([
    M(body, mat.gloss(c, { roughness: 0.2, clearcoat: 1 })),
    wrapLabel(body, 0.2, 0.72, { title: label, sub, accent: hex(c), ink: DARK }),
    M(capG, mat.gloss('#ffffff', { roughness: 0.3 }), [0, 1.06, 0]),
    M(scatter(sph(0.12, 24, 16), [{ p: [0.55, 0.05, 0.4], s: [1, 0.45, 1] }, { p: [0.3, 0.05, 0.6], s: [1, 0.45, 1] }]), mat.satin(mix(c, '#ffffff', 0.5))),
  ]);
});

reg('eyedrops', ({ c = '#4cc9f0', label = 'EYE DROP' }) => {
  const boxTex = ctex(512, 900, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, h * 0.45, 0, h); grd.addColorStop(0, hex(c)); grd.addColorStop(1, hex(hsl(c, 0.08, 0, -0.15)));
    g.fillStyle = grd; g.fillRect(0, h * 0.5, w, h * 0.5);
    txt(g, label, w / 2, h * 0.24, 92, hex(hsl(c, 0, 0, -0.3)), { weight: 900, maxW: w * 0.85 });
    txt(g, '目薬 · COOL', w / 2, h * 0.36, 48, hex(c), { weight: 800 });
    g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w * (0.3 + i * 0.2), h * (0.7 + (i % 2) * 0.08), 30 - i * 6, 0, TAU); g.fill(); }
  });
  const bottle = lathe([[0, 0], [0.24, 0], [0.27, 0.03], [0.27, 0.55], [0.22, 0.68], [0.1, 0.76], [0, 0.78]]);
  return G([
    M(bottle, mat.glass(c, { attenuationDistance: 0.6, thickness: 0.7 })),
    wrapLabel(bottle, 0.16, 0.44, { title: 'COOL', sub: 'dopa eye', accent: hex(c), ink: DARK, turn: 0.3 }),
    M(lathe([[0, 0.74], [0.14, 0.74], [0.15, 0.8], [0.13, 0.98], [0.06, 1.2], [0.02, 1.26], [0, 1.26]]), mat.gloss(hsl(c, 0, 0, -0.12))),
    G([M(rbox(0.66, 1.15, 0.26, 0.03, 2), mat.satin('#ffffff')), M(new THREE.PlaneGeometry(0.64, 1.13), mat.satin('#ffffff', { map: boxTex }), [0, 0, 0.131])], [-0.48, 0.575, -0.3], [0, 0.25, 0]),
  ]);
}, { yaw: -0.3 });

reg('bandage', ({ c = '#f1c3a0' }) => {
  const strip = ext(rpoly([[-0.72, -0.2], [0.72, -0.2], [0.72, 0.2], [-0.72, 0.2]], 0.2), 0.015, { bevel: 0.01, seg: 2 });
  const dots = [];
  for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 4; i++) for (let j = -1; j <= 1; j += 2) dots.push({ p: [s * (0.3 + i * 0.1), j * 0.08, 0.019], r: [PI / 2, 0, 0] });
  const one = (col) => G([
    M(strip, mat.satin(col, { roughness: 0.7 })),
    M(rbox(0.42, 0.3, 0.02, 0.04, 2), mat.soft(mix(col, '#ffffff', 0.7)), [0, 0, 0.012]),
    M(scatter(cyl(0.016, 0.016, 0.004, 12), dots), mat.matte(hsl(col, 0, 0, -0.12))),
  ]);
  return G([G([one(c)], [0, 0, 0], [0, 0, 0.5]), G([one(hsl(c, 0.04, 0, 0.04))], [0, 0, 0.05], [0, 0, -0.5])], [0, 0.6, 0], [-0.85, 0, 0]);
}, { yaw: -0.2 });

reg('thermometer', ({ c = '#4f8cff' }) => {
  const disp = ctex(256, 192, (g, w, h) => { g.fillStyle = '#0f1a16'; g.fillRect(0, 0, w, h); txt(g, '36.5', w * 0.45, h * 0.55, 92, '#7dffb2', { weight: 700 }); txt(g, '°C', w * 0.85, h * 0.4, 36, '#7dffb2', { weight: 700 }); });
  const body = ext(rpoly([[-0.16, -0.7], [0.16, -0.7], [0.2, 0.7], [-0.2, 0.7]], [0.08, 0.08, 0.18, 0.18]), 0.1, { bevel: 0.05, seg: 4 });
  return G([
    M(body, mat.gloss('#ffffff', { roughness: 0.2 })),
    M(rbox(0.3, 0.1, 0.22, 0.04, 3), mat.gloss(c), [0, 0.68, 0]),
    M(cyl(0.06, 0.035, 0.32, 32), mat.metal(SILVER, 0.15), [0, -0.86, 0]),
    M(sph(0.035, 16, 12), mat.metal(SILVER, 0.15), [0, -1.02, 0]),
    M(rbox(0.26, 0.2, 0.02, 0.02, 2), mat.gloss('#ffffff', { map: disp, emissive: '#ffffff', emissiveMap: disp, emissiveIntensity: 0.9 }), [0, 0.32, 0.1]),
    M(cyl(0.07, 0.07, 0.04, 32), mat.gloss(c), [0, -0.05, 0.1], [PI / 2, 0, 0]),
  ], [0, 1.0, 0], [-0.3, 0, -0.6]);
}, { yaw: -0.2 });

function gummyBear(c) {
  const m = mat.jelly(c);
  const s = (r, p, sc) => M(sph(r, 32, 24), m, p, null, sc);
  return G([
    s(0.3, [0, 0.33, 0], [1, 1.1, 0.75]), s(0.23, [0, 0.78, 0], [1, 0.95, 0.8]),
    s(0.085, [-0.17, 0.97, 0], [1, 1, 0.7]), s(0.085, [0.17, 0.97, 0], [1, 1, 0.7]),
    s(0.1, [0, 0.72, 0.16], [1, 0.8, 0.7]),
    s(0.11, [-0.27, 0.48, 0.05], [0.8, 1.1, 0.7]), s(0.11, [0.27, 0.48, 0.05], [0.8, 1.1, 0.7]),
    s(0.13, [-0.17, 0.11, 0.06], [1, 0.9, 0.8]), s(0.13, [0.17, 0.11, 0.06], [1, 0.9, 0.8]),
  ]);
}
reg('gummies', ({ c = '#ff4d6d', mixed = false }) => {
  const cols = mixed ? ['#ff4d6d', '#ffb703', '#8ac926', '#ff7b00', '#c77dff'] : [0, 0.05, -0.05, 0.1, -0.08].map((d) => hsl(c, d, 0, d * 0.5));
  return G([
    G([gummyBear(cols[0])], [-0.42, 0.02, -0.15], [0, 0.35, 0]),
    G([gummyBear(cols[1])], [0.12, 0.02, -0.35], [0, -0.2, 0]),
    G([gummyBear(cols[2])], [0.62, 0.02, -0.1], [0, -0.6, 0]),
    G([gummyBear(cols[3])], [-0.2, 0.2, 0.55], [-PI / 2, 0, 0.3]),
    G([gummyBear(cols[4])], [0.42, 0.2, 0.5], [-PI / 2, 0, -0.5]),
  ]);
}, { elev: 0.4 });

reg('mask', ({ c = '#f4f5f8' }) => {
  const g = new THREE.PlaneGeometry(1.25, 0.8, 64, 40);
  deform(g, (v) => {
    const ax = v.x / 0.625, ay = v.y / 0.4;
    v.z = -0.42 * ax * ax + 0.1 * (1 - ax * ax) * (1 - ay * ay) + 0.045 * Math.pow(Math.abs(Math.sin(v.y * PI * 2.6)), 0.6) * (1 - ax * ax * 0.6);
  });
  const loop = (s) => M(tor(0.26, 0.014, 8, 48), mat.matte(hsl(c, 0, 0, -0.12)), [s * 0.6, 0, -0.66], [0, PI / 2, 0], [1, 0.75, 1]);
  const edge = (s) => M(cap(0.022, 0.72, 4, 10), mat.soft(hsl(c, 0, 0, -0.06)), [s * 0.625, 0, -0.42]);
  return G([M(g, mat.soft(c, { side: THREE.DoubleSide })), edge(-1), edge(1), loop(-1), loop(1)], [0, 0.42, 0]);
}, { yaw: -0.5, elev: 0.2 });

reg('firstaid', ({ c = '#ff4757' }) => {
  const crossC = lum(c) > 0.7 ? '#ff4757' : '#ffffff';
  const m = mat.gloss(c, { roughness: 0.25 });
  return G([
    M(rbox(1.1, 0.62, 0.55, 0.1, 5), m, [0, 0.31, 0]),
    M(rbox(1.13, 0.24, 0.58, 0.1, 5), mat.gloss(hsl(c, 0, 0, 0.04), { roughness: 0.25 }), [0, 0.74, 0]),
    M(rbox(0.36, 0.11, 0.03, 0.02, 2), mat.gloss(crossC), [0, 0.38, 0.28]), M(rbox(0.11, 0.36, 0.03, 0.02, 2), mat.gloss(crossC), [0, 0.38, 0.28]),
    M(tor(0.2, 0.035, 12, 32, PI), mat.gloss(DARK), [0, 0.86, 0]),
    M(rbox(0.14, 0.08, 0.04, 0.015, 2), mat.metal(SILVER), [0, 0.64, 0.29]),
  ]);
}, { yaw: -0.45 });

reg('protein', ({ c = '#26252c', c2 = '#ff4d6d', label = 'PROTEIN', sub = 'CHOCOLATE' }) => {
  const lid = lathe([[0, 1.0], [0.57, 1.0], [0.585, 1.04], [0.585, 1.16], [0.555, 1.2], [0, 1.2]], { segs: 128 });
  deform(lid, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); if (r > 0.56 && v.y > 1.02 && v.y < 1.18) { const k = 1 + 0.012 * Math.cos(th * 72); v.x *= k; v.z *= k; } });
  const tub = lathe([[0, 0], [0.5, 0], [0.55, 0.04], [0.56, 0.1], [0.56, 0.98], [0.54, 1.0], [0, 1.0]]);
  return G([
    M(tub, mat.gloss(c, { roughness: 0.3 })),
    wrapLabel(tub, 0.2, 0.8, { bg: hex(c), ink: lum(c) > 0.6 ? DARK : '#ffffff', accent: hex(c2), title: label, sub, h: 260, turn: 0.2 }),
    M(lid, mat.gloss('#ffffff', { roughness: 0.35 })),
  ]);
}, { yaw: -0.2 });

/* ================= HOME ================= */
reg('sofa', ({ c = '#7c9cff', c2 = '#ffd166' }) => {
  const m = fabric(c), leg = mat.satin(WOOD, { roughness: 0.5 });
  const legs = [[-0.88, 0.35], [0.88, 0.35], [-0.88, -0.35], [0.88, -0.35]].map(([x, z]) => M(cyl(0.045, 0.03, 0.18, 16), leg, [x, 0.09, z]));
  return G([
    legs,
    M(rbox(2.0, 0.26, 0.95, 0.08, 4), m, [0, 0.3, 0]),
    M(rbox(0.95, 0.22, 0.78, 0.1, 5), m, [-0.48, 0.54, 0.07]), M(rbox(0.95, 0.22, 0.78, 0.1, 5), m, [0.48, 0.54, 0.07]),
    M(rbox(0.95, 0.6, 0.26, 0.12, 5), m, [-0.48, 0.86, -0.33], [-0.12, 0, 0]), M(rbox(0.95, 0.6, 0.26, 0.12, 5), m, [0.48, 0.86, -0.33], [-0.12, 0, 0]),
    M(rbox(0.26, 0.62, 0.98, 0.11, 5), m, [-1.02, 0.56, 0]), M(rbox(0.26, 0.62, 0.98, 0.11, 5), m, [1.02, 0.56, 0]),
    M(pebble(0.4, 0.4, 0.14, 0.3), fabric(c2), [0.55, 0.82, -0.12], [-0.25, -0.2, 0.25]),
  ]);
}, { yaw: -0.45, elev: 0.3 });

reg('lamp', ({ c = '#ffb3c1' }) => {
  const m = mat.gloss(c, { roughness: 0.2 });
  return G([
    M(lathe([[0, 0], [0.32, 0], [0.34, 0.03], [0.31, 0.07], [0.14, 0.12], [0.09, 0.2], [0, 0.2]]), m),
    M(cyl(0.065, 0.08, 0.56, 32), m, [0, 0.46, 0]),
    M(lathe([[0, 0.69], [0.5, 0.69], [0.585, 0.72], [0.61, 0.78], [0.56, 0.92], [0.4, 1.06], [0.18, 1.14], [0, 1.16]]), m),
    M(cyl(0.49, 0.49, 0.01, 64), new THREE.MeshBasicMaterial({ color: '#fff4d6' }), [0, 0.688, 0]),
    M(sph(0.11, 24, 16), new THREE.MeshBasicMaterial({ color: '#fffaf0' }), [0, 0.68, 0], null, [1, 0.5, 1]),
  ]);
});

function pot(c, top = 0.64) {
  return G([
    M(lathe([[0, 0], [0.3, 0], [0.33, 0.03], [0.4, top - 0.08], [0.445, top - 0.04], [0.445, top + 0.02], [0.41, top + 0.03], [0, top - 0.02]]), mat.gloss(c, { roughness: 0.22 })),
    M(cyl(0.4, 0.4, 0.02, 48), mat.matte('#4a3426', { roughness: 1 }), [0, top - 0.01, 0]),
  ]);
}
reg('plant', ({ c = '#ff8fab' }) => {
  const leafS = new THREE.Shape(); leafS.moveTo(0, 0); leafS.bezierCurveTo(0.26, 0.05, 0.33, 0.42, 0, 0.66); leafS.bezierCurveTo(-0.33, 0.42, -0.26, 0.05, 0, 0);
  const leafG = ext(leafS, 0.008, { bevel: 0.014, seg: 2, curve: 16 });
  deform(leafG, (v) => { v.z += -0.14 * Math.abs(v.x) + 0.18 * v.y * v.y; });
  const rnd = rng(12), parts = [pot(c)];
  for (let i = 0; i < 11; i++) {
    const phi = i * 2.399, tilt = 0.25 + rnd() * 0.75, len = 0.35 + rnd() * 0.5;
    const end = [Math.sin(phi) * Math.sin(tilt) * len, 0.63 + Math.cos(tilt) * len, Math.cos(phi) * Math.sin(tilt) * len];
    parts.push(M(tube([[0, 0.62, 0], [end[0] * 0.5, 0.63 + (end[1] - 0.63) * 0.65, end[2] * 0.5], end], 0.014, 16, 6), mat.satin('#4c8c3a')));
    const pivot = new THREE.Group(); pivot.position.set(...end); pivot.rotation.order = 'YXZ'; pivot.rotation.set(tilt + 0.35, phi, 0);
    pivot.add(M(leafG, mat.gloss(hsl('#3fa34d', (rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.12), { roughness: 0.3 }), null, null, 0.8 + rnd() * 0.35));
    parts.push(pivot);
  }
  return G(parts);
});

reg('cactus', ({ c = '#e07a5f' }) => {
  const ribs = (g) => deform(g, (v) => { const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z), k = 1 + 0.07 * Math.cos(th * 8); v.x *= k; v.z *= k; });
  const green = mat.satin('#5bb26a', { roughness: 0.5 });
  const body = ribs(cap(0.22, 0.56, 16, 64));
  const armL = ribs(cap(0.12, 0.24, 12, 48)), armR = ribs(cap(0.1, 0.14, 12, 48));
  const spines = scatter(sph(0.012, 6, 4), surfacePts(body, 46, rng(8), (p) => p.y > -0.3));
  const petals = Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos((i / 6) * TAU) * 0.07, 0, Math.sin((i / 6) * TAU) * 0.07], s: [1, 0.45, 1] }));
  return G([
    pot(c, 0.58),
    M(body, green, [0, 1.07, 0]), M(spines, mat.matte('#ffffff'), [0, 1.07, 0]),
    M(cap(0.1, 0.16, 8, 24), green, [-0.25, 0.98, 0], [0, 0, PI / 2]), M(armL, green, [-0.36, 1.16, 0]),
    M(cap(0.08, 0.12, 8, 24), green, [0.22, 0.86, 0], [0, 0, PI / 2]), M(armR, green, [0.32, 0.98, 0]),
    G([M(scatter(sph(0.06, 16, 12), petals), mat.gloss('#ff7eb6')), M(sph(0.04, 12, 8), mat.gloss('#ffd23f'), [0, 0.02, 0])], [0, 1.6, 0]),
  ]);
});

reg('clock', ({ c = '#ff6b6b' }) => {
  const face = ctex(512, 512, (g, w, h) => {
    g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; g.save(); g.translate(w / 2, h / 2); g.rotate(a); g.fillStyle = i % 5 ? '#c9c9d0' : DARK; g.fillRect(-(i % 5 ? 2 : 5), -236, i % 5 ? 4 : 10, i % 5 ? 14 : 30); g.restore(); }
    [12, 3, 6, 9].forEach((n, i) => { const a = (i / 4) * TAU - PI / 2; txt(g, String(n), w / 2 + Math.cos(a) * 170, h / 2 + Math.sin(a) * 170, 64, hex(c), { weight: 900 }); });
  });
  const hand = (len, wd, ang, col) => { const g = rbox(wd, len, 0.015, wd / 2.2, 2); g.translate(0, len / 2 - 0.05, 0); return M(g, mat.gloss(col), [0, 0, 0.08], [0, 0, ang]); };
  const m = mat.gloss(c, { roughness: 0.2 });
  return G([
    G([
      M(cyl(0.62, 0.62, 0.14, 64), m, [0, 0, -0.04], [PI / 2, 0, 0]),
      M(tor(0.62, 0.07, 20, 96), m),
      M(cyl(0.6, 0.6, 0.02, 64), mat.satin('#ffffff', { map: face }), [0, 0, 0.04], [PI / 2, 0, 0]),
      hand(0.32, 0.05, -1.0, DARK), hand(0.45, 0.035, 1.05, DARK), hand(0.5, 0.012, 2.5, c),
      M(cyl(0.04, 0.04, 0.04, 16), mat.gloss(DARK), [0, 0, 0.1], [PI / 2, 0, 0]),
      M(sph(0.2, 32, 16, 0, TAU, 0, PI / 2), m, [-0.42, 0.6, -0.04], [0, 0, 0.6]),
      M(sph(0.2, 32, 16, 0, TAU, 0, PI / 2), m, [0.42, 0.6, -0.04], [0, 0, -0.6]),
      M(cyl(0.025, 0.025, 0.2, 12), mat.metal(SILVER), [0, 0.72, -0.04]),
      M(rbox(0.5, 0.04, 0.04, 0.02, 2), mat.metal(SILVER), [0, 0.81, -0.04]),
      M(cyl(0.04, 0.02, 0.2, 12), mat.metal(SILVER), [-0.36, -0.66, 0], [0, 0, -0.5]),
      M(cyl(0.04, 0.02, 0.2, 12), mat.metal(SILVER), [0.36, -0.66, 0], [0, 0, 0.5]),
    ], [0, 0.76, 0]),
  ]);
}, { yaw: -0.35, elev: 0.18 });

reg('chair', ({ c = '#ffb703' }) => {
  const m = fabric(c), wood = mat.satin(WOOD, { roughness: 0.45 });
  const leg = (sx, sz) => M(cyl(0.035, 0.025, 0.82, 16), wood, [sx * 0.36, 0.38, sz * 0.32], [sz * 0.1, 0, -sx * 0.1]);
  return G([
    leg(-1, -1), leg(1, -1), leg(-1, 1), leg(1, 1),
    M(rbox(0.9, 0.14, 0.86, 0.07, 5), m, [0, 0.8, 0]),
    M(rbox(0.92, 0.6, 0.14, 0.07, 5), m, [0, 1.2, -0.42], [-0.16, 0, 0]),
    M(cyl(0.02, 0.02, 0.4, 12), wood, [-0.3, 0.95, -0.4], [-0.16, 0, 0]), M(cyl(0.02, 0.02, 0.4, 12), wood, [0.3, 0.95, -0.4], [-0.16, 0, 0]),
  ]);
}, { yaw: -0.6, elev: 0.3 });

reg('vase', ({ c = '#6c8cff', c2 = '#ff6b8b' }) => {
  const vase = lathe([[0, 0], [0.26, 0], [0.3, 0.04], [0.4, 0.33], [0.38, 0.62], [0.22, 0.92], [0.17, 1.06], [0.2, 1.18], [0.205, 1.2], [0.185, 1.205], [0.16, 1.12], [0.14, 1.0]]);
  const tulip = (col) => { const g = lathe([[0, 0], [0.08, 0.015], [0.125, 0.09], [0.125, 0.19], [0.085, 0.27], [0, 0.25]]); deform(g, (v) => { const th = Math.atan2(v.z, v.x); if (v.y > 0.18) v.y += 0.03 * Math.cos(th * 3); }); return M(g, mat.gloss(col, { roughness: 0.3 })); };
  const stems = [[-0.2, 1.75, 0.05], [0.05, 1.95, -0.05], [0.24, 1.7, 0.08]];
  const cols = [c2, hsl(c2, 0.08, 0, 0.08), hsl(c2, -0.06, 0, 0.04)];
  return G([
    M(vase, mat.gloss(c, { roughness: 0.18 })),
    stems.map((e, i) => M(tube([[0, 0.9, 0], [e[0] * 0.5, 1.35, e[2] * 0.5], e], 0.018, 24, 6), mat.satin('#4c9a3f'))),
    stems.map((e, i) => G([tulip(cols[i])], e, [0, i, (i - 1) * -0.25])),
    M(ext(rpoly([[0, 0], [0.08, 0.3], [0, 0.6], [-0.05, 0.3]], 0.05), 0.01, { bevel: 0.01, seg: 2 }), mat.satin('#5aa64b'), [0.12, 1.1, 0.05], [0, 0.3, -0.5]),
  ]);
}, { yaw: -0.2 });

reg('mug', ({ c = '#ff8c42' }) => {
  const latte = ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a5a3c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6e6d3';
    g.beginPath(); const x = w / 2, y = h * 0.42; g.moveTo(x, y + 60); g.bezierCurveTo(x - 110, y - 10, x - 50, y - 90, x, y - 30); g.bezierCurveTo(x + 50, y - 90, x + 110, y - 10, x, y + 60); g.fill();
  });
  const handle = tor(0.21, 0.055, 16, 48, PI * 1.1); handle.rotateZ(-PI * 0.55);
  return G([
    M(lathe([[0, 0], [0.36, 0], [0.4, 0.03], [0.41, 0.1], [0.41, 0.84], [0.4, 0.87], [0.385, 0.875]]), mat.gloss(c, { roughness: 0.18 })),
    M(lathe([[0.385, 0.875], [0.37, 0.87], [0.36, 0.84], [0.36, 0.12], [0, 0.12]]), mat.gloss('#fdfcf8', { roughness: 0.18 })),
    M(new THREE.CircleGeometry(0.362, 48), mat.gloss('#ffffff', { map: latte, roughness: 0.25 }), [0, 0.74, 0], [-PI / 2, 0, 0]),
    M(handle, mat.gloss(c, { roughness: 0.18 }), [0.43, 0.46, 0], null, [0.9, 1, 1]),
  ]);
}, { yaw: -0.7, elev: 0.42 });

function cushionGeo(s = 1) {
  const g = sph(1, 72, 54);
  return deform(g, (v) => {
    const f = (c, k) => Math.sign(c) * Math.pow(Math.abs(c), k);
    let x = f(v.x, 0.3) * 0.55, y = f(v.y, 0.3) * 0.55, z = f(v.z, 0.8) * 0.22;
    const ax = Math.abs(x) / 0.55, ay = Math.abs(y) / 0.55;
    z *= (1 - 0.6 * Math.pow(Math.max(ax, ay), 3)) * (1 - 0.3 * ax * ay);
    z *= 1 - 0.25 * Math.exp(-(x * x + y * y) / 0.008);
    x *= 1 - 0.07 * ay * ay; y *= 1 - 0.07 * ax * ax;
    v.set(x * s, y * s, z * s);
  });
}
reg('cushion', ({ c = '#ff8fab', c2 = '#ffd166' }) => G([
  M(cushionGeo(), fabric(c), [0, 0.55, -0.1], [-0.25, 0, 0]),
  M(sph(0.035, 16, 12), fabric(hsl(c, 0, 0, -0.1)), [0, 0.55, 0.05], null, [1, 1, 0.5]),
  M(cushionGeo(0.75), fabric(c2), [0.45, 0.12, 0.35], [-PI / 2 + 0.05, 0, 0.4]),
]), { yaw: -0.35, elev: 0.3 });

reg('candle', ({ c = '#ffd6e0', label = 'PEONY' }) => {
  const tag = ctex(512, 256, (g, w, h) => { g.fillStyle = '#e9d5b5'; g.fillRect(0, 0, w, h); txt(g, label, w / 2, h * 0.45, 70, '#5b4636', { weight: 800, maxW: w * 0.8 }); txt(g, 'scented candle', w / 2, h * 0.72, 30, '#5b4636', { weight: 600 }); });
  return G([
    M(lathe([[0, 0], [0.34, 0], [0.37, 0.03], [0.375, 0.62], [0.36, 0.64], [0.345, 0.62], [0.345, 0.06], [0, 0.06]], { n: 120 }), mat.glass('#ffffff', { thickness: 0.2, roughness: 0.04 })),
    M(cyl(0.336, 0.336, 0.46, 64), mat.satin(c, { roughness: 0.7 }), [0, 0.29, 0]),
    M(cyl(0.38, 0.38, 0.2, 64, 1, true, -0.8, 1.6), mat.satin('#ffffff', { map: tag, side: THREE.DoubleSide }), [0, 0.3, 0]),
    M(cyl(0.012, 0.012, 0.08, 8), mat.matte('#2b2522'), [0, 0.55, 0]),
    M(lathe([[0, 0], [0.04, 0.03], [0.05, 0.08], [0.03, 0.15], [0, 0.21]]), new THREE.MeshBasicMaterial({ color: '#ffc94d' }), [0, 0.57, 0]),
    M(lathe([[0, 0], [0.022, 0.03], [0.028, 0.07], [0, 0.12]]), new THREE.MeshBasicMaterial({ color: '#fffbe8' }), [0, 0.58, 0.012]),
    M(cyl(0.38, 0.38, 0.07, 64), mat.satin(WOOD, { roughness: 0.55 }), [0.62, 0.15, 0.25], [0.2, 0, -1.25]),
  ]);
}, { yaw: -0.3 });

/* ================= TECH ================= */
reg('headphones', ({ c = '#8b5cf6', c2 = '#26252c' }) => {
  const m = mat.satin(c, { roughness: 0.35 }), pad = mat.soft(hsl(c, 0, -0.1, -0.2));
  const cup = lathe([[0, 0], [0.26, 0], [0.29, 0.03], [0.3, 0.12], [0.27, 0.2], [0, 0.22]]);
  return G([
    M(tor(0.64, 0.065, 20, 72, PI), m),
    M(tor(0.6, 0.05, 14, 48, PI * 0.6), pad, [0, 0, 0], [0, 0, PI * 0.2]),
    M(rbox(0.06, 0.24, 0.1, 0.03, 2), mat.metal(SILVER), [-0.64, -0.08, 0]), M(rbox(0.06, 0.24, 0.1, 0.03, 2), mat.metal(SILVER), [0.64, -0.08, 0]),
    M(cup, m, [-0.62, -0.3, 0], [0, 0, PI / 2]), M(cup, m, [0.62, -0.3, 0], [0, 0, -PI / 2]),
    M(tor(0.2, 0.085, 16, 48), pad, [-0.57, -0.3, 0], [0, PI / 2, 0]), M(tor(0.2, 0.085, 16, 48), pad, [0.57, -0.3, 0], [0, PI / 2, 0]),
    M(cyl(0.12, 0.12, 0.02, 32), mat.gloss(c2), [-0.85, -0.3, 0], [0, 0, PI / 2]), M(cyl(0.12, 0.12, 0.02, 32), mat.gloss(c2), [0.85, -0.3, 0], [0, 0, PI / 2]),
  ], [0, 0.6, 0]);
}, { yaw: -0.5, elev: 0.25 });

reg('speaker', ({ c = '#f4a3c0', c2 = '#5ee7ff' }) => {
  const knit = noiseTex(256, 6, 2400, 2);
  return G([
    M(lathe([[0, 0], [0.4, 0], [0.46, 0.04], [0.5, 0.15], [0.5, 0.9], [0.47, 1.0], [0.4, 1.04], [0, 1.05]]), mat.soft(c, { bumpMap: knit, bumpScale: 2 })),
    M(cyl(0.4, 0.4, 0.02, 64), mat.gloss(DARK, { roughness: 0.15 }), [0, 1.045, 0]),
    M(tor(0.31, 0.02, 10, 96), mat.glow(c2, 2.2), [0, 1.06, 0], [PI / 2, 0, 0]),
    M(scatter(cyl(0.025, 0.025, 0.01, 16), [[-0.12, 0], [0.12, 0], [0, -0.12], [0, 0.12]].map(([x, z]) => ({ p: [x, 1.06, z] }))), mat.gloss('#ffffff')),
  ]);
});

reg('controller', ({ c = '#4cc9f0' }) => {
  const body = ext(rpoly([[-0.95, -0.62], [-0.62, 0.36], [0.62, 0.36], [0.95, -0.62], [0.66, -0.7], [0.32, -0.3], [-0.32, -0.3], [-0.66, -0.7]], [0.25, 0.3, 0.3, 0.25, 0.2, 0.2, 0.2, 0.2]), 0.2, { bevel: 0.1, seg: 7 });
  const dark = mat.gloss('#2f2d38', { roughness: 0.3 });
  const btn = (col, x, y) => M(cyl(0.055, 0.055, 0.06, 24), mat.gloss(col), [x, y, 0.21], [PI / 2, 0, 0]);
  return G([
    M(body, mat.gloss(c, { roughness: 0.28 })),
    M(rbox(0.27, 0.09, 0.06, 0.02, 2), dark, [-0.5, 0.0, 0.2]), M(rbox(0.09, 0.27, 0.06, 0.02, 2), dark, [-0.5, 0.0, 0.2]),
    btn('#ff5d73', 0.62, 0), btn('#ffd166', 0.5, 0.12), btn('#06d6a0', 0.38, 0), btn('#ffffff', 0.5, -0.12),
    M(cyl(0.1, 0.1, 0.08, 32), dark, [-0.22, -0.24, 0.21], [PI / 2, 0, 0]), M(cyl(0.1, 0.1, 0.08, 32), dark, [0.22, -0.24, 0.21], [PI / 2, 0, 0]),
    M(sph(0.11, 24, 12, 0, TAU, 0, PI / 2), dark, [-0.22, -0.24, 0.25], [PI / 2, 0, 0], [1, 0.4, 1]), M(sph(0.11, 24, 12, 0, TAU, 0, PI / 2), dark, [0.22, -0.24, 0.25], [PI / 2, 0, 0], [1, 0.4, 1]),
    M(scatter(rbox(0.1, 0.04, 0.04, 0.018, 2), [{ p: [-0.1, 0.17, 0.2] }, { p: [0.1, 0.17, 0.2] }]), mat.gloss('#ffffff')),
    M(rbox(0.36, 0.08, 0.16, 0.04, 3), mat.gloss(hsl(c, 0, 0, -0.1)), [-0.55, 0.38, 0]), M(rbox(0.36, 0.08, 0.16, 0.04, 3), mat.gloss(hsl(c, 0, 0, -0.1)), [0.55, 0.38, 0]),
  ], null, [-1.0, 0, 0]);
}, { yaw: -0.2, elev: 0.4 });

reg('camera', ({ c = '#a0e7e5' }) => {
  const photo = ctex(256, 300, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, h * 0.8); grd.addColorStop(0, '#ff9a8b'); grd.addColorStop(0.5, '#ff6a88'); grd.addColorStop(1, '#ffd166');
    g.fillStyle = grd; g.fillRect(16, 16, w - 32, h * 0.72);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(w * 0.62, h * 0.32, 34, 0, TAU); g.fill();
  });
  return G([
    M(rbox(1.25, 0.95, 0.62, 0.16, 6), mat.gloss(c, { roughness: 0.22 }), [0, 0.475, 0]),
    M(cyl(0.34, 0.34, 0.1, 64), mat.gloss('#ffffff', { roughness: 0.25 }), [0.1, 0.42, 0.34], [PI / 2, 0, 0]),
    M(cyl(0.27, 0.27, 0.12, 64), mat.gloss('#2b2b33', { roughness: 0.2 }), [0.1, 0.42, 0.42], [PI / 2, 0, 0]),
    M(tor(0.24, 0.02, 10, 64), mat.metal(SILVER, 0.15), [0.1, 0.42, 0.48]),
    M(sph(0.2, 48, 24), mat.gloss('#16213a', { roughness: 0.04, clearcoat: 1, iridescence: 0.9, iridescenceIOR: 1.7 }), [0.1, 0.42, 0.45], null, [1, 1, 0.35]),
    M(rbox(0.32, 0.16, 0.06, 0.03, 2), mat.gloss('#fdfdfd', { emissive: '#ffffff', emissiveIntensity: 0.15 }), [-0.36, 0.78, 0.31]),
    M(rbox(0.15, 0.12, 0.06, 0.03, 2), mat.gloss('#1e1e24'), [0.42, 0.78, 0.31]),
    M(cyl(0.07, 0.07, 0.05, 24), mat.gloss('#ff4d6d'), [-0.44, 0.24, 0.31], [PI / 2, 0, 0]),
    M(rbox(0.6, 0.7, 0.012, 0.01, 1), mat.satin('#ffffff', { map: photo }), [0.0, 1.05, -0.05], [0, 0, 0.06]),
  ]);
}, { yaw: -0.45 });

reg('phone', ({ c = '#ff8fab' }) => {
  const wall = ctex(256, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#ff9a8b'); grd.addColorStop(0.5, '#a18cd1'); grd.addColorStop(1, '#5ee7df');
    g.fillStyle = grd; g.fillRect(0, 0, w, h); txt(g, '10:08', w / 2, h * 0.22, 64, '#ffffff', { weight: 300 });
  });
  const lenses = [{ p: [-0.24, 0.66, -0.085] }, { p: [-0.24, 0.48, -0.085] }];
  return G([
    M(rbox(0.78, 1.6, 0.09, 0.11, 6), mat.gloss(c, { roughness: 0.15, clearcoat: 1 })),
    M(new THREE.PlaneGeometry(0.72, 1.53), mat.gloss('#000000', { map: wall, emissive: '#ffffff', emissiveMap: wall, emissiveIntensity: 0.7 }), [0, 0, 0.046]),
    M(rbox(0.3, 0.44, 0.04, 0.1, 4), mat.gloss(hsl(c, 0, 0, 0.06), { roughness: 0.1 }), [-0.21, 0.57, -0.055]),
    M(scatter(cyl(0.075, 0.075, 0.04, 32), lenses.map((l) => ({ ...l, r: [PI / 2, 0, 0] }))), mat.gloss('#16161c', { roughness: 0.05, iridescence: 0.6 })),
    M(scatter(tor(0.075, 0.012, 8, 32), lenses.map((l) => ({ p: [l.p[0], l.p[1], -0.1] }))), mat.metal(SILVER, 0.15)),
    M(sph(0.03, 16, 8), mat.glow('#fff6d8', 0.6), [-0.12, 0.66, -0.08]),
  ], [0, 0.82, 0], [0, 0, 0.08]);
}, { yaw: Math.PI - 0.55, elev: 0.15 });

reg('earbuds', ({ c = '#f6f6f8', c2 = '#7dffb2' }) => {
  const m = mat.gloss(c, { roughness: 0.18 });
  const bud = (s) => G([
    M(sph(0.15, 32, 24), m, null, null, [1, 1, 0.9]),
    M(cap(0.045, 0.32, 6, 16), m, [0.02, -0.2, 0.02], [0, 0, 0.15]),
    M(sph(0.085, 24, 16), mat.soft('#c9ccd4'), [0, 0, 0.13], null, [1, 1, 0.7]),
  ], null, [0, s * 0.5, 0]);
  return G([
    M(pebble(0.82, 0.62, 0.36, 0.42, 0.5), m, [0, 0.31, -0.15]),
    M(rbox(0.82, 0.008, 0.34, 0.004, 1), mat.matte('#9aa0aa'), [0, 0.43, -0.15]),
    M(sph(0.018, 12, 8), mat.glow(c2, 2), [0, 0.22, 0.03]),
    G([bud(1)], [-0.32, 0.2, 0.4], [PI / 2 - 0.3, 0, 0.5]),
    G([bud(-1)], [0.28, 0.2, 0.45], [PI / 2 - 0.3, 0, -0.6]),
  ]);
}, { yaw: -0.3, elev: 0.38 });

reg('keyboard', ({ c = '#ffd6e0', c2 = '#ff6b8b' }) => {
  const key = rbox(0.145, 0.08, 0.145, 0.03, 3);
  const base = [], accent = [];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 11; k++) {
    if (r === 3 && k > 2 && k < 8) continue;
    const p = { p: [-0.83 + k * 0.166 + (r % 2) * 0.03, 0.15, -0.25 + r * 0.166] };
    ((r === 0 && k === 0) || (r === 1 && k === 10) || (r === 3 && k === 10) ? accent : base).push(p);
  }
  return G([
    M(rbox(1.94, 0.12, 0.76, 0.06, 4), mat.gloss(c, { roughness: 0.25 }), [0, 0.06, 0]),
    M(scatter(key, base), mat.satin(mix(c, '#ffffff', 0.65), { roughness: 0.4 })),
    M(scatter(key, accent), mat.satin(c2, { roughness: 0.4 })),
    M(rbox(0.8, 0.08, 0.145, 0.03, 3), mat.satin(mix(c, '#ffffff', 0.65), { roughness: 0.4 }), [-0.05, 0.15, 0.248]),
  ], null, [0.55, 0, 0]);
}, { yaw: -0.25, elev: 0.4 });

reg('hairdryer', ({ c = '#c3aed6', c2 = '#ffffff' }) => {
  const m = mat.gloss(c, { roughness: 0.22 });
  const grille = ctex(256, 256, (g, w, h) => { g.fillStyle = '#3a3842'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1c1b22'; g.lineWidth = 8; for (let r = 18; r < 128; r += 20) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, TAU); g.stroke(); } });
  return G([
    M(lathe([[0, 0], [0.3, 0], [0.33, 0.04], [0.34, 0.5], [0.3, 0.7], [0.22, 0.82], [0.21, 0.95], [0, 0.95]]), m, [-0.45, 0.95, 0], [0, 0, -PI / 2]),
    M(cyl(0.3, 0.3, 0.02, 48), mat.matte('#ffffff', { map: grille }), [-0.455, 0.95, 0], [0, 0, PI / 2]),
    M(tor(0.205, 0.025, 10, 48), mat.gloss(c2), [0.5, 0.95, 0], [0, PI / 2, 0]),
    M(rbox(0.26, 0.8, 0.24, 0.12, 5), m, [-0.12, 0.42, 0], [0, 0, -0.22]),
    M(rbox(0.07, 0.16, 0.04, 0.03, 2), mat.gloss(c2), [-0.03, 0.55, 0.125], [0, 0, -0.22]),
    M(tube([[-0.22, 0.05, 0], [-0.3, -0.05, 0.1], [-0.15, -0.05, 0.25], [0.05, -0.05, 0.2]], 0.025, 32, 8), mat.gloss('#ffffff')),
  ], [0, 0.08, 0]);
}, { yaw: -0.45 });

/* ================= DAILY ================= */
reg('toiletpaper', ({ c = '#ffffff' }) => {
  const roll = lathe([[0.16, 0], [0.4, 0], [0.43, 0.02], [0.44, 0.06], [0.44, 0.64], [0.43, 0.68], [0.4, 0.7], [0.16, 0.7], [0.16, 0.0]], { n: 160, segs: 72 });
  const emboss = noiseTex(256, 7, 600, 4);
  const one = (p) => G([M(roll, mat.soft(c, { bumpMap: emboss, bumpScale: 1.5, roughness: 0.95 })), M(cyl(0.157, 0.157, 0.7, 32, 1, true), mat.matte('#b98a5a', { side: THREE.DoubleSide }), [0, 0.35, 0])], p);
  return G([one([-0.45, 0, 0]), one([0.45, 0, 0]), one([0, 0.7, 0]), one([0, 0, -0.75])]);
}, { elev: 0.62 });

reg('detergent', ({ c = '#4cc9f0', label = 'CLEAN' }) => {
  const s = rpoly([[-0.45, 0], [0.45, 0], [0.47, 0.95], [0.25, 1.22], [-0.1, 1.22], [-0.45, 0.95]], [0.12, 0.12, 0.15, 0.12, 0.12, 0.15]);
  s.holes.push(rpoly([[0.1, 0.78], [0.32, 0.78], [0.32, 0.92], [0.2, 1.06], [0.1, 1.06]], 0.06, new THREE.Path()));
  const tex = ctex(512, 380, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = hex(mix(c, '#ffffff', 0.6)); const r = rng(4); for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 30, 0, TAU); g.fill(); }
    txt(g, label, w / 2, h * 0.45, 110, hex(hsl(c, 0, 0, -0.25)), { weight: 900, maxW: w * 0.85 });
    txt(g, 'LAUNDRY · 洗たく用洗剤', w / 2, h * 0.72, 32, DARK, { weight: 700 });
  });
  return G([
    M(ext(s, 0.48, { bevel: 0.1, seg: 6 }), mat.gloss(c, { roughness: 0.2 })),
    M(new THREE.PlaneGeometry(0.72, 0.52), mat.satin('#ffffff', { map: tex }), [0, 0.42, 0.342]),
    M(cyl(0.15, 0.15, 0.2, 48), mat.gloss('#ffffff'), [-0.24, 1.36, 0]),
  ]);
}, { yaw: -0.4 });

reg('toothbrush', ({ c = '#7bdff2', c2 = '#ff8fab' }) => {
  const brush = (col) => {
    const tufts = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) tufts.push({ p: [(i - 1) * 0.04, 1.36 + j * 0.045, 0.07], r: [PI / 2, 0, 0] });
    const tg = scatter(cyl(0.017, 0.017, 0.12, 8), tufts);
    vcolor(tg, (v) => (v.y > 1.48 ? col : '#ffffff'));
    return G([
      M(tube([[0, 0, 0], [0, 0.6, 0.02], [0, 1.15, 0], [0, 1.3, -0.02]], 0.055, 48, 16), mat.gloss('#ffffff')),
      M(cap(0.06, 0.4, 8, 16), mat.gloss(col), [0, 0.5, 0.01]),
      M(rbox(0.14, 0.4, 0.07, 0.035, 3), mat.gloss('#ffffff'), [0, 1.48, 0]),
      M(tg, mat.satin('#ffffff', { vertexColors: true, roughness: 0.6 })),
    ]);
  };
  return G([
    M(lathe([[0, 0], [0.3, 0], [0.33, 0.03], [0.36, 0.65], [0.35, 0.68], [0.33, 0.67], [0.3, 0.06], [0, 0.06]], { n: 120 }), mat.gloss(mix(c, '#ffffff', 0.3), { roughness: 0.15 })),
    G([brush(c)], [-0.07, 0.12, 0], [0, 0.3, 0.2]),
    G([brush(c2)], [0.08, 0.12, -0.04], [0, -0.4, -0.2]),
  ]);
}, { yaw: 0.2 });

reg('sponge', ({ c = '#ffd23f', c2 = '#4caf50' }) => G([
  M(pebble(1.0, 0.36, 0.64, 0.22, 0.3), mat.matte(c, { roughness: 0.95, bumpMap: noiseTex(256, 2, 1800, 4), bumpScale: 0.9 }), [0, 0.18, 0]),
  M(pebble(1.0, 0.13, 0.64, 0.22, 0.4), mat.matte(c2, { roughness: 1, bumpMap: noiseTex(256, 3, 2600, 2), bumpScale: 1.4 }), [0, 0.42, 0]),
  M(scatter(sph(1, 32, 24), [[0.3, 0.68, 0.1, 0.12], [0.5, 0.8, -0.1, 0.08], [0.15, 0.85, -0.15, 0.06], [-0.3, 0.6, 0.2, 0.09], [0.45, 0.58, 0.25, 0.07]].map(([x, y, z, s]) => ({ p: [x, y, z], s }))), mat.bubble()),
]), { yaw: -0.4, elev: 0.38 });

reg('soap', ({ c = '#b8f2e6', c2 = '#ffd6e0' }) => G([
  M(pebble(0.95, 0.36, 0.62, 0.42, 0.55), mat.satin(c, { roughness: 0.35, clearcoat: 0.6 }), [0, 0.18, 0]),
  M(pebble(0.7, 0.28, 0.46, 0.42, 0.55), mat.satin(c2, { roughness: 0.35, clearcoat: 0.6 }), [0.05, 0.5, -0.02], [0, 0.4, 0.06]),
  M(scatter(sph(1, 32, 24), [[0.45, 0.75, 0.2, 0.13], [0.6, 0.95, 0, 0.08], [0.3, 1.0, 0.1, 0.06], [-0.4, 0.55, 0.3, 0.1], [-0.25, 0.85, 0.05, 0.07]].map(([x, y, z, s]) => ({ p: [x, y, z], s }))), mat.bubble()),
]), { yaw: -0.3 });

reg('umbrella', ({ c = '#ff5a5f', c2 = '#ffffff' }) => {
  const can = lathe([[0.98, 0.78], [0.92, 0.86], [0.7, 1.06], [0.35, 1.24], [0, 1.3]], { segs: 160 });
  deform(can, (v) => {
    const th = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z), f = Math.abs(Math.sin(th * 4));
    const k = smooth(0.55, 0.98, r); v.y += 0.12 * f * k; const nr = r * (1 - 0.05 * f * k) + 0.03 * f * (1 - k) * Math.min(1, r * 3);
    if (r > 1e-5) { v.x *= nr / r; v.z *= nr / r; }
  });
  const nonIdx = can.toNonIndexed(); const pos = nonIdx.attributes.position, cols = new Float32Array(pos.count * 3);
  const A = new THREE.Color(c), B = new THREE.Color(c2);
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const seg = Math.floor(((Math.atan2(z, x) + PI) / TAU) * 8 + 0.5) % 2, col = seg ? A : B;
    for (let k = 0; k < 3; k++) cols.set([col.r, col.g, col.b], (i + k) * 3);
  }
  nonIdx.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const hook = tor(0.13, 0.045, 12, 32, PI); hook.rotateZ(PI);
  return G([
    M(nonIdx, mat.gloss('#ffffff', { vertexColors: true, roughness: 0.3, side: THREE.DoubleSide })),
    M(cyl(0.022, 0.022, 1.6, 12), mat.metal(SILVER), [0, 0.5, 0]),
    M(lathe([[0, 0], [0.04, 0], [0, 0.12]]), mat.gloss(c), [0, 1.3, 0]),
    M(cyl(0.05, 0.05, 0.32, 16), mat.gloss(DARK, { roughness: 0.3 }), [0, -0.12, 0]),
    M(hook, mat.gloss(DARK, { roughness: 0.3 }), [0.13, -0.28, 0]),
  ], null, [0, 0, 0.25]);
}, { elev: 0.35 });

reg('tumbler', ({ c = '#90be6d', c2 = '#f6f6f8' }) => G([
  M(lathe([[0, 0], [0.29, 0], [0.32, 0.03], [0.33, 0.1], [0.34, 0.95], [0.33, 0.99], [0, 1.0]]), mat.satin(c, { roughness: 0.55, clearcoat: 0.3 })),
  M(cyl(0.342, 0.342, 0.06, 64), mat.metal(SILVER, 0.18), [0, 0.98, 0]),
  M(lathe([[0, 1.0], [0.335, 1.0], [0.345, 1.04], [0.335, 1.18], [0.3, 1.22], [0, 1.23]]), mat.gloss(c2, { roughness: 0.25 })),
  M(tor(0.11, 0.03, 10, 32, PI), mat.gloss(c2, { roughness: 0.25 }), [0, 1.22, 0]),
]));

reg('tissue', ({ c = '#ffd6a5', c2 = '#ff8fab' }) => {
  const tex = ctex(512, 512, (g, w, h) => { g.fillStyle = hex(c); g.fillRect(0, 0, w, h); g.fillStyle = hex(c2); for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) { g.beginPath(); g.arc(x * 90 + (y % 2) * 45 + 20, y * 90 + 30, 14, 0, TAU); g.fill(); } });
  const sheet = new THREE.PlaneGeometry(0.6, 0.55, 30, 30);
  deform(sheet, (v) => {
    const t = (v.y + 0.275) / 0.55, x = v.x * (0.3 + 0.7 * t);
    v.set(x, t * 0.42 - 0.1 * (Math.abs(v.x) / 0.3) ** 2 * t, 0.07 * Math.sin(v.x * 9 + t * 3) * t + 0.05 * Math.sin(t * 5));
  });
  return G([
    M(rbox(1.25, 0.44, 0.7, 0.05, 3), mat.satin('#ffffff', { map: tex, roughness: 0.6 }), [0, 0.22, 0]),
    M(cyl(1, 1, 0.01, 40), mat.matte('#f3f3f3'), [0, 0.445, 0], null, [0.42, 1, 0.1]),
    M(sheet, mat.soft('#ffffff', { side: THREE.DoubleSide, roughness: 1 }), [0, 0.44, 0]),
  ]);
}, { yaw: -0.4, elev: 0.35 });

/* ================= HOBBY & SPORTS ================= */
reg('duck', ({ c = '#ffd23f' }) => {
  const body = sph(0.5, 64, 48);
  deform(body, (v) => { v.set(v.x * 1.2, v.y * 0.78, v.z * 0.95); if (v.x < -0.3) v.y += (-v.x - 0.3) ** 2 * 1.4; if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.4; });
  const m = mat.gloss(c, { roughness: 0.28, clearcoat: 0.9 }), beak = mat.gloss('#ff8a00', { roughness: 0.3 });
  const eye = (s) => G([M(sph(0.055, 24, 16), mat.gloss('#1b1b1f', { roughness: 0.1 })), M(sph(0.016, 8, 6), mat.matte('#ffffff'), [0.02, 0.025, 0.04])], [0.52, 1.02, s * 0.17], [0, s * -0.6, 0]);
  return G([
    M(body, m, [0, 0.4, 0]),
    M(sph(0.34, 48, 32), m, [0.32, 0.92, 0]),
    M(sph(0.17, 32, 16), beak, [0.62, 0.86, 0], null, [1.15, 0.42, 0.9]),
    M(sph(0.13, 32, 16), beak, [0.58, 0.8, 0], null, [1.1, 0.3, 0.8]),
    eye(1), eye(-1),
    M(sph(0.25, 32, 16), mat.gloss(hsl(c, -0.02, 0, -0.05), { roughness: 0.28 }), [-0.08, 0.5, 0.43], [0, 0, 0.3], [1.1, 0.6, 0.35]),
    M(sph(0.25, 32, 16), mat.gloss(hsl(c, -0.02, 0, -0.05), { roughness: 0.28 }), [-0.08, 0.5, -0.43], [0, 0, 0.3], [1.1, 0.6, 0.35]),
  ]);
}, { yaw: -0.75 });

reg('blocks', ({ c = '#ff5d73' }) => {
  const col = (d) => hsl(c, d, 0, 0);
  const wood = (cc) => mat.satin(cc, { roughness: 0.4, clearcoat: 0.4 });
  const arch = new THREE.Shape(); arch.moveTo(-0.4, 0); arch.lineTo(-0.2, 0); arch.absarc(0, 0, 0.2, PI, 0, true); arch.lineTo(0.4, 0); arch.lineTo(0.4, 0.42); arch.lineTo(-0.4, 0.42); arch.closePath();
  const triS = rpoly([[-0.3, 0], [0.3, 0], [0, 0.32]], 0.02);
  return G([
    M(rbox(0.5, 0.5, 0.5, 0.04, 3), wood(col(0)), [-0.5, 0.25, 0]),
    M(cyl(0.2, 0.2, 0.5, 48), wood(col(0.15)), [-0.5, 0.75, 0]),
    M(ext(arch, 0.32, { bevel: 0.02, seg: 2, soft: false }), wood(col(0.33)), [0.4, 0, -0.1]),
    M(ext(triS, 0.3, { bevel: 0.02, seg: 2, soft: false }), wood(col(0.5)), [0.4, 0.44, -0.1]),
    M(rbox(0.36, 0.36, 0.36, 0.03, 3), wood(col(0.66)), [0.0, 0.18, 0.5], [0, 0.4, 0]),
    M(sph(0.16, 32, 24), wood(col(0.82)), [0.55, 0.16, 0.5]),
  ]);
}, { yaw: -0.3 });

reg('beachball', ({ c = '#ff4d6d' }) => {
  const g = sph(0.6, 96, 64).toNonIndexed(); const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
  const palette = [c, '#ffffff', hex(hsl(c, 0.15, 0, 0.05)), '#ffffff', hex(hsl(c, 0.55, 0, 0)), '#ffffff'].map((x) => new THREE.Color(x));
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const col = Math.abs(y) > 0.54 ? palette[1] : palette[Math.floor(((Math.atan2(z, x) + PI) / TAU) * 6) % 6];
    for (let k = 0; k < 3; k++) cols.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return G([M(g, mat.gloss('#ffffff', { vertexColors: true, roughness: 0.2 }), [0, 0.6, 0], [0.5, 0, 0.35])]);
});

reg('dumbbell', ({ c = '#ff5d73' }) => {
  const hexG = ext(rpoly(ngon(6, 0.3), 0.06), 0.24, { bevel: 0.04, seg: 3 }); hexG.rotateY(PI / 2);
  const one = (p, r) => G([
    M(cyl(0.05, 0.05, 0.75, 24), mat.metal('#c8ccd4', 0.35), [0, 0, 0], [0, 0, PI / 2]),
    M(hexG, mat.gloss(c, { roughness: 0.4 }), [-0.33, 0, 0]), M(hexG, mat.gloss(c, { roughness: 0.4 }), [0.33, 0, 0]),
    M(cyl(0.085, 0.085, 0.05, 24), mat.metal(SILVER, 0.2), [-0.19, 0, 0], [0, 0, PI / 2]), M(cyl(0.085, 0.085, 0.05, 24), mat.metal(SILVER, 0.2), [0.19, 0, 0], [0, 0, PI / 2]),
  ], p, r);
  return G([one([0, 0.27, 0.3], [0, 0.15, 0]), one([0.05, 0.27, -0.35], [0, -0.25, 0]), one([0.0, 0.8, -0.02], [0, 0.05, 0])]);
}, { yaw: -0.4, elev: 0.35 });

reg('skateboard', ({ c = '#7c5cff', c2 = '#ffd23f' }) => {
  const deck = ext(rpoly([[-0.24, -0.92], [0.24, -0.92], [0.24, 0.92], [-0.24, 0.92]], 0.235), 0.035, { bevel: 0.012, seg: 2 }); deck.rotateX(-PI / 2);
  const bend = (v) => { const z = Math.abs(v.z); if (z > 0.6) v.y += ((z - 0.6) / 0.32) ** 2 * 0.14; v.y += 0.02 * (v.x / 0.24) ** 2; };
  deform(deck, bend);
  const stripe = rbox(0.5, 0.01, 0.12, 0.005, 1); deform(stripe, bend, false);
  const wheel = (x, z) => M(cyl(0.085, 0.085, 0.075, 32), mat.gloss(c2, { roughness: 0.3 }), [x, -0.13, z], [0, 0, PI / 2]);
  const truck = (z) => G([
    M(rbox(0.2, 0.035, 0.14, 0.01, 2), mat.metal(SILVER), [0, -0.035, z]),
    M(rbox(0.5, 0.06, 0.08, 0.025, 2), mat.metal(SILVER, 0.25), [0, -0.09, z]),
    wheel(-0.27, z), wheel(0.27, z),
  ]);
  return G([
    M(deck, mat.gloss(c, { roughness: 0.25 })),
    M(stripe, mat.gloss(c2), [0, -0.022, 0.25]), M(stripe, mat.gloss('#ffffff'), [0, -0.022, -0.05]),
    truck(0.55), truck(-0.55),
  ], [0, 0.3, 0], [PI + 0.6, 0.0, 0]);
}, { yaw: -0.75, elev: 0.3 });

reg('teddy', ({ c = '#c98a5a', c2 = '#ff4d6d' }) => {
  const m = fabric(c), lt = fabric(mix(c, '#fff3e6', 0.55)), dk = mat.gloss('#2a2020', { roughness: 0.12 });
  const ear = (s) => G([M(sph(0.14, 32, 16), m, null, null, [1, 1, 0.6]), M(sph(0.08, 24, 12), lt, [0, -0.01, 0.06], null, [1, 1, 0.4])], [s * 0.28, 1.52, -0.02]);
  return G([
    M(sph(0.42, 48, 32), m, [0, 0.55, 0], null, [1, 1.1, 0.9]),
    M(sph(0.3, 32, 24), lt, [0, 0.5, 0.22], null, [1, 1.1, 0.5]),
    M(sph(0.38, 48, 32), m, [0, 1.22, 0.02]),
    M(sph(0.16, 32, 24), lt, [0, 1.12, 0.33], null, [1.1, 0.85, 0.8]),
    M(sph(0.055, 16, 12), dk, [0, 1.18, 0.45], null, [1.3, 0.9, 0.9]),
    M(sph(0.045, 16, 12), dk, [-0.14, 1.3, 0.33]), M(sph(0.045, 16, 12), dk, [0.14, 1.3, 0.33]),
    ear(-1), ear(1),
    M(cap(0.12, 0.3, 8, 24), m, [-0.42, 0.68, 0.08], [0.2, 0, 0.6]), M(cap(0.12, 0.3, 8, 24), m, [0.42, 0.68, 0.08], [0.2, 0, -0.6]),
    M(cap(0.15, 0.2, 8, 24), m, [-0.22, 0.2, 0.22], [PI / 2, 0, 0]), M(cap(0.15, 0.2, 8, 24), m, [0.22, 0.2, 0.22], [PI / 2, 0, 0]),
    M(sph(0.12, 24, 16), lt, [-0.22, 0.2, 0.4], null, [1, 1, 0.35]), M(sph(0.12, 24, 16), lt, [0.22, 0.2, 0.4], null, [1, 1, 0.35]),
    M(new THREE.ConeGeometry(0.1, 0.18, 24), mat.satin(c2), [-0.09, 0.9, 0.3], [0, 0, PI / 2]),
    M(new THREE.ConeGeometry(0.1, 0.18, 24), mat.satin(c2), [0.09, 0.9, 0.3], [0, 0, -PI / 2]),
    M(sph(0.05, 16, 12), mat.satin(c2), [0, 0.9, 0.32]),
  ]);
}, { yaw: -0.3 });

reg('ukulele', ({ c = '#d9a066', c2 = '#ffffff' }) => {
  const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
  const circ = (y, cy, r) => Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  const right = [];
  for (let i = 0; i <= 40; i++) { const y = -0.48 + (i / 40) * 1.08; right.push(new THREE.Vector2(Math.max(0.001, smax(circ(y, -0.08, 0.4), circ(y, 0.36, 0.29), 0.12)), y)); }
  const outline = new THREE.Shape(); outline.moveTo(0, -0.48);
  outline.splineThru(right.slice(1)); outline.splineThru(right.slice().reverse().map((p) => new THREE.Vector2(-p.x, p.y)).slice(1));
  const body = ext(outline, 0.2, { bevel: 0.03, seg: 3, curve: 64 });
  const dark = mat.satin('#3a2a22', { roughness: 0.5 });
  const frets = Array.from({ length: 8 }, (_, i) => ({ p: [0, 0.7 + i * 0.095, 0.085] }));
  const strings = [-0.045, -0.015, 0.015, 0.045].map((x) => ({ p: [x, 0.66, 0.125], r: [0.04, 0, 0] }));
  return G([
    M(body, mat.gloss(c, { roughness: 0.3 })),
    M(cyl(0.1, 0.1, 0.012, 48), mat.matte('#1d140f'), [0, 0.32, 0.13], [PI / 2, 0, 0]),
    M(tor(0.115, 0.01, 8, 48), mat.gloss(c2), [0, 0.32, 0.132]),
    M(rbox(0.3, 0.06, 0.04, 0.015, 2), dark, [0, -0.22, 0.14]),
    M(rbox(0.14, 0.95, 0.08, 0.03, 2), mat.satin('#b07a48'), [0, 1.05, 0.02]),
    M(rbox(0.13, 0.82, 0.02, 0.008, 1), dark, [0, 1.02, 0.065]),
    M(scatter(rbox(0.13, 0.008, 0.012, 0.003, 1), frets), mat.metal(SILVER)),
    M(rbox(0.22, 0.3, 0.06, 0.05, 3), mat.gloss(c, { roughness: 0.3 }), [0, 1.65, 0]),
    M(scatter(cyl(0.025, 0.025, 0.08, 12), [[-0.13, 1.58], [0.13, 1.58], [-0.13, 1.72], [0.13, 1.72]].map(([x, y]) => ({ p: [x, y, 0], r: [0, 0, PI / 2] }))), mat.gloss(c2)),
    M(scatter(cyl(0.004, 0.004, 1.84, 4), strings), mat.matte('#ffffff')),
  ], [0, 0.6, 0], [-0.15, 0, -0.42]);
}, { yaw: -0.25, elev: 0.25 });

reg('dice', ({ c = '#ff4d6d', c2 }) => {
  const die = (col) => {
    const pip = sph(0.055, 16, 12), s = 0.3, o = 0.165, layout = {
      1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
    };
    const faces = [[1, [0, 0, 1]], [6, [0, 0, -1]], [5, [0, 1, 0]], [2, [0, -1, 0]], [3, [1, 0, 0]], [4, [-1, 0, 0]]];
    const items = [];
    for (const [n, nrm] of faces) for (const [u, w] of layout[n]) {
      const p = nrm[2] ? [u * o, w * o, nrm[2] * s] : nrm[1] ? [u * o, nrm[1] * s, w * o] : [nrm[0] * s, u * o, w * o];
      items.push({ p, n: nrm, s: [1, 1, 0.35] });
    }
    const pipC = lum(col) > 0.6 ? DARK : '#ffffff';
    return G([M(rbox(0.6, 0.6, 0.6, 0.11, 6), mat.gloss(col, { roughness: 0.15, clearcoat: 1 })), M(scatter(pip, items), mat.gloss(pipC))]);
  };
  return G([G([die(c)], [-0.36, 0.3, 0], [0, 0.35, 0]), G([die(c2 || hsl(c, 0.5, 0, 0))], [0.42, 0.3, 0.3], [0, -0.55, 0])]);
}, { elev: 0.45 });

/* ================= APP OBJECTS ================= */
reg('box', () => {
  const lbl = ctex(512, 320, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    txt(g, 'dopa', w * 0.36, h * 0.36, 110, '#17161c', { weight: 900 });
    g.fillStyle = '#ff2d6f'; g.beginPath(); g.arc(w * 0.66, h * 0.43, 16, 0, TAU); g.fill();
    for (let i = 0; i < 38; i++) { g.fillStyle = '#17161c'; g.fillRect(40 + i * 11, h * 0.62, i % 3 ? 4 : 7, h * 0.24); }
  });
  const kraft = mat.matte('#cf9a5f', { roughness: 0.8 }), tape = mat.satin('#e8d7aa', { roughness: 0.35 });
  return G([
    M(rbox(1.2, 0.85, 0.9, 0.03, 3), kraft, [0, 0.425, 0]),
    M(rbox(1.21, 0.004, 0.012, 0.002, 1), mat.matte('#9c6e3f'), [0, 0.851, 0]),
    M(rbox(0.24, 0.012, 0.92, 0.004, 1), tape, [0, 0.851, 0]),
    M(rbox(0.24, 0.3, 0.012, 0.004, 1), tape, [0, 0.71, 0.452]),
    M(new THREE.PlaneGeometry(0.42, 0.26), mat.satin('#ffffff', { map: lbl }), [0.3, 0.32, 0.452]),
  ]);
}, { yaw: -0.5, elev: 0.38 });

reg('capsule', ({ c = '#ff4d6d' }) => G([
  M(sph(0.5, 64, 32, 0, TAU, PI / 2, PI / 2), mat.gloss(c, { roughness: 0.18, clearcoat: 1 })),
  M(sph(0.5, 64, 32, 0, TAU, 0, PI / 2), mat.gloss(mix(c, '#ffffff', 0.78), { roughness: 0.08, clearcoat: 1 })),
  M(tor(0.5, 0.035, 12, 96), mat.gloss('#ffffff'), [0, 0, 0], [PI / 2, 0, 0]),
  M(ext(rpoly(starPts(5, 0.2, 0.09), 0.03), 0.06, { bevel: 0.03, seg: 3 }), mat.gloss('#ffd23f', { roughness: 0.2 }), [0, 0.18, 0.12], [-0.3, 0, 0]),
], [0, 0.5, 0]), { elev: 0.25, yaw: -0.2 });

reg('bag', ({ c = '#ff2d6f', c2 = '#ffffff' }) => G([
  M(rbox(0.95, 1.0, 0.45, 0.06, 4), mat.gloss(c, { roughness: 0.3 }), [0, 0.5, 0]),
  M(tor(0.2, 0.035, 12, 40, PI), mat.gloss(c2), [0, 1.0, 0.1]), M(tor(0.2, 0.035, 12, 40, PI), mat.gloss(c2), [0, 1.0, -0.1]),
  M(cyl(0.16, 0.16, 0.02, 48), mat.gloss(c2), [0, 0.5, 0.23], [PI / 2, 0, 0]),
  M(ext(rpoly(starPts(5, 0.1, 0.045), 0.015), 0.02, { bevel: 0.012, seg: 2 }), mat.gloss(c), [0, 0.5, 0.25]),
]), { yaw: -0.45 });

/* ---------------- public builder ---------------- */
export function buildModel(key, variant = {}) {
  const def = MODELS[key];
  if (!def) throw new Error('unknown model ' + key);
  const obj = def.build(variant);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}
export function modelView(key) { const d = MODELS[key] || {}; return { yaw: d.yaw ?? -0.45, elev: d.elev ?? 0.32 }; }
