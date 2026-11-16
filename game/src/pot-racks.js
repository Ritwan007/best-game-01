// The pot racks: six clay-pot stands in a ring around the kiln, at mixed
// distances so the gold zone ring (which grows with the heat) reaches the
// near stands first and the far stands only when the kiln runs hot.
import { KILN } from './config.js';

// [angle in degrees, distance from the kiln's centre]
const STANDS = [
  [-90, 205], [-32, 248], [28, 288], [90, 228], [148, 268], [208, 302],
];

export const RACKS = STANDS.map(([degrees, distance]) => ({
  x: Math.round(KILN.x + Math.cos((degrees * Math.PI) / 180) * distance),
  y: Math.round(KILN.y + Math.sin((degrees * Math.PI) / 180) * distance),
}));

/** A fresh set of unfired pots, one per rack. */
export function createPots() {
  return RACKS.map((rack) => ({ x: rack.x, y: rack.y, progress: 0, fired: false }));
}
