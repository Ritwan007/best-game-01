// The yard's two looks. Waves 1-5 burn at dusk (plum and amber); waves 6-10
// are the Night Firing — deep indigo with cyan frost accents, the biome the
// Frost Herald fight lives in. One clear palette break across the game.
export const BIOMES = {
  dusk: {
    id: 'dusk', name: 'Dusk Yard',
    skyTop: '#1d1426', skyMid: '#2e2130', skyBot: '#3a2330',
    glow: 'rgba(255,150,50,0.20)', stone: 'rgba(0,0,0,0.25)', starAlpha: 0.35,
  },
  night: {
    id: 'night', name: 'Night Firing',
    skyTop: '#0a1030', skyMid: '#16204a', skyBot: '#232c58',
    glow: 'rgba(127,212,255,0.15)', stone: 'rgba(0,0,0,0.38)', starAlpha: 0.8,
  },
};

/** The biome a wave is fought in: dusk first, night from wave 6. */
export function biomeForWave(wave) {
  return wave >= 6 ? BIOMES.night : BIOMES.dusk;
}
