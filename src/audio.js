// WebAudio: short synthesized effects plus an ambient wind loop. No audio files.
import { rnd } from './state.js';

let AC = null, master = null, ambient = null, squeakTimer = 0;
export const audio = { muted: false };

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
};

export function setMute(m) {
  audio.muted = m; if (master) master.gain.value = m ? 0 : 1;
  try { localStorage.setItem('misine-mute', m ? '1' : '0'); } catch (e) {}
}
export function loadMute() { try { audio.muted = localStorage.getItem('misine-mute') === '1'; } catch (e) {} }

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
