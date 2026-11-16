// The draft surge: a mid-wave event from wave 2. At twelve seconds in, a
// four-second gust doubles the draft spawn rate and warns the keeper —
// the wave's moment of pressure, telegraphed by banner, sound and HUD.
import { SURGE, EVENT_SURGE } from './config.js';

/** Trigger the surge when its moment comes; count down while it blows. */
export function stepSurge(state, dt) {
  if (state.wave >= SURGE.firstWave && !state.surgeDone && state.waveTime >= SURGE.atSeconds) {
    state.surgeDone = true;
    state.surgeLeft = SURGE.seconds;
    state.banner = 'DRAFT SURGE! Hold the kiln!';
    state.bannerTime = 2.4;
    state.events.push(EVENT_SURGE);
  }
  if (state.surgeLeft > 0) {
    state.surgeLeft -= dt;
    state.draftTimer = Math.min(state.draftTimer, SURGE.draftInterval);
  }
}

/** True while the surge gust is blowing. */
export function surgeActive(state) {
  return state.surgeLeft > 0;
}
