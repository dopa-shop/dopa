// dopa — app state, persisted per device in localStorage.
import { byId, PRODUCTS, CATS } from './catalog.js';

const KEY = 'dopa.state.v1';
export const FREE_SHIP = 3500;
export const SHIP_FEE = 410;
export const DELIVERY_SEC = 40;
export const STAGES = [
  { t: 0, label: '注文確定' },
  { t: 6, label: '発送' },
  { t: 16, label: '配送中' },
  { t: DELIVERY_SEC, label: 'お届け済み' },
];

export const RANKS = [
  { name: 'ブロンズ', en: 'BRONZE', xp: 0, mult: 1, grad: ['#f3c7a2', '#b5764f'] },
  { name: 'シルバー', en: 'SILVER', xp: 200, mult: 1.5, grad: ['#f1f4f8', '#9ea8b8'] },
  { name: 'ゴールド', en: 'GOLD', xp: 800, mult: 2, grad: ['#ffe8a3', '#dc9f1d'] },
  { name: 'プラチナ', en: 'PLATINUM', xp: 2500, mult: 3, grad: ['#e3f6ff', '#8ea6ff'] },
  { name: 'ダイヤモンド', en: 'DIAMOND', xp: 8000, mult: 5, grad: ['#ffd6f6', '#7fd1ff'] },
];

export const RARITY = {
  N: { name: 'ノーマル', c: '#3fcf9a' },
  R: { name: 'レア', c: '#3b9cff' },
  SR: { name: 'スーパーレア', c: '#9b6bff' },
  UR: { name: 'ウルトラレア', c: '#ffb21e' },
};
export const PRIZES = [
  { w: 30, rarity: 'N', kind: 'pts', val: 50, label: '50ポイント' },
  { w: 18, rarity: 'N', kind: 'pct', val: 5, label: '5%OFFクーポン' },
  { w: 14, rarity: 'N', kind: 'ship', val: 0, label: '送料無料クーポン' },
  { w: 14, rarity: 'R', kind: 'yen', val: 500, min: 3000, label: '500円OFFクーポン' },
  { w: 10, rarity: 'R', kind: 'pts', val: 300, label: '300ポイント' },
  { w: 8, rarity: 'SR', kind: 'pct', val: 20, label: '20%OFFクーポン' },
  { w: 4, rarity: 'SR', kind: 'mult', val: 3, label: 'ポイント3倍クーポン' },
  { w: 2, rarity: 'UR', kind: 'pts', val: 3000, label: '3,000ポイント' },
];

export const BADGES = [
  { id: 'first', name: 'はじめての注文', desc: '1回注文する', icon: 'bag', test: (s) => s.orders.length >= 1 },
  { id: 'unbox', name: '開封の儀', desc: '届いた荷物を開ける', icon: 'box', test: (s) => s.orders.some((o) => o.opened) },
  { id: 'gacha', name: '運だめし', desc: 'ガチャをまわす', icon: 'spark', test: (s) => s.gachaCount >= 1 },
  { id: 'wish5', name: 'ほしいものリスト', desc: 'お気に入りを5つ登録', icon: 'heart', test: (s) => s.wish.length >= 5 },
  { id: 'cat3', name: 'よくばり', desc: '3カテゴリの商品を買う', icon: 'grid', test: (s) => catsBought(s) >= 3 },
  { id: 'big', name: '大人買い', desc: '1回で¥30,000以上注文', icon: 'gem', test: (s) => s.orders.some((o) => o.subtotal >= 30000) },
  { id: 'col10', name: 'コレクター', desc: 'コレクションを10種集める', icon: 'star', test: (s) => s.collection.length >= 10 },
  { id: 'orders10', name: '常連さん', desc: '10回注文する', icon: 'repeat', test: (s) => s.orders.length >= 10 },
  { id: 'gold', name: 'ゴールド会員', desc: 'ゴールドランクに到達', icon: 'medal', test: (s) => s.xp >= RANKS[2].xp },
  { id: 'catall', name: '全カテゴリ制覇', desc: `全${CATS.length}カテゴリの商品を買う`, icon: 'crown', test: (s) => catsBought(s) >= CATS.length },
  { id: 'jackpot', name: '大当たり', desc: 'ガチャでURを引く', icon: 'trophy', test: (s) => !!s.gotUR },
  { id: 'col30', name: 'マスターコレクター', desc: 'コレクションを30種集める', icon: 'gem', test: (s) => s.collection.length >= 30 },
];
function catsBought(s) { const set = new Set(); s.orders.forEach((o) => o.lines.forEach((l) => byId[l.id] && set.add(byId[l.id].cat))); return set.size; }

