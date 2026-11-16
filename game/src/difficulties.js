// Kilnfire difficulties: three ways to run a firing, chosen on the title
// screen and shown in the HUD. Each one scales how fast the kiln cools and
// how fast every foe moves; Stoker is the true firing (all multipliers 1).
export const DIFFICULTIES = [
  { id: 'apprentice', name: 'Apprentice', heatDecay: 0.7, enemySpeed: 0.85, desc: 'Gentle drafts, a patient kiln' },
  { id: 'stoker', name: 'Stoker', heatDecay: 1, enemySpeed: 1, desc: 'The true firing, as written' },
  { id: 'kilnmaster', name: 'Kilnmaster', heatDecay: 1.35, enemySpeed: 1.18, desc: 'Fast foes and a hungry kiln' },
];

/** The difficulty with this id, or Stoker when the id is unknown. */
export function difficultyById(id) {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];
}

/** The next difficulty in the list, wrapping around (for keyboard cycling). */
export function nextDifficulty(id) {
  const index = DIFFICULTIES.findIndex((d) => d.id === id);
  return DIFFICULTIES[(index + 1) % DIFFICULTIES.length];
}
