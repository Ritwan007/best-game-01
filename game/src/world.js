// Kilnfire world: the simulation orchestrator. Pure game logic, no canvas and
// no audio, so it can be driven headlessly in tests. The systems live in
// their own modules — keeper, gold-zone, combo, masterpiece, draft-surge,
// frost-wraiths, boss, campaign, difficulties, particles, pot-racks — and
// this file wires them into one fixed-step world.
import { FIELD, KILN, STEP, WAVE_SECONDS, KEEPER, HEARTS, HEAT, EMBER, DRAFT, IMP, FROST, SPARK, POT, EVENT_OVER, EVENT_WAVE, EVENT_VENT, EVENT_PICKUP, EVENT_SHOOT, EVENT_BOSS, EVENT_VICTORY } from './config.js';
import { makeRandom, range } from './random.js';
import { burst, floater, stepParticles } from './particles.js';
import { createKeeper, stepKeeper, hurtKeeper } from './keeper.js';
import { createPots, RACKS } from './pot-racks.js';
import { heatInGoldBand, potCanFire } from './gold-zone.js';
import { registerPotFired, resetCombo } from './combo.js';
import { maybeMasterpiece } from './masterpiece.js';
import { stepSurge } from './draft-surge.js';
import { spawnFrost, stepFrosts, KIND_FROST } from './frost-wraiths.js';
import { createBoss, stepBoss, damageBoss } from './boss.js';
import { isBossWave } from './campaign.js';
import { difficultyById } from './difficulties.js';

export { EVENT_OVER, EVENT_WAVE, EVENT_VENT, EVENT_PICKUP, EVENT_SHOOT, EVENT_BOSS, EVENT_VICTORY };
export { EVENT_FIRED, EVENT_HIT, EVENT_COMBO, EVENT_MASTERPIECE, EVENT_SURGE, EVENT_DASH, EVENT_BOSS_DOWN } from './config.js';
export { RACKS };
export const KIND_EMBER = 'ember';
export const KIND_DRAFT = 'draft';
export const KIND_IMP = 'imp';
export { KIND_FROST };

