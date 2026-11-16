// Kilnfire entry point: wires input, world, renderer and audio together, runs
// the fixed-step loop, and owns the five screens (title, play, upgrade,
// victory, over) plus the campaign flow between them — difficulty choice,
// the upgrade reroll, victory, and the endless firing after it.
// ?shot=title|play|boss|victory|upgrade|end&seed=N renders one scene instead.
import { FIELD, STEP } from './config.js';
import { createWorld, stepWorld, nextWave, EVENT_OVER, EVENT_FIRED, EVENT_HIT, EVENT_VENT, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE, EVENT_COMBO, EVENT_MASTERPIECE, EVENT_SURGE, EVENT_DASH, EVENT_BOSS, EVENT_BOSS_DOWN, EVENT_VICTORY } from './world.js';
import { emptyUpgrades, rollChoices, rerollChoices } from './upgrades.js';
import { createInput, attachInput, consumePress, clearPresses } from './input.js';
import { drawWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER, SCREEN_VICTORY } from './render.js';
import { drawTitle, drawUpgrade, drawOver, drawVictory } from './screens.js';
import { createAudio, SOUNDS, toggleMute } from './audio.js';
import { loadBest, saveBest, saveBestFiring } from './saves.js';
import { runStats } from './campaign.js';
import { shotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;

const input = createInput();
attachInput(input, canvas);
const audio = createAudio();

let screen = SCREEN_TITLE;
let difficultyId = 'stoker';
let state = createWorld(seed, difficultyId);
state.upgrades = emptyUpgrades();
let choices = [];
let best = loadBest();

function setStatus(text) {
  if (status) status.textContent = text;
}

function startGame() {
  state = createWorld((seed + Date.now()) % 2147483647, difficultyId);
  state.upgrades = emptyUpgrades();
  screen = SCREEN_PLAY;
  SOUNDS.click(audio);
  setStatus(`Kilnfire: the Great Firing begins on ${state.difficulty.name}. Feed the kiln, fire the pots inside the gold ring.`);
}

function openUpgrade() {
  choices = rollChoices(state.random, state.upgrades);
  screen = SCREEN_UPGRADE;
  SOUNDS.wave(audio);
  setStatus(`Wave ${state.wave} complete. Choose one upgrade, or press R to reroll for 5 embers.`);
}

function pickUpgrade(index) {
  const choice = choices[index];
  if (!choice) return;
  choice.apply(state.upgrades);
  if (choice.id === 'heart') state.hearts = Math.min(4, state.upgrades.hearts);
  nextWave(state);
  screen = SCREEN_PLAY;
  SOUNDS.click(audio);
  setStatus(`Wave ${state.wave}. ${choice.name} chosen.`);
}

function reroll() {
  const next = rerollChoices(state, choices);
  if (!next) { SOUNDS.hit(audio); return; }
  choices = next;
  SOUNDS.combo(audio);
  setStatus('Choices rerolled for 5 embers.');
}

function gameOver() {
  if (screen === SCREEN_OVER) return;
  screen = SCREEN_OVER;
  best = saveBest(state.score);
  SOUNDS.over(audio);
  setStatus(`Game over. Final score ${state.score}. Press R to fire again.`);
}

function victory() {
  if (screen === SCREEN_VICTORY) return;
  screen = SCREEN_VICTORY;
  best = saveBest(state.score);
  saveBestFiring(runStats(state));
  SOUNDS.victory(audio);
  setStatus(`Victory! The Frost Herald falls. Final score ${state.score}. Enter to play again, E for endless firing.`);
}

function startEndless() {
  state.won = false;
  state.endless = true;
  nextWave(state);
  screen = SCREEN_PLAY;
  SOUNDS.wave(audio);
  setStatus('Endless firing: wave after wave, as long as the kiln burns.');
}

function handleEvents() {
  for (const event of state.events) {
    if (event === EVENT_PICKUP) SOUNDS.pickup(audio);
    else if (event === EVENT_SHOOT) SOUNDS.shoot(audio);
    else if (event === EVENT_HIT) SOUNDS.hit(audio);
    else if (event === EVENT_FIRED) SOUNDS.fired(audio);
    else if (event === EVENT_VENT) SOUNDS.vent(audio);
    else if (event === EVENT_COMBO) SOUNDS.combo(audio);
    else if (event === EVENT_MASTERPIECE) SOUNDS.masterpiece(audio);
    else if (event === EVENT_SURGE) SOUNDS.surge(audio);
    else if (event === EVENT_DASH) SOUNDS.dash(audio);
    else if (event === EVENT_BOSS) SOUNDS.surge(audio);
    else if (event === EVENT_BOSS_DOWN) SOUNDS.bossdown(audio);
    else if (event === EVENT_WAVE) openUpgrade();
    else if (event === EVENT_VICTORY) victory();
    else if (event === EVENT_OVER) gameOver();
  }
  state.events.length = 0;
}

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale * window.devicePixelRatio);
  canvas.height = Math.round(FIELD.height * scale * window.devicePixelRatio);
  canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
}
window.addEventListener('resize', resize);
resize();

