// Shared game state, constants and small helpers.
export const TAU = Math.PI * 2;
export const FONT = 'Anton, Impact, "Arial Black", sans-serif';
export const BREAK_LEN = 2.5;
// Difficulty knobs, tuned with tools/balance.mjs (bot simulation).
export const BALANCE = { quotaBase: 6, quotaPerWave: 3, spawnBase: 1.7, spawnPerWave: 0.18, spawnMin: 0.4, speedPerWave: 0.06, bossHpPerRound: 5 };

// World units: on narrow screens the whole scene is scaled by SC.
export const view = { W: 0, H: 0, SC: 1, DPR: 1, safe: { l: 0, r: 0, t: 0, b: 0 } };
// touch: true while the last pointer was a finger (barrel tilt follows finger height instead of aiming at it)
export const pointer = { x: 0, y: 0, down: false, space: false, touch: false, startY: 0, startAngle: 0 };
export const motion = { reduced: false };
export const meta = { best: 0 };

export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const gun = () => ({ x: Math.max(view.W * 0.24, 200 + view.safe.l), y: view.H * 0.72 });

export const BUG_TYPES = {
  s: { size: 30, hp: 1, speed: 70, dmg: 10, tags: ['typo', 'NPE', '404', 'off by 1', 'race condition', 'undefined', 'null', 'CSS', 'memory leak', 'merge conflict', 'flaky test', 'jen na produkci', 'u mě to jde', 'timezone', 'encoding', 'infinite loop', 'deadlock', 'stack overflow', 'legacy'] },
  b: { size: 46, hp: 3, speed: 42, dmg: 20, tags: ['CRITICAL', 'P0', 'SEGFAULT', 'DATA LOSS', 'SECURITY', 'ROOT ACCESS'] },
  f: { size: 22, hp: 1, speed: 150, dmg: 7, tags: ['regrese', 'hotfix', 'flaky', 'race'] },
  d: { size: 34, hp: 1, speed: 60, dmg: 8, tags: ['duplicate', 'copy-paste', 'DRY?', 'fork'] },
  c: { size: 30, hp: 1, speed: 65, dmg: 8, tags: ['cache', 'CDN cache', 'Ctrl+F5'] },
  h: { size: 26, hp: 1, speed: 80, dmg: 9, tags: ['heisenbug', 'nelze reprodukovat'] },
  B: { size: 90, hp: 15, speed: 20, dmg: 40, tags: ['PROD DOWN'] },
};
// Bosses rotate every 5th wave; hp grows with each appearance.
export const BOSSES = [
  { key: 'prod', tag: 'PROD DOWN', hat: 'PROD', hp: 15, speed: 20, tip: 'PROD DOWN! Zasyp ho myšmi, než dojde až k tobě.',
    lines: ['u mě to funguje', 'to je feature', 'nešlo by to zítra?', 'kdo to mergnul?', 'ROLLBACK!', 'v pátek nedeployujeme', 'to prošlo review', 'restartovals to?', 'není to bug, je to edge case'] },
  { key: 'legacy', tag: 'LEGACY MONOLITH', hat: 'COBOL', hp: 22, speed: 15, tip: 'LEGACY MONOLITH! Sype ze sebe staré bugy.',
    lines: ['nesahej na to, funguje to', 'dokumentace neexistuje', 'autor odešel v roce 2009', 'to se přepíše příští kvartál', 'testy? jaké testy?', 'běží to na serveru pod stolem'],
    spawn: ['jQuery', 'IE6', 'COBOL', 'SOAP', 'FTP deploy', 'table layout', 'Flash', 'SVN'] },
  { key: 'leak', tag: 'MEMORY LEAK', hat: 'LEAK', hp: 20, speed: 18, tip: 'MEMORY LEAK! Roste a léčí se, když do něj nestřílíš.',
    lines: ['ještě trochu RAM…', 'garbage collector spí', 'swap je taky paměť', 'OOM killer už jde', 'kdo drží tu referenci?'] },
];
export const UPGRADES = [
  { id: 'belt', icon: '🐭', name: 'DELŠÍ PÁS', desc: '+10 myší v pásu', max: 4 },
  { id: 'cool', icon: '❄️', name: 'CHLADIČ', desc: 'hlaveň se zahřívá o 15 % pomaleji', max: 4 },
  { id: 'reload', icon: '⚡', name: 'RYCHLÉ NABÍJENÍ', desc: 'přebití o 20 % rychlejší', max: 3 },
  { id: 'gold', icon: '✨', name: 'ZLATÝ CHOV', desc: 'zlatá myš o 3 s častěji', max: 3 },
  { id: 'rapid', icon: '🔥', name: 'KADENCE', desc: 'o 12 % rychlejší palba', max: 3 },
  { id: 'double', icon: '🔱', name: 'DVOJITÁ HLAVEŇ', desc: 'každý výstřel vypustí dvě myši', max: 1 },
  { id: 'heal', icon: '💗', name: 'MÍROVÁ JEDNÁNÍ', desc: '+30 % míru hned teď', max: 99 },
  { id: 'slow', icon: '🐌', name: 'CODE FREEZE', desc: 'bugy jsou o 8 % pomalejší', max: 3 },
  { id: 'combo', icon: '🔗', name: 'CI PIPELINE', desc: 'průnik kombo jen půlí, neresetuje', max: 1 },
];

