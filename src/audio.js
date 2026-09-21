// WebAudio: short synthesized effects plus an ambient wind loop. No audio files.
import { S, rnd } from './state.js';

let AC = null, master = null, sfxBus = null, musicBus = null, ambient = null, squeakTimer = 0;
export const audio = { muted: false, music: true, vol: { music: 0.7, sfx: 0.8 } };

function ensure() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    AC = new C(); master = AC.createGain(); master.gain.value = audio.muted ? 0 : 1; master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = audio.vol.sfx; sfxBus.connect(master);
    musicBus = AC.createGain(); musicBus.gain.value = audio.music ? audio.vol.music : 0; musicBus.connect(master);
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
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
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
export function loadMute() {
  try {
    audio.muted = localStorage.getItem('misine-mute') === '1'; audio.music = localStorage.getItem('misine-music') !== '0';
    const v = JSON.parse(localStorage.getItem('misine-vol') || 'null');
    if (v && isFinite(v.music) && isFinite(v.sfx)) audio.vol = { music: Math.min(1, Math.max(0, v.music)), sfx: Math.min(1, Math.max(0, v.sfx)) };
  } catch (e) {}
}
// Separate volumes for music and effects (0..1).
export function setVolume(kind, v) {
  audio.vol[kind] = Math.min(1, Math.max(0, v));
  if (kind === 'sfx' && sfxBus) sfxBus.gain.value = audio.vol.sfx;
  if (kind === 'music' && musicBus) musicBus.gain.value = audio.music ? audio.vol.music : 0;
  try { localStorage.setItem('misine-vol', JSON.stringify(audio.vol)); } catch (e) {}
}

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
  src.connect(filt).connect(gain).connect(sfxBus); src.start(); lfo.start();
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
// Two tunes on a sixteenth-note grid, scheduled slightly ahead on the AudioContext clock (tight timing,
// and it freezes by itself while the game is paused).
//  * March (C major, 16 bars): grows with the waves. Intensity 0..4 adds hats and stabs, a walking bass and a
//    harmony voice, a sixteenth arpeggio with four-on-the-floor in minor, then an octave lead, crashes and a
//    key lift. Tempo rises with every wave.
//  * Boss (A minor, 8 bars): drone, driving saw ostinato, detuned saw lead, syncopated stabs, tom fills,
//    and a final push (faster, octave lead, snare eighths) once the boss is below 35 % health.
//  * Low peace adds a heartbeat under either tune.
const MARCH = [ // [bass root (MIDI), minor chord?, melody as 8 eighth notes, 0 = rest]
  [36, 0, [76, 79, 84, 79, 76, 79, 84, 0]], [36, 0, [76, 79, 84, 79, 76, 74, 72, 0]],
  [41, 0, [77, 81, 84, 81, 77, 81, 84, 0]], [36, 0, [76, 79, 84, 79, 76, 0, 79, 0]],
  [43, 0, [74, 79, 83, 79, 74, 79, 83, 0]], [41, 0, [84, 81, 77, 81, 84, 81, 77, 0]],
  [36, 0, [76, 79, 76, 72, 74, 76, 79, 0]], [43, 0, [79, 77, 76, 74, 71, 74, 67, 0]],
  [45, 1, [81, 0, 84, 81, 76, 0, 81, 0]], [41, 0, [81, 0, 84, 81, 77, 0, 72, 0]],
  [36, 0, [79, 0, 84, 79, 76, 0, 72, 0]], [43, 0, [74, 76, 77, 79, 83, 0, 79, 0]],
  [45, 1, [81, 84, 88, 84, 81, 84, 88, 0]], [41, 0, [81, 84, 89, 84, 81, 84, 89, 0]],
  [43, 0, [79, 83, 86, 83, 79, 83, 86, 0]], [43, 0, [86, 84, 83, 81, 79, 77, 74, 71]],
];
const BOSS = [ // [bass root, triad intervals, lead as [note, length in eighths]]
  [33, [0, 3, 7], [[76, 4], [81, 4]]], [33, [0, 3, 7], [[84, 3], [83, 1], [81, 2], [76, 2]]],
  [29, [0, 4, 7], [[77, 4], [81, 4]]], [31, [0, 4, 7], [[83, 3], [81, 1], [79, 2], [74, 2]]],
  [33, [0, 3, 7], [[76, 2], [81, 2], [84, 2], [88, 2]]], [33, [0, 3, 7], [[86, 3], [84, 1], [81, 4]]],
  [29, [0, 4, 7], [[77, 2], [81, 2], [84, 2], [89, 2]]], [28, [0, 4, 7], [[83, 2], [80, 2], [83, 2], [88, 2]]],
];
const OSTINATO = [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 7, 12, 7, 12];
const SCALE = [0, 2, 4, 5, 7, 9, 11];
let music = null, noiseBuf = null;
const freq = m => 440 * 2 ** ((m - 69) / 12);
const darken = m => { const pc = m % 12; return pc === 4 || pc === 9 || pc === 11 ? m - 1 : m; }; // major -> minor
function thirdBelow(m) { // two scale steps down in C major
  const pc = m % 12; let i = SCALE.indexOf(pc); if (i < 0) return m - 3;
  i -= 2; return m - pc + (i < 0 ? SCALE[i + 7] - 12 : SCALE[i]);
}
function mnote(type, m, t, dur, vol, dest, detune = 0) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq(m); o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.03);
}
function drum(kind, t, dest, vol = 1) {
  if (kind === 'kick' || kind === 'tom' || kind === 'heart') {
    const o = AC.createOscillator(), g = AC.createGain();
    const [f0, f1, len, v] = kind === 'kick' ? [130, 45, 0.14, 0.13] : kind === 'heart' ? [70, 38, 0.2, 0.16] : [220 * vol, 90 * vol, 0.16, 0.1];
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.85);
    g.gain.setValueAtTime(v * (kind === 'tom' ? 1 : vol), t); g.gain.exponentialRampToValueAtTime(0.0005, t + len);
    o.connect(g).connect(dest); o.start(t); o.stop(t + len + 0.02); return;
  }
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * 1.2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = AC.createBufferSource(), hp = AC.createBiquadFilter(), g = AC.createGain();
  const [cut, v, len] = kind === 'hat' ? [7000, 0.014, 0.03] : kind === 'crash' ? [4000, 0.05, 1.0] : [1800, 0.05, 0.1];
  src.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = cut;
  g.gain.setValueAtTime(v * vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  src.connect(hp).connect(g).connect(dest); src.start(t); src.stop(t + len + 0.05);
}
const intensity = () => Math.max(0, Math.min(4, Math.floor(((S.wave || 1) - 1) / 2)));

