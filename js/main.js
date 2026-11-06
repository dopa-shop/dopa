// dopa — app shell, screens and the little rewards that make shopping feel good.
import { ThumbFactory, LiveViewer } from './render3d.js';
import { CATS, PRODUCTS, byId, catById, offPct, tile, reviewsFor, ratingBars, search } from './catalog.js';
import * as S from './store.js';
import { sfx, haptic, confetti, flyTo, countUp, bump, fxSettings, unlockAudio } from './fx.js';
import { ic } from './icons.js';
import { SITUATIONS, sitById } from './situations.js';

const { state } = S;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('ja-JP');
const yen = (n) => '¥' + fmt(n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

Object.assign(fxSettings, state.settings);

/* ================= theme ================= */
const mq = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : mq.matches; };
let dark = isDark();
function onTheme() {
  const d = isDark(); if (d === dark) return;
  dark = d; thumbs.clear(); urlCache.clear();
  $$('.view').forEach((v) => delete v.dataset.ready);
  render(cur, true);
  if (sheet.p) { setStageVars(); viewer.show(liveSpec(sheet.p, sheet.vi), 'none'); hydrate($('#sheet')); }
  else if (cur === 'home') mountHero(true);
}
mq.addEventListener?.('change', onTheme);
new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ================= 3D thumbnails ================= */
const thumbs = new ThumbFactory();
const viewer = new LiveViewer();
const urlCache = new Map();
const CAPS = { X: '#dcd8e8', N: S.RARITY.N.c, R: S.RARITY.R.c, SR: S.RARITY.SR.c, UR: S.RARITY.UR.c };
const tileOf = (c) => tile(c, dark);
const tileVars = (c) => { const [a, b] = tileOf(c); return `--t1:${a};--t2:${b}`; };
function specFor(key) {
  if (key.startsWith('@gc:')) return { model: 'capsule', variant: { c: CAPS[key.slice(4)] }, size: 640, bg: null, margin: 0.74 };
  if (key === '@box') return { model: 'box', variant: {}, size: 640, bg: null, margin: 0.78 };
  if (key === '@bag') return { model: 'bag', variant: {}, size: 512, bg: null, margin: 0.78 };
  const [id, vi] = key.split(':'); const p = byId[id], v = p.variants[+vi] || p.variants[0];
  return { model: p.model, variant: v, size: 512, bg: tileOf(v.c), margin: 0.8 };
}
const ckey = (k) => (dark ? 'd|' : 'l|') + k;
function thumbUrl(k, urgent = false) {
  const key = ckey(k);
  return thumbs.get(key, specFor(k), urgent).then((u) => { urlCache.set(key, u); return u; });
}
function setImg(img, url) {
  if (!url || img.getAttribute('src') === url) return;
  img.onload = () => img.classList.add('in');
  img.src = url;
  if (img.complete) img.classList.add('in');
}
const io = new IntersectionObserver((ents) => {
  for (const e of ents) if (e.isIntersecting) { io.unobserve(e.target); const k = e.target.dataset.k; thumbUrl(k, true).then((u) => { if (e.target.dataset.k === k) setImg(e.target, u); }); }
}, { rootMargin: '360px 360px' });
function hydrate(root = document) {
  for (const img of root.querySelectorAll('img[data-k]')) {
    const u = urlCache.get(ckey(img.dataset.k));
    if (u) setImg(img, u); else { img.classList.remove('in'); io.observe(img); }
  }
}
const liveSpec = (p, vi) => { const v = p.variants[vi] || p.variants[0]; return { model: p.model, variant: v, bg: tileOf(v.c), margin: 0.8 }; };

/* ================= shell ================= */
const TABS = [
  { id: 'home', label: 'ホーム', icon: 'home' },
  { id: 'explore', label: 'さがす', icon: 'search' },
  { id: 'gacha', label: 'ガチャ', icon: 'spark' },
  { id: 'cart', label: 'カート', icon: 'bag' },
  { id: 'me', label: 'マイページ', icon: 'user' },
];
const app = $('#app');
app.innerHTML = `
  <main id="main">${TABS.map((t) => `<section class="view" id="v-${t.id}" hidden></section>`).join('')}</main>
  <nav class="tabbar" aria-label="メインメニュー">${TABS.map((t) => `
    <button class="tab" data-tab="${t.id}" id="tab-${t.id}"><span class="tab-ic">${ic(t.icon, 24)}<i class="tab-badge" hidden></i></span><span class="tab-lb">${t.label}</span></button>`).join('')}
  </nav>
  <div id="sheet" class="sheet" hidden role="dialog" aria-modal="true" aria-label="商品の詳細"></div>
  <div id="modal" class="modal" hidden role="dialog" aria-modal="true"></div>
  <button class="mission-pill" id="mPill" data-sit-open hidden aria-label="挑戦中のお題を見る"></button>
  <div id="toasts" aria-live="polite"></div>`;

let cur = null;
const scrolls = {};
function go(name, opt = {}) {
  if (!TABS.some((t) => t.id === name)) name = 'home';
  if (name === cur && !opt.force) {
    if (name === 'explore' && opt.focus) $('#q')?.focus();
    else window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    return;
  }
  if (cur) { scrolls[cur] = window.scrollY; $(`#v-${cur}`).hidden = true; }
  cur = name;
  render(name);
  $(`#v-${name}`).hidden = false;
  window.scrollTo(0, opt.top ? 0 : scrolls[name] || 0);
  $$('.tab').forEach((t) => { const on = t.dataset.tab === name; t.classList.toggle('on', on); t.setAttribute('aria-current', on ? 'page' : 'false'); });
  if (name === 'home') mountHero(); else if (!sheet.p) viewer.unmount();
  if (name === 'explore' && opt.focus) setTimeout(() => $('#q')?.focus(), 60);
}
function render(name, force) {
  ({ home: renderHome, explore: renderExplore, gacha: renderGacha, cart: renderCart, me: renderMe })[name](force);
}

