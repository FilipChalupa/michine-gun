// Headless balance check: bots of three skill levels play the real game logic.
// Usage: node tools/balance.mjs [gamesPerSkill]
import { S, view, pointer, gun, newGame, applyUpgrades, BALANCE } from '../src/state.js';
import { audio } from '../src/audio.js';
import { update, hooks, chooseUpgrade, reload } from '../src/entities.js';

audio.muted = true; // tone() returns before touching WebAudio
view.W = 1280; view.H = 720;
const GAMES = +process.argv[2] || 40, DT = 1 / 60, MAX_T = 30 * 60;
if (process.env.B) Object.assign(BALANCE, JSON.parse(process.env.B)); // try out knob values without editing the source
const SKILLS = {
  // aimErr: aiming noise (rad) · retarget: seconds between decisions · uptime: share of time actually firing
  // (people hesitate, look around, lift the finger) · focus: chance to pick the most dangerous bug, not a random one
  'začátečník': { aimErr: 0.22, retarget: 0.7, heatStop: 1.1, lead: 0.3, reloads: false, uptime: 0.5, focus: 0.3 },
  'průměrný':   { aimErr: 0.12, retarget: 0.4, heatStop: 1.1, lead: 0.7, reloads: true, uptime: 0.72, focus: 0.7 },
  'zkušený':    { aimErr: 0.055, retarget: 0.2, heatStop: 0.92, lead: 1, reloads: true, uptime: 0.93, focus: 0.95 },
};
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

function play(sk) {
  newGame(); applyUpgrades();
  hooks.onGameOver = () => {};
  hooks.onUpgradeOffer = offer => chooseUpgrade(offer[Math.floor(Math.random() * offer.length)].id);
  let t = 0, noise = 0, noiseT = 0, target = null, cooling = false, idle = false, log = [];
  while (S.running && t < MAX_T) {
    const g = gun();
    noiseT -= DT;
    if (noiseT <= 0) { // the bot re-decides only every `retarget` seconds, with a fresh aiming error
      noiseT = sk.retarget; noise = gauss() * sk.aimErr;
      const live = S.bugs.filter(b => !b.happy && !b.hidden && b.x < view.W - 20);
      live.sort((a, b) => (a.x - a.speed * 1.5) - (b.x - b.speed * 1.5));
      target = (Math.random() < sk.focus ? live[0] : live[Math.floor(Math.random() * live.length)]) || null;
      idle = Math.random() > sk.uptime;
    }
    if (target && (target.happy || !S.bugs.includes(target))) { target = null; noiseT = Math.min(noiseT, 0.12); }
    if (S.heat > sk.heatStop) cooling = true; if (S.heat < sk.heatStop - 0.35) cooling = false;
    if (target) {
      const d = Math.hypot(target.x - g.x, target.y - g.y), tof = d / 870;
      const px = target.x - target.speed * tof * sk.lead, py = target.y - 0.5 * 260 * tof * tof * sk.lead;
      const a = Math.atan2(py - g.y, px - g.x) + noise;
      pointer.touch = false; pointer.x = g.x + Math.cos(a) * 600; pointer.y = g.y + Math.sin(a) * 600;
      pointer.down = !cooling && !idle;
    } else {
      pointer.down = false;
      if (sk.reloads && S.ammo < S.maxAmmo * 0.4) reload();
    }
    const w = S.wave; update(DT); t += DT;
    if (S.wave !== w) log.push({ wave: S.wave, t: Math.round(t), peace: Math.round(S.peace) });
  }
  return { wave: S.wave, time: t, score: S.score, acc: S.shots ? S.hits / S.shots : 0, log };
}
const q = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * p))];
console.log('BALANCE', JSON.stringify(BALANCE));
for (const [name, sk] of Object.entries(SKILLS)) {
  const res = []; for (let i = 0; i < GAMES; i++) res.push(play(sk));
  const waves = res.map(r => r.wave), times = res.map(r => r.time / 60);
  const hist = {}; for (const w of waves) hist[w] = (hist[w] || 0) + 1;
  console.log(`${name.padEnd(11)} vlna p10/med/p90: ${q(waves, .1)}/${q(waves, .5)}/${q(waves, .9)}  | minut med: ${q(times, .5).toFixed(1)}  | přesnost: ${(100 * res.reduce((s, r) => s + r.acc, 0) / res.length).toFixed(0)} %  | skóre med: ${q(res.map(r => r.score), .5)}`);
  console.log('            konec ve vlně:', Object.entries(hist).map(([w, n]) => `${w}:${n}`).join(' '));
}
