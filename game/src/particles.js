// Particles and floating score text: the game's juice. Bursts are pooled
// under a hard cap so a busy frame can never grow the arrays without bound.
import { PARTICLE_CAP } from './config.js';

/** A burst of coloured sparks at a point, capped at PARTICLE_CAP live parts. */
export function burst(state, x, y, colour, count, speed) {
  if (state.particles.length > PARTICLE_CAP) state.particles.splice(0, state.particles.length - PARTICLE_CAP);
  for (let i = 0; i < count; i += 1) {
    const angle = state.random() * Math.PI * 2;
    const v = speed * (0.4 + state.random() * 0.8);
    state.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: 0.5 + state.random() * 0.4, maxLife: 0.9, colour, size: 2 + state.random() * 4 });
  }
}

/** A floating label that rises and fades ("+50 FIRED!", "VENTED!"). */
export function floater(state, x, y, text, colour) {
  state.floaters.push({ x, y, text, colour, life: 1.1 });
}

/** Age particles and floaters by one step and drop the dead. */
export function stepParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floaters) { f.y -= 34 * dt; f.life -= dt; }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 40 * dt);
}
