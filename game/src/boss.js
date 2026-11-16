// The bosses. Wave 5 fields the ASH GOLEM, a slow ember-rock that slams
// drafts loose. Wave 10 fields THE FROST HERALD in three phases: it summons
// wraiths, then calls a COLD FRONT that shrinks the gold zone ring, then
// rages — faster, summoning wraiths and imps together. Killing the Herald
// wins the firing. Boss waves end only when the boss falls.
import { FIELD, KILN, KEEPER, EVENT_BOSS_DOWN } from './config.js';
import { bossKindForWave } from './campaign.js';
import { burst, floater } from './particles.js';

export const BOSS_KINDS = {
  golem: { name: 'ASH GOLEM', hp: 30, radius: 44, speed: 92, score: 200, touch: 'GOLEM SLAM!', colour: '#ff7a2f' },
  herald: { name: 'THE FROST HERALD', hp: 52, radius: 52, speed: 114, score: 500, touch: "HERALD'S CHILL!", colour: '#7fd4ff' },
};

/** The boss a wave fields, entering from the yard's north edge, or null. */
export function createBoss(state) {
  const kind = bossKindForWave(state.wave);
  if (!kind) return null;
  const def = BOSS_KINDS[kind];
  return {
    kind, name: def.name, x: KILN.x, y: 108, radius: def.radius,
    hp: def.hp, maxHp: def.hp, scoreValue: def.score, phase: 1,
    active: true, counted: false, summonTimer: 4.5, slamTimer: 3,
  };
}

/** The phase a boss is in, from its remaining health: 1, 2 or 3. */
export function bossPhase(boss) {
  const frac = boss.hp / boss.maxHp;
  return frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
}

/**
 * A spark hits the boss. Phase changes are announced; the Herald's second
 * phase raises the cold front (the world reads state.coldFront for the ring).
 * Returns true when this hit kills the boss.
 */
export function damageBoss(state, damage) {
  const boss = state.boss;
  if (!boss || !boss.active) return false;
  boss.hp -= damage;
  burst(state, boss.x, boss.y, BOSS_KINDS[boss.kind].colour, 8, 150);
  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.active = false;
    state.events.push(EVENT_BOSS_DOWN);
    burst(state, boss.x, boss.y, BOSS_KINDS[boss.kind].colour, 60, 300);
    floater(state, boss.x, boss.y - 60, `${boss.name} FALLS! +${boss.scoreValue}`, '#ffe9a8');
    return true;
  }
  const phase = bossPhase(boss);
  if (phase !== boss.phase) {
    boss.phase = phase;
    if (boss.kind === 'herald' && phase >= 2) {
      state.coldFront = true;
      state.banner = 'THE HERALD CALLS THE COLD FRONT — THE GOLD ZONE SHRINKS!';
    } else if (boss.kind === 'herald') {
      state.banner = 'THE HERALD RAGES!';
    } else {
      state.banner = phase === 2 ? 'THE GOLEM CRACKS — EMBERS SHOW!' : 'THE GOLEM SHATTERS APART!';
    }
    state.bannerTime = 2.6;
    state.shake = Math.max(state.shake, 12);
  }
  return false;
}

/**
 * Move and act the boss for one step. `helpers` carries the world's own
 * hurt/spawn functions so this module never imports the world.
 * The boss hunts the keeper; the Golem's slam shakes drafts loose, the
 * Herald summons frost — more, and worse, in each later phase.
 */
export function stepBoss(state, dt, helpers) {
  const boss = state.boss;
  if (!boss || !boss.active) return;
  const def = BOSS_KINDS[boss.kind];
  const phaseSpeed = boss.phase === 3 ? 1.32 : boss.phase === 2 ? 1.13 : 1;
  const speed = def.speed * phaseSpeed * state.difficulty.enemySpeed;
  const dx = state.keeper.x - boss.x; const dy = state.keeper.y - boss.y;
  const d = Math.hypot(dx, dy) || 1;
  boss.x += (dx / d) * speed * dt;
  boss.y += (dy / d) * speed * dt;
  boss.x = Math.min(FIELD.width - boss.radius, Math.max(boss.radius, boss.x));
  boss.y = Math.min(FIELD.height - boss.radius, Math.max(boss.radius, boss.y));
  // A boss that reaches the kiln bleeds its heat away.
  if (Math.hypot(boss.x - KILN.x, boss.y - KILN.y) < KILN.radius + boss.radius) {
    state.heat = Math.max(0, state.heat - 6 * dt);
    boss.x -= (dx / d) * 20 * dt;
    boss.y -= (dy / d) * 20 * dt;
  }
  if (d < boss.radius + KEEPER.radius) {
    helpers.hurtKeeper(state, 1, def.touch);
    // Knock the boss well back so one touch is one heart, not a drain.
    boss.x -= (dx / d) * 72;
    boss.y -= (dy / d) * 72;
  }
  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    if (boss.kind === 'herald') {
      boss.summonTimer = boss.phase === 3 ? 5 : boss.phase === 2 ? 6.5 : 8;
      helpers.spawnFrost(state);
      if (boss.phase >= 2) helpers.spawnFrost(state);
      if (boss.phase >= 3) helpers.spawnImp(state);
      state.banner = 'THE HERALD SUMMONS THE FROST!';
      state.bannerTime = 1.6;
    } else {
      boss.summonTimer = 6;
      helpers.spawnDraft(state);
      helpers.spawnDraft(state);
    }
  }
  if (boss.kind === 'golem') {
    boss.slamTimer -= dt;
    if (boss.slamTimer <= 0) {
      boss.slamTimer = 4.5;
      if (d < 190) {
        state.shake = Math.max(state.shake, 9);
        burst(state, boss.x, boss.y, '#ffb347', 20, 220);
        helpers.spawnDraft(state);
      }
    }
  }
}
