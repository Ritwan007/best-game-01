// The screens: title (compact, over the live un-dimmed yard), the wave-break
// upgrade choice with its reroll, game over, and the victory screen with its
// stars and run stats. Only the title is a light panel — the rest of the
// contact sheet is the game itself.
import { FIELD, PALETTE } from './config.js';
import { drawWorld } from './render.js';
import { roundRect, text, wrapText } from './hud.js';
import { DIFFICULTIES } from './difficulties.js';
import { CAMPAIGN, runStats } from './campaign.js';
import { canReroll, REROLL_COST } from './upgrades.js';

function overlay(ctx, alpha = 0.78) {
  ctx.fillStyle = `rgba(18,10,20,${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(46,33,48,0.95)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brickLight;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
}

/**
 * The title screen: the yard, kiln, flame and keeper burn un-dimmed behind a
 * compact title block, a one-line scope strip, and the difficulty picker.
 * `difficultyId` is the currently chosen difficulty.
 */
export function drawTitle(ctx, state, time, difficultyId = 'stoker') {
  drawWorld(ctx, state, time);
  // Compact title block, top centre — the game stays visible around it.
  ctx.fillStyle = 'rgba(24,14,26,0.82)';
  roundRect(ctx, 240, 24, 800, 148, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brickLight;
  ctx.lineWidth = 2;
  roundRect(ctx, 240, 24, 800, 148, 16);
  ctx.stroke();
  text(ctx, 'KILNFIRE', 640, 74, 58, PALETTE.gold);
  text(ctx, 'The Kiln-Keeper\u2019s Firing — fire the pots inside the gold ring', 640, 122, 19, PALETTE.cream);
  text(ctx, '10 waves \u00B7 Ash Golem & the Frost Herald \u00B7 3 difficulties', 640, 152, 17, PALETTE.amber);
  // Difficulty picker, bottom: three chips, the chosen one lit.
  const pulse = 0.7 + 0.3 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS ENTER OR CLICK TO START', 640, 540, 24, PALETTE.gold);
  ctx.globalAlpha = 1;
  DIFFICULTIES.forEach((d, i) => {
    const x = 240 + i * 280;
    const y = 586;
    const chosen = d.id === difficultyId;
    ctx.fillStyle = chosen ? 'rgba(138,74,47,0.95)' : 'rgba(24,14,26,0.82)';
    roundRect(ctx, x, y, 256, 96, 12);
    ctx.fill();
    ctx.strokeStyle = chosen ? PALETTE.gold : 'rgba(247,234,215,0.35)';
    ctx.lineWidth = chosen ? 3 : 1;
    roundRect(ctx, x, y, 256, 96, 12);
    ctx.stroke();
    text(ctx, `${i + 1}  ${d.name.toUpperCase()}`, x + 128, y + 30, 20, chosen ? PALETTE.gold : PALETTE.cream);
    text(ctx, d.desc, x + 128, y + 62, 14, PALETTE.cream);
  });
  text(ctx, 'WASD move \u00B7 mouse aim \u00B7 click spark \u00B7 SHIFT dash \u00B7 SPACE vent \u00B7 keys 1/2/3 choose difficulty', 640, 706, 14, 'rgba(247,234,215,0.8)');
}

export function drawUpgrade(ctx, state, choices) {
  drawWorld(ctx, state, 0);
  overlay(ctx);
  panel(ctx, 190, 90, 900, 540);
  text(ctx, `WAVE ${state.wave} COMPLETE!`, 640, 150, 40, PALETTE.gold);
  text(ctx, `Score ${state.score} \u00B7 Pots fired ${state.potsFired} \u00B7 Embers ${state.embers}`, 640, 196, 20, PALETTE.cream);
  text(ctx, state.wave === CAMPAIGN.miniBossWave - 1 ? 'The Ash Golem waits in the next wave...' : state.wave === CAMPAIGN.bossWave - 1 ? 'THE FROST HERALD waits in the next wave...' : 'CHOOSE ONE UPGRADE — press 1, 2 or 3, or click a card', 640, 240, 19, PALETTE.amber);
  choices.forEach((choice, i) => {
    const x = 230 + i * 300;
    const y = 280;
    ctx.fillStyle = 'rgba(138,74,47,0.9)';
    roundRect(ctx, x, y, 260, 230, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, 260, 230, 14);
    ctx.stroke();
    text(ctx, `${i + 1}`, x + 130, y + 36, 26, PALETTE.gold);
    text(ctx, choice.name, x + 130, y + 78, 21, PALETTE.cream);
    wrapText(ctx, choice.desc, x + 130, y + 128, 220, 19, PALETTE.cream);
  });
  // The reroll: once per break, for banked embers.
  if (canReroll(state)) {
    text(ctx, `R — REROLL THESE CHOICES (${REROLL_COST} embers, once per break)`, 640, 556, 18, PALETTE.gold);
  } else if (state.rerollUsed) {
    text(ctx, 'Reroll spent for this break', 640, 556, 16, 'rgba(247,234,215,0.6)');
  } else {
    text(ctx, `Reroll costs ${REROLL_COST} embers — you hold ${state.embers}`, 640, 556, 16, 'rgba(247,234,215,0.6)');
  }
  text(ctx, `${CAMPAIGN.name}: wave ${state.wave} of ${CAMPAIGN.waves} fired`, 640, 592, 15, PALETTE.cold);
}

export function drawOver(ctx, state) {
  drawWorld(ctx, state, 0);
  overlay(ctx);
  panel(ctx, 340, 150, 600, 420);
  const stats = runStats(state);
  text(ctx, 'THE KILN HAS GONE COLD', 640, 220, 36, PALETTE.cold);
  text(ctx, `FINAL SCORE  ${stats.score}`, 640, 300, 30, PALETTE.gold);
  text(ctx, `Waves survived ${stats.wave} \u00B7 Pots fired ${stats.potsFired}`, 640, 350, 20, PALETTE.cream);
  text(ctx, `Embers gathered ${stats.embers} \u00B7 Foes shattered ${stats.kills}`, 640, 382, 20, PALETTE.cream);
  text(ctx, `Best combo x${state.comboMax || 0} \u00B7 Masterpieces ${stats.masterpieces}`, 640, 414, 20, '#ffe9a8');
  text(ctx, 'PRESS R OR ENTER TO FIRE AGAIN', 640, 470, 22, PALETTE.gold);
  text(ctx, 'The yard remembers every firing. Beat your score!', 640, 520, 16, 'rgba(247,234,215,0.7)');
}

/** The victory screen: the Herald is down, the Great Firing is complete. */
export function drawVictory(ctx, state) {
  drawWorld(ctx, state, 0);
  overlay(ctx, 0.6);
  panel(ctx, 300, 120, 680, 480);
  const stats = runStats(state);
  text(ctx, 'THE GREAT FIRING IS COMPLETE!', 640, 182, 34, PALETTE.gold);
  text(ctx, 'THE FROST HERALD FALLS — THE KILN BURNS ON', 640, 224, 18, '#bfe9ff');
  // Stars: pots, artistry, and the win itself.
  const stars = '\u2605'.repeat(stats.stars) + '\u2606'.repeat(3 - stats.stars);
  text(ctx, stars, 640, 286, 54, PALETTE.gold);
  text(ctx, `FINAL SCORE  ${stats.score}`, 640, 348, 30, PALETTE.cream);
  text(ctx, `Pots fired ${stats.potsFired} \u00B7 Masterpieces ${stats.masterpieces} \u00B7 Foes shattered ${stats.kills}`, 640, 392, 19, PALETTE.cream);
  const mm = String(Math.floor(stats.seconds / 60)).padStart(2, '0');
  const ss = String(stats.seconds % 60).padStart(2, '0');
  text(ctx, `Time ${mm}:${ss} \u00B7 Difficulty ${stats.difficulty} \u00B7 Hearts left ${state.hearts}`, 640, 424, 19, PALETTE.cream);
  text(ctx, 'ENTER — PLAY AGAIN', 640, 486, 23, PALETTE.gold);
  text(ctx, 'E — ENDLESS FIRING (keep this kiln, wave after wave)', 640, 524, 17, PALETTE.amber);
  text(ctx, 'Ten waves, two bosses, one keeper. The yard is yours.', 640, 566, 15, 'rgba(247,234,215,0.7)');
}
