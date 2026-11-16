// Kilnfire renderer: draws the world on one canvas in the fixed 1280x720
// logical field — the yard in its wave biome, the gold zone ring, the kiln,
// the pot racks, every actor and the particles. Screens live in screens.js
// and the HUD in hud.js. All art is drawn shapes — no assets.
import { FIELD, KILN, PALETTE, POT } from './config.js';
import { heatZone } from './world.js';
import { biomeForWave } from './biomes.js';
import { goldZoneRadius, heatInGoldBand, potInGoldZone } from './gold-zone.js';
import { drawHud, text } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

function drawYard(ctx, state, time) {
  const biome = biomeForWave(state.wave);
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, biome.skyTop);
  sky.addColorStop(0.45, biome.skyMid);
  sky.addColorStop(1, biome.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Flagstones.
  ctx.strokeStyle = biome.stone;
  ctx.lineWidth = 2;
  for (let y = 90; y < FIELD.height; y += 90) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
  for (let x = 120; x < FIELD.width; x += 160) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
  }
  // Warm glow pooling around the kiln.
  const glow = ctx.createRadialGradient(KILN.x, KILN.y, 40, KILN.x, KILN.y, 430);
  glow.addColorStop(0, biome.glow);
  glow.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Stars, brighter in the Night Firing; a moon joins them there.
  ctx.fillStyle = '#f7ead7';
  for (let i = 0; i < 30; i += 1) {
    const sx = (i * 173) % FIELD.width;
    const sy = 20 + ((i * 97) % 120);
    ctx.globalAlpha = biome.starAlpha * (0.6 + 0.4 * Math.sin(time * 2 + i));
    ctx.fillRect(sx, sy, 3, 3);
  }
  ctx.globalAlpha = 1;
  if (biome.id === 'night') {
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath(); ctx.arc(1120, 84, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = biome.skyTop;
    ctx.beginPath(); ctx.arc(1132, 76, 22, 0, Math.PI * 2); ctx.fill();
  }
}

