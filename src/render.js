// All canvas drawing: scene, actors, particles. HUD lives in hud.js.
import { S, view, pointer, TAU, FONT, rnd, clamp, gun } from './state.js';
import { clouds } from './entities.js';

let ctx = null;
export function initRender(canvas) { ctx = canvas.getContext('2d'); return ctx; }
export const getCtx = () => ctx;

// ---------- primitives ----------
export function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
export function ellipse(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); }
export function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function heart(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath(); ctx.fill();
}
export function stencil(text, x, y, size, color, align = 'left') {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(text, x + 1.5, y + 1.5);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

// ---------- mouse ----------
export function drawMouse(x, y, rot, s, scream, golden = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const fur = golden ? '#f2c230' : '#b9a68a', belly = golden ? '#fff0a8' : '#d9cbb2', legs = golden ? '#b8860b' : '#9d8a6e';
  ctx.strokeStyle = golden ? '#ffb347' : '#e8a0a0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-20, -8, -26, 3); ctx.stroke();
  ctx.strokeStyle = legs; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(9, 10); ctx.moveTo(-4, 5); ctx.lineTo(-9, 10); ctx.moveTo(6, -3); ctx.lineTo(11, -9); ctx.moveTo(-5, -4); ctx.lineTo(-10, -9); ctx.stroke();
  ctx.fillStyle = fur; ellipse(0, 0, 13, 7.5);
  ctx.fillStyle = belly; ellipse(1, 2.5, 9, 3.5);
  ctx.fillStyle = fur; circle(3, -7, 4.2); circle(7.5, -6.5, 3.8);
  ctx.fillStyle = '#f0b0b0'; circle(3, -7, 2.3); circle(7.5, -6.5, 2);
  ctx.fillStyle = '#222'; circle(8, -2, 1.7); ctx.fillStyle = '#fff'; circle(8.6, -2.6, 0.6);
  ctx.fillStyle = '#e88a8a'; circle(13.5, 0.5, 1.7);
  if (scream) { ctx.fillStyle = '#b8302b'; ellipse(10.5, 3, 2.3, 2.6); }
  ctx.strokeStyle = 'rgba(40,30,20,.5)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(18, -2); ctx.moveTo(12, 2); ctx.lineTo(18, 4); ctx.stroke();
  if (golden) { ctx.fillStyle = 'rgba(255,240,150,.9)'; for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; circle(Math.cos(a) * 16, Math.sin(a) * 10, 1.5); } }
  ctx.restore();
}

