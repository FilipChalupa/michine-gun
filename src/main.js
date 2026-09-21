// Bootstrap: canvas sizing, input, overlay screens, pause, loop, PWA.
import { S, view, pointer, motion, meta, newGame, loadPrefs } from './state.js';
import { audio, unlock, setMute, loadMute, startAmbient, stopAmbient, startMusic, stopMusic, setMusic, suspend, resume } from './audio.js';
import { update, hooks, reload, chooseUpgrade } from './entities.js';
import { initRender, drawScene } from './render.js';
import { drawHUD, drawTitleSign, isAmmoTap } from './hud.js';

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
const musicBtn = document.getElementById('music');
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
  // safe-area insets (notch, rounded corners) converted to world units
  const cs = getComputedStyle(document.getElementById('safe'));
  const px = v => (parseFloat(v) || 0) / view.SC;
  view.safe = { l: px(cs.paddingLeft), r: px(cs.paddingRight), t: px(cs.paddingTop), b: px(cs.paddingBottom) };
}
window.addEventListener('resize', resize);
resize();

// ---------- preferences ----------
loadPrefs(); loadMute();
const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
motion.reduced = rm.matches; rm.addEventListener('change', e => { motion.reduced = e.matches; });
function refreshMute() {
  muteBtn.textContent = audio.muted ? '🔇 TICHO' : '🔊 ZVUK';
  musicBtn.textContent = audio.music ? '🎵 HUDBA' : '🎵 BEZ HUDBY'; musicBtn.style.opacity = audio.music && !audio.muted ? '1' : '.6';
}
refreshMute();
muteBtn.addEventListener('click', () => { setMute(!audio.muted); refreshMute(); });
musicBtn.addEventListener('click', () => { setMusic(!audio.music); refreshMute(); });

// ---------- screen wake lock (keeps the phone awake while playing) ----------
let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || wakeLock) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (e) {}
}
function releaseWake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }

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
  hintEl.hidden = mode === 'pause'; document.getElementById('touchhint').hidden = mode === 'pause';
  pauseBtn.hidden = true;
  btn.focus();
}
function pause() {
  if (!S.running || S.paused || S.phase === 'upgrade') return; // the upgrade screen already freezes the game
  releaseWake(); S.paused = true; pointer.down = false; pointer.space = false; suspend(); showOverlay('pause');
}
function unpause() {
  S.paused = false; overlay.hidden = true; pauseBtn.hidden = false; resume(); keepAwake();
}
function start() {
  unlock(); startAmbient(); startMusic(); newGame(); overlay.hidden = true; pauseBtn.hidden = false; keepAwake();
  pointer.x = view.W * 0.7; pointer.y = view.H * 0.4;
}
btn.addEventListener('click', () => { if (overlayMode === 'pause') unpause(); else start(); });
pauseBtn.addEventListener('click', pause);
// ---------- upgrade cards between waves ----------
const upgradesEl = document.getElementById('upgrades');
const upgradeTitle = document.getElementById('upgradetitle');
const cardsEl = document.getElementById('cards');
function pickUpgrade(id) { upgradesEl.hidden = true; pauseBtn.hidden = false; chooseUpgrade(id); }
hooks.onUpgradeOffer = offer => {
  const n = S.waveHits, noun = n === 1 ? 'bug' : n >= 2 && n <= 4 ? 'bugy' : 'bugů';
  upgradeTitle.textContent = `VLNA ${S.wave} HOTOVÁ · ${n === 1 ? 'opraven' : n >= 2 && n <= 4 ? 'opraveny' : 'opraveno'} ${n} ${noun}`;
  cardsEl.innerHTML = '';
  offer.forEach((u, i) => {
    const b = document.createElement('button'); b.className = 'card'; b.id = 'card-' + u.id;
    const lvl = (S.up[u.id] || 0) + 1;
    b.innerHTML = `<span class="ico">${u.icon}</span><span class="nm">${u.name}${u.max > 1 && u.max < 99 ? ' ' + lvl + '/' + u.max : ''}</span><span class="ds">${u.desc}</span><span class="key">${i + 1}</span>`;
    b.addEventListener('click', () => pickUpgrade(u.id));
    cardsEl.appendChild(b);
  });
  upgradesEl.hidden = false; pauseBtn.hidden = true;
  setTimeout(() => { const f = cardsEl.querySelector('button'); if (f && !upgradesEl.hidden) f.focus(); }, 350); // small delay so a held fire key cannot pick by accident
};

