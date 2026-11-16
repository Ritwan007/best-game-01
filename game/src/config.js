// Kilnfire — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

// The kiln sits at the centre of the yard. Its fire mouth faces down; the keeper
// works around it, feeding embers in and keeping the cold drafts away.
export const KILN = { x: 640, y: 360, radius: 86, mouthY: 430 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds of play in one firing round (wave), then the upgrade screen opens. */
export const WAVE_SECONDS = 25;

export const KEEPER = {
  radius: 20,
  speed: 330,
  dashSpeed: 780,
  dashSeconds: 0.16,
  dashCooldown: 1.6,
  invulnerable: 1.4,
};

export const HEARTS = 3;

// Heat: 0..100. Below 20 the kiln is dying (a heart is lost at 0). 55..85 is the
// gold band where pots can fire — and only while a pot stands inside the gold
// zone ring around the kiln (see gold-zone.js). Above 95 the kiln cracks.
export const HEAT = {
  start: 55,
  drainPerSecond: 0.55,
  emberGain: 9,
  draftCool: 14,
  ventCool: 24,
  goldLow: 55,
  goldHigh: 85,
  overheat: 95,
  crackDamageSeconds: 3,
};

export const EMBER = {
  radius: 11,
  points: 10,
  interval: 1.15,
  intervalJitter: 0.6,
  speed: 26,
  maxAlive: 14,
};

export const DRAFT = {
  radius: 17,
  speed: 66,
  speedPerWave: 9,
  interval: 3.0,
  intervalScale: 0.9,
  minInterval: 0.9,
  coolOnTouch: 14,
};

export const FROST = {
  radius: 14,
  speed: 168,
  speedPerWave: 6,
  interval: 7.5,
  firstWave: 3,
  weave: 2.6,
};

export const COMBO = { bonusPerStack: 25, maxStack: 8 };
export const MASTERPIECE = { streak: 6, score: 250 };
export const SURGE = { atSeconds: 12, seconds: 4, firstWave: 2, draftInterval: 0.55 };
export const PARTICLE_CAP = 420;

export const IMP = {
  radius: 15,
  speed: 118,
  speedPerWave: 8,
  interval: 6.5,
  firstWave: 2,
};

export const SPARK = {
  radius: 7,
  speed: 620,
  cooldown: 0.34,
  damage: 1,
  range: 560,
};

// Clay pots stand on racks in a ring around the kiln (see pot-racks.js). A pot
// fires (scores) after enough seconds with the heat in the gold band while the
// pot itself stands inside the gold zone ring; a fired pot turns glazed.
export const POT = {
  count: 6,
  fireSeconds: 6,
  score: 50,
  waveBonus: 25,
};

// Terracotta dusk palette: warm brick and amber against cool night blue.
export const PALETTE = {
  night: '#241a26',
  yard: '#2e2130',
  yardEdge: '#1d1420',
  brick: '#8a4a2f',
  brickDark: '#5f3220',
  brickLight: '#b06a3e',
  amber: '#ffb347',
  ember: '#ff7a2f',
  gold: '#ffd166',
  clay: '#d98a5f',
  glazed: '#e8b04b',
  cold: '#7fd4ff',
  coldDark: '#3d7ea6',
  soot: '#4a3a4d',
  cream: '#f7ead7',
  heart: '#ff5d73',
};

export const SCREENS = { TITLE: 'title', PLAY: 'play', UPGRADE: 'upgrade', OVER: 'over', VICTORY: 'victory' };

// World events: the world pushes these strings, the entry point turns them
// into sound and screen changes. They live here so every system module can
// name them without importing the world (no import cycles).
export const EVENT_OVER = 'over';
export const EVENT_WAVE = 'wave';
export const EVENT_FIRED = 'fired';
export const EVENT_HIT = 'hit';
export const EVENT_VENT = 'vent';
export const EVENT_PICKUP = 'pickup';
export const EVENT_SHOOT = 'shoot';
export const EVENT_COMBO = 'combo';
export const EVENT_MASTERPIECE = 'masterpiece';
export const EVENT_SURGE = 'surge';
export const EVENT_DASH = 'dash';
export const EVENT_BOSS = 'boss';
export const EVENT_BOSS_DOWN = 'bossdown';
export const EVENT_VICTORY = 'victory';
