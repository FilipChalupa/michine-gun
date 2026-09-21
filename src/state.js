// Shared game state, constants and small helpers.
export const TAU = Math.PI * 2;
export const FONT = 'Anton, Impact, "Arial Black", sans-serif';
export const BREAK_LEN = 4;
export const RELOAD_LEN = 1.8;

// World units: on narrow screens the whole scene is scaled by SC.
export const view = { W: 0, H: 0, SC: 1, DPR: 1, safe: { l: 0, r: 0, t: 0, b: 0 } };
// touch: true while the last pointer was a finger (barrel tilt follows finger height instead of aiming at it)
export const pointer = { x: 0, y: 0, down: false, space: false, touch: false };
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
export const BOSS_LINES = ['u mě to funguje', 'to je feature', 'nešlo by to zítra?', 'kdo to mergnul?', 'ROLLBACK!', 'v pátek nedeployujeme', 'to prošlo review', 'restartovals to?', 'není to bug, je to edge case'];

export const S = {};
export function newGame() {
  Object.assign(S, {
    running: true, over: false, paused: false, time: 0,
    score: 0, peace: 100, combo: 0,
    wave: 0, phase: 'break', breakT: 0.01, quota: 0, spawned: 0, waveHits: 0, bossAlive: false, bossTalkT: 3,
    ammo: 40, maxAmmo: 40, reloading: false, reloadT: 0, heat: 0, overheated: false, shots: 0, hits: 0,
    golden: false, goldenT: 12,
    touchGuideT: null, // seconds left to show the tilt-slider hint; starts counting at the first touch
    mice: [], bugs: [], parts: [], texts: [], pending: [], nextId: 1,
    spawnT: 1.2, fireT: 0, recoil: 0, shake: 0, fireAnim: 0, angle: -0.4, hitStop: 0, shock: 0,
  });
}
newGame(); S.running = false;

export function floatText(x, y, txt, color, size = 22, life = 1, bubble = false) {
  S.texts.push({ x, y, txt, color, size, life, max: life, bubble });
}
export function loadPrefs() {
  try { meta.best = parseInt(localStorage.getItem('misine-best') || '0', 10) || 0; } catch (e) {}
}
export function saveBest() {
  if (S.score > meta.best) { meta.best = S.score; try { localStorage.setItem('misine-best', String(meta.best)); } catch (e) {} }
}
