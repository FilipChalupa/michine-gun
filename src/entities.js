// Game logic: spawning, waves, firing, collisions, particles.
import { S, view, pointer, motion, gun, rnd, clamp, pick, floatText, BUG_TYPES, BOSSES, BALANCE, BREAK_LEN, saveBest, offerUpgrades, takeUpgrade } from './state.js';
import { sfx } from './audio.js';

export const clouds = Array.from({ length: 7 }, () => ({ x: Math.random(), y: 0.05 + Math.random() * 0.3, s: rnd(0.7, 1.5), v: rnd(6, 14) }));
export const hooks = { onGameOver: () => {}, onUpgradeOffer: () => {} };

// Short haptic feedback on phones; skipped with reduced motion and where unsupported (iOS).
function buzz(pattern) {
  if (motion.reduced || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

function shake(v) { if (!motion.reduced) S.shake = Math.max(S.shake, v); }
function hitStop(t) { if (!motion.reduced) S.hitStop = Math.max(S.hitStop, t); }

// ---------- particles ----------
export function burstHearts(x, y, n) {
  for (let i = 0; i < n; i++) S.parts.push({ kind: 'heart', x, y, vx: rnd(-90, 90), vy: rnd(-160, -40), life: rnd(0.8, 1.4), max: 1.4, r: rnd(5, 10), c: ['#ff6b8b', '#ff9ec2', '#f5c400', '#ff4d6d'][i % 4] });
}
export function puff(x, y, n, c) {
  for (let i = 0; i < n; i++) S.parts.push({ kind: 'smoke', x, y, vx: rnd(-80, 80), vy: rnd(-90, 10), life: rnd(0.5, 0.9), max: 0.9, r: rnd(8, 18), c });
}
function steam(x, y) {
  S.parts.push({ kind: 'smoke', x, y, vx: rnd(-15, 15), vy: rnd(-120, -60), life: rnd(0.5, 0.9), max: 0.9, r: rnd(5, 9), c: 'rgba(240,240,255,.9)' });
}

// ---------- bugs ----------
export function makeBug(type, opts = {}) {
  const T = BUG_TYPES[type]; const { W, H } = view;
  const wave = Math.max(1, S.wave);
  const bug = {
    id: S.nextId++, type, size: T.size, hp: T.hp, maxhp: T.hp, dmg: T.dmg,
    speed: T.speed * (1 + (wave - 1) * BALANCE.speedPerWave) * S.bugSpeed,
    x: W + T.size + 10, baseY: rnd(H * 0.16, H * 0.62), y: 0,
    happy: false, t: Math.random() * 10, fade: 1, hug: [], wob: rnd(0.8, 1.4),
    tag: pick(T.tags), flash: 0, hidden: false, blinkT: rnd(1, 2), sinceHit: 9, spawnT: 2.5,
    ...opts,
  };
  bug.y = bug.baseY; S.bugs.push(bug); return bug;
}
function pickType() {
  const w = S.wave, r = Math.random(), table = [];
  if (w >= 2) table.push(['b', 0.15 + w * 0.01]);
  if (w >= 3) table.push(['f', 0.18]);
  if (w >= 4) table.push(['d', 0.13]);
  if (w >= 4) table.push(['c', 0.11]);
  if (w >= 5) table.push(['h', 0.13]);
  let acc = 0; for (const [t, p] of table) { acc += p; if (r < acc) return t; }
  return 's';
}
const hittable = b => !b.happy && !b.hidden && b.fade > 0.5;

export function startWave(n) {
  S.wave = n; S.phase = 'wave'; S.spawned = 0; S.waveHits = 0; S.spawnT = 1.0;
  const boss = n % 5 === 0; const { W, H } = view;
  S.quota = boss ? 4 + n : BALANCE.quotaBase + n * BALANCE.quotaPerWave;
  floatText(W * 0.55, H * 0.35, boss ? 'VLNA ' + n + ' · BOSS' : 'VLNA ' + n, boss ? '#ff6b6b' : '#f5c400', 60, 1.8);
  const tips = { 1: 'Pal v dávkách, hlaveň se přehřívá. Pás se nabije, až když dojde.', 2: 'Kritické bugy P0 potřebují 3 myši!', 3: 'Rychlé regrese! Miř před ně.', 4: 'Duplicity se dělí, cache se vrací.', 5: 'Heisenbug mizí a objevuje se jinde.' };
  if (boss) {
    const round = n / 5 - 1, kind = BOSSES[round % BOSSES.length];
    const hp = kind.hp + BALANCE.bossHpPerRound * round;
    makeBug('B', { baseY: H * 0.4, hp, maxhp: hp, boss: kind.key, tag: kind.tag, speed: kind.speed * S.bugSpeed });
    S.bossAlive = true; S.bossTalkT = 2; sfx.boss(); shake(8); buzz([80, 40, 80]);
    floatText(W * 0.55, H * 0.35 + 50, kind.tip, '#f3e7cf', 20, 3);
  } else {
    if (tips[n]) floatText(W * 0.55, H * 0.35 + 50, tips[n], '#f3e7cf', 20, 2.6);
    sfx.wave();
  }
}
// A cleared wave freezes the game and offers three upgrades; picking one starts a short break.
function endWave() {
  S.heat = 0; S.overheated = false; sfx.waveDone();
  S.offer = offerUpgrades();
  if (!S.offer.length) { S.phase = 'break'; S.breakT = BREAK_LEN; return; }
  S.phase = 'upgrade'; pointer.down = false; pointer.space = false;
  hooks.onUpgradeOffer(S.offer);
}
export function chooseUpgrade(id) {
  if (S.phase !== 'upgrade' || !S.offer.some(u => u.id === id)) return;
  takeUpgrade(id); const u = S.offer.find(u => u.id === id), { W, H } = view;
  floatText(W * 0.55, H * 0.35, u.icon + ' ' + u.name, '#7CFC9A', 36, 2);
  S.offer = []; S.phase = 'break'; S.breakT = BREAK_LEN;
}
// Manual reload (R key or a tap on the ammo): throws away what is left in the belt.
export function reload() {
  if (!S.running || S.paused || S.phase === 'upgrade' || S.reloading || S.ammo >= S.maxAmmo) return false;
  const g = gun();
  S.ammo = 0; S.reloading = true; S.reloadT = S.reloadLen; sfx.reload();
  floatText(g.x + 40, g.y - 70, 'PŘEBÍJÍM', '#8ecbff', 18, 0.9);
  return true;
}

function cheerUp(gr) {
  const { W, H } = view;
  gr.happy = true; S.combo++; S.waveHits++; S.cheered++;
  const mult = 1 + Math.min(S.combo, 30) * 0.1, boss = gr.type === 'B';
  const pts = Math.round((boss ? 200 : 10 * gr.maxhp * (gr.type === 'f' ? 1.5 : 1)) * mult);
  S.score += pts; S.peace = Math.min(100, S.peace + (boss ? 15 : gr.type === 'b' ? 3 : 1));
  floatText(gr.x, gr.y - gr.size - 26, '+' + pts + (S.combo >= 5 ? '  x' + mult.toFixed(1) : ''), '#f5c400', boss ? 34 : 22, 1);
  burstHearts(gr.x, gr.y, boss ? 40 : gr.type === 'b' ? 14 : 8);
  if (boss) {
    S.bossAlive = false; sfx.bigPop(); hitStop(0.35); shake(14); buzz([40, 30, 40, 30, 120]);
    floatText(W * 0.55, H * 0.3, { prod: 'PROD JE ZPÁTKY!', legacy: 'MONOLIT PŘEPSÁN!', leak: 'PAMĚŤ UVOLNĚNA!' }[gr.boss] || 'BOSS PORAŽEN!', '#7CFC9A', 44, 2);
  } else if (S.combo % 5 === 0) { hitStop(0.12); sfx.hitstop(); sfx.pop(); } else sfx.pop();
  if (gr.type === 'd') {
    for (const i of [0, 1]) makeBug('s', { x: gr.x + 10, baseY: clamp(gr.baseY + (i ? 40 : -40), H * 0.1, H * 0.7), size: 20, dmg: 5, tag: 'dup #' + (i + 1), speed: 95 * (1 + (S.wave - 1) * 0.06) });
    floatText(gr.x, gr.y + gr.size + 14, 'rozdělil se!', '#ffb3b3', 14, 0.8);
  }
  if (gr.type === 'c') S.pending.push({ t: 2.5, fn: () => {
    if (!S.running) return;
    makeBug('s', { size: 26, dmg: 6, tag: 'stale cache', baseY: gr.baseY });
    floatText(W - 90, gr.baseY - 50, 'cache se vrátila', '#ffb3b3', 14, 1);
  } });
}
function hitBug(gr, m) {
  gr.hp -= m.golden ? 3 : 1; S.hits++; gr.flash = 0.12; gr.sinceHit = 0;
  if (gr.boss === 'leak') gr.size = Math.max(80, gr.size - 3);
  if (gr.hug.length < (gr.type === 'B' ? 8 : 4)) gr.hug.push({ dx: rnd(-gr.size * 0.5, gr.size * 0.5), dy: rnd(-gr.size * 0.4, gr.size * 0.4), rot: rnd(-1, 1) });
  if (gr.type === 'b') shake(5);
  if (gr.hp <= 0) cheerUp(gr);
  else { floatText(gr.x, gr.y - gr.size - 26, gr.type === 'B' ? pick(['AU', 'to není bug', 'to nic nebylo']) : 'ERR', '#ddd', 16, 0.5); sfx.hmpf(); }
}
function breach(gr, i, g) {
  S.peace -= gr.dmg; S.combo = S.comboKeep ? Math.floor(S.combo / 2) : 0; S.shock = 1.2; shake(gr.type === 'B' ? 16 : 10);
  buzz(gr.type === 'B' ? [200, 60, 200] : 70);
  puff(gr.x, gr.y, gr.type === 'B' ? 30 : 12, '#4b4b50'); sfx.thud();
  floatText(g.x + 60, g.y - 90, '-' + gr.dmg + ' MÍR', '#ff6b6b', gr.type === 'B' ? 36 : 26, 1.2);
  if (gr.type === 'B') S.bossAlive = false;
  S.bugs.splice(i, 1);
  if (S.peace <= 0) { S.peace = 0; gameOver(); }
}
function gameOver() {
  S.running = false; S.over = true; saveBest(); sfx.over(); hooks.onGameOver();
}

// ---------- firing ----------
export function fire() {
  const g = gun(), golden = S.golden;
  const L = 128 - S.recoil * 10;
  let sx = 0, sy = 0;
  for (let k = 0; k < (golden ? 1 : S.barrels); k++) {
    const a = S.angle + (golden ? 0 : rnd(-0.06, 0.06)) + (S.barrels > 1 && !golden ? (k ? 0.07 : -0.07) : 0);
    sx = g.x + Math.cos(a) * L; sy = g.y + Math.sin(a) * L;
    const sp = golden ? 1000 : rnd(820, 920);
    S.mice.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: a, t: 0, golden, hitIds: golden ? new Set() : null });
    for (let i = 0; i < 4; i++) S.parts.push({ kind: 'spark', x: sx, y: sy, vx: Math.cos(a + rnd(-0.5, 0.5)) * rnd(80, 260), vy: Math.sin(a + rnd(-0.5, 0.5)) * rnd(80, 260), life: rnd(0.12, 0.25), max: 0.25, r: rnd(2, 5), c: golden ? '#ffd700' : '#ffd35a' });
  }
  S.ammo -= 1; S.shots++;
  if (S.ammo <= 0) { S.ammo = 0; S.reloading = true; S.reloadT = S.reloadLen; floatText(g.x + 40, g.y - 70, 'PÁS PRÁZDNÝ · NABÍJÍM', '#ffb3b3', 18, 1); sfx.reload(); }
  S.recoil = 1; S.fireAnim = 0.12; shake(golden ? 5 : 2);
  S.heat = Math.min(1, S.heat + S.heatPerShot);
  if (S.heat >= 1 && !S.overheated) { S.overheated = true; floatText(g.x + 60, g.y - 80, 'PŘEHŘÁTO!', '#ff6b6b', 24, 1.2); sfx.overheat(); buzz([30, 30, 30]); }
  if (golden) { S.golden = false; floatText(sx, sy - 30, 'ZLATÁ MYŠ!', '#ffd700', 20, 0.8); }
  S.parts.push({ kind: 'smoke', x: sx, y: sy, vx: rnd(-20, 40), vy: rnd(-60, -20), life: 0.7, max: 0.7, r: rnd(6, 12) });
  sfx.squeak(golden);
}