/** The gold zone ring: the spatial heart of the game, drawn around the kiln. */
function drawGoldRing(ctx, state) {
  const radius = goldZoneRadius(state);
  const inBand = heatInGoldBand(state.heat);
  const colour = state.coldFront ? '#7fd4ff' : inBand ? '#ffd166' : state.heat > 85 ? '#ff8a5d' : '#8a7a8d';
  ctx.save();
  // The fired ground inside the ring.
  const fill = ctx.createRadialGradient(KILN.x, KILN.y, KILN.radius, KILN.x, KILN.y, radius);
  fill.addColorStop(0, inBand ? 'rgba(255,209,102,0.13)' : 'rgba(255,209,102,0.04)');
  fill.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(KILN.x, KILN.y, radius, 0, Math.PI * 2); ctx.fill();
  // The ring itself, marching dashes so it reads as a boundary in a still.
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.setLineDash([30, 16]);
  ctx.lineDashOffset = -state.time * 24;
  ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.arc(KILN.x, KILN.y, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  text(ctx, state.coldFront ? 'GOLD ZONE — SHRUNK BY THE COLD FRONT' : 'GOLD ZONE — POTS FIRE INSIDE', KILN.x, KILN.y + radius + 24, 15, colour);
  ctx.restore();
}

function drawKiln(ctx, state) {
  const zone = heatZone(state.heat);
  const heatFrac = state.heat / 100;
  ctx.save();
  ctx.translate(KILN.x, KILN.y);
  const grad = ctx.createLinearGradient(-KILN.radius, -KILN.radius, KILN.radius, KILN.radius);
  grad.addColorStop(0, PALETTE.brickLight);
  grad.addColorStop(0.5, PALETTE.brick);
  grad.addColorStop(1, PALETTE.brickDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, KILN.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, KILN.radius, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (const r of [28, 52, 74]) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  if (state.coldFront) {
    ctx.strokeStyle = 'rgba(127,212,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, KILN.radius - 3, 0, Math.PI * 2); ctx.stroke();
  }
  // Chimney.
  ctx.fillStyle = PALETTE.brickDark;
  ctx.fillRect(-16, -KILN.radius - 22, 32, 26);
  ctx.fillStyle = PALETTE.brickLight;
  ctx.fillRect(-20, -KILN.radius - 26, 40, 8);
  // Fire mouth: the glow tracks the heat, gold in the sweet band, blue when dying.
  const mouthColour = zone === 'dying' ? '#7fd4ff' : zone === 'overheat' ? '#ff3b30' : '#ff9a2f';
  const mouthGlow = ctx.createRadialGradient(0, 52, 4, 0, 52, 58);
  mouthGlow.addColorStop(0, mouthColour);
  mouthGlow.addColorStop(1, 'rgba(255,122,47,0)');
  ctx.fillStyle = mouthGlow;
  ctx.beginPath(); ctx.arc(0, 52, 58, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = zone === 'dying' ? '#3d7ea6' : `rgba(255,${Math.floor(140 + 90 * heatFrac)},40,0.95)`;
  ctx.beginPath(); ctx.arc(0, 52, 30 + 8 * heatFrac, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(0, 52, 12 + 6 * heatFrac, 0, Math.PI * 2); ctx.fill();
  // Animated flame tongues, flickering with heat.
  const flick = Math.sin(state.time * 11) * 0.18 + Math.sin(state.time * 23 + 1.7) * 0.12;
  ctx.fillStyle = zone === 'dying' ? 'rgba(127,212,255,0.7)' : 'rgba(255,170,40,0.85)';
  for (const off of [-14, 0, 14]) {
    const h = (26 + 30 * heatFrac) * (1 + flick + off * 0.004);
    ctx.beginPath();
    ctx.moveTo(off - 7, 58);
    ctx.quadraticCurveTo(off, 58 - h * 0.6, off + Math.sin(state.time * 9 + off) * 3, 58 - h);
    ctx.quadraticCurveTo(off, 58 - h * 0.5, off + 7, 58);
    ctx.closePath(); ctx.fill();
  }
  // Heat label over the kiln.
  text(ctx, `HEAT ${Math.round(state.heat)}`, 0, -KILN.radius - 40, 20, zone === 'gold' ? PALETTE.gold : PALETTE.cream);
  if (zone === 'gold') text(ctx, 'GOLD BAND — POTS FIRING', 0, -KILN.radius - 62, 15, PALETTE.gold);
  if (zone === 'overheat') text(ctx, 'OVERHEAT! PRESS SPACE TO VENT', 0, -KILN.radius - 62, 15, '#ff5d73');
  if (zone === 'dying') text(ctx, 'THE KILN IS DYING — FEED EMBERS!', 0, -KILN.radius - 62, 15, PALETTE.cold);
  ctx.restore();
}

function drawPots(ctx, state) {
  for (const pot of state.pots) {
    const inZone = potInGoldZone(state, pot);
    ctx.save();
    ctx.translate(pot.x, pot.y);
    if (!pot.fired && !inZone) ctx.globalAlpha = 0.55;
    // The rack stand.
    ctx.fillStyle = '#3a2a33';
    ctx.fillRect(-34, 16, 68, 6);
    ctx.fillRect(-30, -14, 4, 30);
    ctx.fillRect(26, -14, 4, 30);
    if (!pot.fired && inZone && heatInGoldBand(state.heat)) {
      const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
      halo.addColorStop(0, 'rgba(255,209,102,0.5)');
      halo.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
    }
    // The pot itself: dull clay until fired, then bright glazed gold.
    const body = pot.fired ? PALETTE.glazed : PALETTE.clay;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.bezierCurveTo(-26, 2, -18, 14, 0, 14);
    ctx.bezierCurveTo(18, 14, 26, 2, 16, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pot.fired ? '#ffe9a8' : '#a86a45';
    ctx.fillRect(-18, -16, 36, 6);
    if (pot.fired) {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(-6, 2, 4, 0, Math.PI * 2); ctx.fill();
    } else if (pot.progress > 0) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + (pot.progress / POT.fireSeconds) * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (!pot.fired && !inZone) text(ctx, 'OUTSIDE', pot.x, pot.y + 34, 10, 'rgba(247,234,215,0.6)');
  }
}

function drawKeeper(ctx, state, time) {
  const k = state.keeper;
  ctx.save();
  ctx.translate(k.x, k.y);
  if (k.invulnerable > 0 && k.dashTime <= 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  if (k.dashTime > 0) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke(); text(ctx, 'DASH!', 0, -38, 13, '#ffd166'); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 18, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b3a52';
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a4a63';
  ctx.fillRect(-12, 4, 24, 14);
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c95a';
  ctx.beginPath(); ctx.ellipse(0, -12, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a13a';
  ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, 0); ctx.fill();
  ctx.rotate(k.aim);
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(14, -5); ctx.lineTo(34, -3); ctx.moveTo(14, 5); ctx.lineTo(34, 3); ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(36, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBoss(ctx, state, time) {
  const boss = state.boss;
  if (!boss || !boss.active) return;
  ctx.save();
  ctx.translate(boss.x, boss.y + Math.sin(time * 2.2) * 3);
  if (boss.kind === 'golem') {
    // A shambling mound of ember rock with glowing cracks.
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 74);
    glow.addColorStop(0, 'rgba(255,122,47,0.5)');
    glow.addColorStop(1, 'rgba(255,122,47,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3428';
    ctx.beginPath(); ctx.arc(0, 0, boss.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5f4530';
    ctx.beginPath(); ctx.arc(-16, -14, 22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, 10, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff7a2f';
    ctx.lineWidth = 3;
    for (const [x1, y1, x2, y2] of [[-30, -6, -8, 4], [-4, -26, 6, -6], [10, 16, 28, 26], [-20, 24, -6, 12]]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(-10, -8, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -8, 4.5, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'ASH GOLEM', 0, -boss.radius - 18, 16, '#ffb347');
  } else {
    // The Frost Herald: a tall pale crowned wraith wreathed in cold.
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 92);
    glow.addColorStop(0, 'rgba(127,212,255,0.55)');
    glow.addColorStop(1, 'rgba(127,212,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(191,233,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(0, -boss.radius);
    ctx.bezierCurveTo(boss.radius, -boss.radius / 3, boss.radius * 0.7, boss.radius, 0, boss.radius + 12);
    ctx.bezierCurveTo(-boss.radius * 0.7, boss.radius, -boss.radius, -boss.radius / 3, 0, -boss.radius);
    ctx.fill();
    // Ice crown.
    ctx.fillStyle = '#eaf8ff';
    for (const off of [-24, 0, 24]) {
      ctx.beginPath();
      ctx.moveTo(off - 8, -boss.radius + 6);
      ctx.lineTo(off, -boss.radius - 20 - (off === 0 ? 8 : 0));
      ctx.lineTo(off + 8, -boss.radius + 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#12314a';
    ctx.beginPath(); ctx.arc(-13, -12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3d7ea6'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 6, 12, 0.3, Math.PI - 0.3); ctx.stroke();
    text(ctx, 'THE FROST HERALD', 0, -boss.radius - 36, 17, '#bfe9ff');
  }
  ctx.restore();
}

function drawFoes(ctx, state, time) {
  for (const draft of state.drafts) {
    ctx.save();
    ctx.translate(draft.x, draft.y);
    const wobble = Math.sin(time * 3 + draft.chill) * 3;
    ctx.fillStyle = draft.elite ? '#a8e4ff' : 'rgba(127,212,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -draft.radius - 6 + wobble);
    ctx.bezierCurveTo(draft.radius, -draft.radius / 2, draft.radius, draft.radius / 2, 0, draft.radius + wobble);
    ctx.bezierCurveTo(-draft.radius, draft.radius / 2, -draft.radius, -draft.radius / 2, 0, -draft.radius - 6 + wobble);
    ctx.fill();
    ctx.fillStyle = '#eaf8ff';
    ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, 2, 2.5, 0, Math.PI * 2); ctx.fill();
    if (draft.elite) text(ctx, 'ELITE', 0, -draft.radius - 18, 12, '#a8e4ff');
    ctx.restore();
  }
  for (const imp of state.imps) {
    ctx.save();
    ctx.translate(imp.x, imp.y);
    ctx.fillStyle = '#4a3a4d';
    ctx.beginPath(); ctx.arc(0, 0, imp.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath(); ctx.arc(-5, -3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -imp.radius - 4); ctx.lineTo(-3, -imp.radius + 4); ctx.moveTo(8, -imp.radius - 4); ctx.lineTo(3, -imp.radius + 4); ctx.stroke();
    ctx.restore();
  }
  for (const frost of state.frosts || []) {
    ctx.save();
    ctx.translate(frost.x, frost.y + Math.sin(time * 5 + frost.phase) * 3);
    const fg = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    fg.addColorStop(0, 'rgba(191,233,255,0.95)');
    fg.addColorStop(1, 'rgba(61,126,166,0.15)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eaf8ff';
    ctx.beginPath(); ctx.arc(0, -2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#123';
    ctx.beginPath(); ctx.arc(-4, -4, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -4, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 2;
    for (const a of [0.4, 2.5, 4.6]) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke(); }
    text(ctx, 'WRAITH', 0, -30, 11, '#bfe9ff');
    ctx.restore();
  }
  drawBoss(ctx, state, time);
}

function drawEmbers(ctx, state, time) {
  for (const item of state.items) {
    ctx.save();
    ctx.translate(item.x, item.y + Math.sin(time * 3 + item.bob) * 3);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    glow.addColorStop(0, 'rgba(255,150,50,0.8)');
    glow.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const spark of state.sparks) {
    ctx.save();
    ctx.translate(spark.x, spark.y);
    // A short trail behind the spark so motion reads in a still frame.
    ctx.strokeStyle = 'rgba(255,209,102,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-spark.vx * 0.05, -spark.vy * 0.05); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.colour;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 18, f.colour);
  }
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx, state, time) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawYard(ctx, state, time);
  drawGoldRing(ctx, state);
  drawPots(ctx, state);
  drawKiln(ctx, state);
  drawEmbers(ctx, state, time);
  drawFoes(ctx, state, time);
  drawKeeper(ctx, state, time);
  drawParticles(ctx, state);
  ctx.restore();
  drawHud(ctx, state, time);
}