/* ================= shared bits ================= */
function stars(r, size = 12) {
  const row = ic('star-f', size).repeat(5);
  return `<span class="stars" role="img" aria-label="5点中${r}点"><span class="st-bg">${row}</span><span class="st-fg" style="width:${(r / 5) * 100}%">${row}</span></span>`;
}
function card(p, o = {}) {
  const vi = o.vi || 0, v = p.variants[vi], w = S.isWished(p.id);
  return `<article class="card${o.rail ? ' rail-card' : ''}">
    <div class="tile" style="${tileVars(v.c)}">
      <img data-k="${p.id}:${vi}" alt="">
      ${o.rank ? `<span class="rank-no r${o.rank}">${o.rank}</span>` : ''}
      ${p.list ? `<span class="off">-${offPct(p)}%</span>` : p.badge ? `<span class="flag">${p.badge}</span>` : ''}
      <button class="heart${w ? ' on' : ''}" data-wish="${p.id}" aria-label="お気に入り" aria-pressed="${w}">${ic(w ? 'heart-f' : 'heart', 18)}</button>
      <button class="add" data-add="${p.id}" data-v="${vi}" aria-label="${esc(p.name)}をカートに入れる">${ic('plus', 18)}</button>
    </div>
    <button class="hit" data-p="${p.id}" data-v="${vi}" aria-label="${esc(p.name)}${vi ? '（' + esc(v.n) + '）' : ''}"></button>
    <div class="meta">
      <h3 class="name">${esc(p.name)}</h3>
      <div class="rate">${ic('star-f', 12)}<span>${p.rating.toFixed(1)}</span><small>(${fmt(p.reviews)})</small></div>
      <div class="price"><b>${yen(p.price)}</b>${p.list ? `<s>${yen(p.list)}</s>` : ''}</div>
      ${o.stock ? `<div class="stock"><i style="width:${Math.min(100, (p.stock / 40) * 100)}%"></i></div><small class="stock-lb">残り${p.stock}点</small>` : ''}
    </div>
  </article>`;
}
const SALE_PERIOD = 3 * 3600e3;
function countdown() {
  const left = Math.max(0, Math.ceil(Date.now() / SALE_PERIOD) * SALE_PERIOD - Date.now()), s = Math.floor(left / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}
function shipBanner() {
  const q = S.quote();
  if (!q.lines.length) return `<div class="ship">${ic('truck', 20)}<span><b>¥${fmt(S.FREE_SHIP)}以上で送料無料</b><small>ドーパ便は注文から約${S.DELIVERY_SEC}秒でお届け</small></span></div>`;
  if (q.toFree <= 0) return `<div class="ship ok">${ic('check', 20)}<span><b>送料無料が適用されています</b><small>カートに${S.cartCount()}点 · ${yen(q.subtotal)}</small></span></div>`;
  return `<div class="ship">${ic('truck', 20)}<span><b>あと${yen(q.toFree)}で送料無料</b><span class="ship-bar"><i style="width:${(q.subtotal / S.FREE_SHIP) * 100}%"></i></span></span></div>`;
}
const couponBig = (c) => (c.kind === 'pct' ? `${c.val}%OFF` : c.kind === 'yen' ? `¥${fmt(c.val)}OFF` : c.kind === 'ship' ? '送料無料' : `ポイント${c.val}倍`);
const couponNote = (c) => (c.kind === 'pct' ? '割引は最大¥5,000まで' : c.kind === 'yen' ? `¥${fmt(c.min || 0)}以上の注文で使えます` : c.kind === 'ship' ? '送料が0円になります' : '獲得ポイントが増えます');
function seeded(list, seed) {
  const a = [...list]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ================= HOME ================= */
const HERO = ['sneaker', 'headphones', 'ring', 'perfume', 'handheld', 'camera'];
let heroI = 0, heroTimer = 0, heroVisible = true;
function heroInfo(p) {
  return `<span class="tag">${ic('flash', 14)}タイムセール <b data-countdown>${countdown()}</b></span>
    <h2 class="hero-name">${esc(p.name)}</h2>
    <div class="hero-buy">
      <div class="price lg"><b>${yen(p.price)}</b>${p.list ? `<s>${yen(p.list)}</s><em class="off-pill">-${offPct(p)}%</em>` : ''}</div>
      <button class="btn-mini" data-p="${p.id}">見る${ic('right', 16)}</button>
    </div>`;
}
function renderHome() {
  const el = $('#v-home');
  if (el.dataset.ready) { refreshHome(); return; }
  el.dataset.ready = '1';
  const sale = PRODUCTS.filter((p) => p.sale);
  const ranking = [...PRODUCTS].sort((a, b) => b.reviews * b.rating - a.reviews * a.rating).slice(0, 10);
  const day = Math.floor(Date.now() / 864e5);
  const hp = byId[HERO[heroI]];
  el.innerHTML = `
  <header class="hd">
    <div class="logo" aria-label="dopa">dopa<i></i></div>
    <button class="pts-chip" data-tab="me" aria-label="保有ポイント">${ic('coin', 18)}<b data-bind="points">${fmt(state.points)}</b><small>pt</small></button>
  </header>
  <div class="wrap">
    <button class="search-fake" data-tab="explore" data-focus="1">${ic('search', 20)}<span>りんご、スニーカー、口紅…</span></button>
    <div id="homeSit">${sitCardTpl()}</div>
    <section class="hero" id="hero" style="${tileVars(hp.variants[0].c)}">
      <div class="hero-stage" id="heroStage"><img class="stage-img" data-k="${hp.id}:0" alt=""></div>
      <div class="hero-info" id="heroInfo">${heroInfo(hp)}</div>
      <div class="hero-dots">${HERO.map((_, i) => `<button data-hero="${i}" class="${i === heroI ? 'on' : ''}" aria-label="特集 ${i + 1}"></button>`).join('')}</div>
    </section>
    <nav class="cats hs" aria-label="カテゴリ">${CATS.map((c) => `
      <button class="cat" data-cat="${c.id}"><span class="cat-tile" style="${tileVars(byId[c.icon].variants[0].c)}"><img data-k="${c.icon}:0" alt=""></span><span class="cat-lb">${c.short}</span></button>`).join('')}
    </nav>
    <div id="homeShip">${shipBanner()}</div>
    <button class="promo" data-tab="gacha">
      <span class="promo-img"><img data-k="@gc:SR" alt=""></span>
      <span class="promo-txt"><b>デイリーガチャ</b><small>チケット <em data-bind="tickets">${state.tickets}</em>枚 · 最大3,000pt当たる</small></span>
      ${ic('right', 20)}
    </button>
    <section class="sec">
      <div class="sec-hd"><h2>タイムセール</h2><span class="timer">${ic('clock', 15)}<b data-countdown>${countdown()}</b></span></div>
      <div class="hs rail">${sale.map((p) => card(p, { stock: true, rail: true })).join('')}</div>
    </section>
    <section class="sec">
      <div class="sec-hd"><h2>売れ筋ランキング</h2></div>
      <div class="hs rail">${ranking.map((p, i) => card(p, { rank: i + 1, rail: true })).join('')}</div>
    </section>
    <section class="sec">
      <div class="sec-hd"><h2>あなたへのおすすめ</h2><span class="muted">${PRODUCTS.length}点</span></div>
      <div class="grid">${seeded(PRODUCTS, day).map((p) => card(p)).join('')}</div>
    </section>
    <p class="fine">dopa は架空のショッピングアプリです。商品・ブランドはすべてフィクションで、実際の請求や配送はありません。</p>
  </div>`;
  hydrate(el);
  heroIO.observe($('#hero'));
}
function refreshHome() { const s = $('#homeShip'); if (s) s.innerHTML = shipBanner(); refreshSitCard(); syncHearts(); }
const heroIO = new IntersectionObserver(([e]) => {
  heroVisible = e.isIntersecting;
  if (viewer.host?.id === 'heroStage') heroVisible && !document.hidden ? viewer.start() : viewer.stop();
});
function mountHero(again) {
  const host = $('#heroStage'); if (!host || sheet.p) return;
  const p = byId[HERO[heroI]];
  const fresh = viewer.host !== host;
  viewer.mount(host, () => { sfx.pop(); haptic(); setTimeout(() => openProduct(HERO[heroI]), 160); });
  if (fresh || again) viewer.show(liveSpec(p, 0), 'pop');
  if (!heroVisible) viewer.stop();
  clearInterval(heroTimer);
  heroTimer = setInterval(() => { if (cur === 'home' && !sheet.p && !modalOpen && !document.hidden && heroVisible) setHero(heroI + 1); }, 6500);
}
function setHero(i) {
  heroI = (i + HERO.length) % HERO.length;
  const p = byId[HERO[heroI]], hero = $('#hero'); if (!hero) return;
  hero.setAttribute('style', tileVars(p.variants[0].c));
  const info = $('#heroInfo'); info.innerHTML = heroInfo(p); bump(info, 'swap');
  const img = $('#heroStage .stage-img'); img.dataset.k = `${p.id}:0`; hydrate(hero);
  $$('.hero-dots button').forEach((b, j) => b.classList.toggle('on', j === heroI));
  if (viewer.host?.id === 'heroStage') viewer.show(liveSpec(p, 0), 'pop');
}

/* ================= EXPLORE ================= */
const ex = { q: '', cat: 'all', sort: 'rec' };
function renderExplore() {
  const el = $('#v-explore');
  if (!el.dataset.ready) {
    el.dataset.ready = '1';
    el.innerHTML = `
    <div class="wrap"><h1 class="title">さがす</h1></div>
    <header class="hd hd-col">
      <label class="search">${ic('search', 20)}<input id="q" type="search" placeholder="商品名・ブランド・カテゴリ" enterkeyhint="search" autocomplete="off" aria-label="商品を検索"></label>
      <div class="chips hs" id="exCats">${[{ id: 'all', short: 'すべて' }, ...CATS].map((c) => `<button class="chip" data-excat="${c.id}">${c.short}</button>`).join('')}</div>
    </header>
    <div class="wrap">
      <div class="kw" id="kw"><span>人気のキーワード</span>${['スニーカー', 'コスメ', 'スイーツ', 'ガジェット', '猫', '出産祝い', 'キッチン', 'ピンク'].map((k) => `<button class="kw-b" data-kw="${k}">${k}</button>`).join('')}</div>
      <div class="sortbar"><span id="exCount"></span><div class="seg" role="group" aria-label="並び替え">${[['rec', 'おすすめ'], ['low', '安い順'], ['high', '高い順'], ['rate', '評価順']].map(([k, l]) => `<button data-sort="${k}">${l}</button>`).join('')}</div></div>
      <div class="grid" id="exGrid"></div>
    </div>`;
    const q = $('#q', el); let tm;
    q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { ex.q = q.value; exResults(); }, 110); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') q.blur(); });
  }
  $('#q').value = ex.q;
  exResults();
}
function exResults() {
  const list = search(ex.q, ex.cat);
  if (ex.sort === 'low') list.sort((a, b) => a.price - b.price);
  else if (ex.sort === 'high') list.sort((a, b) => b.price - a.price);
  else if (ex.sort === 'rate') list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  $$('[data-excat]').forEach((b) => b.classList.toggle('on', b.dataset.excat === ex.cat));
  const onChip = $('[data-excat].on'), row = $('#exCats');
  if (onChip && row) row.scrollTo({ left: Math.max(0, onChip.offsetLeft - row.clientWidth / 2 + onChip.offsetWidth / 2), behavior: reduced() ? 'auto' : 'smooth' });
  $$('[data-sort]').forEach((b) => b.classList.toggle('on', b.dataset.sort === ex.sort));
  $('#exCount').textContent = `${list.length}件`;
  $('#kw').hidden = !!ex.q;
  const g = $('#exGrid');
  // when a search word names a color ("ピンク"), show that color of each product
  const terms = ex.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const pickVi = (p) => { const i = p.variants.findIndex((v) => terms.some((t) => v.n.toLowerCase().includes(t))); return i > 0 ? i : 0; };
  g.innerHTML = list.length ? list.map((p) => card(p, { vi: pickVi(p) })).join('')
    : `<div class="empty"><img data-k="@bag" alt=""><p><b>「${esc(ex.q)}」は見つかりませんでした</b><br>別のことばや、カテゴリから探してみてください。</p></div>`;
  hydrate(g);
}

/* ================= GACHA ================= */
function renderGacha() {
  const el = $('#v-gacha');
  const tiers = ['UR', 'SR', 'R', 'N'], tot = S.PRIZES.reduce((a, p) => a + p.w, 0);
  el.innerHTML = `
  <header class="hd"><h1 class="title">ガチャ</h1><span class="ticket-chip">${ic('ticket', 18)}<b data-bind="tickets">${state.tickets}</b>枚</span></header>
  <div class="wrap">
    <div class="machine">
      <div class="machine-glow"></div>
      ${['N', 'R', 'UR', 'SR'].map((r, i) => `<img class="cap-mini m${i}" data-k="@gc:${r}" alt="">`).join('')}
      <img class="cap-hero" data-k="@gc:X" alt="">
      <p class="machine-copy"><b>チケット1枚で1回</b><small>ポイントやクーポンが当たります</small></p>
      <button class="btn-primary xl" id="spinBtn" ${state.tickets ? '' : 'disabled'}>${ic('spark', 20)}ガチャをまわす</button>
      <p class="hint">${state.tickets ? '' : 'チケットがありません。'}毎日1枚、注文ごとに1枚もらえます。</p>
    </div>
    <section class="sec"><div class="sec-hd"><h2>当たりの内容</h2></div>
      <ul class="odds">${tiers.map((t) => {
        const ps = S.PRIZES.filter((p) => p.rarity === t), w = ps.reduce((a, p) => a + p.w, 0);
        return `<li style="--rc:${S.RARITY[t].c}"><span class="rar">${t}</span><span class="odds-tx"><b>${S.RARITY[t].name}</b><small>${ps.map((p) => p.label).join(' / ')}</small></span><span class="pct">${((w / tot) * 100).toFixed(0)}%</span></li>`;
      }).join('')}</ul>
    </section>
    <section class="sec"><div class="sec-hd"><h2>マイクーポン</h2><span class="muted">${state.coupons.length}枚</span></div>
      ${state.coupons.length ? `<div class="coupons">${state.coupons.map((c) => `
        <div class="coupon" style="--rc:${S.RARITY[c.rarity]?.c || '#999'}">
          <div class="coupon-l"><b>${couponBig(c)}</b><small>${c.rarity}</small></div>
          <div class="coupon-r"><b>${esc(c.label)}</b><small>${couponNote(c)}</small></div>
        </div>`).join('')}</div>` : `<div class="empty-sm">${ic('ticket', 26)}<p>クーポンはまだありません。ガチャで当てよう！</p></div>`}
    </section>
  </div>`;
  hydrate(el);
  ['X', 'N', 'R', 'SR', 'UR'].forEach((r) => thumbUrl('@gc:' + r));
}

async function spinGacha() {
  if (state.tickets <= 0) { toast({ icon: 'ticket', title: 'チケットがありません', text: '注文するとチケットが1枚もらえます' }); return; }
  const [mystery] = await Promise.all([thumbUrl('@gc:X', true), thumbUrl('@gc:N', true), thumbUrl('@gc:R', true), thumbUrl('@gc:SR', true), thumbUrl('@gc:UR', true)]);
  const prize = S.spin(); if (!prize) return;
  const tier = ['N', 'R', 'SR', 'UR'].indexOf(prize.rarity), rc = S.RARITY[prize.rarity];
  const capUrl = urlCache.get(ckey('@gc:' + prize.rarity));
  openModal(`
    <div class="gacha-run" style="--rc:${rc.c}">
      <div class="rays"></div>
      <div class="gr-cap" id="grCap"><img class="half top" src="${mystery}" alt=""><img class="half bottom" src="${mystery}" alt=""></div>
      <div class="gr-prize" id="grPrize">
        <span class="rar-big">${prize.rarity}</span>
        <small class="rar-name">${rc.name}</small>
        <h2>${esc(prize.label)}</h2>
        <p>${prize.kind === 'pts' ? 'ポイントに加算しました' : 'マイクーポンに追加しました。カートで使えます'}</p>
        <button class="btn-primary" data-close>受け取る</button>
      </div>
    </div>`, { bare: true, locked: true });
  const capEl = $('#grCap');
  sfx.whoosh(); haptic();
  const shakes = reduced() ? 1 : 9;
  capEl.classList.add('shake');
  for (let i = 0; i < shakes; i++) { await wait(130); sfx.tick(); if (i % 3 === 2) haptic(); }
  capEl.querySelectorAll('img').forEach((img) => (img.src = capUrl));
  capEl.classList.remove('shake'); capEl.classList.add('flash');
  await wait(380);
  capEl.classList.add('open');
  $('.gacha-run').classList.add('revealed');
  sfx.reveal(tier); haptic('heavy');
  confetti({ y: innerHeight * 0.4, n: 50 + tier * 50, power: 0.9 + tier * 0.15, colors: [rc.c, '#ffffff', '#ffd23f', '#ff2d6f'] });
  if (tier >= 2) setTimeout(() => confetti({ x: innerWidth * 0.15, y: innerHeight * 0.7, n: 60, spread: 1.2 }), 280);
  if (tier >= 2) setTimeout(() => confetti({ x: innerWidth * 0.85, y: innerHeight * 0.7, n: 60, spread: 1.2 }), 420);
  modalOpts.locked = false;
  modalOpts.onClose = () => { if (cur === 'gacha') renderGacha(); checkBadges(); };
}

/* ================= CART ================= */
function renderCart() {
  const el = $('#v-cart'), q = S.quote();
  if (!q.lines.length) {
    el.innerHTML = `<header class="hd"><h1 class="title">カート</h1></header>
    <div class="wrap">
      <div class="empty"><img data-k="@bag" alt=""><p><b>カートは空っぽです</b><br>気になる商品の＋を押すと、ここに飛んできます。</p><button class="btn-primary" data-tab="home">人気の商品を見る</button></div>
      ${state.wish.length ? `<section class="sec"><div class="sec-hd"><h2>お気に入りから</h2></div><div class="hs rail">${state.wish.map((id) => byId[id] && card(byId[id], { rail: true })).join('')}</div></section>` : ''}
    </div>`;
    hydrate(el); return;
  }
  const coupons = [null, ...state.coupons];
  el.innerHTML = `
  <header class="hd"><h1 class="title">カート</h1><span class="muted">${S.cartCount()}点</span></header>
  <div class="wrap">
    ${sitBannerTpl()}
    ${shipBanner()}
    <ul class="lines">${q.lines.map((l, i) => `
      <li class="line">
        <button class="line-tile" data-p="${l.id}" data-v="${l.v}" style="${tileVars(l.variant.c)}" aria-label="${esc(l.p.name)}"><img data-k="${l.id}:${l.v}" alt=""></button>
        <div class="line-info">
          <p class="line-name">${esc(l.p.name)}</p>
          <p class="line-var"><i style="background:${l.variant.c}"></i>${esc(l.variant.n)} · ${yen(l.unit)}</p>
          <div class="line-ft">
            <b class="price-sm">${yen(l.sum)}</b>
            <div class="stepper"><button data-qty="${i}" data-d="-1" aria-label="${l.qty === 1 ? '削除' : '1つ減らす'}">${ic(l.qty === 1 ? 'trash' : 'minus', 16)}</button><span>${l.qty}</span><button data-qty="${i}" data-d="1" aria-label="1つ増やす">${ic('plus', 16)}</button></div>
          </div>
        </div>
      </li>`).join('')}
    </ul>
    <section class="panel">
      <h3>クーポン</h3>
      <div class="cp-pick hs">${coupons.map((c) => `<button class="cp${(c ? c.id : null) === (state.applied || null) ? ' on' : ''}" data-coupon="${c ? c.id : ''}" style="--rc:${c ? S.RARITY[c.rarity]?.c : 'var(--muted)'}">${c ? `<b>${couponBig(c)}</b><small>${c.rarity}</small>` : '<b>使わない</b>'}</button>`).join('')}</div>
      ${q.couponBlocked ? `<p class="warn">${ic('info', 16)}このクーポンは${yen(state.coupons.find((c) => c.id === state.applied)?.min || 0)}以上で使えます</p>` : ''}
      <label class="switch-row"><span>${ic('coin', 18)}ポイントを使う<small>保有 ${fmt(state.points)}pt</small></span><input type="checkbox" class="tgl" id="usePts" ${state.usePoints ? 'checked' : ''}></label>
    </section>
    <section class="panel sum">
      <div><span>小計</span><b>${yen(q.subtotal)}</b></div>
      <div><span>送料</span><b>${q.ship ? yen(q.ship) : '無料'}</b></div>
      ${q.discount ? `<div class="neg"><span>クーポン割引</span><b>−${yen(q.discount)}</b></div>` : ''}
      ${q.pointsUsed ? `<div class="neg"><span>ポイント利用</span><b>−${yen(q.pointsUsed)}</b></div>` : ''}
      <div class="total"><span>合計</span><b>${yen(q.total)}</b></div>
      <div class="earn-row">${ic('coin', 16)}<span>獲得予定</span><b>+${fmt(q.earn)}pt</b>${q.rank.mult > 1 ? `<small>${q.rank.name}特典 ×${q.rank.mult}</small>` : ''}${q.coupon?.kind === 'mult' ? `<small>クーポン ×${q.coupon.val}</small>` : ''}</div>
    </section>
    <div class="slide" id="slide" role="button" tabindex="0" aria-label="注文を確定する">
      <div class="slide-fill"></div><span class="slide-lb">${state.mission ? 'スライドして爆買いする' : 'スライドして注文する'}</span><span class="slide-knob">${ic('right', 24)}</span>
    </div>
    <p class="fine">架空の注文です。お金は一切かかりません。</p>
  </div>`;
  hydrate(el); bindSlide();
}
function bindSlide() {
  const sl = $('#slide'); if (!sl) return;
  const knob = $('.slide-knob', sl), fill = $('.slide-fill', sl);
  let x0 = null, max = 1, pos = 0, step = 0;
  const set = (x) => {
    pos = Math.max(0, Math.min(max, x));
    knob.style.transform = `translateX(${pos}px)`; fill.style.width = `${pos + knob.offsetWidth}px`;
    sl.style.setProperty('--p', (pos / max).toFixed(3));
    const s = Math.floor((pos / max) * 5); if (s !== step) { step = s; sfx.tick(); haptic(); }
  };
  knob.addEventListener('pointerdown', (e) => { unlockAudio(); x0 = e.clientX - pos; max = sl.clientWidth - knob.offsetWidth - 8; knob.setPointerCapture(e.pointerId); sl.classList.add('drag'); });
  knob.addEventListener('pointermove', (e) => { if (x0 !== null) set(e.clientX - x0); });
  const end = () => {
    if (x0 === null) return; x0 = null; sl.classList.remove('drag');
    if (pos >= max * 0.9) { set(max); sl.classList.add('done'); checkout(); }
    else { sl.classList.add('snap'); set(0); setTimeout(() => sl.classList.remove('snap'), 380); }
  };
  knob.addEventListener('pointerup', end); knob.addEventListener('pointercancel', end);
  sl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); checkout(); } });
}

