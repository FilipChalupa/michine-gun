// WebAudio: short synthesized effects plus an ambient wind loop. No audio files.
import { S, rnd } from './state.js';

let AC = null, master = null, ambient = null, squeakTimer = 0;
export const audio = { muted: false, music: true };

function ensure() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    AC = new C(); master = AC.createGain(); master.gain.value = audio.muted ? 0 : 1; master.connect(AC.destination);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
export function unlock() { ensure(); }
export function suspend() { if (AC && AC.state === 'running') AC.suspend(); }
export function resume() { if (AC && AC.state === 'suspended') AC.resume(); }

export function tone(type, f0, f1, dur, vol, delay = 0) {
  if (audio.muted) return; const a = ensure(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  squeak: (golden) => { const f = golden ? 3200 : rnd(1300, 2900); tone('square', f, f * 0.45, rnd(0.07, 0.13), golden ? 0.06 : 0.035); },
  pop: () => { tone('sine', 520, 1200, 0.16, 0.08); tone('triangle', 900, 1800, 0.12, 0.03); },
  bigPop: () => { tone('sine', 300, 900, 0.3, 0.12); tone('triangle', 600, 2400, 0.25, 0.05, 0.05); tone('sine', 1200, 2000, 0.3, 0.04, 0.15); },
  thud: () => { tone('triangle', 140, 45, 0.35, 0.18); tone('sawtooth', 90, 40, 0.3, 0.06); },
  wave: () => { tone('square', 440, 660, 0.15, 0.05); tone('square', 660, 880, 0.2, 0.05, 0.14); },
  waveDone: () => { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.18, 0.05, i * 0.12)); },
  over: () => { tone('sawtooth', 300, 60, 0.9, 0.12); },
  overheat: () => { tone('sawtooth', 200, 80, 0.4, 0.08); tone('sine', 3000, 500, 0.5, 0.03); },
  cool: () => tone('sine', 600, 900, 0.1, 0.04),
  golden: () => { tone('sine', 880, 1760, 0.2, 0.06); tone('sine', 1320, 2640, 0.25, 0.05, 0.12); },
  boss: () => { tone('sawtooth', 80, 40, 1.2, 0.15); tone('square', 110, 55, 1.0, 0.06, 0.1); },
  hitstop: () => tone('triangle', 200, 1600, 0.15, 0.05),
  hmpf: () => tone('sine', 300, 380, 0.08, 0.04),
  blink: () => tone('sine', 1500, 2500, 0.06, 0.02),
  reload: () => { for (let i = 0; i < 6; i++) tone('square', 170 + i * 28, 110, 0.04, 0.03, i * 0.28); },
  reloaded: () => { tone('square', 300, 150, 0.06, 0.06); tone('triangle', 900, 1400, 0.1, 0.04, 0.06); },
};

export function setMute(m) {
  audio.muted = m; if (master) master.gain.value = m ? 0 : 1;
  try { localStorage.setItem('misine-mute', m ? '1' : '0'); } catch (e) {}
}
export function loadMute() { try { audio.muted = localStorage.getItem('misine-mute') === '1'; audio.music = localStorage.getItem('misine-music') !== '0'; } catch (e) {} }

export function startAmbient() {
  const a = ensure(); if (!a || ambient) return;
  const len = 2 * a.sampleRate, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0; // pinkish noise
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + w * 0.03; b1 = 0.6 * b1 + w * 0.1; d[i] = (b0 * 4 + b1) * 0.5; }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const filt = a.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320; filt.Q.value = 0.8;
  const lfo = a.createOscillator(); lfo.frequency.value = 0.07; const lfoG = a.createGain(); lfoG.gain.value = 180;
  lfo.connect(lfoG).connect(filt.frequency);
  const gain = a.createGain(); gain.gain.value = 0; gain.gain.setTargetAtTime(0.05, a.currentTime, 1.5);
  src.connect(filt).connect(gain).connect(master); src.start(); lfo.start();
  ambient = { src, lfo, gain };
  scheduleSqueak();
}
function scheduleSqueak() {
  squeakTimer = setTimeout(() => {
    if (!ambient) return;
    tone('sine', rnd(1500, 2400), rnd(900, 1300), 0.12, 0.012);
    if (Math.random() < 0.5) tone('sine', rnd(1500, 2400), rnd(900, 1300), 0.1, 0.01, 0.15);
    scheduleSqueak();
  }, rnd(2500, 7000));
}
export function stopAmbient() {
  if (!ambient) return; clearTimeout(squeakTimer);
  const n = ambient; ambient = null;
  n.gain.gain.setTargetAtTime(0, AC.currentTime, 0.3);
  setTimeout(() => { try { n.src.stop(); n.lfo.stop(); } catch (e) {} }, 1200);
}