// ---------- update ----------
export function update(rawDt) {
  for (const c of clouds) { c.x -= c.v * rawDt / view.W; if (c.x < -0.2) c.x += 1.4; }
  if (!S.running || S.paused || S.phase === 'upgrade') return;
  let dt = rawDt;
  if (S.hitStop > 0) { S.hitStop -= rawDt; dt = rawDt * 0.12; }
  S.time += dt;
  const g = gun(), { W, H } = view;

  // aiming: a mouse aims at the cursor; a finger tilts the barrel by its height above the bottom edge,
  // so the thumb can rest anywhere without covering the targets
  let target;
  if (pointer.touch) {
    // relative: the tilt follows how far the finger moved from where it landed (full range = 40 % of the height)
    const k = 1.67 / (H * 0.4);
    target = pointer.startAngle + (pointer.y - pointer.startY) * k;
    if (target < -1.45) { pointer.startY += (-1.45 - target) / k; target = -1.45; }   // re-anchor at the limits so
    if (target > 0.22) { pointer.startY -= (target - 0.22) / k; target = 0.22; }      // reversing responds at once
  } else {
    const dx = pointer.x - g.x, dy = pointer.y - g.y;
    target = Math.atan2(dy, dx);
    if (dx < 0) target = dy < 0 ? -1.45 : 0.2;
    target = clamp(target, -1.45, 0.22);
  }
  S.angle += (target - S.angle) * Math.min(1, dt * 18);

  // the tilt-slider hint is only a tutorial: it fades out a few seconds after the first touch
  if (S.touchGuideT === null) { if (pointer.touch && pointer.down) S.touchGuideT = 4; }
  else if (S.touchGuideT > 0) S.touchGuideT = Math.max(0, S.touchGuideT - dt);

  // heat & firing
  S.heat = Math.max(0, S.heat - (S.overheated ? 0.5 : 0.3) * dt);
  if (S.overheated) {
    if (Math.random() < dt * 30) steam(g.x + Math.cos(S.angle) * 120, g.y + Math.sin(S.angle) * 120);
    if (S.heat <= 0.3) { S.overheated = false; sfx.cool(); floatText(g.x + 60, g.y - 80, 'HLAVEŇ OK', '#7CFC9A', 16, 0.7); }
  }
  S.fireT -= dt;
  if ((pointer.down || pointer.space) && S.fireT <= 0) {
    if (S.overheated || S.reloading) S.fireT = 0.2;
    else if (S.ammo >= 1) { fire(); S.fireT = S.fireInterval; }
  }
  // the belt refills only once it is completely empty
  if (S.reloading) {
    S.reloadT -= dt;
    if (S.reloadT <= 0) { S.reloading = false; S.ammo = S.maxAmmo; sfx.reloaded(); buzz(15); floatText(g.x + 40, g.y - 70, 'PÁS NABITÝ', '#7CFC9A', 16, 0.7); }
  }
  S.recoil = Math.max(0, S.recoil - dt * 9);
  S.fireAnim = Math.max(0, S.fireAnim - dt);
  S.shake = Math.max(0, S.shake - rawDt * 14);
  S.shock = Math.max(0, S.shock - dt);
  if (!S.golden) { S.goldenT -= dt; if (S.goldenT <= 0) { S.golden = true; S.goldenT = S.goldenEvery; floatText(g.x, g.y - 115, 'ZLATÁ MYŠ V PÁSU! Proletí vším.', '#ffd700', 18, 1.6); sfx.golden(); } }

  // waves
  if (S.phase === 'break') { S.breakT -= dt; if (S.breakT <= 0) startWave(S.wave + 1); }
  else {
    S.spawnT -= dt;
    if (S.spawned < S.quota && S.spawnT <= 0) {
      makeBug(pickType()); S.spawned++;
      const interval = BALANCE.spawnBase / (1 + (S.wave - 1) * BALANCE.spawnPerWave);
      S.spawnT = Math.max(BALANCE.spawnMin, interval * rnd(0.6, 1.3)) * (S.bossAlive ? 2.2 : 1);
    }
    if (S.spawned >= S.quota && S.pending.length === 0 && !S.bugs.some(b => !b.happy)) endWave();
  }
  if (S.bossAlive) {
    S.bossTalkT -= dt;
    if (S.bossTalkT <= 0) { const b = S.bugs.find(b => b.type === 'B' && !b.happy); if (b) floatText(b.x, b.y - b.size - 48, pick((BOSSES.find(k => k.key === b.boss) || BOSSES[0]).lines), '#2b2119', 16, 2.2, true); S.bossTalkT = rnd(3, 4.5); }
  }
  for (let i = S.pending.length - 1; i >= 0; i--) { const p = S.pending[i]; p.t -= dt; if (p.t <= 0) { S.pending.splice(i, 1); p.fn(); } }

  // mice
  for (let i = S.mice.length - 1; i >= 0; i--) {
    const m = S.mice[i];
    m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vy += (m.golden ? 120 : 260) * dt; m.rot = Math.atan2(m.vy, m.vx) + Math.sin(m.t * 20) * 0.15;
    let hit = false;
    for (const gr of S.bugs) {
      if (!hittable(gr)) continue;
      if (m.golden && m.hitIds.has(gr.id)) continue;
      const ddx = gr.x - m.x, ddy = gr.y - m.y;
      if (ddx * ddx + ddy * ddy < (gr.size + (m.golden ? 14 : 8)) ** 2) {
        hitBug(gr, m);
        if (m.golden) m.hitIds.add(gr.id); else { hit = true; break; }
      }
    }
    if (hit || m.x > W + 40 || m.y > H + 40 || m.x < -40) S.mice.splice(i, 1);
  }

  // bugs
  for (let i = S.bugs.length - 1; i >= 0; i--) {
    const gr = S.bugs[i];
    gr.t += dt; gr.flash = Math.max(0, gr.flash - dt); gr.sinceHit += dt;
    if (!gr.happy && gr.boss === 'legacy') { // the monolith keeps shedding old bugs
      gr.spawnT -= dt;
      if (gr.spawnT <= 0 && gr.x < W - 60) { gr.spawnT = 3.2; const kind = BOSSES.find(k => k.key === 'legacy'); makeBug('s', { x: gr.x - gr.size * 0.6, baseY: clamp(gr.y + rnd(-90, 90), H * 0.12, H * 0.66), size: 22, dmg: 6, tag: pick(kind.spawn) }); puff(gr.x - gr.size * 0.6, gr.y, 5, 'rgba(120,110,90,.9)'); }
    }
    if (!gr.happy && gr.boss === 'leak') { // the leak grows and heals while nobody shoots at it
      if (gr.sinceHit > 1.2) { gr.hp = Math.min(gr.maxhp, gr.hp + 1.2 * dt); gr.size = Math.min(140, gr.size + 6 * dt); }
      if (Math.random() < dt * 8) S.parts.push({ kind: 'spark', x: gr.x + rnd(-gr.size, gr.size) * 0.7, y: gr.y + gr.size * 0.8, vx: 0, vy: rnd(120, 200), life: 0.6, max: 0.6, r: rnd(3, 5), c: '#7fc4ff' });
    }
    if (!gr.happy) {
      if (gr.type === 'h') {
        gr.blinkT -= dt;
        if (gr.blinkT <= 0) {
          if (gr.hidden) { gr.hidden = false; gr.blinkT = rnd(1.2, 2.2); gr.baseY = rnd(H * 0.16, H * 0.62); }
          else { gr.hidden = true; gr.blinkT = 0.4; gr.x -= 50; sfx.blink(); puff(gr.x, gr.y, 4, 'rgba(210,220,255,.9)'); }
        }
        gr.fade += ((gr.hidden ? 0 : 1) - gr.fade) * Math.min(1, dt * 12);
      }
      gr.x -= gr.speed * dt;
      gr.y = gr.baseY + Math.sin(gr.t * 2 * gr.wob) * (gr.type === 'B' ? 20 : 12);
      if (gr.x < g.x + 70) { breach(gr, i, g); if (!S.running) return; }
    } else {
      gr.y -= 70 * dt; gr.x += 25 * dt; gr.fade -= dt * (gr.type === 'B' ? 0.4 : 0.7);
      if (Math.random() < dt * 6) S.parts.push({ kind: 'heart', x: gr.x + rnd(-gr.size, gr.size), y: gr.y, vx: rnd(-20, 20), vy: -60, life: 0.8, max: 0.8, r: rnd(3, 6), c: '#ff7f9f' });
      if (gr.fade <= 0) S.bugs.splice(i, 1);
    }
  }

  // particles & texts
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'heart') p.vy -= 20 * dt; if (p.kind === 'smoke') { p.vy -= 30 * dt; p.r += 12 * dt; }
    if (p.life <= 0) S.parts.splice(i, 1);
  }
  for (let i = S.texts.length - 1; i >= 0; i--) { const t = S.texts[i]; t.life -= dt; if (!t.bubble) t.y -= 28 * dt; if (t.life <= 0) S.texts.splice(i, 1); }
}