hooks.onGameOver = () => { upgradesEl.hidden = true; stopAmbient(); stopMusic(); releaseWake(); showOverlay('over'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { pointer.down = false; pointer.space = false; pause(); });

// ---------- input ----------
// A press that lands on the ammo (HUD row, belt or crate) may be a tap to reload, so it holds fire
// for a moment; if it turns out to be a hold, it fires like any other press.
let tap = null, tapTimer = 0;
canvas.addEventListener('pointerdown', e => {
  pointer.x = e.clientX / view.SC; pointer.y = e.clientY / view.SC; pointer.touch = e.pointerType === 'touch';
  pointer.startY = pointer.y; pointer.startAngle = S.angle; unlock();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  if (isAmmoTap(pointer.x, pointer.y)) {
    tap = { x: pointer.x, y: pointer.y, t: performance.now() };
    clearTimeout(tapTimer); tapTimer = setTimeout(() => { if (tap) { tap = null; pointer.down = true; } }, 260);
  } else pointer.down = true;
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX / view.SC; pointer.y = e.clientY / view.SC; pointer.touch = e.pointerType === 'touch'; });
canvas.addEventListener('pointerup', () => {
  pointer.down = false;
  if (tap && Math.hypot(pointer.x - tap.x, pointer.y - tap.y) < 24) reload();
  tap = null; clearTimeout(tapTimer);
});
canvas.addEventListener('pointercancel', () => { pointer.down = false; tap = null; clearTimeout(tapTimer); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!overlay.hidden) btn.click(); else if (upgradesEl.hidden) pointer.space = true;
  }
  if (e.key === 'r' || e.key === 'R') reload();
  if (!upgradesEl.hidden && ['1', '2', '3'].includes(e.key)) { const b = cardsEl.children[+e.key - 1]; if (b) b.click(); }
  if (e.key === 'm' || e.key === 'M') { setMute(!audio.muted); refreshMute(); }
  if (e.key === 'h' || e.key === 'H') { setMusic(!audio.music); refreshMute(); }
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

// ---------- PWA: install prompt, offline cache, update notice ----------
const installBtn = document.getElementById('install');
const iosHint = document.getElementById('ioshint');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastmsg');
const toastBtn = document.getElementById('toastbtn');
const standalone = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;

let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; installBtn.hidden = false; });
installBtn.addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  try { await installEvent.userChoice; } catch (e) {}
  installEvent = null; installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; iosHint.hidden = true; });
// iOS Safari has no install prompt; explain the manual way once.
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isIOS && !standalone) iosHint.hidden = false;

function showToast(text, action, onClick) {
  toastMsg.textContent = text; toastBtn.textContent = action; toastBtn.hidden = !action;
  toastBtn.onclick = onClick || null; toast.hidden = false;
}
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const offerUpdate = worker => {
        if (!navigator.serviceWorker.controller) return; // first install, nothing to update
        showToast('Je k dispozici nová verze.', 'OBNOVIT', () => worker.postMessage('SKIP_WAITING'));
      };
      if (reg.waiting) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed') {
            if (navigator.serviceWorker.controller) offerUpdate(w);
            else { showToast('Hra je připravená i offline.', '', null); setTimeout(() => { toast.hidden = true; }, 3500); }
          }
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded || !toastBtn.onclick) return; reloaded = true; location.reload();
      });
    } catch (e) {}
  });
}