function marchStep(step, t, d) { // d = length of a sixteenth
  const L = intensity(), bar = MARCH[(step >> 4) % MARCH.length], i16 = step & 15, i8 = i16 >> 1, on8 = !(i16 & 1);
  const [root, minorChord, mel] = bar, minor = L >= 3, tr = [0, 0, 1, 2, 3][L];
  const fix = m => (minor ? darken(m) : m) + tr;
  const out = music.lp, low = music.bus;
  if (on8 && mel[i8]) {
    mnote('square', fix(mel[i8]), t, d * 1.8, L ? 0.03 : 0.024, out);
    if (L >= 2) mnote('square', fix(thirdBelow(mel[i8])), t, d * 1.8, 0.014, out);
    if (L >= 4) mnote('sawtooth', fix(mel[i8]) + 12, t, d * 1.6, 0.012, out);
  }
  if (L < 2) { if (i16 === 0) mnote('triangle', root + tr, t, d * 3.6, 0.075, low); if (i16 === 8) mnote('triangle', root + 7 + tr, t, d * 3.6, 0.065, low); }
  else if (on8) mnote('triangle', root + tr + [0, 12, 7, 12, 0, 12, 7, 10][i8], t, d * 1.7, 0.07, low); // walking bass
  if (L >= 1 && (i16 === 4 || i16 === 12)) { const third = minorChord || minor ? 15 : 16; mnote('square', root + 12 + third + tr, t, d * 1.4, 0.012, out); mnote('square', root + 31 + tr, t, d * 1.4, 0.012, out); }
  if (L >= 3) { const third = minorChord || minor ? 3 : 4; mnote('square', root + 36 + tr + [0, third, 7, 12][i16 & 3], t, d * 0.8, 0.008, out); } // arpeggio
  if (L >= 3 ? (i16 & 3) === 0 : i16 === 0 || i16 === 8) drum('kick', t, low, L ? 1 : 0.7);
  if (i16 === 4 || i16 === 12) drum('snare', t, low, L ? 1 : 0.5);
  if (L >= 1 && on8) drum('hat', t, low);
  if (L >= 3 && !on8) drum('hat', t, low, 0.6);
  if (L >= 4 && i16 === 0 && ((step >> 4) & 3) === 0) drum('crash', t, low);
  if ((step >> 4) % MARCH.length === MARCH.length - 1 && i16 >= 12) drum('snare', t, low, 0.8); // roll into the repeat
  if (L >= 2 && ((step >> 4) & 3) === 3 && i16 >= 8 && !on8) drum('snare', t, low, 0.5);
}
function bossStep(step, t, d, boss) {
  const round = Math.max(0, Math.floor((S.wave || 5) / 5) - 1), tr = (round % 3) * 2;
  const final = boss && boss.hp / boss.maxhp < 0.35;
  const barI = (step >> 4) % BOSS.length, [root, triad, lead] = BOSS[barI], i16 = step & 15;
  const out = music.lp, low = music.bus;
  if (i16 === 0) { mnote('sine', root + tr, t, d * 15.5, 0.1, low); mnote('sine', root + 7 + tr, t, d * 15.5, 0.035, low); mnote('sawtooth', root - 12 + tr, t, d * 15.5, 0.03, music.bassLp); } // drone
  mnote('sawtooth', root + 12 + tr + OSTINATO[i16], t, d * 0.9, 0.075, music.bassLp);                                              // ostinato
  let pos = 0;
  for (const [m, len8] of lead) {
    if (pos === i16) { const dur = d * len8 * 2 * 0.95; mnote('sawtooth', m + tr, t, dur, 0.034, out, -9); mnote('sawtooth', m + tr, t, dur, 0.034, out, 9); mnote('square', m + tr - 12, t, dur, 0.016, out); if (final) mnote('square', m + tr + 12, t, dur, 0.02, out); }
    pos += len8 * 2;
  }
  if (i16 === 6 || i16 === 14 || (final && i16 === 2)) for (const iv of triad) mnote('square', root + 24 + tr + iv, t, d * 1.2, 0.018, out);   // syncopated stabs
  if ((i16 & 3) === 0) drum('kick', t, low, 1.5);
  if (i16 === 4 || i16 === 12 || (final && (i16 & 3) === 2)) drum('snare', t, low, 1.5);
  drum('hat', t, low, i16 & 1 ? 1 : 0.6);
  if (i16 === 0 && (barI === 0 || barI === 4)) drum('crash', t, low);
  if (barI === BOSS.length - 1 && i16 >= 8) drum('tom', t, low, 1.5 - (i16 - 8) * 0.11);                                         // descending tom fill
}
function riser(t) { // tension sweep when a boss arrives
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + 1.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 1.3); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.5);
  o.connect(g).connect(music.lp); o.start(t); o.stop(t + 1.6);
  for (let i = 0; i < 12; i++) drum('snare', t + 0.4 + i * (1.0 / 12), music.bus, 0.3 + i * 0.06);
}
function musicTick() {
  if (!music || !AC || AC.state !== 'running') return;
  if (S.paused) { music.nextT = AC.currentTime + 0.1; return; } // stay silent while paused even if a volume preview woke the context
  if (music.nextT < AC.currentTime) music.nextT = AC.currentTime + 0.05; // tab was throttled; resync
  while (music.nextT < AC.currentTime + 0.35) {
    const boss = S.bossAlive ? S.bugs.find(b => b.type === 'B' && !b.happy) : null, mode = boss ? 'boss' : 'march';
    const audible = !audio.muted && audio.music && audio.vol.music > 0;
    if (mode !== music.mode) { // switch tunes on the spot: riser into the boss, clean restart of the march after it
      music.mode = mode; music.step = 0;
      if (mode === 'boss' && audible) { riser(music.nextT); music.nextT += 1.5; }
    }
    const round = Math.max(0, Math.floor((S.wave || 5) / 5) - 1);
    const bpm = mode === 'boss' ? 146 + Math.min(round, 4) * 6 + (boss.hp / boss.maxhp < 0.35 ? 14 : 0) : Math.min(168, 106 + (S.wave || 1) * 5);
    const d = 15 / bpm;
    if (audible) {
      if (mode === 'boss') bossStep(music.step, music.nextT, d, boss); else marchStep(music.step, music.nextT, d);
      if (S.running && S.peace < 30 && ((music.step & 15) === 0 || (music.step & 15) === 3)) drum('heart', music.nextT, music.bus, (music.step & 15) ? 0.7 : 1);
    }
    music.nextT += d; music.step++;
  }
}
export function startMusic() {
  const a = ensure(); if (!a) return;
  if (music) stopMusic(true);
  const bus = a.createGain(); bus.gain.value = 1; bus.connect(musicBus);
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(bus);
  const bassLp = a.createBiquadFilter(); bassLp.type = 'lowpass'; bassLp.frequency.value = 520; bassLp.Q.value = 4; bassLp.connect(bus);
  music = { bus, lp, bassLp, nextT: a.currentTime + 0.15, step: 0, mode: 'march', timer: setInterval(musicTick, 80) };
}
export function stopMusic(now = false) {
  if (!music) return; clearInterval(music.timer);
  const m = music; music = null;
  m.bus.gain.setTargetAtTime(0, AC.currentTime, now ? 0.01 : 0.4);
  setTimeout(() => { try { m.bus.disconnect(); } catch (e) {} }, now ? 100 : 2000);
}
export function setMusic(on) {
  audio.music = on; if (musicBus) musicBus.gain.value = on ? audio.vol.music : 0;
  try { localStorage.setItem('misine-music', on ? '1' : '0'); } catch (e) {}
}
// Exposed for tests: what the sequencer is doing right now.
export const musicState = () => (music ? { mode: music.mode, step: music.step, intensity: intensity() } : null);