// ---------- bug ----------
export function drawBug(gr) {
  ctx.save(); ctx.translate(gr.x, gr.y); ctx.globalAlpha = clamp(gr.fade, 0, 1);
  const s = gr.size, happy = gr.happy, t = gr.t, boss = gr.type === 'B';
  const shell = happy ? '#f4a6ba' : boss ? '#7a1f8a' : gr.type === 'b' ? '#b83b3b' : gr.type === 'f' ? '#6f8f4a' : gr.type === 'h' ? '#5b7ea8' : gr.type === 'c' ? '#8a7a3c' : gr.type === 'd' ? '#3f8a7a' : '#4f8a3c';
  const shellDark = happy ? '#c7607f' : boss ? '#2e0b36' : gr.type === 'b' ? '#5e1b1b' : '#243d1a';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  if (!happy && gr.type === 'f') {
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s + 6, i * 8); ctx.lineTo(s + 22 + Math.abs(i) * 6, i * 8); ctx.stroke(); }
  }
  if (gr.type === 'f') {
    const flap = Math.sin(t * 40) * 0.5;
    ctx.fillStyle = 'rgba(210,235,255,.55)'; ctx.strokeStyle = 'rgba(120,150,170,.6)'; ctx.lineWidth = 1.5;
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.translate(sg * s * 0.4, -s * 0.5); ctx.rotate(sg * (0.9 + flap));
      ctx.beginPath(); ctx.ellipse(0, -s * 0.7, s * 0.35, s * 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  // legs
  ctx.strokeStyle = shellDark; ctx.lineWidth = Math.max(2, s * 0.09);
  for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.55 + Math.sin(t * 12 + i * 2 + (sg > 0 ? 3 : 0)) * 0.25;
    const bx = sg * s * 0.85, by = s * 0.15 + i * s * 0.22;
    ctx.beginPath(); ctx.moveTo(bx, by);
    ctx.lineTo(bx + sg * s * 0.45 * Math.cos(a), by + s * 0.2 - s * 0.35 * Math.sin(a));
    ctx.lineTo(bx + sg * s * 0.55 * Math.cos(a) + sg * s * 0.1, by + s * 0.45 - s * 0.2 * Math.sin(a)); ctx.stroke();
  }
  // antennae
  ctx.lineWidth = Math.max(2, s * 0.08);
  for (const sg of [-1, 1]) {
    const wig = Math.sin(t * 6 + sg) * s * 0.12;
    ctx.beginPath(); ctx.moveTo(sg * s * 0.35, -s * 0.75);
    ctx.quadraticCurveTo(sg * s * 0.75, -s * 1.25 + wig, sg * s * 0.95 + wig * 0.5, -s * 1.5); ctx.stroke();
    ctx.fillStyle = shellDark; circle(sg * s * 0.95 + wig * 0.5, -s * 1.5, s * 0.09);
  }
  // head shell
  ctx.fillStyle = shell; ctx.strokeStyle = shellDark; ctx.lineWidth = boss ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.95, s * 0.15);
  ctx.bezierCurveTo(-s * 1.05, -s * 0.9, s * 1.05, -s * 0.9, s * 0.95, s * 0.15);
  ctx.bezierCurveTo(s * 0.8, s * 0.95, -s * 0.8, s * 0.95, -s * 0.95, s * 0.15);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ellipse(-s * 0.3, -s * 0.5, s * 0.3, s * 0.16, -0.4);
  ctx.strokeStyle = shellDark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -s * 0.85); ctx.lineTo(0, -s * 0.25); ctx.stroke();
  if (boss && !happy) { // scars / cracks on the boss shell
    ctx.strokeStyle = shellDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.7); ctx.lineTo(s * 0.45, -s * 0.45); ctx.lineTo(s * 0.35, -s * 0.3); ctx.moveTo(-s * 0.6, -s * 0.2); ctx.lineTo(-s * 0.45, 0); ctx.stroke();
  }
  // compound eyes
  const ex = s * 0.48, ey = -s * 0.15, er = s * 0.3;
  for (const sg of [-1, 1]) {
    ctx.fillStyle = happy ? '#6a2440' : '#1b1b1f'; ellipse(sg * ex, ey, er, er * 1.15, sg * 0.25);
    if (!happy) {
      ctx.fillStyle = boss ? '#ffb020' : '#ff5a5a';
      for (let i = 0; i < 4; i++) circle(sg * ex + (i % 2) * s * 0.11 - s * 0.05, ey - s * 0.12 + Math.floor(i / 2) * s * 0.12, s * 0.045);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; circle(sg * ex - sg * s * 0.1, ey - s * 0.14, s * 0.06);
    }
  }
  if (!happy) {
    ctx.strokeStyle = shellDark; ctx.lineWidth = Math.max(3, s * 0.13);
    ctx.beginPath(); ctx.moveTo(-ex - s * 0.28, ey - s * 0.5); ctx.lineTo(-ex + s * 0.25, ey - s * 0.22);
    ctx.moveTo(ex + s * 0.28, ey - s * 0.5); ctx.lineTo(ex - s * 0.25, ey - s * 0.22); ctx.stroke();
    const snap = 0.25 + Math.abs(Math.sin(t * 9)) * 0.35;
    ctx.lineWidth = Math.max(3, s * 0.12);
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sg * s * 0.35, s * 0.55);
      ctx.quadraticCurveTo(sg * s * (0.5 - snap * 0.3), s * 1.05, sg * s * (0.12 + snap * 0.3), s * 1.1); ctx.stroke();
    }
    ctx.fillStyle = '#2b2b2b'; ellipse(0, s * 0.6, s * 0.22, s * 0.09);
  } else {
    ctx.strokeStyle = '#ffe3ea'; ctx.lineWidth = Math.max(3, s * 0.1);
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(sg * ex, ey + s * 0.05, s * 0.16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,90,120,.45)'; circle(-ex - s * 0.1, ey + s * 0.45, s * 0.13); circle(ex + s * 0.1, ey + s * 0.45, s * 0.13);
    ctx.strokeStyle = shellDark; ctx.lineWidth = Math.max(3, s * 0.1);
    ctx.beginPath(); ctx.arc(0, s * 0.45, s * 0.32, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  }
  if ((gr.type === 'b' || boss) && !happy) { // hard hat
    ctx.fillStyle = boss ? '#ff3b3b' : '#e0b100'; ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 0.72, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = boss ? '#6b0000' : '#8a6d00'; ctx.lineWidth = 2; ctx.stroke();
    rrect(-s * 0.9, -s * 0.62, s * 1.8, s * 0.14, 3); ctx.fill(); ctx.stroke();
    stencil(boss ? 'PROD' : 'P0', 0, -s * 0.85, Math.max(9, s * 0.3), boss ? '#fff' : '#3a2d00', 'center');
  }
  if (gr.type === 'c' && !happy) { // little refresh arrow badge
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.18, 0.4, TAU - 0.9); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.66); ctx.lineTo(s * 0.32, -s * 0.5); ctx.lineTo(s * 0.12, -s * 0.5); ctx.closePath(); ctx.fill();
  }
  if (gr.type === 'd' && !happy) { // ghost twin outline
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.15, s * 0.8, s * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  // hit flash
  if (gr.flash > 0) { ctx.globalAlpha *= gr.flash / 0.12; ctx.fillStyle = '#fff'; ellipse(0, 0, s * 1.05, s * 0.95); ctx.globalAlpha = clamp(gr.fade, 0, 1); }
  // label chip
  const lbl = gr.tag, fs = boss ? 18 : Math.max(10, Math.min(13, s * 0.36));
  ctx.font = `${fs}px ${FONT}`; const lw = ctx.measureText(lbl).width + 12;
  const ly = -s - ((gr.type === 'b' || boss) ? s * 0.6 : s * 0.55) - 12;
  ctx.fillStyle = happy ? 'rgba(255,200,215,.9)' : (gr.type === 'b' || boss) ? 'rgba(200,40,40,.92)' : 'rgba(28,30,26,.85)';
  rrect(-lw / 2, ly - 9, lw, 18, 4); ctx.fill();
  stencil(lbl, 0, ly, fs, happy ? '#7a2b45' : '#f3e7cf', 'center');
  if (!happy && gr.maxhp > 1 && !boss) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rrect(-s * 0.6, ly + 12, s * 1.2, 5, 2); ctx.fill();
    ctx.fillStyle = '#ff8f8f'; rrect(-s * 0.6, ly + 12, s * 1.2 * (gr.hp / gr.maxhp), 5, 2); ctx.fill();
  }
  for (const h of gr.hug) drawMouse(h.dx, h.dy, h.rot, 0.8, false);
  ctx.restore();
}