function frame(now) {
  const time = now / 1000;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height) / window.devicePixelRatio;
  ctx.scale(scale, scale);

  if (consumePress(input, 'mute')) {
    const muted = toggleMute(audio);
    setStatus(muted ? 'Sound off.' : 'Sound on.');
  }

  if (screen === SCREEN_TITLE) {
    stepWorld(state, { up: false, down: false, left: false, right: false, dash: false, vent: false, firing: false, mouseX: 640, mouseY: 200 }, STEP);
    state.events.length = 0;
    if (consumePress(input, 'choice1')) difficultyId = 'apprentice';
    else if (consumePress(input, 'choice2')) difficultyId = 'stoker';
    else if (consumePress(input, 'choice3')) difficultyId = 'kilnmaster';
    if (consumePress(input, 'confirm') || consumePress(input, 'fire')) startGame();
    drawTitle(ctx, state, time, difficultyId);
  } else if (screen === SCREEN_PLAY) {
    stepWorld(state, input, STEP);
    handleEvents();
    if (state.over) gameOver();
    if (state.won) victory();
    drawWorld(ctx, state, time);
    if (state.score > best) best = state.score;
  } else if (screen === SCREEN_UPGRADE) {
    if (consumePress(input, 'choice1')) pickUpgrade(0);
    else if (consumePress(input, 'choice2')) pickUpgrade(1);
    else if (consumePress(input, 'choice3')) pickUpgrade(2);
    else if (consumePress(input, 'restart')) reroll();
    drawUpgrade(ctx, state, choices);
  } else if (screen === SCREEN_VICTORY) {
    if (consumePress(input, 'endless')) startEndless();
    else if (consumePress(input, 'confirm') || consumePress(input, 'restart')) startGame();
    drawVictory(ctx, state);
  } else if (screen === SCREEN_OVER) {
    if (consumePress(input, 'restart') || consumePress(input, 'confirm')) startGame();
    drawOver(ctx, state);
  }
  clearPresses(input);
  requestAnimationFrame(frame);
}

if (shot) {
  // Screenshot mode: render one deterministic scene, no loop, no input.
  const scene = shotScene(shot, seed);
  state = scene.state;
  if (!state.upgrades) state.upgrades = emptyUpgrades();
  screen = scene.screen;
  choices = scene.choices;
  resize();
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height) / window.devicePixelRatio;
  ctx.scale(scale, scale);
  if (screen === SCREEN_TITLE) drawTitle(ctx, state, 1.2, difficultyId);
  else if (screen === SCREEN_UPGRADE) drawUpgrade(ctx, state, choices);
  else if (screen === SCREEN_OVER) drawOver(ctx, state);
  else if (screen === SCREEN_VICTORY) drawVictory(ctx, state);
  else drawWorld(ctx, state, 19);
  setStatus(`Kilnfire screenshot: ${shot}.`);
} else {
  setStatus('Kilnfire: pick a difficulty, press Enter to start the Great Firing.');
  requestAnimationFrame(frame);
}
