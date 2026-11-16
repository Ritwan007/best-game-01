// The screenshot scenes behind ?shot=title|play|boss|victory|upgrade|end.
// Each one plays the real rules forward from a fresh world, steered by the
// autopilot below (chase the nearest ember, keep clear of foes, throw sparks
// at the nearest foe — the boss first when one is on the yard), so the frame
// is what a real game looks like and the same seed always gives the same
// frame. The victory scene plays a whole campaign; when the pilot falls
// short it is staged from its own run's end state, exactly as the old 'end'
// scene forced game over when the pilot survived.
import { KILN, STEP } from './config.js';
import { createWorld, stepWorld, nextWave } from './world.js';
import { rollChoices, emptyUpgrades } from './upgrades.js';
import { createBoss, damageBoss } from './boss.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER, SCREEN_VICTORY } from './render.js';

const START_SECONDS = 2;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Every foe the pilot must mind, the boss included when it is on the yard. */
function foesOf(state) {
  const foes = [...state.drafts, ...state.imps, ...(state.frosts || [])];
  if (state.boss && state.boss.active) foes.push(state.boss);
  return foes;
}

/** The autopilot's input for one step: nearest ember, flee close foes, aim and fire. */
export function autopilotInput(state) {
  const keeper = state.keeper;
  let target = null;
  let best = Infinity;
  for (const item of state.items) {
    const d = Math.hypot(item.x - keeper.x, item.y - keeper.y);
    if (d < best) { best = d; target = item; }
  }
  let mx = 0; let my = 0;
  if (target) {
    mx = target.x - keeper.x;
    my = target.y - keeper.y;
  } else {
    mx = KILN.x + 220 - keeper.x;
    my = KILN.y + 120 - keeper.y;
  }
  // Flee any foe that gets close — the boss from further away.
  for (const foe of foesOf(state)) {
    const d = Math.hypot(foe.x - keeper.x, foe.y - keeper.y);
    const range = foe === state.boss ? 200 : 130;
    if (d < range) {
      mx += ((keeper.x - foe.x) / (d || 1)) * 240;
      my += ((keeper.y - foe.y) / (d || 1)) * 240;
    }
  }
  const input = {
    up: my < -12, down: my > 12, left: mx < -12, right: mx > 12,
    dash: false, vent: false, firing: false,
    mouseX: keeper.x, mouseY: keeper.y,
  };
  // Aim at the boss when it is in range, else the nearest foe, and fire.
  let foe = null;
  let foeBest = 460;
  if (state.boss && state.boss.active) {
    const d = Math.hypot(state.boss.x - keeper.x, state.boss.y - keeper.y);
    if (d < 540) { foe = state.boss; foeBest = d; }
  }
  if (!foe) {
    for (const other of foesOf(state)) {
      const d = Math.hypot(other.x - keeper.x, other.y - keeper.y);
      if (d < foeBest) { foeBest = d; foe = other; }
    }
  }
  if (foe) {
    input.mouseX = foe.x;
    input.mouseY = foe.y;
    input.firing = true;
    if (foeBest < 70) input.dash = true;
  }
  // Vent before the kiln cracks.
  if (state.heat > 93) input.vent = true;
  return input;
}

function runFor(state, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(state, autopilotInput(state), STEP);
    if (state.over || state.waveClear || state.won) break;
  }
  return state;
}

/** Play through a wave break the way the game does: first upgrade, next wave. */
function playBreak(state) {
  const choices = rollChoices(state.random, state.upgrades ?? emptyUpgrades());
  if (choices.length > 0) {
    choices[0].apply(state.upgrades);
    if (choices[0].id === 'heart') state.hearts = Math.min(4, state.upgrades.hearts);
  }
  nextWave(state);
}

/** Keep the captured frame honest and dense: heat in the band, foes on screen. */
function stageDensity(state, minFoes) {
  if (state.heat < 55 || state.heat > 85) state.heat = 72;
  let foes = state.drafts.length + state.imps.length + state.frosts.length;
  let guard = 0;
  while (foes < minFoes && guard < 8) {
    guard += 1;
    const angle = state.random() * Math.PI * 2;
    const x = Math.min(1220, Math.max(60, KILN.x + Math.cos(angle) * (360 + state.random() * 200)));
    const y = Math.min(660, Math.max(60, KILN.y + Math.sin(angle) * (240 + state.random() * 120)));
    if (guard % 2 === 0) state.frosts.push({ kind: 'frost', x, y, radius: 14, hp: 1, active: true, phase: state.random() * 6 });
    else state.drafts.push({ kind: 'draft', x, y, radius: 17, hp: 1, elite: false, active: true, chill: state.random() * 6 });
    foes += 1;
  }
}

