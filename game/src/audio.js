// Kilnfire sound: small synthesised WebAudio blips — no audio assets, nothing
// over the network. Created lazily on the first user gesture.
export function createAudio() {
  return { ctx: null, muted: false, musicTimer: 0 };
}

function ensure(audio) {
  if (!audio.ctx) {
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audio.ctx = null;
    }
  }
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio.ctx;
}

function tone(audio, freq, dur, type, vol, slideTo) {
  if (audio.muted) return;
  const ctx = ensure(audio);
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

export const SOUNDS = {
  pickup(audio) { tone(audio, 660, 0.12, 'sine', 0.12, 990); },
  shoot(audio) { tone(audio, 520, 0.08, 'square', 0.06, 260); },
  hit(audio) { tone(audio, 180, 0.25, 'sawtooth', 0.16, 70); },
  fired(audio) { tone(audio, 523, 0.15, 'triangle', 0.14); setTimeout(() => tone(audio, 784, 0.2, 'triangle', 0.14), 110); },
  vent(audio) { tone(audio, 900, 0.4, 'sine', 0.1, 180); },
  wave(audio) { tone(audio, 392, 0.12, 'triangle', 0.12); setTimeout(() => tone(audio, 523, 0.12, 'triangle', 0.12), 100); setTimeout(() => tone(audio, 659, 0.2, 'triangle', 0.12), 200); },
  over(audio) { tone(audio, 330, 0.3, 'triangle', 0.14, 220); setTimeout(() => tone(audio, 220, 0.5, 'triangle', 0.14, 110), 260); },
  click(audio) { tone(audio, 880, 0.05, 'sine', 0.08); },
  combo(audio) { tone(audio, 740, 0.1, 'triangle', 0.12, 1180); },
  masterpiece(audio) { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(audio, f, 0.22, 'triangle', 0.15), i * 90)); },
  surge(audio) { tone(audio, 220, 0.3, 'sawtooth', 0.1, 440); setTimeout(() => tone(audio, 220, 0.3, 'sawtooth', 0.1, 440), 320); },
  dash(audio) { tone(audio, 300, 0.14, 'sine', 0.09, 700); },
  bossdown(audio) { tone(audio, 140, 0.5, 'sawtooth', 0.16, 50); setTimeout(() => tone(audio, 392, 0.3, 'triangle', 0.14), 240); setTimeout(() => tone(audio, 523, 0.4, 'triangle', 0.14), 420); },
  victory(audio) { [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(audio, f, 0.3, 'triangle', 0.15), i * 120)); },
};

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