function checkout() {
  const res = S.placeOrder(); if (!res) return;
  sfx.fanfare(); haptic('success');
  confetti({ n: 140, power: 1.15 });
  setTimeout(() => confetti({ x: 0, y: innerHeight * 0.75, n: 70, spread: 1.0, power: 1.2 }), 220);
  setTimeout(() => confetti({ x: innerWidth, y: innerHeight * 0.75, n: 70, spread: 1.0, power: 1.2 }), 360);
  const { order, before, after, mission } = res;
  const sit = mission && sitById[mission.id];
  const head = sit ? `
      <p class="eyebrow">${esc(sit.title)}</p>
      <h2>${esc(sit.done)}</h2>
      <div class="chat mini">${chatHead(sit)}<div class="msg-row"><div class="bubble typing" id="celReply"><i></i><i></i><i></i></div></div></div>
      ${haulTpl(order.lines, 12)}
      <div class="haul-stat"><b>${fmt(mission.count)}点</b>を爆買い<span>${yen(mission.total)}ぶん</span><em>お支払い 0円</em></div>` : `
      <div class="cel-check"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
      <h2>ご注文ありがとうございます！</h2>
      <p class="muted">注文番号 #${order.no}</p>
      <div class="cel-items">${order.lines.slice(0, 5).map((l, i) => `<span class="mini-tile pop" style="${tileVars(byId[l.id].variants[l.v].c)};--i:${i}"><img data-k="${l.id}:${l.v}" alt=""></span>`).join('')}${order.lines.length > 5 ? `<span class="more">+${order.lines.length - 5}</span>` : ''}</div>`;
  openModal(`
    <div class="celebrate${sit ? ' sit' : ''}">
      <div class="rays"></div>
      ${head}
      <div class="cel-earn">${ic('coin', 24)}<b>+<span id="celPts">0</span></b><small>pt 獲得</small></div>
      <div class="cel-xp"><div class="cel-xp-hd"><span>${before.name}会員</span><span>${after.next ? `${after.next.name}まで あと${yen(after.toNext)}` : '最高ランク'}</span></div><div class="bar"><i id="celXp" style="width:${before.progress * 100}%"></i></div></div>
      <div class="cel-chips"><span>${ic('ticket', 16)}ガチャチケット +${sit ? 2 : 1}</span><span>${ic('truck', 16)}約${S.DELIVERY_SEC}秒でお届け</span>${sit ? `<span>${ic('star', 16)}手帳にスタンプ ${S.doneSituations().size}/${SITUATIONS.length}</span>` : ''}</div>
      <div class="cel-btns"><button class="btn-ghost" data-close>買い物を続ける</button><button class="btn-primary" data-track>配送を見る</button></div>
    </div>`, {
    onClose: () => {
      if (after.i > before.i) setTimeout(() => rankUp(after), 250); else checkBadges();
    },
  });
  hydrate($('#modal'));
  if (sit) {
    setTimeout(() => confetti({ y: innerHeight * 0.3, n: 120, power: 1.1 }), 600);
    setTimeout(() => { const b = $('#celReply'); if (!b) return; b.classList.remove('typing'); b.textContent = sit.reply; bump(b, 'pop'); sfx.msg(); haptic(); }, 1200);
  }
  setTimeout(() => { countUp($('#celPts'), 0, order.earn, 1100); sfx.coin(); }, 420);
  setTimeout(() => { const bar = $('#celXp'); if (bar) bar.style.width = (after.i > before.i ? 100 : after.progress * 100) + '%'; }, 700);
  if (cur === 'cart') renderCart();
}
function rankUp(r) {
  sfx.levelUp(); haptic('success');
  confetti({ n: 120, colors: [r.grad[0], r.grad[1], '#ffffff', '#ffd23f'] });
  openModal(`
    <div class="rankup">
      <div class="rays"></div>
      <p class="eyebrow">RANK UP</p>
      <div class="member mini" style="--g1:${r.grad[0]};--g2:${r.grad[1]}"><span class="member-logo">dopa<i></i></span><b class="member-rank">${r.en}</b><div class="member-shine"></div></div>
      <h2>${r.name}会員になりました</h2>
      <p class="muted">ポイント還元率が ×${r.mult} にアップしました</p>
      <button class="btn-primary" data-close>やったね</button>
    </div>`, { onClose: checkBadges });
}

