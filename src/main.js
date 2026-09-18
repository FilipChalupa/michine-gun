// Bootstrap: canvas sizing, input, overlay screens, pause, loop, PWA.
import { S, view, pointer, motion, meta, newGame, loadPrefs } from './state.js';
import { audio, sfx, unlock, setMute, loadMute, startAmbient, stopAmbient, suspend, resume } from './audio.js';
import { update, hooks } from './entities.js';
import { initRender, drawScene } from './render.js';
import { drawHUD, drawTitleSign } from './hud.js';

const canvas = document.getElementById('c');
const ctx = initRender(canvas);
const overlay = document.getElementById('overlay');
const msgEl = document.getElementById('msg');
const statsEl = document.getElementById('stats');
const btn = document.getElementById('btn');
const hintEl = document.getElementById('hint');
const rotateEl = document.getElementById('rotate');
const pauseBtn = document.getElementById('pause');
const muteBtn = document.getElementById('mute');
const START_MSG = msgEl.textContent;
let overlayMode = 'start';

// ---------- sizing ----------
function resize() {
  view.DPR = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth, ch = window.innerHeight;
  view.SC = Math.min(1, Math.max(0.5, cw / 1100));
  view.W = cw / view.SC; view.H = ch / view.SC;
  canvas.width = Math.round(cw * view.DPR); canvas.height = Math.round(ch * view.DPR);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  ctx.setTransform(view.DPR * view.SC, 0, 0, view.DPR * view.SC, 0, 0);
  rotateEl.hidden = !(ch > cw && cw < 700);
}
window.addEventListener('resize', resize);
resize();

// ---------- preferences ----------
loadPrefs(); loadMute();
const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
motion.reduced = rm.matches; rm.addEventListener('change', e => { motion.reduced = e.matches; });
function refreshMute() { muteBtn.textContent = audio.muted ? '🔇 TICHO' : '🔊 ZVUK'; }
refreshMute();
muteBtn.addEventListener('click', () => { setMute(!audio.muted); refreshMute(); });

// ---------- overlay / pause ----------
function showOverlay(mode) {
  overlayMode = mode; overlay.hidden = false;
  if (mode === 'start') {
    msgEl.textContent = START_MSG; statsEl.innerHTML = ''; btn.textContent = 'ZAHÁJIT MÍROVOU MISI';
  } else if (mode === 'over') {
    const acc = S.shots ? Math.round(100 * S.hits / S.shots) : 0;
    msgEl.textContent = 'Bugy prorazily na produkci a mír je v troskách. Ale spousta z nich odešla s úsměvem a myší v náručí. Zkusíš to znovu?';
    statsEl.innerHTML = `SKÓRE <b>${S.score}</b> &nbsp;·&nbsp; NEJLEPŠÍ <b>${meta.best}</b><br>VLNA <b>${S.wave}</b> &nbsp;·&nbsp; VYŘEŠENO <b>${S.hits}</b> &nbsp;·&nbsp; PŘESNOST <b>${acc}%</b>`;
    btn.textContent = 'ZKUSIT ZNOVU';
  } else {
    msgEl.textContent = 'Pauza. Bugy trpělivě čekají, myši si dávají sýr.';
    statsEl.innerHTML = `SKÓRE <b>${S.score}</b> &nbsp;·&nbsp; VLNA <b>${S.wave}</b> &nbsp;·&nbsp; MÍR <b>${Math.round(S.peace)}%</b>`;
    btn.textContent = 'POKRAČOVAT';
  }
  hintEl.hidden = mode === 'pause';
  pauseBtn.hidden = true;
  btn.focus();
}
function pause() {
  if (!S.running || S.paused) return;
  S.paused = true; pointer.down = false; pointer.space = false; suspend(); showOverlay('pause');
}
function unpause() {
  S.paused = false; overlay.hidden = true; pauseBtn.hidden = false; resume();
}
function start() {
  unlock(); startAmbient(); newGame(); overlay.hidden = true; pauseBtn.hidden = false;
  pointer.x = view.W * 0.7; pointer.y = view.H * 0.4;
}
btn.addEventListener('click', () => { if (overlayMode === 'pause') unpause(); else start(); });
pauseBtn.addEventListener('click', pause);
hooks.onGameOver = () => { stopAmbient(); showOverlay('over'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { pointer.down = false; pointer.space = false; pause(); });

// ---------- input ----------
canvas.addEventListener('pointerdown', e => {
  pointer.x = e.clientX / view.SC; pointer.y = e.clientY / view.SC; pointer.down = true; unlock();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX / view.SC; pointer.y = e.clientY / view.SC; });
canvas.addEventListener('pointerup', () => { pointer.down = false; });
canvas.addEventListener('pointercancel', () => { pointer.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!overlay.hidden) btn.click(); else pointer.space = true;
  }
  if (e.key === 'm' || e.key === 'M') { setMute(!audio.muted); refreshMute(); }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (S.running) { S.paused ? unpause() : pause(); } }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') pointer.space = false; });
pointer.x = view.W * 0.7; pointer.y = view.H * 0.4;

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); drawScene(); drawTitleSign(); drawHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- PWA ----------
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
