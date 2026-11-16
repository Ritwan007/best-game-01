// The screenshot scenes behind ?shot=title|play|upgrade|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (chase the nearest ember, keep clear of drafts, throw a
// spark at the nearest foe), so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { FIELD, KILN, STEP } from './config.js';
import { createWorld, stepWorld, nextWave, EVENT_OVER } from './world.js';
import { rollChoices } from './upgrades.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 19;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** The autopilot's input for one step: move toward the nearest ember, flee a close draft, aim at the nearest foe. */
function autopilot(state) {
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
  // Flee any draft or imp that gets close.
  for (const foe of [...state.drafts, ...state.imps, ...(state.frosts || [])]) {
    const d = Math.hypot(foe.x - keeper.x, foe.y - keeper.y);
    if (d < 130) {
      mx += ((keeper.x - foe.x) / (d || 1)) * 220;
      my += ((keeper.y - foe.y) / (d || 1)) * 220;
    }
  }
  const len = Math.hypot(mx, my) || 1;
  const input = {
    up: my < -12, down: my > 12, left: mx < -12, right: mx > 12,
    dash: false, vent: false, firing: false,
    mouseX: keeper.x, mouseY: keeper.y,
  };
  // Aim at the nearest foe and fire when one is in range.
  let foe = null;
  let foeBest = 420;
  for (const other of [...state.drafts, ...state.imps, ...(state.frosts || [])]) {
    const d = Math.hypot(other.x - keeper.x, other.y - keeper.y);
    if (d < foeBest) { foeBest = d; foe = other; }
  }
  if (foe) {
    input.mouseX = foe.x;
    input.mouseY = foe.y;
    input.firing = true;
  }
  // Vent before the kiln cracks.
  if (state.heat > 93) input.vent = true;
  return input;
}

function runFor(state, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(state, pilot(state), STEP);
    if (state.over || state.waveClear) break;
  }
  return state;
}

/**
 * Build the state a screenshot shows. Returns { state, screen, choices }.
 * `shot` is title | play | upgrade | end; `seed` fixes the world.
 */
export function shotScene(shot, seed = 1) {
  const scene = buildScene(shot, seed);
  scene.state.shake = 0; // screenshots must be byte-stable: no random shake offset
  return scene;
}

function buildScene(shot, seed = 1) {
  if (shot === 'title') {
    const state = createWorld(seed);
    runFor(state, START_SECONDS, autopilot);
    // The title screen shows a fresh world behind it; reset to a clean look.
    const fresh = createWorld(seed);
    runFor(fresh, 2, autopilot);
    return { state: fresh, screen: SCREEN_TITLE, choices: [] };
  }
  if (shot === 'play') {
    const state = createWorld(seed);
    runFor(state, PLAY_SECONDS, autopilot);
    return { state, screen: SCREEN_PLAY, choices: [] };
  }
  if (shot === 'upgrade') {
    const state = createWorld(seed);
    runFor(state, 30, autopilot);
    if (!state.waveClear) {
      // Force the wave break so the upgrade screen is always reachable.
      state.waveTime = 26;
      stepWorld(state, autopilot(state), STEP);
    }
    const choices = rollChoices(state.random, state.upgrades ?? { hearts: 3 });
    return { state, screen: SCREEN_UPGRADE, choices };
  }
  // end: play on until the keeper falls (the pilot is brave, not perfect).
  const state = createWorld(seed);
  const limit = Math.floor(END_LIMIT_SECONDS / SAMPLE);
  for (let i = 0; i < limit; i += 1) {
    for (let s = 0; s < Math.floor(SAMPLE / STEP); s += 1) stepWorld(state, autopilot(state), STEP);
    if (state.over) break;
    if (state.waveClear) {
      const choices = rollChoices(state.random, state.upgrades ?? { hearts: 3 });
      if (choices.length > 0) choices[0].apply(state.upgrades ?? {});
      nextWave(state);
    }
  }
  if (!state.over) {
    state.hearts = 0;
    state.over = true;
    state.events.push(EVENT_OVER);
  }
  return { state, screen: SCREEN_OVER, choices: [] };
}