export const S = {};
export function newGame() {
  Object.assign(S, {
    running: true, over: false, paused: false, time: 0,
    score: 0, peace: 100, combo: 0,
    wave: 0, phase: 'break', breakT: 0.01, quota: 0, spawned: 0, waveHits: 0, bossAlive: false, bossTalkT: 3,
    ammo: 40, maxAmmo: 40, reloading: false, reloadT: 0, reloadLen: 1.8, heat: 0,
    up: {}, offer: [], heatPerShot: 0.06, goldenEvery: 14, fireInterval: 0.1, barrels: 1, bugSpeed: 1, comboKeep: false, cheered: 0, overheated: false, shots: 0, hits: 0,
    golden: false, goldenT: 12,
    touchGuideT: null, // seconds left to show the tilt-slider hint; starts counting at the first touch
    mice: [], bugs: [], parts: [], texts: [], pending: [], nextId: 1,
    spawnT: 1.2, fireT: 0, recoil: 0, shake: 0, fireAnim: 0, angle: -0.4, hitStop: 0, shock: 0,
  });
}
newGame(); S.running = false;

// Recompute derived stats from the upgrades picked so far.
export function applyUpgrades() {
  const u = id => S.up[id] || 0;
  S.maxAmmo = 40 + 10 * u('belt');
  S.heatPerShot = 0.06 * 0.85 ** u('cool') * (u('double') ? 1.15 : 1);
  S.reloadLen = 1.8 * 0.8 ** u('reload');
  S.goldenEvery = 14 - 3 * u('gold');
  S.fireInterval = 0.1 * 0.88 ** u('rapid');
  S.barrels = u('double') ? 2 : 1;
  S.bugSpeed = 0.92 ** u('slow');
  S.comboKeep = !!u('combo');
}
export function takeUpgrade(id) {
  S.up[id] = (S.up[id] || 0) + 1;
  if (id === 'heal') S.peace = Math.min(100, S.peace + 30);
  if (id === 'belt') S.ammo = Math.min(S.ammo + 10, 40 + 10 * S.up.belt);
  applyUpgrades();
}
export function offerUpgrades() {
  const pool = UPGRADES.filter(u => (S.up[u.id] || 0) < u.max && !(u.id === 'heal' && S.peace > 75));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}

export function floatText(x, y, txt, color, size = 22, life = 1, bubble = false) {
  S.texts.push({ x, y, txt, color, size, life, max: life, bubble });
}
export function loadPrefs() {
  try { meta.best = parseInt(localStorage.getItem('misine-best') || '0', 10) || 0; } catch (e) {}
}
export function saveBest() {
  if (S.score > meta.best) { meta.best = S.score; try { localStorage.setItem('misine-best', String(meta.best)); } catch (e) {} }
}
