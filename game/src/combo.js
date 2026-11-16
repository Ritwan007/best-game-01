// The combo chain: pots fired back-to-back without the heat leaving the gold
// band pay more each time (+25 per stack, doubled by Kiln Rhythm), up to x8.
// Leaving the band breaks the chain — gold-zone discipline is the skill.
import { POT, COMBO, EVENT_FIRED, EVENT_COMBO } from './config.js';
import { burst, floater } from './particles.js';

/** Break the chain: the heat left the gold band. */
export function resetCombo(state) {
  state.combo = 0;
  state.goldStreak = 0;
}

/**
 * Register one fired pot: advance the chain, pay its score (base + combo
 * bonus), and celebrate it. Returns the points gained.
 */
export function registerPotFired(state, pot) {
  state.potsFired += 1;
  state.combo = Math.min(COMBO.maxStack, state.combo + 1);
  state.comboMax = Math.max(state.comboMax, state.combo);
  state.goldStreak += 1;
  const mult = state.upgrades?.rhythm ? 2 : 1;
  const gained = POT.score + COMBO.bonusPerStack * (state.combo - 1) * mult;
  state.score += gained;
  state.events.push(EVENT_FIRED);
  if (state.combo >= 2) state.events.push(EVENT_COMBO);
  floater(state, pot.x, pot.y - 30, state.combo > 1 ? `+${gained} x${state.combo} COMBO!` : `+${gained} FIRED!`, '#ffd166');
  burst(state, pot.x, pot.y, '#ffd166', 16, 140);
  return gained;
}
