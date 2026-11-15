// Kilnfire world: pure game logic, no canvas and no audio, so it can be driven
// headlessly in tests. A state is created by createWorld(seed), stepped by
// stepWorld(state, input, dt), and read by the renderer and the screenshots.
import { FIELD, KILN, STEP, WAVE_SECONDS, KEEPER, HEARTS, HEAT, EMBER, DRAFT, IMP, SPARK, POT } from './config.js';
import { makeRandom, range } from './random.js';

export const KIND_EMBER = 'ember';
export const KIND_DRAFT = 'draft';
export const KIND_IMP = 'imp';
export const KIND_SPARK = 'spark';
export const EVENT_OVER = 'over';
export const EVENT_WAVE = 'wave';
export const EVENT_FIRED = 'fired';
export const EVENT_HIT = 'hit';
export const EVENT_VENT = 'vent';
export const EVENT_PICKUP = 'pickup';
export const EVENT_SHOOT = 'shoot';

const RACKS = [
  { x: 96, y: 120 }, { x: 96, y: 360 }, { x: 96, y: 600 },
  { x: 1184, y: 120 }, { x: 1184, y: 360 }, { x: 1184, y: 600 },
];

export function createWorld(seed) {
  const random = makeRandom(seed);
  return {
    seed,
    random,
    time: 0,
    wave: 1,
    waveTime: 0,
    score: 0,
    embers: 0,
    potsFired: 0,
    hearts: HEARTS,
    heat: HEAT.start,
    overheatSeconds: 0,
    keeper: { x: 640, y: 560, vx: 0, vy: 0, aim: -Math.PI / 2, dashTime: 0, dashCooldown: 0, invulnerable: 0, moving: false },
    sparks: [],
    items: [],
    drafts: [],
    imps: [],
    particles: [],
    floaters: [],
    pots: RACKS.map((rack) => ({ x: rack.x, y: rack.y, progress: 0, fired: false })),
    emberTimer: 0.4,
    draftTimer: 3.0,
    impTimer: 8,
    sparkCooldown: 0,
    shake: 0,
    events: [],
    over: false,
    waveClear: false,
    kills: 0,
  };
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnEmber(state) {
  const angle = state.random() * Math.PI * 2;
  const radius = 150 + state.random() * 380;
  const x = Math.min(FIELD.width - 40, Math.max(40, KILN.x + Math.cos(angle) * radius));
  const y = Math.min(FIELD.height - 40, Math.max(40, KILN.y + Math.sin(angle) * radius));
  if (distance(x, y, KILN.x, KILN.y) < KILN.radius + 30) return;
  state.items.push({ kind: KIND_EMBER, x, y, vx: range(state.random, -EMBER.speed, EMBER.speed), vy: range(state.random, -EMBER.speed, EMBER.speed), radius: EMBER.radius, active: true, bob: state.random() * Math.PI * 2 });
}

function spawnDraft(state) {
  const edge = Math.floor(state.random() * 4);
  let x = 40; let y = 40;
  if (edge === 0) { x = range(state.random, 40, FIELD.width - 40); y = 30; }
  if (edge === 1) { x = range(state.random, 40, FIELD.width - 40); y = FIELD.height - 30; }
  if (edge === 2) { x = 30; y = range(state.random, 40, FIELD.height - 40); }
  if (edge === 3) { x = FIELD.width - 30; y = range(state.random, 40, FIELD.height - 40); }
  const elite = state.wave >= 4 && state.random() < 0.25;
  state.drafts.push({ kind: KIND_DRAFT, x, y, radius: elite ? DRAFT.radius + 6 : DRAFT.radius, hp: elite ? 2 : 1, elite, active: true, chill: state.random() * Math.PI * 2 });
}

function spawnImp(state) {
  const angle = state.random() * Math.PI * 2;
  const x = Math.min(FIELD.width - 50, Math.max(50, KILN.x + Math.cos(angle) * 460));
  const y = Math.min(FIELD.height - 50, Math.max(50, KILN.y + Math.sin(angle) * 300));
  state.imps.push({ kind: KIND_IMP, x, y, radius: IMP.radius, hp: 2, active: true });
}

function burst(state, x, y, colour, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.random() * Math.PI * 2;
    const v = speed * (0.4 + state.random() * 0.8);
    state.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: 0.5 + state.random() * 0.4, maxLife: 0.9, colour, size: 2 + state.random() * 4 });
  }
}