const today = () => new Date().toLocaleDateString('sv-SE');
function fresh() {
  return {
    cart: [], wish: [], orders: [], collection: [],
    points: 500, xp: 0, spent: 0, tickets: 2, gachaCount: 0, gotUR: false,
    coupons: [{ id: 'welcome', rarity: 'R', kind: 'pct', val: 10, label: 'はじめての10%OFFクーポン' }],
    applied: 'welcome', usePoints: false, daily: '', badges: [],
    settings: { sound: true, haptics: true },
  };
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...fresh(), ...JSON.parse(raw) }; } catch { /* storage unavailable */ }
  return fresh();
}
export const state = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }

const subs = new Set();
export function on(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit(topic) { save(); subs.forEach((fn) => fn(topic)); }

/* ---------- daily ticket ---------- */
export function claimDaily() {
  if (state.daily === today()) return false;
  state.daily = today(); state.tickets += 1; emit('tickets');
  return true;
}

/* ---------- wishlist ---------- */
export const isWished = (id) => state.wish.includes(id);
export function toggleWish(id) {
  const i = state.wish.indexOf(id);
  if (i >= 0) state.wish.splice(i, 1); else state.wish.unshift(id);
  emit('wish');
  return i < 0;
}

/* ---------- cart ---------- */
export const cartCount = () => state.cart.reduce((a, l) => a + l.qty, 0);
export function addToCart(id, v = 0, qty = 1) {
  const line = state.cart.find((l) => l.id === id && l.v === v);
  if (line) line.qty = Math.min(99, line.qty + qty); else state.cart.unshift({ id, v, qty });
  emit('cart');
}
export function setQty(i, qty) {
  if (!state.cart[i]) return;
  if (qty <= 0) state.cart.splice(i, 1); else state.cart[i].qty = Math.min(99, qty);
  emit('cart');
}
export function cartLines() {
  return state.cart.filter((l) => byId[l.id]).map((l) => { const p = byId[l.id]; return { ...l, p, variant: p.variants[l.v] || p.variants[0], unit: p.price, sum: p.price * l.qty }; });
}

export function rankOf(xp = state.xp) {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const r = RANKS[i], next = RANKS[i + 1];
  return { i, ...r, next, progress: next ? (xp - r.xp) / (next.xp - r.xp) : 1, toNext: next ? (next.xp - xp) * 100 : 0 };
}

export function quote(lines = cartLines(), couponId = state.applied, usePoints = state.usePoints) {
  const subtotal = lines.reduce((a, l) => a + l.sum, 0);
  const coupon = state.coupons.find((c) => c.id === couponId) || null;
  let discount = 0, ship = subtotal >= FREE_SHIP || subtotal === 0 ? 0 : SHIP_FEE, mult = 1, couponOk = !!coupon;
  if (coupon) {
    if (coupon.kind === 'pct') discount = Math.min(Math.floor((subtotal * coupon.val) / 100), 5000);
    else if (coupon.kind === 'yen') { if (subtotal >= (coupon.min || 0)) discount = coupon.val; else couponOk = false; }
    else if (coupon.kind === 'ship') ship = 0;
    else if (coupon.kind === 'mult') mult = coupon.val;
  }
  const before = Math.max(0, subtotal - discount + ship);
  const pointsUsed = usePoints ? Math.min(state.points, before) : 0;
  const total = before - pointsUsed;
  const rank = rankOf();
  const earn = Math.floor(subtotal * 0.01 * rank.mult * mult);
  return { lines, subtotal, discount, ship, pointsUsed, total, earn, coupon: couponOk ? coupon : null, couponBlocked: coupon && !couponOk, rank, toFree: Math.max(0, FREE_SHIP - subtotal) };
}

/* ---------- orders ---------- */
export function placeOrder(q = quote()) {
  if (!q.lines.length) return null;
  const before = rankOf();
  const order = {
    no: 'DP-' + Date.now().toString(36).slice(-6).toUpperCase(),
    at: Date.now(),
    lines: q.lines.map((l) => ({ id: l.id, v: l.v, qty: l.qty, unit: l.unit })),
    subtotal: q.subtotal, total: q.total, earn: q.earn, discount: q.discount, pointsUsed: q.pointsUsed,
    opened: false, notified: false,
  };
  state.orders.unshift(order);
  state.points = state.points - q.pointsUsed + q.earn;
  state.spent += q.subtotal;
  state.xp += Math.floor(q.subtotal / 100);
  state.tickets += 1;
  if (q.coupon) { state.coupons = state.coupons.filter((c) => c.id !== q.coupon.id); }
  state.applied = state.coupons[0]?.id || null;
  state.usePoints = false;
  state.cart = [];
  emit('order');
  return { order, before, after: rankOf() };
}
export function stageOf(o, now = Date.now()) {
  const sec = (now - o.at) / 1000;
  let i = 0; while (i + 1 < STAGES.length && sec >= STAGES[i + 1].t) i++;
  return { i, label: STAGES[i].label, done: i === STAGES.length - 1, progress: Math.min(1, sec / DELIVERY_SEC), left: Math.max(0, Math.ceil(DELIVERY_SEC - sec)) };
}
export function openOrder(no) {
  const o = state.orders.find((x) => x.no === no);
  if (!o || o.opened) return null;
  o.opened = true;
  const fresh = [];
  for (const l of o.lines) {
    const key = l.id + ':' + l.v;
    const c = state.collection.find((x) => x.k === key);
    if (c) c.n += l.qty; else { state.collection.unshift({ k: key, n: l.qty }); fresh.push(key); }
  }
  emit('orders');
  return { order: o, fresh };
}

/* ---------- gacha ---------- */
export function spin() {
  if (state.tickets <= 0) return null;
  state.tickets -= 1; state.gachaCount += 1;
  const total = PRIZES.reduce((a, p) => a + p.w, 0);
  let r = Math.random() * total, prize = PRIZES[0];
  for (const p of PRIZES) { if ((r -= p.w) < 0) { prize = p; break; } }
  if (prize.rarity === 'UR') state.gotUR = true;
  if (prize.kind === 'pts') state.points += prize.val;
  else {
    const c = { id: 'c' + Date.now().toString(36), rarity: prize.rarity, kind: prize.kind, val: prize.val, min: prize.min, label: prize.label };
    state.coupons.unshift(c);
    if (!state.applied) state.applied = c.id;
  }
  emit('gacha');
  return prize;
}

/* ---------- badges ---------- */
export function newBadges() {
  const got = BADGES.filter((b) => !state.badges.includes(b.id) && b.test(state));
  if (got.length) { state.badges.push(...got.map((b) => b.id)); save(); }
  return got;
}

export function setSetting(k, v) { state.settings[k] = v; emit('settings'); }
export function reset() { const f = fresh(); Object.keys(state).forEach((k) => delete state[k]); Object.assign(state, f); emit('reset'); }
export function recent() { return PRODUCTS; }