/* ================= ME ================= */
const stageMemo = new Map();
function timeAgo(t) { const s = Math.floor((Date.now() - t) / 1000); return s < 60 ? `${s}秒前` : s < 3600 ? `${Math.floor(s / 60)}分前` : s < 86400 ? `${Math.floor(s / 3600)}時間前` : `${Math.floor(s / 86400)}日前`; }
function orderFoot(o, st) {
  if (!st.done) return `<span class="eta">${ic('clock', 15)}お届けまで <b data-eta>${st.left}</b>秒</span>`;
  if (!o.opened) return `<span class="eta ok">${ic('box', 15)}お届け済み</span><button class="btn-primary sm glow" data-unbox="${o.no}">${ic('gift', 18)}開封する</button>`;
  return `<span class="eta">${ic('check', 15)}開封済み</span><button class="btn-ghost sm" data-again="${o.no}">もう一度買う</button>`;
}
function ordersTpl() {
  if (!state.orders.length) return `<div class="empty-sm">${ic('box', 26)}<p>まだ注文はありません。届いた荷物はここで開封できます。</p></div>`;
  return state.orders.slice(0, 15).map((o) => {
    const st = S.stageOf(o); stageMemo.set(o.no, st.i);
    return `<article class="order${st.done ? ' done' : ''}" data-order="${o.no}">
      <div class="order-hd"><b>#${o.no}</b><time>${timeAgo(o.at)}</time></div>
      <div class="order-items">${o.lines.slice(0, 4).map((l) => `<span class="mini-tile" style="${tileVars(byId[l.id].variants[l.v].c)}"><img data-k="${l.id}:${l.v}" alt=""></span>`).join('')}${o.lines.length > 4 ? `<span class="more">+${o.lines.length - 4}</span>` : ''}<b class="order-total">${yen(o.total)}</b></div>
      <div class="track"><div class="track-bar"><i style="width:${st.progress * 100}%"></i><span class="truck" style="left:${st.progress * 100}%">${ic('truck', 16)}</span></div>
        <ol class="track-steps">${S.STAGES.map((s, i) => `<li class="${i <= st.i ? 'on' : ''}">${s.label}</li>`).join('')}</ol></div>
      <div class="order-ft">${orderFoot(o, st)}</div>
    </article>`;
  }).join('');
}
function renderMe() {
  const el = $('#v-me'), r = S.rankOf();
  const col = state.collection;
  el.innerHTML = `
  <header class="hd"><h1 class="title">マイページ</h1></header>
  <div class="wrap">
    <div class="member" style="--g1:${r.grad[0]};--g2:${r.grad[1]}">
      <div class="member-top"><span class="member-logo">dopa<i></i></span><b class="member-rank">${r.en}</b></div>
      <div class="member-pts"><small>保有ポイント</small><b><span data-bind="points">${fmt(state.points)}</span><em>pt</em></b></div>
      <div><div class="member-bar"><i style="width:${r.progress * 100}%"></i></div>
      <div class="member-ft"><span>${r.name}会員 · 還元 ×${r.mult}</span><span>${r.next ? `${r.next.name}まで あと${yen(r.toNext)}` : '最高ランク'}</span></div></div>
      <div class="member-shine"></div>
    </div>
    <div class="stats">
      <div><b>${state.orders.length}</b><small>注文</small></div>
      <div><b>${col.length}</b><small>コレクション</small></div>
      <div><b>${yen(state.spent)}</b><small>累計のお買い物</small></div>
    </div>
    <section class="sec"><div class="sec-hd"><h2>注文と配送</h2></div><div id="orders" class="orders">${ordersTpl()}</div></section>
    <section class="sec"><div class="sec-hd"><h2>シチュエーション手帳</h2><span class="muted">${S.doneSituations().size} / ${SITUATIONS.length}種</span></div>${sitBookTpl()}</section>
    <section class="sec"><div class="sec-hd"><h2>バッジ</h2><span class="muted">${state.badges.length} / ${S.BADGES.length}</span></div>
      <div class="badges">${S.BADGES.map((b) => { const on = state.badges.includes(b.id); return `<div class="bdg${on ? ' on' : ''}"><span class="bdg-ic">${ic(b.icon, 24)}</span><b>${b.name}</b><small>${b.desc}</small></div>`; }).join('')}</div>
    </section>
    <section class="sec"><div class="sec-hd"><h2>コレクション</h2><span class="muted">${col.length}種</span></div>
      ${col.length ? `<div class="shelf">${col.map((c) => { const [id, v] = c.k.split(':'); const p = byId[id]; if (!p) return ''; return `<button class="shelf-item" data-p="${id}" data-v="${v}" style="${tileVars(p.variants[+v].c)}" aria-label="${esc(p.name)}"><img data-k="${c.k}" alt="">${c.n > 1 ? `<b>×${c.n}</b>` : ''}</button>`; }).join('')}</div>`
        : `<div class="empty-sm">${ic('star', 26)}<p>届いた荷物を開封すると、商品がここに並びます。</p></div>`}
    </section>
    <section class="sec"><div class="sec-hd"><h2>お気に入り</h2><span class="muted">${state.wish.length}点</span></div>
      ${state.wish.length ? `<div class="hs rail">${state.wish.map((id) => byId[id] && card(byId[id], { rail: true })).join('')}</div>` : `<div class="empty-sm">${ic('heart', 26)}<p>♡を押した商品がここに並びます。</p></div>`}
    </section>
    <section class="sec"><div class="sec-hd"><h2>設定</h2></div>
      <div class="panel settings">
        <label class="switch-row"><span>${ic('sound', 18)}サウンド<small>iPhoneの消音モード中は鳴りません</small></span><input type="checkbox" class="tgl" data-set="sound" ${state.settings.sound ? 'checked' : ''}></label>
        <label class="switch-row"><span>${ic('vibrate', 18)}触覚フィードバック<small>iOS 18以降のSafariで動作します</small></span><input type="checkbox" class="tgl" data-set="haptics" ${state.settings.haptics ? 'checked' : ''}></label>
        <div class="reset-row" id="resetRow"><button class="btn-text danger" id="resetBtn">データをリセット</button></div>
      </div>
    </section>
    <p class="fine">dopa は架空のショッピングアプリです。データはこの端末の中だけに保存されます。</p>
  </div>`;
  hydrate(el);
}
function liveOrders() {
  let changed = false;
  for (const o of state.orders) {
    const st = S.stageOf(o);
    if (stageMemo.has(o.no) && stageMemo.get(o.no) !== st.i) changed = true;
    stageMemo.set(o.no, st.i);
    if (st.done && !o.notified) {
      o.notified = true; S.emit('orders');
      sfx.add(); haptic('success');
      toast({ img: urlCache.get(ckey('@box')), title: o.mission ? `「${sitById[o.mission]?.title}」の荷物が届いた！` : 'お届けしました！', text: `#${o.no} · ${o.lines.reduce((a, l) => a + l.qty, 0)}点`, action: '開封する', onAction: () => unbox(o.no), ms: 6000 });
    }
  }
  if (cur === 'me') {
    const box = $('#orders');
    if (box && changed) { box.innerHTML = ordersTpl(); hydrate(box); }
    else for (const art of $$('.order', box || document)) {
      const o = state.orders.find((x) => x.no === art.dataset.order); if (!o) continue;
      const st = S.stageOf(o);
      if (st.done) continue;
      art.querySelector('.track-bar i').style.width = st.progress * 100 + '%';
      art.querySelector('.truck').style.left = st.progress * 100 + '%';
      const eta = art.querySelector('[data-eta]'); if (eta) eta.textContent = st.left;
    }
  }
  updateBadges();
}