/** Stage the Herald mid-fight: phase 2 (cold front up), heat in the band. */
function stageBoss(state) {
  if (state.boss && state.boss.active) {
    const target = Math.floor(state.boss.maxHp * 0.62);
    if (state.boss.hp > target) damageBoss(state, state.boss.hp - target);
  }
  stageDensity(state, 4);
}

/**
 * Build the state a screenshot shows. Returns { state, screen, choices }.
 * `shot` is title | play | boss | victory | upgrade | end; seed fixes it.
 */
export function shotScene(shot, seed = 1) {
  const scene = buildScene(shot, seed);
  scene.state.shake = 0; // screenshots must be byte-stable: no random shake offset
  return scene;
}

function buildScene(shot, seed = 1) {
  if (shot === 'title') {
    const fresh = createWorld(seed);
    fresh.upgrades = emptyUpgrades();
    runFor(fresh, START_SECONDS);
    fresh.banner = '';
    fresh.bannerTime = 0;
    return { state: fresh, screen: SCREEN_TITLE, choices: [] };
  }
  if (shot === 'play') {
    // Wave 3, mid-surge: two full waves in, the surge gust blowing, wraiths up.
    const state = createWorld(seed);
    state.upgrades = emptyUpgrades();
    runFor(state, 26);
    if (state.waveClear) playBreak(state);
    runFor(state, 26);
    if (state.waveClear) playBreak(state);
    runFor(state, 13.8);
    // By now the pilot has usually fired the whole rack; leave three pots
    // mid-firing (real progress values) so the ring rule reads in the still.
    let unfired = 0;
    for (const pot of state.pots) {
      if (unfired >= 3) break;
      if (pot.fired) { pot.fired = false; pot.progress = 3.5; unfired += 1; }
    }
    stageDensity(state, 5);
    return { state, screen: SCREEN_PLAY, choices: [] };
  }
  if (shot === 'boss') {
    // Wave 10, the Night Firing: play a real campaign to the Herald, then
    // nine seconds into the fight. If the pilot falls on the way, stage a
    // fresh wave-10 world instead (it never fells the Herald in 9s either).
    const state = createWorld(seed);
    state.upgrades = emptyUpgrades();
    const limit = Math.floor(END_LIMIT_SECONDS / STEP);
    for (let i = 0; i < limit; i += 1) {
      stepWorld(state, autopilotInput(state), STEP);
      if (state.over || state.won) break;
      if (state.waveClear) playBreak(state);
      if (state.wave === 10 && state.boss && state.boss.active) break;
    }
    runFor(state, 4);
    if (state.wave !== 10 || !state.boss || !state.boss.active || state.won) {
      const fresh = createWorld(seed);
      fresh.upgrades = emptyUpgrades();
      fresh.wave = 9;
      nextWave(fresh);
      runFor(fresh, 9);
      if (!fresh.boss || !fresh.boss.active) { fresh.boss = createBoss(fresh); fresh.wave = 10; }
      stageBoss(fresh);
      return { state: fresh, screen: SCREEN_PLAY, choices: [] };
    }
    stageBoss(state);
    return { state, screen: SCREEN_PLAY, choices: [] };
  }
  if (shot === 'victory') {
    // A whole campaign under the pilot; if it falls, stage the win from its
    // own end state (the old end scene did the mirror image for game over).
    const state = createWorld(seed);
    state.upgrades = emptyUpgrades();
    const limit = Math.floor(END_LIMIT_SECONDS / STEP);
    for (let i = 0; i < limit; i += 1) {
      stepWorld(state, autopilotInput(state), STEP);
      if (state.won || state.over) break;
      if (state.waveClear) playBreak(state);
    }
    if (!state.won) {
      state.wave = 10;
      state.boss = null;
      state.coldFront = false;
      state.hearts = Math.max(1, state.hearts);
      state.over = false;
      state.won = true;
      state.campaignDone = true;
    }
    return { state, screen: SCREEN_VICTORY, choices: [] };
  }
  if (shot === 'upgrade') {
    const state = createWorld(seed);
    state.upgrades = emptyUpgrades();
    runFor(state, 30);
    if (!state.waveClear && !state.over) {
      state.waveTime = 26;
      stepWorld(state, autopilotInput(state), STEP);
    }
    const choices = rollChoices(state.random, state.upgrades);
    return { state, screen: SCREEN_UPGRADE, choices };
  }
  // end: play a campaign on until the keeper falls (the pilot is brave).
  const state = createWorld(seed);
  state.upgrades = emptyUpgrades();
  const limit = Math.floor(END_LIMIT_SECONDS / SAMPLE);
  for (let i = 0; i < limit; i += 1) {
    for (let s = 0; s < Math.floor(SAMPLE / STEP); s += 1) stepWorld(state, autopilotInput(state), STEP);
    if (state.over || state.won) break;
    if (state.waveClear) playBreak(state);
  }
  if (!state.over) {
    state.hearts = 0;
    state.over = true;
  }
  return { state, screen: SCREEN_OVER, choices: [] };
}
