// Kilnfire entry point: wires input, world, renderer and audio together, runs
// the fixed-step loop, and owns the four screens (title, play, upgrade, over).
// ?shot=title|play|upgrade|end&seed=N renders one screenshot scene instead.
import { FIELD, STEP } from './config.js';
import { createWorld, stepWorld, nextWave, EVENT_OVER, EVENT_FIRED, EVENT_HIT, EVENT_VENT, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE } from './world.js';
import { emptyUpgrades, rollChoices } from './upgrades.js';
import { createInput, attachInput, consumePress, clearPresses } from './input.js';
import { drawWorld, drawTitle, drawUpgrade, drawOver, SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_OVER } from './render.js';
import { createAudio, SOUNDS, toggleMute } from './audio.js';
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
let state = createWorld(seed);
state.upgrades = emptyUpgrades();
let choices = [];
let best = 0;
try { best = Number(window.localStorage.getItem('kilnfire-best') || 0) || 0; } catch { best = 0; }

function setStatus(text) {
  if (status) status.textContent = text;
}

function startGame() {
  state = createWorld((seed + Date.now()) % 2147483647);
  state.upgrades = emptyUpgrades();
  screen = SCREEN_PLAY;
  SOUNDS.click(audio);
  setStatus('Kilnfire: feed the kiln, fire the pots, dodge the cold drafts.');
}

function openUpgrade() {
  choices = rollChoices(state.random, state.upgrades);
  screen = SCREEN_UPGRADE;
  SOUNDS.wave(audio);
  setStatus(`Wave ${state.wave} complete. Choose one upgrade.`);
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

function gameOver() {
  if (screen === SCREEN_OVER) return;
  screen = SCREEN_OVER;
  if (state.score > best) {
    best = state.score;
    try { window.localStorage.setItem('kilnfire-best', String(best)); } catch { /* storage unavailable */ }
  }
  SOUNDS.over(audio);
  setStatus(`Game over. Final score ${state.score}. Press R to fire again.`);
}

function handleEvents() {
  for (const event of state.events) {
    if (event === EVENT_PICKUP) SOUNDS.pickup(audio);
    else if (event === EVENT_SHOOT) SOUNDS.shoot(audio);
    else if (event === EVENT_HIT) SOUNDS.hit(audio);
    else if (event === EVENT_FIRED) SOUNDS.fired(audio);
    else if (event === EVENT_VENT) SOUNDS.vent(audio);
    else if (event === EVENT_WAVE) openUpgrade();
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
    if (consumePress(input, 'confirm') || consumePress(input, 'fire')) startGame();
    drawTitle(ctx, state, time);
  } else if (screen === SCREEN_PLAY) {
    stepWorld(state, input, STEP);
    handleEvents();
    if (state.over) gameOver();
    drawWorld(ctx, state, time);
    if (state.score > best) best = state.score;
  } else if (screen === SCREEN_UPGRADE) {
    if (consumePress(input, 'choice1')) pickUpgrade(0);
    else if (consumePress(input, 'choice2')) pickUpgrade(1);
    else if (consumePress(input, 'choice3')) pickUpgrade(2);
    drawUpgrade(ctx, state, choices);
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
  if (screen === SCREEN_TITLE) drawTitle(ctx, state, 1.2);
  else if (screen === SCREEN_UPGRADE) drawUpgrade(ctx, state, choices);
  else if (screen === SCREEN_OVER) drawOver(ctx, state);
  else drawWorld(ctx, state, 19);
  setStatus(`Kilnfire screenshot: ${shot}.`);
} else {
  setStatus('Kilnfire: press Enter to start. Feed the kiln, fire the pots.');
  requestAnimationFrame(frame);
}