/* ---------- unboxing ---------- */
async function unbox(no) {
  const o = state.orders.find((x) => x.no === no); if (!o || o.opened) return;
  if (sheet.p) closeSheet();
  const boxUrl = await thumbUrl('@box', true);
  let taps = 3;
  openModal(`
    <div class="unbox" id="unbox">
      <div class="rays"></div>
      ${o.mission && sitById[o.mission] ? `<p class="ub-cap">${esc(sitById[o.mission].title)} の荷物</p>` : ''}
      <button class="ub-box" id="ubBox" aria-label="タップして開封"><img src="${boxUrl}" alt=""></button>
      <p class="ub-hint" id="ubHint">タップして開封 <b>${taps}</b></p>
      <div class="ub-items" id="ubItems"></div>
      <div class="ub-done" id="ubDone" hidden><h2>開封しました！</h2><p class="muted">コレクションに追加されました</p><button class="btn-primary" data-close>やったね</button></div>
    </div>`, { bare: true, locked: true, onClose: () => { if (cur === 'me') renderMe(); checkBadges(); } });
  $('#ubBox').addEventListener('click', async () => {
    if (taps <= 0) return;
    taps--; const box = $('#ubBox');
    bump(box, 'wobble'); sfx.thud(); haptic(taps ? 'light' : 'heavy');
    if (taps > 0) { $('#ubHint b').textContent = taps; return; }
    const res = S.openOrder(no); if (!res) return;
    $('#ubHint').hidden = true;
    box.classList.add('burst'); $('#unbox').classList.add('opened');
    sfx.reveal(2);
    confetti({ y: innerHeight * 0.45, n: 120, power: 1.05 });
    const items = $('#ubItems');
    items.innerHTML = res.order.lines.slice(0, 9).map((l, i) => `<span class="mini-tile pop" style="${tileVars(byId[l.id].variants[l.v].c)};--i:${i}"><img data-k="${l.id}:${l.v}" alt="">${res.fresh.includes(l.id + ':' + l.v) ? '<em>NEW</em>' : ''}</span>`).join('');
    hydrate(items);
    res.order.lines.slice(0, 9).forEach((_, i) => setTimeout(() => { sfx.blip(); haptic(); }, 260 + i * 110));
    await wait(500 + Math.min(9, res.order.lines.length) * 110);
    $('#ubDone').hidden = false;
    modalOpts.locked = false;
  });
}

