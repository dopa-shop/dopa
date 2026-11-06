// dopa — 3D studio: one offscreen renderer bakes product "photos" (thumbnails),
// one live renderer shows a spinning, touchable model in the hero and product sheet.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { buildModel, modelView } from './models.js';

const TAU = Math.PI * 2;

function makeRenderer(canvas, preserve) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

function radialAlpha() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
        m.dispose();
      });
    }
  });
}

class Studio {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
    this.buildEnv();

    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(2.6, 5.2, 3.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera; sc.left = sc.bottom = -2; sc.right = sc.top = 2; sc.near = 0.5; sc.far = 14;
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.025;
    key.target.position.set(0, 0.6, 0);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(-3.5, 2.6, -3.2);
    this.scene.add(key, key.target, rim, new THREE.HemisphereLight(0xffffff, 0x9a98a8, 0.35));

    this.groundMat = new THREE.ShadowMaterial({ opacity: 0.16, color: 0x000000 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.groundMat);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.contactMat = new THREE.MeshBasicMaterial({ map: radialAlpha(), transparent: true, depthWrite: false, color: 0x000000, opacity: 0.32 });
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.contactMat);
    this.contact.rotation.x = -Math.PI / 2; this.contact.position.y = 0.002;
    this.scene.add(ground, this.contact);

    this.pivot = new THREE.Group();   // yaw + squash live here
    this.scene.add(this.pivot);
    this.model = null;
    this.size = new THREE.Vector3(1, 1, 1);

    // Backdrop: a screen-space quad drawn without tone mapping, so its edge color
    // matches the CSS around the canvas exactly (and glass still refracts it).
    this.bgCanvas = document.createElement('canvas'); this.bgCanvas.width = this.bgCanvas.height = 256;
    this.bgTex = new THREE.CanvasTexture(this.bgCanvas); this.bgTex.colorSpace = THREE.SRGBColorSpace;
    this.bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { map: { value: this.bgTex } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv;\nvoid main(){\ngl_FragColor = texture2D(map, vUv);\n#include <colorspace_fragment>\n}',
      depthTest: false, depthWrite: false, toneMapped: false,
    }));
    this.bgMesh.frustumCulled = false; this.bgMesh.renderOrder = -10; this.bgMesh.visible = false;
    this.scene.add(this.bgMesh);
  }
  buildEnv() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    if (this.env) this.env.dispose();
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.95;
  }
  setBackground(bg) {
    if (!bg) { this.bgMesh.visible = false; this.groundMat.color.set(0x000000); this.contactMat.color.set(0x000000); this.groundMat.opacity = 0.08; return; }
    this.groundMat.opacity = 0.16;
    const [c1, c2] = bg, g = this.bgCanvas.getContext('2d');
    // reaches c2 before any canvas edge, so the bottom edge blends into a flat CSS c2
    const grd = g.createRadialGradient(128, 104, 8, 128, 112, 140);
    grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    this.bgTex.needsUpdate = true;
    this.bgMesh.visible = true;
    // tint shadows with the backdrop hue so they read as colored light, not grey smudges
    const sh = new THREE.Color(c2).offsetHSL(0, 0.1, -0.45);
    this.groundMat.color.copy(sh); this.contactMat.color.copy(sh);
  }
  setModel(obj) {
    this.clearModel();
    const inner = new THREE.Group(); inner.add(obj);
    const box = new THREE.Box3().setFromObject(obj, true);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z);
    inner.scale.setScalar(s);
    inner.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    this.size.copy(size).multiplyScalar(s);
    this.pivot.add(inner);
    this.model = inner;
    const foot = Math.max(this.size.x, this.size.z);
    this.contact.scale.set(foot * 1.25, foot * 1.25, 1);
  }
  clearModel() {
    if (!this.model) return;
    this.pivot.remove(this.model); disposeTree(this.model); this.model = null;
  }
  // Fit camera so every corner of the model's box (optionally swept through all yaws) is in view.
  frame(aspect, margin, elev, sweep = false) {
    const cam = this.camera; cam.aspect = aspect; cam.updateProjectionMatrix();
    const h = this.size, c = new THREE.Vector3(0, h.y / 2, 0);
    const dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev));
    const fwd = dir.clone().negate(), right = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3().crossVectors(right, fwd);
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), tanH = tanV * aspect;
    const yaws = sweep ? Array.from({ length: 16 }, (_, i) => (i / 16) * TAU) : [this.pivot.rotation.y];
    let d = 0;
    const p = new THREE.Vector3();
    for (const yaw of yaws) {
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
        const x0 = (sx * h.x) / 2, z0 = (sz * h.z) / 2;
        p.set(x0 * cs + z0 * sn, sy * h.y, -x0 * sn + z0 * cs).sub(c);
        const x = p.dot(right), y = p.dot(up), z = p.dot(dir);
        d = Math.max(d, z + Math.abs(x) / (tanH * margin), z + Math.abs(y) / (tanV * margin));
      }
    }
    cam.position.copy(c).addScaledVector(dir, d);
    cam.lookAt(c);
  }
}