function floater(state, x, y, text, colour) {
  state.floaters.push({ x, y, text, colour, life: 1.1 });
}

function hurtKeeper(state, amount, what) {
  if (state.keeper.invulnerable > 0 || state.over) return;
  state.hearts -= amount;
  state.keeper.invulnerable = KEEPER.invulnerable;
  state.shake = 14;
  state.events.push(EVENT_HIT);
  floater(state, state.keeper.x, state.keeper.y - 34, what, '#ff5d73');
  burst(state, state.keeper.x, state.keeper.y, '#ff5d73', 14, 180);
  if (state.hearts <= 0) {
    state.hearts = 0;
    state.over = true;
    state.events.push(EVENT_OVER);
  }
}

function stepKeeper(state, input, dt) {
  const keeper = state.keeper;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  if (len > 0) { mx /= len; my /= len; }
  keeper.moving = len > 0;
  if (input.dash && keeper.dashCooldown <= 0 && len > 0) {
    keeper.dashTime = KEEPER.dashSeconds;
    keeper.dashCooldown = KEEPER.dashCooldown;
    burst(state, keeper.x, keeper.y, '#ffd166', 8, 120);
  }
  const speed = keeper.dashTime > 0 ? KEEPER.dashSpeed : KEEPER.speed * (state.upgrades?.swift ? 1.18 : 1);
  keeper.x += mx * speed * dt;
  keeper.y += my * speed * dt;
  keeper.x = Math.min(FIELD.width - 30, Math.max(30, keeper.x));
  keeper.y = Math.min(FIELD.height - 30, Math.max(30, keeper.y));
  // The kiln is solid: the keeper walks around it.
  const dk = distance(keeper.x, keeper.y, KILN.x, KILN.y);
  if (dk < KILN.radius + KEEPER.radius) {
    const push = (KILN.radius + KEEPER.radius - dk) || 1;
    keeper.x += ((keeper.x - KILN.x) / (dk || 1)) * push;
    keeper.y += ((keeper.y - KILN.y) / (dk || 1)) * push;
  }
  keeper.aim = Math.atan2(input.mouseY - keeper.y, input.mouseX - keeper.x);
  if (keeper.dashTime > 0) keeper.dashTime -= dt;
  if (keeper.dashCooldown > 0) keeper.dashCooldown -= dt;
  if (keeper.invulnerable > 0) keeper.invulnerable -= dt;
}

function stepSparks(state, dt) {
  if (state.sparkCooldown > 0) state.sparkCooldown -= dt;
  for (const spark of state.sparks) {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.life -= dt;
    if (spark.x < 0 || spark.x > FIELD.width || spark.y < 0 || spark.y > FIELD.height) spark.life = 0;
  }
  state.sparks = state.sparks.filter((s) => s.life > 0);
}

function stepHeat(state, dt) {
  state.heat -= HEAT.drainPerSecond * dt;
  const inGold = state.heat >= HEAT.goldLow && state.heat <= HEAT.goldHigh;
  if (inGold) {
    for (const pot of state.pots) {
      if (pot.fired) continue;
      pot.progress += dt * (state.upgrades?.glaze ? 2 : 1);
      if (pot.progress >= POT.fireSeconds) {
        pot.fired = true;
        state.potsFired += 1;
        state.score += POT.score;
        state.events.push(EVENT_FIRED);
        floater(state, pot.x, pot.y - 30, `+${POT.score} FIRED!`, '#ffd166');
        burst(state, pot.x, pot.y, '#ffd166', 16, 140);
      }
    }
  }
  if (state.heat > HEAT.overheat) {
    state.overheatSeconds += dt;
    if (state.overheatSeconds > HEAT.crackDamageSeconds) {
      state.overheatSeconds = 0;
      state.heat = HEAT.overheat - 6;
      hurtKeeper(state, 1, 'KILN CRACKED!');
    }
  } else {
    state.overheatSeconds = 0;
  }
  if (state.heat <= 0) {
    state.heat = 0;
    hurtKeeper(state, 1, 'THE KILN WENT COLD!');
    state.heat = 28;
  }
}