/* ================= PRODUCT SHEET ================= */
const sheetEl = $('#sheet');
const sheet = { p: null, vi: 0, qty: 1 };
function setStageVars() { const st = $('#pdStage'); if (st) st.setAttribute('style', tileVars(sheet.p.variants[sheet.vi].c)); }
function openProduct(id, vi = 0) {
  const p = byId[id]; if (!p) return;
  Object.assign(sheet, { p, vi, qty: 1 });
  const v = p.variants[vi], q = S.quote(), r = S.rankOf(), w = S.isWished(p.id);
  const rv = reviewsFor(p), bars = ratingBars(p);
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id);
  sheetEl.innerHTML = `
    <div class="sheet-scroll" id="sheetScroll">
      <div class="pd-stage" id="pdStage" style="${tileVars(v.c)}">
        <img class="stage-img" data-k="${p.id}:${vi}" alt="">
        <div class="pd-live" id="pdLive"></div>
        <button class="round close" data-sheet-close aria-label="閉じる">${ic('down', 22)}</button>
        <button class="round heart-r${w ? ' on' : ''}" data-wish="${p.id}" aria-label="お気に入り" aria-pressed="${w}">${ic(w ? 'heart-f' : 'heart', 20)}</button>
        <span class="pd-hint">${ic('rotate', 14)}ドラッグで回転 · タップでぷにっ</span>
      </div>
      <div class="pd">
        <p class="pd-brand">${esc(p.brand)} · ${catById[p.cat].name}</p>
        <h1 class="pd-name">${esc(p.name)}</h1>
        <div class="pd-rate">${stars(p.rating, 14)}<b>${p.rating.toFixed(1)}</b><span>${fmt(p.reviews)}件のレビュー</span></div>
        <div class="pd-price"><b class="price xl">${yen(p.price)}</b>${p.list ? `<s>${yen(p.list)}</s><em class="off-pill">-${offPct(p)}%</em>` : ''}</div>
        <div class="pd-earn">${ic('coin', 16)}<b>+${fmt(Math.floor(p.price * 0.01 * r.mult))}pt</b><span>獲得${r.mult > 1 ? `（${r.name}特典 ×${r.mult}）` : ''}</span></div>
        ${p.sale ? `<div class="pd-sale">${ic('flash', 16)}<span>タイムセール 終了まで</span><b data-countdown>${countdown()}</b></div>` : ''}
        <div class="opt">
          <div class="opt-hd">カラー<b id="pdVname">${esc(v.n)}</b></div>
          <div class="swatches" role="radiogroup" aria-label="カラー">${p.variants.map((x, i) => `<button class="sw${i === vi ? ' on' : ''}" data-vi="${i}" role="radio" aria-checked="${i === vi}" aria-label="${esc(x.n)}" style="--c:${x.c}"><i></i></button>`).join('')}</div>
        </div>
        <div class="opt opt-row"><div class="opt-hd">数量</div>
          <div class="stepper lg"><button data-pqty="-1" aria-label="1つ減らす">${ic('minus', 18)}</button><span id="pdQty">1</span><button data-pqty="1" aria-label="1つ増やす">${ic('plus', 18)}</button></div>
        </div>
        <ul class="facts">
          <li>${ic('truck', 20)}<span><b>ドーパ便</b>注文から約${S.DELIVERY_SEC}秒でお届け</span></li>
          <li>${ic('box', 20)}<span><b>残り${p.stock}点</b><span class="stock"><i style="width:${Math.min(100, (p.stock / 40) * 100)}%"></i></span></span></li>
          <li id="pdShip">${ic('gift', 20)}<span>${q.toFree > 0 ? `<b>あと${yen(q.toFree)}で送料無料</b>` : '<b>送料無料</b>'}カートの商品と合わせて計算</span></li>
        </ul>
        <h2 class="pd-h">商品の説明</h2>
        <p class="pd-desc">${esc(p.desc)}</p>
        <h2 class="pd-h">レビュー</h2>
        <div class="rv-sum"><div class="rv-big"><b>${p.rating.toFixed(1)}</b>${stars(p.rating, 13)}<small>${fmt(p.reviews)}件</small></div>
          <div class="rv-bars">${bars.map((b, i) => `<div><span>${5 - i}</span><i><em style="width:${b}%"></em></i></div>`).join('')}</div></div>
        <div class="rv-list">${rv.map((x) => `<div class="rv"><div class="rv-hd"><b>${esc(x.name)}</b>${stars(x.stars, 11)}<small>${x.days}日前</small></div><p>${esc(x.text)}</p></div>`).join('')}</div>
        ${related.length ? `<h2 class="pd-h">${catById[p.cat].name}の人気商品</h2><div class="hs rail">${related.map((x) => card(x, { rail: true })).join('')}</div>` : ''}
      </div>
    </div>
    <div class="cta-bar">
      <button class="btn-ghost" id="buyNow">今すぐ買う</button>
      <button class="btn-primary grow" id="addCart">${ic('bag', 20)}<span>カートに入れる</span></button>
    </div>`;
  sheetEl.hidden = false;
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => requestAnimationFrame(() => sheetEl.classList.add('open')));
  hydrate(sheetEl);
  viewer.mount($('#pdLive'), () => { sfx.pop(); haptic(); });
  viewer.show(liveSpec(p, vi), 'pop');
  viewer.start();
  sfx.blip();
  bindSheetSwipe();
}
function closeSheet() {
  if (!sheet.p) return;
  sheet.p = null;
  sheetEl.classList.remove('open');
  document.documentElement.classList.remove('lock');
  viewer.unmount();
  setTimeout(() => { if (!sheet.p) { sheetEl.hidden = true; sheetEl.innerHTML = ''; sheetEl.style.transform = ''; } }, 420);
  if (cur === 'home') mountHero(true);
}
function pickVariant(i) {
  if (i === sheet.vi) return;
  sheet.vi = i; const p = sheet.p, v = p.variants[i];
  $('#pdVname').textContent = v.n;
  $$('.sw', sheetEl).forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-checked', j === i); });
  setStageVars();
  const img = $('#pdStage .stage-img'); img.dataset.k = `${p.id}:${i}`; hydrate($('#pdStage'));
  viewer.show(liveSpec(p, i), 'swap');
  sfx.blip(); haptic();
}
function addFromSheet(btn) {
  const { p, vi, qty } = sheet;
  const before = S.quote();
  S.addToCart(p.id, vi, qty);
  const src = urlCache.get(ckey(`${p.id}:${vi}`));
  flyTo($('#pdStage'), $('#tab-cart .tab-ic'), src, () => { bump($('#tab-cart .tab-ic')); bump($('#tab-cart .tab-badge'), 'pop'); });
  sfx.add(); haptic('success');
  btn.classList.add('done'); btn.innerHTML = `${ic('check', 20)}<span>追加しました</span>`;
  setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = `${ic('bag', 20)}<span>カートに入れる</span>`; }, 1300);
  shipCrossed(before);
}
function bindSheetSwipe() {
  const sc = $('#sheetScroll'); let y0 = null, dy = 0;
  sc.addEventListener('touchstart', (e) => { if (sc.scrollTop <= 0 && !e.target.closest('canvas')) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sc.addEventListener('touchmove', (e) => {
    if (y0 === null) return; dy = e.touches[0].clientY - y0;
    if (dy > 0 && sc.scrollTop <= 0) { sheetEl.style.transition = 'none'; sheetEl.style.transform = `translateY(${dy * 0.7}px)`; } else { y0 = null; sheetEl.style.transform = ''; sheetEl.style.transition = ''; }
  }, { passive: true });
  sc.addEventListener('touchend', () => {
    if (y0 === null) return; y0 = null; sheetEl.style.transition = '';
    if (dy > 110) { sheetEl.style.transform = ''; closeSheet(); } else sheetEl.style.transform = '';
  });
}

/* ================= wish / quick add ================= */
function syncHearts() {
  $$('[data-wish]').forEach((b) => {
    const on = S.isWished(b.dataset.wish);
    if (b.classList.contains('on') !== on) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.innerHTML = ic(on ? 'heart-f' : 'heart', b.classList.contains('heart-r') ? 20 : 18); }
  });
}
function toggleWish(btn) {
  const on = S.toggleWish(btn.dataset.wish);
  syncHearts();
  if (on) { sfx.heart(); haptic(); heartBurst(btn); } else sfx.unheart();
  checkBadges();
}
function heartBurst(btn) {
  if (reduced()) return;
  const r = btn.getBoundingClientRect();
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('i'); s.className = 'spark';
    const a = (i / 7) * Math.PI * 2;
    s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;--dx:${Math.cos(a) * 26}px;--dy:${Math.sin(a) * 26}px`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 600);
  }
  bump(btn, 'pulse');
}
function quickAdd(btn) {
  const id = btn.dataset.add, vi = +(btn.dataset.v || 0), before = S.quote();
  S.addToCart(id, vi, 1);
  flyTo(btn.closest('.tile'), $('#tab-cart .tab-ic'), urlCache.get(ckey(`${id}:${vi}`)), () => { bump($('#tab-cart .tab-ic')); bump($('#tab-cart .tab-badge'), 'pop'); });
  btn.classList.add('done'); btn.innerHTML = ic('check', 18);
  setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = ic('plus', 18); }, 1100);
  sfx.add(); haptic('success');
  shipCrossed(before);
}
function shipCrossed(before) {
  const after = S.quote();
  if (before.toFree > 0 && after.toFree <= 0) {
    setTimeout(() => { toast({ icon: 'truck', title: '送料無料になりました！', text: `カート合計 ${yen(after.subtotal)}`, tone: 'good' }); sfx.coin(); confetti({ y: 80, n: 50, power: 0.7 }); }, 650);
  } else if (state.mission) {
    // the pill counts up instead; milestones bring their own celebrations
  } else if (after.toFree > 0) {
    toast({ img: null, icon: 'bag', title: 'カートに追加しました', text: `あと${yen(after.toFree)}で送料無料`, ms: 1800 });
  } else toast({ icon: 'bag', title: 'カートに追加しました', text: `${S.cartCount()}点 · ${yen(after.subtotal)}`, ms: 1800 });
}

/* ================= シチュエーション爆買い =================
   A random scenario arrives as a chat message; the player shops for it however they like.
   Nothing is scored: the rewards are the spree itself, milestones, and a keepsake stamp. */
const AVA = ['#ff7aa2', '#5aa9ff', '#ffb21e', '#2fcf9a', '#9b7bff', '#ff8a3d'];
const avaColor = (s) => AVA[[...s.from].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVA.length];
const avatar = (s, cls = '') => `<span class="ava ${cls}" style="--a:${avaColor(s)}" aria-hidden="true">${esc([...s.from][0])}</span>`;
const chatHead = (s) => `<div class="chat-hd">${avatar(s)}<span><b>${esc(s.from)}</b><small>${esc(s.rel)}</small></span></div>`;
const sitTile = (s) => tileVars(byId[s.icon].variants[0].c);
function haulTpl(lines, max = 12) {
  const shown = lines.slice(0, max), rest = lines.length - shown.length;
  return `<div class="haul">${shown.map((l, i) => `<span class="mini-tile pop" style="${tileVars(byId[l.id].variants[l.v].c)};--i:${i}"><img data-k="${l.id}:${l.v}" alt="">${l.qty > 1 ? `<b>×${l.qty}</b>` : ''}</span>`).join('')}${rest > 0 ? `<span class="more">+${rest}</span>` : ''}</div>`;
}
function sitCardTpl() {
  const m = state.mission && sitById[state.mission.id];
  if (m) {
    const n = S.cartCount();
    return `<button class="sit-card on" data-sit-open style="${sitTile(m)}">
      <span class="sit-card-tx"><small>${ic('flash', 13)}お題に挑戦中</small><b>${esc(m.title)}</b><em>${avatar(m, 'xs')}<span>${esc(m.msgs[0])}</span></em></span>
      <span class="sit-pic"><img data-k="${m.icon}:0" alt=""></span>
      <span class="sit-go">${n ? `カート ${n}点` : 'お題を見る'}${ic('right', 16)}</span>
    </button>`;
  }
  const pics = seeded(SITUATIONS, Math.floor(Date.now() / 864e5)).slice(0, 3);
  return `<button class="sit-card" data-sit-start>
    <span class="sit-card-tx"><small>シチュエーション爆買い</small><b>お題にそって<br>好きなだけ爆買い</b><em>予算は無制限 · ${S.doneSituations().size}/${SITUATIONS.length}種あそんだ</em></span>
    <span class="sit-pics">${pics.map((s, i) => `<span class="sp sp${i}" style="${sitTile(s)}"><img data-k="${s.icon}:0" alt=""></span>`).join('')}</span>
    <span class="sit-go hot">${ic('flash', 16)}スタート</span>
  </button>`;
}
function refreshSitCard() { const el = $('#homeSit'); if (el) { el.innerHTML = sitCardTpl(); hydrate(el); } }
function sitBannerTpl() {
  const m = state.mission && sitById[state.mission.id]; if (!m) return '';
  return `<button class="sit-banner" data-sit-open style="${sitTile(m)}">${avatar(m)}<span><small>お題：${esc(m.title)}</small><b>準備ができたら、スライドで爆買い！</b></span>${ic('right', 18)}</button>`;
}

/* --- the pill that rides above the tab bar while a scenario is active --- */
let pillN = 0, pillY = 0;
function renderPill() {
  const m = state.mission && sitById[state.mission.id], pill = $('#mPill');
  document.documentElement.classList.toggle('has-mission', !!m);
  if (!m) { pill.hidden = true; pill.innerHTML = ''; return; }
  pillN = S.cartCount(); pillY = S.quote().subtotal;
  pill.innerHTML = `<span class="mp-ic" style="${sitTile(m)}"><img data-k="${m.icon}:0" alt=""></span>
    <span class="mp-tx"><small>お題に挑戦中</small><b>${esc(m.title)}</b></span>
    <span class="mp-ct"><b><span id="mpN">${pillN}</span>点</b><small id="mpY">${yen(pillY)}</small></span>`;
  pill.hidden = false; hydrate(pill);
}
function updatePill() {
  if (!state.mission) return;
  if (!$('#mpN')) { renderPill(); return; }
  const n = S.cartCount(), y = S.quote().subtotal;
  if (n !== pillN) { countUp($('#mpN'), pillN, n, 500); if (n > pillN) bump($('#mPill'), 'pulse-sm'); }
  if (y !== pillY) countUp($('#mpY'), pillY, y, 700, (v) => yen(v));
  pillN = n; pillY = y;
}
const N_MSG = { 5: 'いい調子！', 10: '止まらない！', 20: '爆買いモード突入', 30: 'もはや伝説', 50: 'カートがあふれそう', 100: '全部買う勢い' };
function milestoneFx() {
  const m = state.mission && sitById[state.mission.id]; if (!m) return;
  S.missionMilestones().forEach((h, i) => setTimeout(() => {
    const big = h.kind === 'n' ? h.v >= 20 : h.v >= 300000;
    toast({ icon: h.kind === 'n' ? 'bag' : 'coin', title: h.kind === 'n' ? `${h.v}点突破！${N_MSG[h.v] || ''}` : `${yen(h.v)}ぶん突破！`, text: `お題：${m.title}`, tone: 'badge', ms: 2400 });
    const r = $('#mPill')?.getBoundingClientRect();
    confetti({ x: r && r.width ? r.left + r.width / 2 : innerWidth / 2, y: r && r.width ? r.top : innerHeight - 150, n: big ? 120 : 55, power: big ? 1.25 : 0.95, spread: 1.5 });
    big ? sfx.levelUp() : sfx.coin(); haptic('success'); bump($('#mPill'), 'bump');
  }, 650 + i * 850));
}

/* --- roulette → chat → start --- */
let sitBusy = false, sitRunId = 0;
function swapModal(html, opts = {}) {
  modalOpts = opts;
  const card = $('.modal-card', modalEl); card.className = `modal-card${opts.bare ? ' bare' : ''}`; card.innerHTML = html;
  hydrate(modalEl);
}
function runReel(T) {
  return new Promise((resolve) => {
    const list = $('#reelList'), H = 76, dur = reduced() ? 300 : 2700, t0 = performance.now();
    let last = -1;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), p = 1 - Math.pow(1 - k, 3.6);
      list.style.transform = `translateY(${-p * (T - 1) * H}px)`;
      const idx = Math.round(p * (T - 1)); if (idx !== last) { last = idx; sfx.tick(); if (k > 0.55) haptic(); }
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}
async function startSituation(exclude = null, forceId = null) {
  if (sitBusy) return; sitBusy = true;
  const run = ++sitRunId;
  // stop quietly if the modal was closed or replaced while the sequence was playing
  const gone = () => { if (run === sitRunId && $('#sitChat')) return false; sitBusy = false; return true; };
  unlockAudio();
  SITUATIONS.forEach((s) => thumbUrl(`${s.icon}:0`, true));
  const target = forceId ? sitById[forceId] : S.pickSituation(exclude);
  const rand = () => SITUATIONS[(Math.random() * SITUATIONS.length) | 0];
  const reel = [];
  while (reel.length < 22) { const s = rand(); if (s.id !== target.id && s.id !== reel[reel.length - 1]?.id) reel.push(s); }
  let tail = rand(); while (tail.id === target.id) tail = rand();
  reel.push(target, tail);
  const T = reel.length - 2, inCart = S.cartCount();
  const html = `
    <div class="sit-run" style="${sitTile(target)}">
      <p class="eyebrow">SITUATION</p>
      <h2 class="sit-q" id="sitQ">今回のお題は…</h2>
      <div class="reel-wrap" id="reelWrap"><div class="reel"><ul class="reel-list" id="reelList">${reel.map((s) => `<li><span class="reel-ic" style="${sitTile(s)}"><img data-k="${s.icon}:0" alt=""></span><b>${esc(s.title)}</b></li>`).join('')}</ul></div><span class="reel-frame"></span></div>
      <div class="chat" id="sitChat" hidden>${chatHead(target)}<div class="chat-body" id="chatBody"></div></div>
      <div class="sit-foot" id="sitFoot" hidden>
        <p class="sit-free">${ic('flash', 16)}予算は無制限。思うままに爆買い！</p>
        <div class="sit-hints"><span>ヒント</span>${target.cats.map((c) => `<button class="chip" data-sit-go="${target.id}" data-sit-cat="${c}">${catById[c].short}</button>`).join('')}</div>
        ${inCart ? `<button class="btn-text" id="sitEmpty">いまのカート（${inCart}点）を空にしてから始める</button>` : ''}
        <div class="sit-btns"><button class="btn-ghost" data-sit-reroll="${target.id}">別のお題</button><button class="btn-primary" data-sit-go="${target.id}">${ic('bag', 18)}買い物スタート</button></div>
      </div>
    </div>`;
  if (modalOpen) swapModal(html, { locked: true }); else openModal(html, { locked: true });
  sfx.whoosh(); haptic();
  await wait(reduced() ? 50 : 350);
  await runReel(T);
  if (gone()) return;
  $$('#reelList li')[T]?.classList.add('hit');
  $('#sitQ').textContent = target.title; bump($('#sitQ'), 'pop');
  sfx.reveal(1); haptic('heavy');
  confetti({ y: innerHeight * 0.38, n: 70, power: 0.95 });
  await wait(reduced() ? 200 : 1000);
  if (gone()) return;
  $('#reelWrap').hidden = true; $('#sitChat').hidden = false;
  const body = $('#chatBody');
  for (const text of target.msgs) {
    const row = document.createElement('div'); row.className = 'msg-row';
    row.innerHTML = '<div class="bubble typing"><i></i><i></i><i></i></div>';
    body.appendChild(row);
    await wait(reduced() ? 120 : 700);
    if (gone()) return;
    const b = row.firstElementChild; b.classList.remove('typing'); b.textContent = text; bump(b, 'pop');
    sfx.msg(); haptic();
    await wait(reduced() ? 80 : 420);
  }
  if (gone()) return;
  $('#sitFoot').hidden = false; bump($('#sitFoot'), 'rise');
  modalOpts.locked = false; sitBusy = false;
}
function goMission(id, cat) {
  const s = sitById[id]; if (!s) return;
  sitRunId++; sitBusy = false;
  S.startMission(id);
  modalOpts.locked = false; closeModal();
  sfx.levelUp(); haptic('success');
  confetti({ y: innerHeight * 0.35, n: 90 });
  toast({ icon: 'flash', title: `お題スタート：${s.title}`, text: '思うままにカートへ入れよう！', tone: 'good', ms: 3200 });
  if (cat) { ex.cat = cat; ex.q = ''; go('explore', { top: true }); exResults(); }
}
function openMission() {
  const s = state.mission && sitById[state.mission.id]; if (!s) return;
  const lines = S.cartLines(), n = S.cartCount();
  openModal(`
    <div class="sit-open" style="${sitTile(s)}">
      <p class="eyebrow">お題に挑戦中</p><h2>${esc(s.title)}</h2>
      <div class="chat">${chatHead(s)}<div class="chat-body">${s.msgs.map((m) => `<div class="msg-row"><div class="bubble">${esc(m)}</div></div>`).join('')}</div></div>
      ${n ? `${haulTpl(lines, 8)}<div class="haul-stat"><b>${fmt(n)}点</b>カートに入れた<span>${yen(S.quote().subtotal)}ぶん</span></div>` : '<p class="muted">まだカートは空っぽ。思いつくままに入れていこう！</p>'}
      <div class="sit-hints"><span>ヒント</span>${s.cats.map((c) => `<button class="chip" data-sit-cat="${c}">${catById[c].short}</button>`).join('')}</div>
      <div class="sit-btns"><button class="btn-ghost" data-close>さらに買う</button><button class="btn-primary" data-sit-cart ${n ? '' : 'disabled'}>${ic('bag', 18)}購入へ</button></div>
      <div class="sit-quit" id="sitQuit"><button class="btn-text" data-sit-quit>このお題をやめる</button></div>
    </div>`);
}
function sitBookTpl() {
  const recs = {}; state.missions.forEach((m) => (recs[m.id] ||= []).push(m));
  return `<div class="stamps">${SITUATIONS.map((s) => {
    const r = recs[s.id];
    return r
      ? `<button class="stamp on" data-sit-log="${s.id}" style="${sitTile(s)}"><span class="stamp-ic"><img data-k="${s.icon}:0" alt=""></span><b>${esc(s.title)}</b>${r.length > 1 ? `<small>${r.length}回</small>` : ''}</button>`
      : '<div class="stamp"><span class="stamp-ic">?</span><b>？？？</b></div>';
  }).join('')}</div>
  <button class="btn-ghost sit-book-go" data-sit-start>${ic('flash', 18)}${state.mission ? '挑戦中のお題を見る' : 'シチュエーションをはじめる'}</button>`;
}
function showSitLog(id) {
  const s = sitById[id], r = state.missions.find((m) => m.id === id); if (!s || !r) return;
  const lines = r.keys.map((k) => { const [pid, v] = k.split(':'); return { id: pid, v: +v, qty: 1 }; }).filter((l) => byId[l.id]);
  const d = new Date(r.at);
  openModal(`
    <div class="sit-open" style="${sitTile(s)}">
      <p class="eyebrow">${d.getMonth() + 1}月${d.getDate()}日の思い出</p><h2>${esc(s.title)}</h2>
      <div class="chat">${chatHead(s)}<div class="chat-body">
        <div class="msg-row"><div class="bubble">${esc(s.msgs[0])}</div></div>
        <div class="msg-row me"><div class="bubble">${fmt(r.count)}点、買ってきたよ！</div></div>
        <div class="msg-row"><div class="bubble">${esc(s.reply)}</div></div>
      </div></div>
      ${haulTpl(lines, 12)}
      <div class="haul-stat"><b>${fmt(r.count)}点</b>を爆買い<span>${yen(r.total)}ぶん</span></div>
      <div class="sit-btns"><button class="btn-ghost" data-close>とじる</button><button class="btn-primary" data-sit-again="${s.id}" ${state.mission ? 'disabled' : ''}>${ic('repeat', 18)}もう一度あそぶ</button></div>
    </div>`);
}

/* ================= modal & toasts ================= */
const modalEl = $('#modal');
let modalOpen = false, modalOpts = {};
const modalQueue = [];
function openModal(html, opts = {}) {
  if (modalOpen) { modalQueue.push([html, opts]); return; }
  modalOpen = true; modalOpts = opts;
  modalEl.innerHTML = `<div class="modal-card${opts.bare ? ' bare' : ''}">${html}</div>`;
  modalEl.hidden = false;
  document.documentElement.classList.add('lock');
  requestAnimationFrame(() => requestAnimationFrame(() => modalEl.classList.add('in')));
  hydrate(modalEl);
}
function closeModal() {
  if (!modalOpen || modalOpts.locked) return;
  const done = modalOpts.onClose;
  modalOpen = false; modalEl.classList.remove('in');
  if (!sheet.p) document.documentElement.classList.remove('lock');
  setTimeout(() => {
    if (!modalOpen) { modalEl.hidden = true; modalEl.innerHTML = ''; }
    done && done();
    if (!modalOpen && modalQueue.length) { const [h, o] = modalQueue.shift(); openModal(h, o); }
  }, 260);
}
modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });

function toast({ icon = 'check', img = null, title, text = '', tone = '', action, onAction, ms = 2600 }) {
  const box = $('#toasts');
  while (box.children.length > 2) box.lastElementChild.remove();
  const t = document.createElement('div'); t.className = `toast ${tone}`;
  t.innerHTML = `<span class="toast-ic">${img ? `<img src="${img}" alt="">` : ic(icon, 20)}</span><span class="toast-tx"><b>${title}</b>${text ? `<small>${text}</small>` : ''}</span>${action ? `<button class="toast-act">${action}</button>` : ''}`;
  box.prepend(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
  const kill = () => { t.classList.remove('in'); t.classList.add('out'); setTimeout(() => t.remove(), 350); };
  const tm = setTimeout(kill, ms);
  t.querySelector('.toast-act')?.addEventListener('click', () => { clearTimeout(tm); kill(); onAction && onAction(); });
}
function checkBadges() {
  const got = S.newBadges();
  if (got.length && cur === 'me' && !modalOpen) renderMe();
  got.forEach((b, i) => setTimeout(() => {
    toast({ icon: b.icon, title: `バッジ獲得：${b.name}`, text: b.desc, tone: 'badge', ms: 3200 });
    sfx.coin(); haptic('success');
  }, 300 + i * 900));
}

/* ================= badges on tabs & bound numbers ================= */
let shownPts = state.points;
function updateBadges() {
  const n = S.cartCount(), cb = $('#tab-cart .tab-badge');
  cb.hidden = !n; cb.textContent = n > 99 ? '99+' : n;
  const gb = $('#tab-gacha .tab-badge'); gb.hidden = !state.tickets; gb.classList.add('dot');
  const mb = $('#tab-me .tab-badge'); mb.hidden = !state.orders.some((o) => S.stageOf(o).done && !o.opened); mb.classList.add('dot');
}
S.on((topic) => {
  updateBadges();
  if (state.points !== shownPts) { $$('[data-bind="points"]').forEach((el) => countUp(el, shownPts, state.points)); shownPts = state.points; }
  $$('[data-bind="tickets"]').forEach((el) => (el.textContent = state.tickets));
  if (topic === 'cart') {
    if (cur === 'cart') renderCart();
    const hs = $('#homeShip'); if (hs) hs.innerHTML = shipBanner();
    const ps = $('#pdShip'); if (ps) { const q = S.quote(); ps.innerHTML = `${ic('gift', 20)}<span>${q.toFree > 0 ? `<b>あと${yen(q.toFree)}で送料無料</b>` : '<b>送料無料</b>'}カートの商品と合わせて計算</span>`; }
    if (state.mission) { refreshSitCard(); updatePill(); milestoneFx(); }
  }
  if (topic === 'mission' || topic === 'order' || topic === 'reset') {
    renderPill(); refreshSitCard();
    if (cur === 'cart' && topic === 'mission') renderCart();
    if (cur === 'me' && topic === 'mission') renderMe();
  }
  if (topic === 'wish' && cur === 'me') renderMe();
  if (topic === 'reset') { $$('.view').forEach((v) => delete v.dataset.ready); render(cur, true); }
});

/* ================= events ================= */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [role="button"]'); if (!t) return;
  unlockAudio();
  const d = t.dataset;
  if (d.tab) { haptic(); sfx.tap(); if (sheet.p) closeSheet(); go(d.tab, { focus: !!d.focus }); return; }
  if (d.sitStart !== undefined) { if (sheet.p) closeSheet(); state.mission ? openMission() : startSituation(); return; }
  if (d.sitAgain) { startSituation(null, d.sitAgain); return; }
  if (d.sitReroll) { startSituation(d.sitReroll); return; }
  if (d.sitGo) { goMission(d.sitGo, d.sitCat); return; }
  if (d.sitCat) { closeModal(); ex.cat = d.sitCat; ex.q = ''; go('explore', { top: true }); exResults(); return; }
  if (d.sitOpen !== undefined) { openMission(); sfx.tap(); return; }
  if (d.sitCart !== undefined) { closeModal(); go('cart', { top: true }); return; }
  if (d.sitQuit !== undefined) { $('#sitQuit').innerHTML = '<span>やめても、カートの中身はそのまま残ります</span><button class="btn-text" data-sit-quit-no>つづける</button><button class="btn-text danger" data-sit-quit-yes>やめる</button>'; return; }
  if (d.sitQuitNo !== undefined) { $('#sitQuit').innerHTML = '<button class="btn-text" data-sit-quit>このお題をやめる</button>'; return; }
  if (d.sitQuitYes !== undefined) { S.quitMission(); closeModal(); toast({ icon: 'info', title: 'お題をやめました', text: 'カートの中身はそのまま残っています' }); return; }
  if (d.sitLog) { showSitLog(d.sitLog); return; }
  if (t.id === 'sitEmpty') {
    state.cart.length = 0; S.emit('cart'); t.remove();
    if (state.mission) { state.mission.peakN = 0; state.mission.peakY = 0; }
    toast({ icon: 'trash', title: 'カートを空にしました', ms: 1600 }); return;
  }
  if (d.wish) { toggleWish(t); return; }
  if (d.add) { quickAdd(t); return; }
  if (d.p) { openProduct(d.p, +(d.v || 0)); return; }
  if (d.cat) { ex.cat = d.cat; ex.q = ''; sfx.tap(); haptic(); go('explore', { top: true }); exResults(); return; }
  if (d.excat) { ex.cat = d.excat; sfx.tap(); haptic(); exResults(); return; }
  if (d.sort) { ex.sort = d.sort; sfx.tap(); exResults(); return; }
  if (d.kw) { ex.q = d.kw; $('#q').value = d.kw; sfx.tap(); exResults(); return; }
  if (d.hero) { setHero(+d.hero); sfx.tap(); return; }
  if (d.qty) { const i = +d.qty, l = state.cart[i]; if (!l) return; S.setQty(i, l.qty + +d.d); +d.d > 0 ? (sfx.blip(), haptic()) : sfx.tap(); return; }
  if (d.coupon !== undefined) { state.applied = d.coupon || null; S.emit('cart'); sfx.blip(); haptic(); return; }
  if (d.unbox) { unbox(d.unbox); return; }
  if (d.again) { const o = state.orders.find((x) => x.no === d.again); o?.lines.forEach((l) => S.addToCart(l.id, l.v, l.qty)); sfx.add(); haptic('success'); toast({ icon: 'bag', title: 'カートに追加しました', text: `${S.cartCount()}点` }); return; }
  if (d.vi !== undefined) { pickVariant(+d.vi); return; }
  if (d.pqty) { sheet.qty = Math.max(1, Math.min(99, sheet.qty + +d.pqty)); $('#pdQty').textContent = sheet.qty; bump($('#pdQty'), 'pop'); sfx.tick(); haptic(); return; }
  if (d.sheetClose !== undefined) { closeSheet(); return; }
  if (d.close !== undefined) { closeModal(); return; }
  if (d.track !== undefined) { closeModal(); go('me', { top: true }); return; }
  if (t.id === 'addCart') { addFromSheet(t); return; }
  if (t.id === 'buyNow') { const { p, vi, qty } = sheet; S.addToCart(p.id, vi, qty); sfx.add(); haptic('success'); closeSheet(); go('cart', { top: true }); return; }
  if (t.id === 'spinBtn') { spinGacha(); return; }
  if (t.id === 'resetBtn') {
    $('#resetRow').innerHTML = `<span>カート・注文・ポイントがすべて消えます</span><button class="btn-text" id="resetNo">やめる</button><button class="btn-text danger" id="resetYes">リセット</button>`; return;
  }
  if (t.id === 'resetNo') { renderMe(); return; }
  if (t.id === 'resetYes') { S.reset(); Object.assign(fxSettings, state.settings); shownPts = state.points; toast({ title: 'データをリセットしました' }); return; }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'usePts') { state.usePoints = t.checked; S.emit('cart'); haptic(); sfx.blip(); }
  if (t.dataset.set) { S.setSetting(t.dataset.set, t.checked); fxSettings[t.dataset.set] = t.checked; if (t.checked) { haptic(); sfx.blip(); } }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOpen) closeModal(); else if (sheet.p) closeSheet();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ================= boot ================= */
updateBadges();
renderPill();
const start = (location.hash || '').slice(1);
go(TABS.some((t) => t.id === start) ? start : 'home', { force: true });
setInterval(() => {
  const cd = countdown();
  $$('[data-countdown]').forEach((el) => (el.textContent = cd));
  liveOrders();
}, 1000);
if (S.claimDaily()) setTimeout(() => { toast({ icon: 'ticket', title: 'デイリーチケットを受け取りました', text: 'ガチャを1回まわせます', tone: 'good', action: 'まわす', onAction: () => go('gacha') }); }, 1400);
// warm the cache in the background: one photo per product, then the app objects
setTimeout(() => { PRODUCTS.forEach((p) => thumbUrl(`${p.id}:0`)); ['@box', '@bag', '@gc:X', '@gc:SR'].forEach((k) => thumbUrl(k)); }, 1800);
window.__dopa = { state, go, openProduct };