/* ---------------- thumbnails ---------------- */
export class ThumbFactory {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.renderer = makeRenderer(this.canvas, true);
    this.renderer.setPixelRatio(1);
    this.studio = new Studio(this.renderer);
    this.cache = new Map();   // key -> Promise<url>
    this.hi = []; this.lo = []; // {key, spec, resolve}: visible first, prefetch later
    this.busy = false;
    this.canvas.addEventListener('webglcontextrestored', () => this.studio.buildEnv());
  }
  get(key, spec, urgent = false) {
    if (this.cache.has(key)) {
      if (urgent) { const i = this.lo.findIndex((j) => j.key === key); if (i >= 0) this.hi.push(this.lo.splice(i, 1)[0]); }
      return this.cache.get(key);
    }
    let resolve; const p = new Promise((r) => (resolve = r));
    this.cache.set(key, p);
    (urgent ? this.hi : this.lo).push({ key, spec, resolve });
    this.pump();
    return p;
  }
  clear() {
    for (const p of this.cache.values()) p.then((u) => u && URL.revokeObjectURL(u));
    this.cache.clear(); this.hi.length = 0; this.lo.length = 0;
  }
  pump() {
    if (this.busy || !(this.hi.length || this.lo.length)) return;
    this.busy = true;
    const next = () => requestAnimationFrame(async () => {
      const job = this.hi.shift() || this.lo.shift();
      if (job) {
        try { job.resolve(await this.render(job.spec)); } catch (e) { console.warn('thumb failed', job.key, e); job.resolve(''); }
      }
      if (this.hi.length || this.lo.length) next(); else this.busy = false;
    });
    next();
  }
  async render({ model, variant, size = 512, bg = null, margin = 0.8, format }) {
    const st = this.studio, view = modelView(model);
    st.setModel(buildModel(model, variant));
    st.pivot.rotation.set(0, view.yaw, 0); st.pivot.scale.setScalar(1);
    st.setBackground(bg);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(size, size, false);
    st.frame(1, margin, view.elev);
    this.renderer.render(st.scene, st.camera);
    const blob = await new Promise((res) => this.canvas.toBlob(res, format || (bg ? 'image/jpeg' : 'image/png'), 0.9));
    st.clearModel();
    return blob ? URL.createObjectURL(blob) : '';
  }
}

/* ---------------- live viewer ---------------- */
export class LiveViewer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'live-canvas';
    this.renderer = makeRenderer(this.canvas, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.studio = new Studio(this.renderer);
    this.yaw = 0; this.vel = 0; this.baseYaw = 0;
    this.squash = 1; this.squashV = 0;   // spring for squash & stretch
    this.grow = 1; this.growV = 0;       // spring for pop-in
    this.idleAt = 0; this.running = false; this.host = null; this.onTap = null;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ro = new ResizeObserver(() => this.resize());
    this.bindPointer();
    this.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    this.canvas.addEventListener('webglcontextrestored', () => { this.studio.buildEnv(); if (this.spec) this.show(this.spec, 'none'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); else if (this.host) this.start(); });
  }
  bindPointer() {
    let down = null;
    this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, moved: false }; });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.lx; down.lx = e.clientX;
      if (Math.abs(e.clientX - down.x) > 6) down.moved = true;
      if (down.moved) { this.yaw += dx * 0.012; this.vel = dx * 0.012 * 60; this.idleAt = performance.now() + 2200; }
    });
    const up = (e) => {
      if (!down) return;
      const tap = !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 350;
      down = null;
      if (tap) { this.bounce(); this.onTap && this.onTap(); }
    };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', () => (down = null));
  }
  mount(host, onTap) {
    if (this.host === host) { this.onTap = onTap; return; }
    this.host = host; this.onTap = onTap;
    host.appendChild(this.canvas);
    this.ro.disconnect(); this.ro.observe(host);
    this.resize(); this.start();
  }
  unmount() { this.stop(); this.ro.disconnect(); this.canvas.remove(); this.host = null; }
  resize() {
    if (!this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    if (this.spec) this.studio.frame(this.aspect, this.spec.margin ?? 0.82, modelView(this.spec.model).elev, true);
  }
  show(spec, anim = 'pop') {
    const same = this.spec && this.spec.model === spec.model;
    this.spec = spec;
    const st = this.studio, view = modelView(spec.model);
    st.setModel(buildModel(spec.model, spec.variant));
    st.setBackground(spec.bg);
    if (!same) { this.yaw = view.yaw; this.vel = 0; }
    st.frame(this.aspect || 1, spec.margin ?? 0.82, view.elev, true);
    if (this.reduced) anim = 'none';
    if (anim === 'pop') { this.grow = 0.35; this.growV = 0; this.vel += 9; }
    if (anim === 'swap') { this.squashV -= 7; this.vel += 6; }
    this.canvas.classList.add('ready');
    this.render();
  }
  bounce() { if (!this.reduced) { this.squashV -= 9; this.vel += 4; } }
  start() { if (this.running || !this.host) return; this.running = true; this.last = performance.now(); const loop = (t) => { if (!this.running) return; this.tick(t); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  tick(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    // yaw: inertia + gentle auto-spin when idle
    const auto = this.reduced ? 0 : 0.45;
    if (t > this.idleAt) this.vel += (auto - this.vel) * Math.min(1, dt * 1.6);
    else this.vel *= Math.pow(0.04, dt);
    this.yaw += this.vel * dt;
    // springs
    const k = 220, damp = 11;
    this.squashV += (-(this.squash - 1) * k - this.squashV * damp) * dt; this.squash += this.squashV * dt;
    this.growV += (-(this.grow - 1) * 160 - this.growV * 13) * dt; this.grow += this.growV * dt;
    const s = Math.max(0.6, this.squash), xz = 1 / Math.sqrt(s);
    const pv = this.studio.pivot;
    pv.rotation.y = this.yaw;
    pv.scale.set(xz * this.grow, s * this.grow, xz * this.grow);
    this.render();
  }
  render() { if (this.studio.model) this.renderer.render(this.studio.scene, this.studio.camera); }
}
