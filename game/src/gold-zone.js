// The gold zone, made spatial: a glowing ring around the kiln. A pot fires
// only while the heat sits in the gold band AND the pot physically stands
// inside the ring. The ring grows with the heat, so a hotter kiln fires the
// far racks too — and the Herald's cold front shrinks it hard.
import { KILN, HEAT } from './config.js';

export const GOLD_ZONE = {
  baseRadius: 90,
  radiusPerHeat: 3.5,
  coldFrontFactor: 0.65,
};

/** True when the heat itself is in the gold band (55..85). */
export function heatInGoldBand(heat) {
  return heat >= HEAT.goldLow && heat <= HEAT.goldHigh;
}

/** The ring's current radius: wider the hotter the kiln, shrunk by a cold front. */
export function goldZoneRadius(state) {
  const radius = GOLD_ZONE.baseRadius + state.heat * GOLD_ZONE.radiusPerHeat;
  return state.coldFront ? radius * GOLD_ZONE.coldFrontFactor : radius;
}

/** True when this pot stands inside the gold zone ring right now. */
export function potInGoldZone(state, pot) {
  return Math.hypot(pot.x - KILN.x, pot.y - KILN.y) <= goldZoneRadius(state);
}

/** How many unfired pots currently stand inside the ring. */
export function potsInZone(state) {
  return state.pots.filter((pot) => !pot.fired && potInGoldZone(state, pot)).length;
}

/** A pot can fire only in the gold band AND inside the ring. */
export function potCanFire(state, pot) {
  return !pot.fired && heatInGoldBand(state.heat) && potInGoldZone(state, pot);
}