// ---------- cat ----------
function drawEar(sg, tilt) {
  ctx.save(); ctx.translate(sg * 30, -22); ctx.rotate(sg * tilt);
  ctx.fillStyle = '#c19a5b'; ctx.beginPath(); ctx.moveTo(-4 * sg, 2); ctx.lineTo(sg * 16, -30); ctx.lineTo(sg * -16 + sg * 2, -12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e5a8a8'; ctx.beginPath(); ctx.moveTo(-2 * sg, -2); ctx.lineTo(sg * 10, -22); ctx.lineTo(sg * -10 + sg * 2, -11); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export function catMood() {
  if (S.over) return 'sad';
  if (S.shock > 0) return 'shock';
  if (S.overheated || S.heat > 0.7) return 'squint';
  if (S.fireAnim > 0 || (S.running && !S.paused && (pointer.down || pointer.space))) return 'yell';
  return 'calm';
}
export function drawCat(x, y, mood) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#4f5636'; rrect(-46, 24, 92, 70, 16); ctx.fill();
  ctx.fillStyle = '#3d4329'; rrect(-30, 34, 22, 26, 4); ctx.fill(); rrect(8, 34, 22, 26, 4); ctx.fill();
  const earTilt = mood === 'shock' ? -0.45 : mood === 'sad' ? 0.9 : mood === 'squint' ? 0.25 : 0;
  drawEar(-1, earTilt); drawEar(1, earTilt);
  ctx.fillStyle = '#c19a5b'; ellipse(0, 0, 42, 37);
  ctx.strokeStyle = '#8a6335'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, -6); ctx.lineTo(-28, -2); ctx.moveTo(-41, 6); ctx.lineTo(-29, 8); ctx.moveTo(40, -6); ctx.lineTo(28, -2); ctx.moveTo(41, 6); ctx.lineTo(29, 8); ctx.stroke();
  ctx.fillStyle = '#e6c9a0'; ellipse(0, 16, 22, 16);
  // helmet
  ctx.fillStyle = '#4a5232'; ctx.beginPath(); ctx.arc(0, -14, 48, Math.PI, 0); ctx.lineTo(48, -8); ctx.lineTo(-48, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#353b25'; rrect(-52, -12, 104, 9, 3); ctx.fill();
  ctx.strokeStyle = '#d8d8c8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(-26, -30, 9, 0, TAU); ctx.moveTo(-26, -39); ctx.lineTo(-26, -21); ctx.moveTo(-26, -30); ctx.lineTo(-32.5, -23.5); ctx.moveTo(-26, -30); ctx.lineTo(-19.5, -23.5); ctx.stroke();
  // eyes (visible when glasses slip or are off)
  if (mood === 'shock' || mood === 'sad') {
    for (const sg of [-1, 1]) {
      ctx.fillStyle = '#fff'; ellipse(sg * 20, -4, 10, 8);
      ctx.fillStyle = '#222'; circle(sg * 20 + (mood === 'shock' ? 2 : 0), mood === 'sad' ? -1 : -5, mood === 'shock' ? 2.5 : 4);
    }
    if (mood === 'sad') {
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(-12, -12); ctx.moveTo(30, -18); ctx.lineTo(12, -12); ctx.stroke();
      ctx.fillStyle = '#9ed0ff'; ellipse(-22, 8, 3, 5);
    }
  }
  // sunglasses
  if (mood !== 'sad') {
    const gy = mood === 'shock' ? 9 : 0;
    ctx.fillStyle = '#111'; rrect(-38, -8 + gy, 32, 17, 7); ctx.fill(); rrect(6, -8 + gy, 32, 17, 7); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -3 + gy); ctx.lineTo(6, -3 + gy); ctx.moveTo(-38, -3 + gy); ctx.lineTo(-46, -8 + gy * 0.5); ctx.moveTo(38, -3 + gy); ctx.lineTo(46, -8 + gy * 0.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; rrect(-33, -6 + gy, 10, 4, 2); ctx.fill(); rrect(11, -6 + gy, 10, 4, 2); ctx.fill();
  }
  if (mood === 'squint') { // strained brows + sweat
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-34, -14); ctx.lineTo(-12, -9); ctx.moveTo(34, -14); ctx.lineTo(12, -9); ctx.stroke();
    ctx.fillStyle = '#9ed0ff'; ctx.beginPath(); ctx.moveTo(44, -20); ctx.quadraticCurveTo(50, -8, 44, -6); ctx.quadraticCurveTo(38, -8, 44, -20); ctx.fill();
  }
  // nose
  ctx.fillStyle = '#e9a3a3'; ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(-5, 9); ctx.lineTo(5, 9); ctx.closePath(); ctx.fill();
  // mouth
  if (mood === 'yell') {
    ctx.fillStyle = '#7d1717'; ellipse(0, 26, 15, 12);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-9, 16); ctx.lineTo(-5, 26); ctx.lineTo(-1, 16); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 16); ctx.lineTo(5, 26); ctx.lineTo(1, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d34a4a'; ellipse(0, 32, 7, 4);
  } else if (mood === 'squint') {
    ctx.fillStyle = '#fff'; rrect(-13, 19, 26, 9, 3); ctx.fill();
    ctx.strokeStyle = '#8a6335'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -8; i <= 8; i += 4) { ctx.moveTo(i, 19); ctx.lineTo(i, 28); } ctx.stroke();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.strokeRect(-13, 19, 26, 9);
  } else if (mood === 'shock') {
    ctx.fillStyle = '#5a1a1a'; ellipse(0, 26, 6, 8);
  } else if (mood === 'sad') {
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-9, 28); ctx.quadraticCurveTo(0, 20, 9, 28); ctx.stroke();
  } else {
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 22); ctx.quadraticCurveTo(-4, 27, 0, 22); ctx.quadraticCurveTo(4, 27, 8, 22); ctx.stroke();
  }
  // whiskers
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
  const wd = mood === 'sad' ? 8 : 0;
  ctx.beginPath(); for (const sg of [-1, 1]) { ctx.moveTo(sg * 14, 16); ctx.lineTo(sg * 58, 8 + wd); ctx.moveTo(sg * 14, 20); ctx.lineTo(sg * 60, 22 + wd); ctx.moveTo(sg * 14, 24); ctx.lineTo(sg * 56, 36 + wd); } ctx.stroke();
  ctx.restore();
}

