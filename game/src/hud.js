// The HUD and the shared canvas text helpers: score, wave, difficulty,
// hearts, the heat gauge with its gold band, the wave progress bar, the
// combo meter, and the boss health bar when a boss is on the yard.
import { FIELD, PALETTE, HEAT, WAVE_SECONDS } from './config.js';
import { heatZone } from './world.js';
import { waveLabel } from './campaign.js';
import { potsInZone } from './gold-zone.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, size, colour, align = 'center', weight = '700') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function wrapText(ctx, str, x, y, maxWidth, size, colour) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => text(ctx, l, x, y + i * (size + 6), size, colour));
}

/** The boss health bar: name, phase pips and a draining bar, top centre. */
function drawBossBar(ctx, state) {
  const boss = state.boss;
  if (!boss || !boss.active) return;
  const w = 560; const x = (FIELD.width - w) / 2; const y = 76;
  ctx.fillStyle = 'rgba(20,12,22,0.8)';
  roundRect(ctx, x - 10, y - 24, w + 20, 58, 10);
  ctx.fill();
  text(ctx, `${boss.name} — PHASE ${boss.phase}`, FIELD.width / 2, y - 8, 16, boss.kind === 'herald' ? '#bfe9ff' : PALETTE.amber);
  ctx.fillStyle = '#1d1420';
  roundRect(ctx, x, y + 6, w, 14, 7);
  ctx.fill();
  ctx.fillStyle = boss.kind === 'herald' ? '#7fd4ff' : '#ff7a2f';
  roundRect(ctx, x, y + 6, w * Math.max(0, boss.hp / boss.maxHp), 14, 7);
  ctx.fill();
}

export function drawHud(ctx, state, time = 0) {
  // Top bar: score, wave, difficulty, embers, pots in the ring.
  ctx.fillStyle = 'rgba(20,12,22,0.72)';
  roundRect(ctx, 16, 12, 660, 54, 10);
  ctx.fill();
  text(ctx, `SCORE ${state.score}`, 34, 40, 24, PALETTE.cream, 'left');
  text(ctx, waveLabel(state), 300, 40, 21, PALETTE.gold, 'left');
  text(ctx, `EMBERS ${state.embers}`, 452, 40, 19, PALETTE.amber, 'left');
  text(ctx, (state.difficulty?.name || 'Stoker').toUpperCase(), 580, 40, 15, PALETTE.cold, 'left');
  // Hearts, top right.
  for (let i = 0; i < 4; i += 1) {
    const x = FIELD.width - 40 - i * 34;
    const y = 40;
    ctx.fillStyle = i < state.hearts ? PALETTE.heart : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(x - 6, y - 3, 8, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x, y + 12); ctx.lineTo(x + 13, y); ctx.closePath(); ctx.fill();
  }
  // Heat gauge, right side: the game's core meter, big and readable.
  const gx = FIELD.width - 62; const gy = 110; const gh = 260;
  ctx.fillStyle = 'rgba(20,12,22,0.72)';
  roundRect(ctx, gx - 26, gy - 34, 52, gh + 68, 10);
  ctx.fill();
  text(ctx, 'HEAT', gx, gy - 16, 15, PALETTE.cream);
  ctx.fillStyle = '#1d1420';
  roundRect(ctx, gx - 10, gy, 20, gh, 6);
  ctx.fill();
  const frac = state.heat / 100;
  const zone = heatZone(state.heat);
  const colour = zone === 'gold' ? PALETTE.gold : zone === 'dying' ? PALETTE.cold : zone === 'overheat' ? '#ff3b30' : '#ff7a2f';
  ctx.fillStyle = colour;
  roundRect(ctx, gx - 10, gy + gh * (1 - frac), 20, gh * frac, 6);
  ctx.fill();
  // Gold-band marker on the gauge.
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx - 14, gy + gh * (1 - HEAT.goldHigh / 100));
  ctx.lineTo(gx + 14, gy + gh * (1 - HEAT.goldHigh / 100));
  ctx.moveTo(gx - 14, gy + gh * (1 - HEAT.goldLow / 100));
  ctx.lineTo(gx + 14, gy + gh * (1 - HEAT.goldLow / 100));
  ctx.stroke();
  text(ctx, `${Math.round(state.heat)}`, gx, gy + gh + 20, 16, colour);
  // Wave progress bar, bottom centre (boss waves end when the boss falls).
  const bw = 420;
  ctx.fillStyle = 'rgba(20,12,22,0.72)';
  roundRect(ctx, (FIELD.width - bw) / 2, FIELD.height - 34, bw, 20, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.amber;
  const bossWave = state.boss && state.boss.active;
  roundRect(ctx, (FIELD.width - bw) / 2 + 3, FIELD.height - 31, (bw - 6) * (bossWave ? 1 : Math.min(1, state.waveTime / WAVE_SECONDS)), 14, 7);
  ctx.fill();
  text(ctx, bossWave ? `${state.boss.name} — the wave ends when it falls` : `${waveLabel(state)} — ${Math.ceil(WAVE_SECONDS - state.waveTime)}s to the firing break`, FIELD.width / 2, FIELD.height - 48, 14, PALETTE.cream);
  // Controls hint, bottom left.
  text(ctx, 'WASD move · mouse aim · click spark · SHIFT dash (i-frames!) · SPACE vent', 16, FIELD.height - 20, 13, 'rgba(247,234,215,0.75)', 'left');
  // Combo meter under the top bar.
  if (state.combo > 1) {
    ctx.fillStyle = 'rgba(20,12,22,0.72)';
    roundRect(ctx, 16, 74, 300, 34, 8); ctx.fill();
    text(ctx, `COMBO x${state.combo}  - pots pay +${25 * (state.combo - 1)}`, 28, 92, 17, PALETTE.gold, 'left');
  }
  if (state.masterpieces > 0) text(ctx, `MASTERPIECES ${state.masterpieces}`, 330, 92, 16, '#ffe9a8', 'left');
  text(ctx, `POTS IN THE RING ${potsInZone(state)}/${state.pots.filter((p) => !p.fired).length}`, 16, 132, 14, PALETTE.gold, 'left');
  drawBossBar(ctx, state);
  // Surge warning and cold-front line, below the banner's strip.
  if (state.surgeLeft > 0) {
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time * 10);
    text(ctx, '!! DRAFT SURGE !!', FIELD.width / 2, 182, 30, '#7fd4ff');
    ctx.globalAlpha = 1;
  }
  if (state.coldFront) {
    text(ctx, 'COLD FRONT — THE GOLD RING IS SHRUNK', FIELD.width / 2, state.surgeLeft > 0 ? 214 : 182, 17, '#bfe9ff');
  }
  // Goal / hint banner, drawn last so it never fights the warnings.
  if (state.bannerTime > 0 && state.banner) {
    ctx.fillStyle = 'rgba(20,12,22,0.85)';
    roundRect(ctx, FIELD.width / 2 - 390, 118, 780, 38, 10); ctx.fill();
    text(ctx, state.banner, FIELD.width / 2, 138, 16, PALETTE.cream);
  }
  // Hit flash.
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,40,60,${(state.flash * 0.55).toFixed(3)})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}
