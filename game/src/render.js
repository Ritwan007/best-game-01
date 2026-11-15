// Kilnfire renderer: draws the whole game on one canvas in the fixed 1280x720
// logical field, scaled to the window. All art is drawn shapes — no assets.
import { FIELD, KILN, PALETTE, HEAT, POT, WAVE_SECONDS } from './config.js';
import { heatZone } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, colour, align = 'center', weight = '700') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawYard(ctx, time) {
  ctx.fillStyle = PALETTE.yard;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Flagstones.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let y = 90; y < FIELD.height; y += 90) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
  for (let x = 120; x < FIELD.width; x += 160) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
  }
  // Warm glow pooling around the kiln.
  const glow = ctx.createRadialGradient(KILN.x, KILN.y, 40, KILN.x, KILN.y, 420);
  glow.addColorStop(0, 'rgba(255,150,50,0.20)');
  glow.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Night stars in the top corners, twinkling.
  ctx.fillStyle = '#f7ead7';
  for (let i = 0; i < 24; i += 1) {
    const sx = (i * 173) % FIELD.width;
    const sy = 20 + ((i * 97) % 120);
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time * 2 + i);
    ctx.fillRect(sx, sy, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawKiln(ctx, state) {
  const zone = heatZone(state.heat);
  const heatFrac = state.heat / 100;
  // Body: a brick beehive kiln.
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
  // Brick courses.
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (const r of [28, 52, 74]) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  // Chimney.
  ctx.fillStyle = PALETTE.brickDark;
  ctx.fillRect(-16, -KILN.radius - 22, 32, 26);
  ctx.fillStyle = PALETTE.brickLight;
  ctx.fillRect(-20, -KILN.radius - 26, 40, 8);
  // Fire mouth: the glow tracks the heat, gold in the sweet zone, blue when dying.
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
  // Heat label over the kiln.
  text(ctx, `HEAT ${Math.round(state.heat)}`, 0, -KILN.radius - 40, 20, zone === 'gold' ? PALETTE.gold : PALETTE.cream);
  if (zone === 'gold') text(ctx, 'GOLD ZONE — POTS FIRING', 0, -KILN.radius - 62, 15, PALETTE.gold);
  if (zone === 'overheat') text(ctx, 'OVERHEAT! PRESS SPACE TO VENT', 0, -KILN.radius - 62, 15, '#ff5d73');
  if (zone === 'dying') text(ctx, 'THE KILN IS DYING — FEED EMBERS!', 0, -KILN.radius - 62, 15, PALETTE.cold);
  ctx.restore();
}

function drawPots(ctx, state) {
  for (const pot of state.pots) {
    ctx.save();
    ctx.translate(pot.x, pot.y);
    // Drying rack.
    ctx.fillStyle = '#3a2a33';
    ctx.fillRect(-34, 16, 68, 6);
    ctx.fillRect(-30, -14, 4, 30);
    ctx.fillRect(26, -14, 4, 30);
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
      // Firing progress ring.
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + (pot.progress / POT.fireSeconds) * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawKeeper(ctx, state, time) {
  const k = state.keeper;
  ctx.save();
  ctx.translate(k.x, k.y);
  if (k.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 18, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Apron body.
  ctx.fillStyle = '#5b3a52';
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a4a63';
  ctx.fillRect(-12, 4, 24, 14);
  // Head with straw hat.
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c95a';
  ctx.beginPath(); ctx.ellipse(0, -12, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a13a';
  ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, 0); ctx.fill();
  // Tongs pointing at the aim.
  ctx.rotate(k.aim);
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(14, -5); ctx.lineTo(34, -3); ctx.moveTo(14, 5); ctx.lineTo(34, 3); ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(36, 0, 4, 0, Math.PI * 2); ctx.fill();
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

function drawHud(ctx, state) {
  // Top bar: score, wave, hearts, heat gauge.
  ctx.fillStyle = 'rgba(20,12,22,0.72)';
  roundRect(ctx, 16, 12, 560, 54, 10);
  ctx.fill();
  text(ctx, `SCORE ${state.score}`, 34, 40, 24, PALETTE.cream, 'left');
  text(ctx, `WAVE ${state.wave}`, 300, 40, 22, PALETTE.gold, 'left');
  text(ctx, `EMBERS ${state.embers}`, 430, 40, 20, PALETTE.amber, 'left');
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
  // Gold-zone band marker.
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx - 14, gy + gh * (1 - HEAT.goldHigh / 100));
  ctx.lineTo(gx + 14, gy + gh * (1 - HEAT.goldHigh / 100));
  ctx.moveTo(gx - 14, gy + gh * (1 - HEAT.goldLow / 100));
  ctx.lineTo(gx + 14, gy + gh * (1 - HEAT.goldLow / 100));
  ctx.stroke();
  text(ctx, `${Math.round(state.heat)}`, gx, gy + gh + 20, 16, colour);
  // Wave progress bar, bottom centre.
  const bw = 420;
  ctx.fillStyle = 'rgba(20,12,22,0.72)';
  roundRect(ctx, (FIELD.width - bw) / 2, FIELD.height - 34, bw, 20, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.amber;
  roundRect(ctx, (FIELD.width - bw) / 2 + 3, FIELD.height - 31, (bw - 6) * Math.min(1, state.waveTime / WAVE_SECONDS), 14, 7);
  ctx.fill();
  text(ctx, `WAVE ${state.wave} — ${Math.ceil(WAVE_SECONDS - state.waveTime)}s to the firing break`, FIELD.width / 2, FIELD.height - 48, 14, PALETTE.cream);
  // Controls hint, bottom left.
  text(ctx, 'WASD move · mouse aim · click spark · SHIFT dash · SPACE vent', 16, FIELD.height - 20, 13, 'rgba(247,234,215,0.75)', 'left');
}

export function drawWorld(ctx, state, time) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawYard(ctx, time);
  drawPots(ctx, state);
  drawKiln(ctx, state);
  drawEmbers(ctx, state, time);
  drawFoes(ctx, state, time);
  drawKeeper(ctx, state, time);
  drawParticles(ctx, state);
  ctx.restore();
  drawHud(ctx, state);
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(18,10,20,0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(46,33,48,0.95)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brickLight;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
}

export function drawTitle(ctx, state, time) {
  drawWorld(ctx, state, time);
  overlay(ctx);
  panel(ctx, 290, 110, 700, 500);
  text(ctx, 'KILNFIRE', 640, 190, 72, PALETTE.gold);
  text(ctx, 'The Kiln-Keeper\u2019s Firing', 640, 250, 26, PALETTE.cream);
  text(ctx, 'Feed the kiln. Fire the pots. Dodge the cold.', 640, 300, 20, PALETTE.amber);
  text(ctx, 'Embers raise the heat — keep it in the GOLD ZONE', 640, 340, 18, PALETTE.cream);
  text(ctx, 'so the clay pots fire and score. Cold drafts chill', 640, 366, 18, PALETTE.cream);
  text(ctx, 'the kiln and you. Over 95? Press SPACE to vent!', 640, 392, 18, PALETTE.cream);
  text(ctx, 'WASD / arrows move · mouse aims · click throws a spark', 640, 440, 17, PALETTE.cream);
  text(ctx, 'SHIFT dash · SPACE vent · 1/2/3 pick upgrades', 640, 466, 17, PALETTE.cream);
  const pulse = 0.7 + 0.3 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS ENTER OR CLICK TO START', 640, 540, 24, PALETTE.gold);
  ctx.globalAlpha = 1;
  text(ctx, '3 hearts · waves of 25 seconds · upgrades after every wave', 640, 580, 15, 'rgba(247,234,215,0.7)');
}

export function drawUpgrade(ctx, state, choices) {
  drawWorld(ctx, state, 0);
  overlay(ctx);
  panel(ctx, 190, 90, 900, 540);
  text(ctx, `WAVE ${state.wave} COMPLETE!`, 640, 150, 40, PALETTE.gold);
  text(ctx, `Score ${state.score} · Pots fired ${state.potsFired} · Embers ${state.embers}`, 640, 196, 20, PALETTE.cream);
  text(ctx, 'CHOOSE ONE UPGRADE — press 1, 2 or 3, or click a card', 640, 240, 19, PALETTE.amber);
  choices.forEach((choice, i) => {
    const x = 230 + i * 300;
    const y = 280;
    ctx.fillStyle = 'rgba(138,74,47,0.9)';
    roundRect(ctx, x, y, 260, 260, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 260, 260, 14);
    ctx.stroke();
    text(ctx, `${i + 1}`, x + 130, y + 40, 26, PALETTE.gold);
    text(ctx, choice.name, x + 130, y + 86, 21, PALETTE.cream);
    wrapText(ctx, choice.desc, x + 130, y + 140, 220, 19, PALETTE.cream);
  });
}

function wrapText(ctx, str, x, y, maxWidth, size, colour) {
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

export function drawOver(ctx, state) {
  drawWorld(ctx, state, 0);
  overlay(ctx);
  panel(ctx, 340, 150, 600, 420);
  text(ctx, 'THE KILN HAS GONE COLD', 640, 220, 36, PALETTE.cold);
  text(ctx, `FINAL SCORE  ${state.score}`, 640, 300, 30, PALETTE.gold);
  text(ctx, `Waves survived ${state.wave} · Pots fired ${state.potsFired}`, 640, 350, 20, PALETTE.cream);
  text(ctx, `Embers gathered ${state.embers} · Drafts shattered ${state.kills}`, 640, 382, 20, PALETTE.cream);
  text(ctx, 'PRESS R OR ENTER TO FIRE AGAIN', 640, 470, 22, PALETTE.gold);
  text(ctx, 'The yard remembers every firing. Beat your score!', 640, 520, 16, 'rgba(247,234,215,0.7)');
}