function draftCool(state) {
  return DRAFT.coolOnTouch * (state.upgrades?.ward ? 0.5 : 1);
}

function stepDrafts(state, dt) {
  const speed = DRAFT.speed + DRAFT.speedPerWave * (state.wave - 1);
  for (const draft of state.drafts) {
    // Drafts drift toward the kiln to cool it; a cold touch on the keeper chills them both.
    const dx = KILN.x - draft.x; const dy = KILN.y - draft.y;
    const d = Math.hypot(dx, dy) || 1;
    draft.x += (dx / d) * speed * dt + Math.sin(state.time * 2 + draft.chill) * 14 * dt;
    draft.y += (dy / d) * speed * dt + Math.cos(state.time * 1.7 + draft.chill) * 14 * dt;
    if (distance(draft.x, draft.y, KILN.x, KILN.y) < KILN.radius + draft.radius) {
      draft.active = false;
      state.heat = Math.max(0, state.heat - draftCool(state));
      burst(state, draft.x, draft.y, '#7fd4ff', 12, 130);
      floater(state, KILN.x, KILN.y - KILN.radius - 14, `-${draftCool(state)} HEAT`, '#7fd4ff');
    }
    if (distance(draft.x, draft.y, state.keeper.x, state.keeper.y) < draft.radius + KEEPER.radius) {
      draft.active = false;
      state.heat = Math.max(0, state.heat - draftCool(state));
      hurtKeeper(state, 1, 'CHILLED!');
    }
  }
  state.drafts = state.drafts.filter((d) => d.active);
}

function stepImps(state, dt) {
  const speed = IMP.speed + IMP.speedPerWave * (state.wave - 1);
  for (const imp of state.imps) {
    const dx = state.keeper.x - imp.x; const dy = state.keeper.y - imp.y;
    const d = Math.hypot(dx, dy) || 1;
    imp.x += (dx / d) * speed * dt;
    imp.y += (dy / d) * speed * dt;
    if (d < imp.radius + KEEPER.radius) {
      imp.active = false;
      hurtKeeper(state, 1, 'ASH IMP!');
    }
  }
  state.imps = state.imps.filter((i) => i.active);
}

function stepCollisions(state) {
  // Sparks hit drafts and imps.
  for (const spark of state.sparks) {
    for (const draft of state.drafts) {
      if (draft.active && distance(spark.x, spark.y, draft.x, draft.y) < spark.radius + draft.radius) {
        spark.life = 0;
        draft.hp -= SPARK.damage;
        burst(state, draft.x, draft.y, '#ffb347', 8, 120);
        if (draft.hp <= 0) {
          draft.active = false;
          state.kills += 1;
          state.score += 15;
          floater(state, draft.x, draft.y - 20, '+15', '#ffb347');
        }
      }
    }
    for (const imp of state.imps) {
      if (imp.active && distance(spark.x, spark.y, imp.x, imp.y) < spark.radius + imp.radius) {
        spark.life = 0;
        imp.hp -= SPARK.damage;
        burst(state, imp.x, imp.y, '#ff7a2f', 8, 120);
        if (imp.hp <= 0) {
          imp.active = false;
          state.kills += 1;
          state.score += 25;
          floater(state, imp.x, imp.y - 20, '+25', '#ff7a2f');
        }
      }
    }
  }
  state.sparks = state.sparks.filter((s) => s.life > 0);
  // Keeper gathers embers.
  for (const item of state.items) {
    if (!item.active) continue;
    item.x += item.vx * STEP;
    item.y += item.vy * STEP;
    if (item.x < 30 || item.x > FIELD.width - 30) item.vx *= -1;
    if (item.y < 30 || item.y > FIELD.height - 30) item.vy *= -1;
    const magnet = state.upgrades?.magnet ? 110 : 52;
    const d = distance(item.x, item.y, state.keeper.x, state.keeper.y);
    if (d < magnet) {
      item.x += ((state.keeper.x - item.x) / (d || 1)) * 260 * STEP;
      item.y += ((state.keeper.y - item.y) / (d || 1)) * 260 * STEP;
    }
    if (d < KEEPER.radius + item.radius + 6) {
      item.active = false;
      state.embers += 1;
      state.score += EMBER.points;
      state.heat = Math.min(100, state.heat + HEAT.emberGain + (state.upgrades?.emberBonus ?? 0));
      state.events.push(EVENT_PICKUP);
      floater(state, item.x, item.y - 18, `+${EMBER.points}`, '#ffb347');
      burst(state, item.x, item.y, '#ff7a2f', 6, 100);
    }
  }
  state.items = state.items.filter((i) => i.active);
}