// ---------- gun ----------
export function drawGun() {
  const g = gun();
  const boxX = g.x - 60, boxY = g.y + 34, boxW = 180, boxH = 86;
  ctx.fillStyle = '#5a4526'; rrect(boxX, boxY, boxW, boxH, 4); ctx.fill();
  ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 3; ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#7a6238'; ctx.lineWidth = 2; ctx.strokeRect(boxX + 10, boxY + 10, boxW - 20, boxH - 20);
  stencil('ŽIVÁ MUNICE', boxX + boxW / 2, boxY + 34, 16, '#d8c9a3', 'center');
  drawMouse(boxX + boxW / 2, boxY + 62, 0, 0.8, false);
  ctx.fillStyle = '#3a2a14'; for (const [cx, cy] of [[boxX + 8, boxY + 6], [boxX + boxW - 8, boxY + 6], [boxX + 8, boxY + boxH - 6], [boxX + boxW - 8, boxY + boxH - 6]]) circle(cx, cy, 3);

  // ammo belt hanging from the gun past the cat; the golden mouse rides first
  const n = Math.min(12, Math.floor(S.ammo / (S.maxAmmo / 12)) + (S.ammo > 0 ? 1 : 0));
  const b0x = g.x - 44, b0y = g.y + 6, b1x = g.x - 205, b1y = g.y + 118;
  const brot = Math.atan2(b0y - b1y, b0x - b1x);
  for (let i = 0; i < n; i++) {
    const t = i / 12;
    const bx = b0x + (b1x - b0x) * t + Math.sin(t * 7) * 5, by = b0y + (b1y - b0y) * t;
    drawMouse(bx, by, brot + Math.sin(t * 9) * 0.15, i === 0 && S.golden ? 0.85 : 0.7, false, i === 0 && S.golden);
  }

  // turret base
  ctx.fillStyle = '#2b2b29'; rrect(g.x - 48, g.y - 18, 96, 56, 6); ctx.fill();
  ctx.strokeStyle = '#141413'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#3a3a37'; rrect(g.x - 40, g.y - 10, 80, 40, 4); ctx.fill();
  stencil('ŠIŘ ROZTOMILOST', g.x, g.y + 4, 11, '#c9c1ad', 'center');
  stencil('NE KULKY ♥', g.x, g.y + 18, 11, '#c9c1ad', 'center');
  ctx.fillStyle = '#5a5a55'; for (const [cx, cy] of [[g.x - 42, g.y - 12], [g.x + 42, g.y - 12], [g.x - 42, g.y + 32], [g.x + 42, g.y + 32]]) circle(cx, cy, 3);
  ctx.strokeStyle = '#26262a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(g.x - 30, g.y + 36); ctx.lineTo(g.x - 50, g.y + 70); ctx.moveTo(g.x + 30, g.y + 36); ctx.lineTo(g.x + 50, g.y + 70); ctx.stroke();

  // rotating part
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(S.angle);
  ctx.translate(-S.recoil * 10, 0);
  ctx.fillStyle = '#1f1f1e'; rrect(-30, -22, 70, 44, 6); ctx.fill();
  ctx.fillStyle = '#2f2f2c'; rrect(30, -11, 70, 22, 3); ctx.fill();
  ctx.fillStyle = '#262624'; rrect(100, -9, 30, 18, 2); ctx.fill();
  ctx.fillStyle = '#141414'; rrect(118, -13, 16, 26, 3); ctx.fill();
  ctx.fillStyle = '#3a3a37'; for (let i = 0; i < 5; i++) ctx.fillRect(38 + i * 12, -11, 4, 22);
  // heat glow on the barrel
  if (S.heat > 0.15) {
    const h = clamp((S.heat - 0.15) / 0.85, 0, 1);
    ctx.fillStyle = `rgba(255,${Math.round(90 - h * 60)},20,${(h * 0.75).toFixed(2)})`;
    rrect(40, -10, 60, 20, 3); ctx.fill(); rrect(100, -8, 30, 16, 2); ctx.fill();
    if (S.overheated) { ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.2 * Math.sin(performance.now() / 60)).toFixed(2)})`; rrect(60, -6, 60, 12, 3); ctx.fill(); }
  }
  ctx.fillStyle = '#1a1a19'; rrect(-24, -30, 40, 12, 3); ctx.fill();
  rrect(-14, 20, 14, 26, 3); ctx.fill();
  if (S.fireAnim > 0) {
    ctx.globalAlpha = S.fireAnim / 0.12;
    ctx.fillStyle = '#ffd35a'; ctx.beginPath(); ctx.moveTo(134, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 12 : 26; ctx.lineTo(134 + 14 + Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4c2'; circle(148, 0, 7); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // paws on the rear grips
  ctx.fillStyle = '#c19a5b'; ellipse(g.x - 40, g.y - 6, 13, 9, -0.3); ellipse(g.x - 36, g.y + 16, 12, 9, 0.3);
  ctx.strokeStyle = '#8a6335'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(g.x - 46, g.y - 8); ctx.lineTo(g.x - 38, g.y - 8); ctx.moveTo(g.x - 42, g.y + 14); ctx.lineTo(g.x - 34, g.y + 14); ctx.stroke();
}

// ---------- scenery ----------
function drawTower(x, y, s, banner) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-24, -120); ctx.moveTo(34, 0); ctx.lineTo(24, -120);
  ctx.moveTo(-32, -30); ctx.lineTo(32, -30); ctx.moveTo(-30, -60); ctx.lineTo(30, -60); ctx.moveTo(-28, -90); ctx.lineTo(28, -90);
  ctx.moveTo(-32, -30); ctx.lineTo(28, -90); ctx.moveTo(32, -30); ctx.lineTo(-28, -90); ctx.stroke();
  ctx.fillStyle = '#5a4629'; ctx.fillRect(-40, -130, 80, 12); ctx.fillRect(-42, -160, 84, 6);
  ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-36, -130); ctx.lineTo(-36, -160); ctx.moveTo(36, -130); ctx.lineTo(36, -160); ctx.moveTo(0, -130); ctx.lineTo(0, -160); ctx.stroke();
  ctx.fillStyle = '#6a5533'; ctx.beginPath(); ctx.moveTo(-50, -160); ctx.lineTo(0, -185); ctx.lineTo(50, -160); ctx.closePath(); ctx.fill();
  if (banner) {
    ctx.fillStyle = '#eee4cc'; ctx.beginPath(); ctx.moveTo(-40, -115); ctx.lineTo(40, -118); ctx.lineTo(42, -40); ctx.lineTo(-38, -36); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b9ac8c'; ctx.lineWidth = 2; ctx.stroke();
    stencil('MÍR', 1, -96, 18, '#4a4235', 'center'); stencil('SKRZE', 1, -78, 18, '#4a4235', 'center'); stencil('MYŠI', 1, -60, 18, '#4a4235', 'center');
    ctx.fillStyle = '#6a6050'; circle(1, -46, 3); circle(-5, -50, 1.8); circle(7, -50, 1.8); circle(-2, -54, 1.6); circle(4, -54, 1.6);
  }
  ctx.restore();
}
function drawSandbags(x0, x1, y, rows) {
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 24 : 0;
    for (let x = x0 + off; x < x1; x += 48) {
      ctx.fillStyle = r % 2 ? '#c9b283' : '#bfa676'; ellipse(x, y + r * 20, 26, 12);
      ctx.strokeStyle = '#8b7549'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + r * 20, 26, 12, 0, 0, TAU); ctx.stroke();
    }
  }
}
export function drawBackground() {
  const { W, H } = view;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#4f8fcf'); sky.addColorStop(0.45, '#bcd7ea'); sky.addColorStop(0.7, '#efdcb8'); sky.addColorStop(1, '#c79a56');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W * 0.85, H * 0.12, 10, W * 0.85, H * 0.12, W * 0.3);
  sun.addColorStop(0, 'rgba(255,240,200,.85)'); sun.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const c of clouds) {
    const cx = c.x * W, cy = c.y * H, s = c.s * 30;
    ellipse(cx, cy, s * 1.6, s * 0.6); ellipse(cx - s, cy + s * 0.1, s, s * 0.5); ellipse(cx + s * 0.9, cy + s * 0.05, s * 1.1, s * 0.55); ellipse(cx + s * 0.1, cy - s * 0.35, s * 0.9, s * 0.6);
  }
  ctx.fillStyle = '#7f8a56'; ctx.beginPath(); ctx.moveTo(0, H * 0.62);
  ctx.quadraticCurveTo(W * 0.2, H * 0.5, W * 0.4, H * 0.6); ctx.quadraticCurveTo(W * 0.6, H * 0.68, W * 0.75, H * 0.55); ctx.quadraticCurveTo(W * 0.9, H * 0.46, W, H * 0.58);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#98955a'; ctx.beginPath(); ctx.moveTo(0, H * 0.7);
  ctx.quadraticCurveTo(W * 0.3, H * 0.62, W * 0.55, H * 0.7); ctx.quadraticCurveTo(W * 0.8, H * 0.76, W, H * 0.66);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  drawTower(W * 0.6, H * 0.72, 0.85, false);
  drawTower(W * 0.86, H * 0.74, 1.05, true);
  ctx.fillStyle = '#b08a4a'; ctx.fillRect(0, H * 0.78, W, H);
  ctx.fillStyle = '#9a7740'; for (let i = 0; i < 40; i++) { const x = ((i * 977) % 1000) / 1000 * W, y = H * 0.8 + ((i * 613) % 1000) / 1000 * H * 0.2; ellipse(x, y, 8, 3); }
  drawSandbags(W * 0.42, W + 40, H * 0.79, 3);
  const sx = W * 0.5, sy = H * 0.63;
  ctx.fillStyle = '#3f2c17'; ctx.fillRect(sx - 4, sy, 8, H * 0.18);
  ctx.fillStyle = '#5a3d22'; rrect(sx - 74, sy - 6, 148, 96, 5); ctx.fill(); ctx.strokeStyle = '#2f1e0d'; ctx.lineWidth = 3; ctx.stroke();
  stencil('ŠŤASTNĚJŠÍ SVĚT', sx, sy + 14, 15, '#eadcbc', 'center'); stencil('JEDNU MYŠ', sx, sy + 34, 15, '#eadcbc', 'center');
  stencil('PO DRUHÉ', sx, sy + 54, 15, '#eadcbc', 'center');
  ctx.fillStyle = '#d8b8b0'; heart(sx, sy + 76, 6);
}

// ---------- full scene ----------
export function drawScene() {
  ctx.save();
  if (S.shake > 0) ctx.translate(rnd(-S.shake, S.shake), rnd(-S.shake, S.shake));
  drawBackground();
  for (const gr of S.bugs) drawBug(gr);
  const g = gun();
  drawCat(g.x - 118, g.y - 28, catMood());
  drawGun();
  for (const m of S.mice) drawMouse(m.x, m.y, m.rot, m.golden ? 1.6 : 1.1, true, m.golden);
  for (const p of S.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    if (p.kind === 'heart') { ctx.fillStyle = p.c; heart(p.x, p.y, p.r); }
    else if (p.kind === 'spark') { ctx.fillStyle = p.c || '#ffd35a'; circle(p.x, p.y, p.r * a); }
    else { ctx.fillStyle = p.c || 'rgba(230,220,200,.9)'; ctx.globalAlpha = a * 0.6; circle(p.x, p.y, p.r); }
    ctx.globalAlpha = 1;
  }
  for (const t of S.texts) {
    ctx.globalAlpha = clamp(t.life / t.max * 1.5, 0, 1);
    if (t.bubble) {
      ctx.font = `${t.size}px ${FONT}`; const w = ctx.measureText(t.txt).width + 20;
      ctx.fillStyle = '#fff'; rrect(t.x - w / 2, t.y - 14, w, 28, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(t.x - 6, t.y + 13); ctx.lineTo(t.x + 6, t.y + 13); ctx.lineTo(t.x, t.y + 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = t.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.txt, t.x, t.y);
    } else stencil(t.txt, t.x, t.y, t.size, t.color, 'center');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
