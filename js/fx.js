// dopa — feedback: synthesized sounds, haptics, confetti, fly-to-cart, number tweens.
export const fxSettings = { sound: true, haptics: true };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- sound (Web Audio, no files) ---------------- */
let ac = null, master = null;
function ctx() {
  if (!fxSettings.sound) return null;
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    // "ambient" respects the iPhone's silent switch
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* unsupported */ }
    ac = new C(); master = ac.createGain(); master.gain.value = 0.55;
    const comp = ac.createDynamicsCompressor(); master.connect(comp).connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone({ f = 440, f2 = 0, t = 0, d = 0.12, type = 'sine', g = 0.25, a = 0.006 }) {
  const c = ctx(); if (!c) return;
  const t0 = c.currentTime + t, o = c.createOscillator(), gn = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d * 0.9);
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + a); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(gn).connect(master); o.start(t0); o.stop(t0 + d + 0.03);
}
function noise({ t = 0, d = 0.25, g = 0.12, f = 1200, f2 = 5000, q = 1.2 }) {
  const c = ctx(); if (!c) return;
  const len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), bp = c.createBiquadFilter(), gn = c.createGain(), t0 = c.currentTime + t;
  src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f, t0); bp.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + d * 0.3); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(bp).connect(gn).connect(master); src.start(t0); src.stop(t0 + d + 0.02);
}
const sparkle = (t0 = 0, n = 8) => { for (let i = 0; i < n; i++) tone({ f: 2200 + Math.random() * 2600, t: t0 + i * 0.045, d: 0.14, g: 0.045 }); };
export const sfx = {
  tap: () => tone({ f: 1100, d: 0.035, type: 'triangle', g: 0.06 }),
  blip: () => tone({ f: 660, f2: 990, d: 0.08, g: 0.14 }),
  pop: () => { tone({ f: 320, f2: 820, d: 0.09, g: 0.26 }); tone({ f: 1250, t: 0.06, d: 0.14, type: 'triangle', g: 0.08 }); },
  add: () => { tone({ f: 523, f2: 1046, d: 0.1, g: 0.24 }); tone({ f: 1568, t: 0.09, d: 0.26, type: 'triangle', g: 0.13 }); tone({ f: 2093, t: 0.15, d: 0.32, g: 0.07 }); },
  heart: () => { tone({ f: 587, f2: 880, d: 0.11, g: 0.2 }); tone({ f: 1175, t: 0.08, d: 0.18, type: 'triangle', g: 0.08 }); },
  unheart: () => tone({ f: 600, f2: 380, d: 0.1, g: 0.12 }),
  coin: () => { tone({ f: 988, d: 0.075, type: 'square', g: 0.05 }); tone({ f: 1319, t: 0.07, d: 0.38, type: 'square', g: 0.05 }); },
  tick: () => tone({ f: 1900, d: 0.025, type: 'square', g: 0.025 }),
  thud: () => tone({ f: 150, f2: 60, d: 0.16, g: 0.32 }),
  whoosh: () => noise({ d: 0.35, f: 600, f2: 4200, g: 0.1 }),
  fanfare: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.085, d: 0.24, type: 'triangle', g: 0.18 }));
    [1047, 1319, 1568].forEach((f) => tone({ f, t: 0.36, d: 1.1, type: 'sine', g: 0.1 }));
    sparkle(0.42, 10);
  },
  levelUp: () => { [523, 587, 659, 784, 880, 1047, 1175, 1319].forEach((f, i) => tone({ f, t: i * 0.055, d: 0.16, type: 'square', g: 0.04 })); sparkle(0.48, 8); },
  reveal: (tier = 0) => {
    noise({ d: 0.3, f: 800, f2: 6000, g: 0.08 });
    const base = [523, 587, 659, 784][tier] || 523;
    [1, 1.25, 1.5, 2].forEach((m, i) => tone({ f: base * m, t: 0.12 + i * 0.07, d: 0.5 + tier * 0.2, type: 'triangle', g: 0.14 }));
    sparkle(0.35, 6 + tier * 4);
  },
};
export function unlockAudio() { ctx(); }