// ---------- background music ----------
// A 16-bar chiptune march, sequenced in eighth notes and scheduled slightly ahead on the
// AudioContext clock (so it stays tight, and freezes by itself while the game is paused).
// Tempo creeps up with the wave number; during a boss the tune drops into minor.
const BARS = [ // [bass root (MIDI), minor chord?, melody as 8 eighth notes, 0 = rest]
  [36, 0, [76, 79, 84, 79, 76, 79, 84, 0]], [36, 0, [76, 79, 84, 79, 76, 74, 72, 0]],
  [41, 0, [77, 81, 84, 81, 77, 81, 84, 0]], [36, 0, [76, 79, 84, 79, 76, 0, 79, 0]],
  [43, 0, [74, 79, 83, 79, 74, 79, 83, 0]], [41, 0, [84, 81, 77, 81, 84, 81, 77, 0]],
  [36, 0, [76, 79, 76, 72, 74, 76, 79, 0]], [43, 0, [79, 77, 76, 74, 71, 74, 67, 0]],
  [45, 1, [81, 0, 84, 81, 76, 0, 81, 0]], [41, 0, [81, 0, 84, 81, 77, 0, 72, 0]],
  [36, 0, [79, 0, 84, 79, 76, 0, 72, 0]], [43, 0, [74, 76, 77, 79, 83, 0, 79, 0]],
  [45, 1, [81, 84, 88, 84, 81, 84, 88, 0]], [41, 0, [81, 84, 89, 84, 81, 84, 89, 0]],
  [43, 0, [79, 83, 86, 83, 79, 83, 86, 0]], [43, 0, [86, 84, 83, 81, 79, 77, 74, 71]],
];
const STEPS = BARS.length * 8;
let music = null, noiseBuf = null;
const freq = m => 440 * 2 ** ((m - 69) / 12);
const darken = m => { const pc = m % 12; return pc === 4 || pc === 9 || pc === 11 ? m - 1 : m; }; // major -> minor

function mnote(type, m, t, dur, vol, dest) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq(m);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.03);
}
function drum(kind, t, dest) {
  if (kind === 'kick') {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.16); return;
  }
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.3, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain(), hat = kind === 'hat';
  src.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = hat ? 7000 : 1800;
  g.gain.setValueAtTime(hat ? 0.014 : 0.05, t); g.gain.exponentialRampToValueAtTime(0.0005, t + (hat ? 0.03 : 0.1));
  src.connect(hp).connect(g).connect(dest); src.start(t); src.stop(t + 0.12);
}
function scheduleStep(step, t, dur) {
  const [root, minorChord, mel] = BARS[step >> 3], i = step & 7, boss = S.bossAlive;
  const fix = m => (boss ? darken(m) : m);
  if (mel[i]) mnote('square', fix(mel[i]), t, dur * 0.9, 0.032, music.lp);
  if (i === 0) mnote('triangle', root, t, dur * 1.8, 0.075, music.gain);
  if (i === 4) mnote('triangle', root + 7, t, dur * 1.8, 0.065, music.gain);
  if (i === 2 || i === 6) { const third = minorChord || boss ? 15 : 16; mnote('square', fix(root + 12 + third), t, dur * 0.7, 0.012, music.lp); mnote('square', fix(root + 31), t, dur * 0.7, 0.012, music.lp); }
  if (i === 0 || i === 4) drum('kick', t, music.gain);
  if (i === 2 || i === 6) drum('snare', t, music.gain);
  drum('hat', t, music.gain);
  if (step >= STEPS - 4) drum('snare', t + dur / 2, music.gain); // little roll into the repeat
}
function musicTick() {
  if (!music || !AC || AC.state !== 'running') return;
  if (music.nextT < AC.currentTime) music.nextT = AC.currentTime + 0.05; // tab was throttled; resync
  while (music.nextT < AC.currentTime + 0.35) {
    const bpm = 116 + Math.min(S.wave || 1, 12) * 3, dur = 30 / bpm;
    if (!audio.muted && audio.music) scheduleStep(music.step, music.nextT, dur);
    music.nextT += dur; music.step = (music.step + 1) % STEPS;
  }
}
export function startMusic() {
  const a = ensure(); if (!a) return;
  if (music) stopMusic(true);
  const gain = a.createGain(); gain.gain.value = 1;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(gain); gain.connect(master);
  music = { gain, lp, nextT: a.currentTime + 0.15, step: 0, timer: setInterval(musicTick, 80) };
}
export function stopMusic(now = false) {
  if (!music) return; clearInterval(music.timer);
  const m = music; music = null;
  m.gain.gain.setTargetAtTime(0, AC.currentTime, now ? 0.01 : 0.4);
  setTimeout(() => { try { m.gain.disconnect(); } catch (e) {} }, now ? 100 : 2000);
}
export function setMusic(on) {
  audio.music = on; try { localStorage.setItem('misine-music', on ? '1' : '0'); } catch (e) {}
}
