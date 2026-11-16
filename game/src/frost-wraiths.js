// Frost wraiths: the third foe kind, from wave 3. Pale weaving chasers that
// fly at the keeper in a sine weave, chill the kiln on touch, and drop a
// bonus ember where they shatter. Frostbane sparks crack them in one hit.
import { FIELD, FROST, KEEPER } from './config.js';
import { range } from './random.js';
import { burst } from './particles.js';

export const KIND_FROST = 'frost';

/** Spawn one wraith at a random field edge. */
export function spawnFrost(state) {
  const edge = Math.floor(state.random() * 4);
  let x = 60; let y = 60;
  if (edge === 0) { x = range(state.random, 60, FIELD.width - 60); y = 46; }
  if (edge === 1) { x = range(state.random, 60, FIELD.width - 60); y = FIELD.height - 46; }
  if (edge === 2) { x = 46; y = range(state.random, 60, FIELD.height - 60); }
  if (edge === 3) { x = FIELD.width - 46; y = range(state.random, 60, FIELD.height - 60); }
  state.frosts.push({ kind: KIND_FROST, x, y, radius: FROST.radius, hp: 1, active: true, phase: state.random() * Math.PI * 2 });
}

/** Chase the keeper with the weave; a touch chills the kiln and hurts. */
export function stepFrosts(state, dt, hurtKeeper) {
  const slow = state.upgrades?.frostbane ? 0.75 : 1;
  const speed = (FROST.speed + FROST.speedPerWave * (state.wave - 1)) * slow * state.difficulty.enemySpeed;
  for (const frost of state.frosts) {
    const dx = state.keeper.x - frost.x; const dy = state.keeper.y - frost.y;
    const d = Math.hypot(dx, dy) || 1;
    const weave = Math.sin(state.time * FROST.weave + frost.phase) * 90;
    frost.x += ((dx / d) - (dy / d) * weave / 200) * speed * dt;
    frost.y += ((dy / d) + (dx / d) * weave / 200) * speed * dt;
    if (d < frost.radius + KEEPER.radius) {
      frost.active = false;
      state.heat = Math.max(0, state.heat - 6);
      hurtKeeper(state, 1, 'FROST WRAITH!');
      burst(state, frost.x, frost.y, '#bfe9ff', 16, 170);
    }
  }
  state.frosts = state.frosts.filter((f) => f.active);
}
