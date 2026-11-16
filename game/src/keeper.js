// The keeper: the player character. Movement, the dash (with its i-frames),
// the solid kiln collision, and what happens when something hurts them.
import { FIELD, KILN, KEEPER, EVENT_DASH, EVENT_HIT, EVENT_OVER } from './config.js';
import { burst, floater } from './particles.js';

/** A keeper at the yard's south edge, tongs ready. */
export function createKeeper() {
  return { x: 640, y: 560, vx: 0, vy: 0, aim: -Math.PI / 2, dashTime: 0, dashCooldown: 0, invulnerable: 0, moving: false };
}

/**
 * Hurt the keeper: lose hearts, flash, shake. A dashing or still-invulnerable
 * keeper cannot be hurt — the dash's i-frames are the game's dodge.
 */
export function hurtKeeper(state, amount, what) {
  if (state.keeper.invulnerable > 0 || state.keeper.dashTime > 0 || state.over) return;
  state.flash = 0.35;
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

/** Move the keeper for one step from the input, dash and kiln included. */
export function stepKeeper(state, input, dt) {
  const keeper = state.keeper;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  if (len > 0) { mx /= len; my /= len; }
  keeper.moving = len > 0;
  if (input.dash && keeper.dashCooldown <= 0 && len > 0) {
    keeper.dashTime = KEEPER.dashSeconds;
    keeper.dashCooldown = KEEPER.dashCooldown;
    state.events.push(EVENT_DASH);
    burst(state, keeper.x, keeper.y, '#ffd166', 8, 120);
  }
  const speed = keeper.dashTime > 0 ? KEEPER.dashSpeed : KEEPER.speed * (state.upgrades?.swift ? 1.18 : 1);
  keeper.x += mx * speed * dt;
  keeper.y += my * speed * dt;
  keeper.x = Math.min(FIELD.width - 30, Math.max(30, keeper.x));
  keeper.y = Math.min(FIELD.height - 30, Math.max(30, keeper.y));
  // The kiln is solid: the keeper walks around it.
  const dk = Math.hypot(keeper.x - KILN.x, keeper.y - KILN.y);
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