export function createWorld(seed, difficultyId = 'stoker') {
  const random = makeRandom(seed);
  const state = {
    seed,
    random,
    difficulty: difficultyById(difficultyId),
    time: 0,
    wave: 1,
    waveTime: 0,
    score: 0,
    embers: 0,
    embersSpent: 0,
    potsFired: 0,
    hearts: HEARTS,
    heat: HEAT.start,
    overheatSeconds: 0,
    keeper: createKeeper(),
    sparks: [],
    items: [],
    drafts: [],
    imps: [],
    frosts: [],
    particles: [],
    floaters: [],
    pots: createPots(),
    emberTimer: 0.4,
    draftTimer: 3.0,
    impTimer: 8,
    frostTimer: 9,
    combo: 0,
    comboMax: 0,
    goldStreak: 0,
    masterpieces: 0,
    surgeDone: false,
    surgeLeft: 0,
    mpWave: false,
    boss: null,
    coldFront: false,
    won: false,
    campaignDone: false,
    endless: false,
    rerollUsed: false,
    banner: 'FIRE THE POTS! Keep heat 55-85 and pots inside the GOLD RING',
    bannerTime: 5,
    hintStage: 0,
    flash: 0,
    sparkCooldown: 0,
    shake: 0,
    events: [],
    over: false,
    waveClear: false,
    kills: 0,
  };
  spawnStarterEmbers(state);
  return state;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnStarterEmbers(state) {
  for (const [dx, dy] of [[90, -60], [-120, 40]]) {
    state.items.push({ kind: KIND_EMBER, x: state.keeper.x + dx, y: state.keeper.y + dy, vx: 0, vy: 0, radius: EMBER.radius, active: true, bob: state.random() * Math.PI * 2 });
  }
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
  state.heat -= HEAT.drainPerSecond * state.difficulty.heatDecay * dt;
  const inGold = heatInGoldBand(state.heat);
  if (!inGold && state.combo > 0) resetCombo(state);
  if (inGold) {
    for (const pot of state.pots) {
      // The spatial rule: a pot fires only while it stands inside the ring.
      if (!potCanFire(state, pot)) continue;
      pot.progress += dt * (state.upgrades?.glaze ? 2 : 1) * (state.upgrades?.stoker ? 1.35 : 1);
      if (pot.progress >= POT.fireSeconds) {
        pot.fired = true;
        registerPotFired(state, pot);
        maybeMasterpiece(state);
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
  const speed = (DRAFT.speed + DRAFT.speedPerWave * (state.wave - 1)) * state.difficulty.enemySpeed;
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
  const speed = (IMP.speed + IMP.speedPerWave * (state.wave - 1)) * state.difficulty.enemySpeed;
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
  // Sparks hit drafts, imps, wraiths and the boss.
  for (const spark of state.sparks) {
    for (const draft of state.drafts) {
      if (draft.active && spark.life > 0 && distance(spark.x, spark.y, draft.x, draft.y) < spark.radius + draft.radius) {
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
      if (imp.active && spark.life > 0 && distance(spark.x, spark.y, imp.x, imp.y) < spark.radius + imp.radius) {
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
    for (const frost of state.frosts) {
      if (frost.active && spark.life > 0 && distance(spark.x, spark.y, frost.x, frost.y) < spark.radius + frost.radius) {
        spark.life = 0;
        frost.hp -= SPARK.damage + (state.upgrades?.frostbane ? 1 : 0);
        burst(state, frost.x, frost.y, '#bfe9ff', 10, 150);
        floater(state, frost.x, frost.y - 20, 'CRACK!', '#bfe9ff');
        if (frost.hp <= 0) {
          frost.active = false;
          state.kills += 1;
          state.score += 40;
          floater(state, frost.x, frost.y - 36, '+40 WRAITH DOWN', '#bfe9ff');
          // A shattered wraith drops a bonus ember where it fell.
          state.items.push({ kind: KIND_EMBER, x: frost.x, y: frost.y, vx: 0, vy: 0, radius: EMBER.radius, active: true, bob: 0 });
        }
      }
    }
    if (state.boss && state.boss.active && spark.life > 0 && distance(spark.x, spark.y, state.boss.x, state.boss.y) < spark.radius + state.boss.radius) {
      spark.life = 0;
      const bonus = state.boss.kind === 'herald' && state.upgrades?.frostbane ? 1 : 0;
      damageBoss(state, SPARK.damage + bonus);
    }
  }
  state.frosts = state.frosts.filter((f) => f.active);
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
  if (state.wave >= FROST.firstWave) {
    state.frostTimer -= dt;
    if (state.frostTimer <= 0) {
      state.frostTimer = FROST.interval * (0.8 + state.random() * 0.5);
      spawnFrost(state);
    }
  }
}

/** Settle a fallen boss: pay it out, then victory (Herald) or the wave break (Golem). */
function settleBoss(state) {
  const boss = state.boss;
  if (!boss || boss.active || boss.counted) return;
  boss.counted = true;
  state.kills += 1;
  state.score += boss.scoreValue;
  state.coldFront = false;
  if (state.wave === 10 && !state.endless) {
    state.won = true;
    state.campaignDone = true;
    state.events.push(EVENT_VICTORY);
  } else {
    state.waveClear = true;
    state.events.push(EVENT_WAVE);
  }
}

/** One fixed simulation step. `input.firing` throws a spark toward the mouse. */
export function stepWorld(state, input, dt = STEP) {
  if (state.over || state.waveClear || state.won) return state;
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
  stepFrosts(state, dt, hurtKeeper);
  stepBoss(state, dt, { hurtKeeper, spawnFrost, spawnImp, spawnDraft });
  stepSurge(state, dt);
  if (state.bannerTime > 0) state.bannerTime -= dt;
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
  // Contextual hints for a first-time keeper.
  if (state.hintStage === 0 && state.embers >= 1) { state.hintStage = 1; state.banner = 'Good! Embers raise HEAT - keep it in the GOLD band'; state.bannerTime = 3; }
  if (state.hintStage === 1 && state.potsFired >= 1) { state.hintStage = 2; state.banner = 'Pot fired! Pots fire inside the GOLD RING - chain them for COMBO'; state.bannerTime = 3.2; }
  stepCollisions(state);
  settleBoss(state);
  stepSpawning(state, dt);
  stepParticles(state, dt);
  const bossAlive = state.boss && state.boss.active;
  if (state.waveTime >= WAVE_SECONDS && !bossAlive) {
    state.waveClear = true;
    state.score += POT.waveBonus;
    state.events.push(EVENT_WAVE);
  }
  return state;
}

/** Open the next wave: fresh pots, timers reset, and a boss on boss waves. */
export function nextWave(state) {
  state.wave += 1;
  state.waveTime = 0;
  state.waveClear = false;
  state.pots = createPots();
  state.draftTimer = 1.2;
  state.impTimer = 6;
  state.frostTimer = 7;
  state.surgeDone = false;
  state.surgeLeft = 0;
  state.mpWave = false;
  state.rerollUsed = false;
  state.coldFront = false;
  state.frosts = [];
  state.boss = !state.endless && isBossWave(state.wave) ? createBoss(state) : null;
  if (state.boss) {
    state.banner = state.boss.kind === 'herald'
      ? 'THE FROST HERALD COMES FOR THE KILN!'
      : 'THE ASH GOLEM STIRS!';
    state.bannerTime = 3;
    state.events.push(EVENT_BOSS);
  } else {
    state.banner = `Wave ${state.wave} - hotter, faster, colder...`;
    state.bannerTime = 2.4;
  }
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
