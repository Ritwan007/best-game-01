// The three-upgrade choice offered after every wave. Each one changes the
// keeper, the kiln or the sparks in a way the player can feel at once.
export const UPGRADES = [
  { id: 'bellows', name: 'Great Bellows', desc: 'Embers feed +6 heat each. The kiln burns hotter, longer.', apply: (u) => { u.emberBonus = (u.emberBonus ?? 0) + 6; } },
  { id: 'twin', name: 'Twin Tongs', desc: 'Throw two sparks at once, slightly spread. Twice the bite.', apply: (u) => { u.twin = true; } },
  { id: 'rapid', name: 'Quick Hands', desc: 'Sparks fly 30% faster. Drafts melt before they reach the kiln.', apply: (u) => { u.rapid = true; } },
  { id: 'magnet', name: 'Ember Charm', desc: 'Embers drift toward you from twice as far away.', apply: (u) => { u.magnet = true; } },
  { id: 'swift', name: 'Swift Sandals', desc: 'Move 18% faster. Outrun the ash imps with ease.', apply: (u) => { u.swift = true; } },
  { id: 'heart', name: 'Clay Heart', desc: 'Mend the keeper: +1 heart, up to 4. A second wind.', apply: (u) => { u.hearts = Math.min(4, (u.hearts ?? 3) + 1); } },
  { id: 'glaze', name: 'Master Glaze', desc: 'Pots fire twice as fast in the gold zone. Score pours in.', apply: (u) => { u.glaze = true; } },
  { id: 'shield', name: 'Kiln Ward', desc: 'Drafts cool the kiln half as much. The cold loses its teeth.', apply: (u) => { u.ward = true; } },
  { id: 'rhythm', name: 'Kiln Rhythm', desc: 'Combo bonuses pay DOUBLE. Chain gold-zone pots and get rich.', apply: (u) => { u.rhythm = true; } },
  { id: 'frostbane', name: 'Frostbane Sparks', desc: 'Sparks crack wraiths in one hit; wraiths fly 25% slower.', apply: (u) => { u.frostbane = true; } },
  { id: 'stoker', name: "Stoker's Craft", desc: 'Pots need 26% less time in the gold zone to fire.', apply: (u) => { u.stoker = true; } },
];

export function emptyUpgrades() {
  return { emberBonus: 0, twin: false, rapid: false, magnet: false, swift: false, hearts: 3, glaze: false, ward: false, rhythm: false, frostbane: false, stoker: false };
}

/** Pick 3 distinct upgrades at random; the heart one is skipped at full hearts. */
export function rollChoices(random, upgrades) {
  const pool = UPGRADES.filter((u) => !(u.id === 'heart' && upgrades.hearts >= 4));
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}
