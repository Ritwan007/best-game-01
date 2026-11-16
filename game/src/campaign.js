// Kilnfire campaign: one firing is TEN waves with a shape — an Ash Golem
// mini-boss at the halfway wave and the Frost Herald at the last. Killing the
// Herald wins the firing; endless waves remain as a post-victory option.
export const CAMPAIGN = {
  waves: 10,
  miniBossWave: 5,
  bossWave: 10,
  name: 'THE GREAT FIRING',
  golemName: 'ASH GOLEM',
  heraldName: 'THE FROST HERALD',
};

/** Boss waves are exactly the mini-boss wave and the final wave. */
export function isBossWave(wave) {
  return wave === CAMPAIGN.miniBossWave || wave === CAMPAIGN.bossWave;
}

/** The boss kind a wave fields: 'golem', 'herald', or null for a plain wave. */
export function bossKindForWave(wave) {
  if (wave === CAMPAIGN.miniBossWave) return 'golem';
  if (wave === CAMPAIGN.bossWave) return 'herald';
  return null;
}

/** The HUD label for the wave: "WAVE 3/10" in the campaign, endless after. */
export function waveLabel(state) {
  if (state.endless || state.wave > CAMPAIGN.waves) return `WAVE ${state.wave} · ENDLESS`;
  return `WAVE ${state.wave}/${CAMPAIGN.waves}`;
}

/**
 * Victory stars, 1 to 3: one for felling the Herald, one for a well-fired
 * yard (30+ pots), one for artistry (4+ masterpiece pots in the firing).
 */
export function starsFor(state) {
  if (!state.campaignDone) return 0;
  let stars = 1;
  if (state.potsFired >= 30) stars += 1;
  if (state.masterpieces >= 4) stars += 1;
  return Math.min(3, stars);
}

/** The run statistics the victory and game-over screens print. */
export function runStats(state) {
  return {
    score: state.score,
    wave: state.wave,
    potsFired: state.potsFired,
    masterpieces: state.masterpieces,
    kills: state.kills,
    embers: state.embers + (state.embersSpent || 0),
    seconds: Math.floor(state.time),
    difficulty: state.difficulty ? state.difficulty.name : 'Stoker',
    stars: starsFor(state),
  };
}
