// The masterpiece pot: once per wave, reaching a x6 combo crowns the streak
// with a masterpiece — a bonus pot's worth of glory (+250), a burst at the
// kiln, a banner and an arpeggio. The firing's artistry stat, and a star.
import { KILN, MASTERPIECE, EVENT_MASTERPIECE } from './config.js';
import { burst, floater } from './particles.js';

/** Award the masterpiece when a wave's combo first reaches the streak. */
export function maybeMasterpiece(state) {
  if (state.combo < MASTERPIECE.streak || state.mpWave) return false;
  state.mpWave = true;
  state.masterpieces += 1;
  state.score += MASTERPIECE.score;
  state.events.push(EVENT_MASTERPIECE);
  floater(state, KILN.x, KILN.y - KILN.radius - 44, `MASTERPIECE! +${MASTERPIECE.score}`, '#ffe9a8');
  burst(state, KILN.x, KILN.y, '#ffe9a8', 42, 260);
  state.shake = Math.max(state.shake, 10);
  state.banner = 'MASTERPIECE POT! The kiln sings!';
  state.bannerTime = 2.2;
  return true;
}
