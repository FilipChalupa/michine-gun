// Title sign and heads-up display.
import { S, view, meta, FONT, UPGRADES, gun, field } from './state.js';
import { getCtx, stencil, rrect, heart, drawMouse } from './render.js';

export function drawTitleSign() {
  const ctx = getCtx(), k = view.hudK;
  ctx.save(); ctx.scale(k, k);
  const x = 16 + view.safe.l / k, y = 14 + view.safe.t / k, w = 250, h = 68;
  ctx.strokeStyle = '#3b3b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 30, 0); ctx.lineTo(x + 30, y); ctx.moveTo(x + w - 30, 0); ctx.lineTo(x + w - 30, y); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(x + 4, y + 6, w, h, 6); ctx.fill();
  ctx.fillStyle = '#5a3d22'; rrect(x, y, w, h, 6); ctx.fill(); ctx.strokeStyle = '#2f1e0d'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 8, y + 14 + i * 14); ctx.lineTo(x + w - 8, y + 12 + i * 14 + (i % 2) * 3); ctx.stroke(); }
  ctx.font = `36px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const w1 = ctx.measureText('Mišine ').width;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText('Mišine ', x + 18, y + 29); ctx.fillText('gun', x + 18 + w1, y + 29);
  ctx.fillStyle = '#f3e7cf'; ctx.fillText('Mišine ', x + 16, y + 27);
  ctx.fillStyle = '#f5c400'; ctx.fillText('gun', x + 16 + w1, y + 27);
  stencil('VÍCE MYŠÍ. MÉNĚ NÁSILÍ.', x + 16, y + 54, 12, '#d9c9a5');
  ctx.restore();
}

export function drawHUD() {
  const ctx = getCtx(), k = view.hudK, W = view.W / k, H = view.H / k;
  ctx.save(); ctx.scale(k, k);
  // Compact panel on the left, under the title sign and above the cat, so it never covers incoming bugs.
  const L = 16 + view.safe.l / k, y0 = 92 + view.safe.t / k, PW = 250, right = L + PW - 12;
  const px = L + 34, pw = PW - 34 - 12;
  ctx.fillStyle = 'rgba(20,14,8,.42)'; rrect(L, y0, PW, 150, 10); ctx.fill();
  stencil('SKÓRE', L + 12, y0 + 22, 14, '#f3e7cf');
  stencil(String(S.score), right, y0 + 24, 32, '#f5c400', 'right');
  stencil('NEJLEPŠÍ ' + meta.best, L + 12, y0 + 50, 12, '#e0d3b3');
  stencil(S.phase === 'break' ? 'DALŠÍ VLNA ZA ' + Math.ceil(S.breakT) : 'VLNA ' + S.wave + ' · ' + Math.max(0, S.quota - S.spawned) + ' v záloze', right, y0 + 50, 13, '#f3e7cf', 'right');
  if (S.combo >= 5) stencil('KOMBO x' + (1 + Math.min(S.combo, 30) * 0.1).toFixed(1), right, y0 + 68, 14, '#ff9ec2', 'right');

  // peace
  const py = y0 + 80;
  ctx.fillStyle = '#ff6b8b'; heart(px - 16, py + 8, 8);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rrect(px, py, pw, 16, 8); ctx.fill();
  const pc = S.peace / 100;
  ctx.fillStyle = pc > 0.5 ? '#ff6b8b' : pc > 0.25 ? '#ffb347' : '#ff4d4d';
  if (pc > 0) { rrect(px, py, Math.max(16, pw * pc), 16, 8); ctx.fill(); }
  stencil('MÍR ' + Math.round(S.peace) + '%', px + pw / 2, py + 8, 12, '#fff', 'center');

  // ammo
  const ay = py + 24;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rrect(px, ay, pw, 12, 6); ctx.fill();
  const fill = S.reloading ? 1 - S.reloadT / S.reloadLen : S.ammo / S.maxAmmo;
  ctx.fillStyle = S.reloading ? '#8ecbff' : S.ammo <= 8 ? '#ff8f8f' : '#d9cbb2';
  if (fill > 0) { rrect(px, ay, Math.max(12, pw * fill), 12, 6); ctx.fill(); }
  stencil(S.reloading ? 'NABÍJÍM PÁS…' : 'MYŠI ' + S.ammo + (S.golden ? '  ·  ZLATÁ V PÁSU' : ''), px + pw / 2, ay + 6, 10, fill > 0.45 ? '#2b2119' : '#e0d3b3', 'center');
  drawMouse(px - 16, ay + 6, 0, 0.55, false, S.golden);

  // heat
  const hy = ay + 20;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rrect(px, hy, pw, 12, 6); ctx.fill();
  const hc = S.overheated ? '#ff3b3b' : S.heat > 0.7 ? '#ff8c42' : '#ffd166';
  if (S.heat > 0) { ctx.fillStyle = hc; rrect(px, hy, Math.max(12, pw * S.heat), 12, 6); ctx.fill(); }
  stencil(S.overheated ? 'PŘEHŘÁTO · chladne' : 'HLAVEŇ', px + pw / 2, hy + 6, 10, S.heat > 0.5 ? '#2b2119' : '#e0d3b3', 'center');
  ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(px - 16, hy + 12); ctx.quadraticCurveTo(px - 24, hy + 2, px - 16, hy - 4); ctx.quadraticCurveTo(px - 8, hy + 2, px - 16, hy + 12); ctx.fill();

  // picked upgrades
  const owned = UPGRADES.filter(u => S.up[u.id]);
  if (owned.length) {
    ctx.font = '16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let ux = L + 6; const uy = y0 + 166;
    for (const u of owned) { ctx.fillStyle = '#fff'; ctx.fillText(u.icon, ux, uy); if (S.up[u.id] > 1) { stencil('×' + S.up[u.id], ux + 20, uy + 1, 11, '#f3e7cf'); ux += 16; } ux += 24; }
  }

  // boss bar
  const boss = S.bugs.find(b => b.type === 'B' && !b.happy);
  if (boss) {
    const cx = field().cx / k, bw = Math.min(420, W * 0.45), bx = cx - bw / 2, by = 22 + view.safe.t / k;
    ctx.fillStyle = 'rgba(20,14,8,.5)'; rrect(bx - 10, by - 14, bw + 20, 40, 8); ctx.fill();
    stencil(boss.tag, cx, by - 2, 14, '#ff6b6b', 'center');
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rrect(bx, by + 8, bw, 12, 6); ctx.fill();
    ctx.fillStyle = '#ff3b3b'; rrect(bx, by + 8, Math.max(12, bw * boss.hp / boss.maxhp), 12, 6); ctx.fill();
  }

  if (S.running && S.paused) {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// Tap target for a manual reload: only the ammo crate under the gun (same rectangle render.js draws),
// so presses anywhere else, including the belt on the left, aim and fire as usual.
export function isAmmoTap(x, y) {
  const g = gun();
  return x >= g.x - 60 && x <= g.x + 120 && y >= g.y + 34 && y <= g.y + 120;
}