function stepSpawning(state, dt) {
  state.emberTimer -= dt;
  if (state.emberTimer <= 0) {
    state.emberTimer = EMBER.interval + state.random() * EMBER.intervalJitter;
    if (state.items.length < EMBER.maxAlive) spawnEmber(state);
  }
  state.draftTimer -= dt;
  if (state.draftTimer <= 0) {
    const interval = Math.max(DRAFT.minInterval, DRAFT.interval * Math.pow(DRAFT.intervalScale, state.wave - 1));
    state.draftTimer = interval * (0.8 + state.random() * 0.4);
    spawnDraft(state);
  }
  if (state.wave >= IMP.firstWave) {
    state.impTimer -= dt;
    if (state.impTimer <= 0) {
      state.impTimer = IMP.interval * (0.8 + state.random() * 0.5);
      spawnImp(state);
    }
  }
}

function stepParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floaters) { f.y -= 34 * dt; f.life -= dt; }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 40 * dt);
}

/** One fixed simulation step. `input.firing` throws a spark toward the mouse. */
export function stepWorld(state, input, dt = STEP) {
  if (state.over || state.waveClear) return state;
  state.time += dt;
  state.waveTime += dt;
  if (input.vent && state.heat > HEAT.goldHigh) {
    state.heat = Math.max(0, state.heat - HEAT.ventCool);
    state.events.push(EVENT_VENT);
    burst(state, KILN.x, KILN.y - KILN.radius, '#f7ead7', 22, 200);
    floater(state, KILN.x, KILN.y - KILN.radius - 20, 'VENTED!', '#f7ead7');
  }
  // Aim first: a spark thrown this step must fly where the mouse points now,
  // not where it pointed a step ago.
  state.keeper.aim = Math.atan2(input.mouseY - state.keeper.y, input.mouseX - state.keeper.x);
  if (input.firing && state.sparkCooldown <= 0) {
    state.sparkCooldown = SPARK.cooldown * (state.upgrades?.rapid ? 0.7 : 1);
    const count = state.upgrades?.twin ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const spread = count === 2 ? (i === 0 ? -0.09 : 0.09) : 0;
      const angle = state.keeper.aim + spread;
      state.sparks.push({ x: state.keeper.x + Math.cos(angle) * 30, y: state.keeper.y + Math.sin(angle) * 30, vx: Math.cos(angle) * SPARK.speed, vy: Math.sin(angle) * SPARK.speed, radius: SPARK.radius, life: SPARK.range / SPARK.speed });
    }
    state.events.push(EVENT_SHOOT);
  }
  stepKeeper(state, input, dt);
  stepSparks(state, dt);
  stepHeat(state, dt);
  stepDrafts(state, dt);
  stepImps(state, dt);
  stepCollisions(state);
  stepSpawning(state, dt);
  stepParticles(state, dt);
  if (state.waveTime >= WAVE_SECONDS) {
    state.waveClear = true;
    state.score += POT.waveBonus;
    state.events.push(EVENT_WAVE);
  }
  return state;
}

/** Open the next wave: fresh pots on the racks, wave counter up, timers reset. */
export function nextWave(state) {
  state.wave += 1;
  state.waveTime = 0;
  state.waveClear = false;
  state.pots = RACKS.map((rack) => ({ x: rack.x, y: rack.y, progress: 0, fired: false }));
  state.draftTimer = 1.2;
  state.impTimer = 6;
  state.heat = Math.min(100, state.heat + 8);
  return state;
}

export function heatZone(heat) {
  if (heat < 20) return 'dying';
  if (heat < HEAT.goldLow) return 'cool';
  if (heat <= HEAT.goldHigh) return 'gold';
  if (heat <= HEAT.overheat) return 'hot';
  return 'overheat';
}