/* ---------------- haptics ---------------- */
let hapLabel = null;
export function haptic(kind = 'light') {
  if (!fxSettings.haptics) return;
  if (navigator.vibrate) { navigator.vibrate(kind === 'heavy' ? [16, 40, 22] : kind === 'success' ? [10, 60, 18] : 9); return; }
  // iOS 18+ Safari has no Vibration API, but toggling an <input switch> plays the system haptic.
  try {
    if (!hapLabel) {
      hapLabel = document.createElement('label'); hapLabel.setAttribute('aria-hidden', 'true');
      hapLabel.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0';
      const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
      hapLabel.appendChild(i); document.body.appendChild(hapLabel);
    }
    hapLabel.click();
  } catch { /* no haptics available */ }
}

/* ---------------- confetti ---------------- */
let cv, cx, parts = [], raf = 0;
const COLORS = ['#ff2d6f', '#ffb21e', '#3fcf9a', '#3b9cff', '#9b6bff', '#ff7a59', '#ffffff'];
export function confetti({ x = innerWidth / 2, y = innerHeight * 0.35, n = 110, power = 1, colors = COLORS, spread = Math.PI * 2 } = {}) {
  if (reduced()) n = Math.min(n, 20);
  if (!cv) {
    cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); cx = cv.getContext('2d');
    const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener('resize', fit);
  }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * spread, v = (5 + Math.random() * 9) * power;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, w: 5 + Math.random() * 7, h: 8 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, flip: Math.random() * 6, c: colors[(Math.random() * colors.length) | 0], life: 0, shape: Math.random() < 0.3 ? 1 : 0 });
  }
  if (!raf) raf = requestAnimationFrame(step);
}
function step() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life < 220 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.life++; p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.flip += 0.18;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, Math.cos(p.flip)); cx.globalAlpha = Math.min(1, (220 - p.life) / 40); cx.fillStyle = p.c;
    if (p.shape) { cx.beginPath(); cx.arc(0, 0, p.w * 0.6, 0, Math.PI * 2); cx.fill(); } else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(step) : 0;
  if (!raf) cx.clearRect(0, 0, innerWidth, innerHeight);
}

/* ---------------- fly to cart ---------------- */
export function flyTo(fromEl, toEl, src, done) {
  if (!fromEl || !toEl) { done && done(); return; }
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const size = Math.min(96, Math.max(56, a.width * 0.6));
  const sx = a.left + a.width / 2 - size / 2, sy = a.top + a.height / 2 - size / 2;
  const dx = b.left + b.width / 2 - size / 2 - sx, dy = b.top + b.height / 2 - size / 2 - sy;
  const outer = document.createElement('div'); outer.className = 'fly';
  outer.style.cssText = `left:${sx}px;top:${sy}px;width:${size}px;height:${size}px`;
  const inner = document.createElement('div'); inner.className = 'fly-in';
  inner.innerHTML = src ? `<img src="${src}" alt="">` : '';
  outer.appendChild(inner); document.body.appendChild(outer);
  const dur = reduced() ? 250 : 720;
  outer.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { duration: dur, easing: 'cubic-bezier(.45,0,.75,1)', fill: 'forwards' });
  const anim = inner.animate([
    { transform: 'translateY(0) scale(1) rotate(0)', opacity: 1 },
    { transform: `translateY(${Math.min(-60, dy * 0.15 - 90)}px) scale(.9) rotate(-8deg)`, opacity: 1, offset: 0.35 },
    { transform: `translateY(${dy}px) scale(.22) rotate(10deg)`, opacity: 0.6 },
  ], { duration: dur, easing: 'cubic-bezier(.3,.0,.6,1)', fill: 'forwards' });
  anim.onfinish = () => { outer.remove(); done && done(); };
}

/* ---------------- tweens ---------------- */
export function countUp(el, from, to, dur = 900, fmt = (n) => Math.round(n).toLocaleString('ja-JP')) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
export function bump(el, cls = 'bump') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
