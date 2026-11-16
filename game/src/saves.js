// Saved progress: the best score and the best firing, kept in localStorage
// where the browser allows it. Every access is guarded — the game runs the
// same with storage unavailable, denied, or absent (headless tests).
const BEST_KEY = 'kilnfire-best-v3';
const FIRING_KEY = 'kilnfire-best-firing-v3';

function read(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch { return null; }
}

function write(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch { /* storage unavailable: the game simply forgets */ }
}

/** The best score ever scored in this browser. */
export function loadBest() {
  return Number(read(BEST_KEY) || 0) || 0;
}

/** Remember a score when it beats the saved best. Returns the best. */
export function saveBest(score) {
  const best = Math.max(loadBest(), score);
  write(BEST_KEY, String(best));
  return best;
}

/** The best completed firing on record: { score, stars, difficulty }. */
export function loadBestFiring() {
  try {
    const raw = read(FIRING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Record a completed firing when its score beats the one on record. */
export function saveBestFiring(stats) {
  const prev = loadBestFiring();
  if (prev && prev.score >= stats.score) return prev;
  write(FIRING_KEY, JSON.stringify(stats));
  return stats;
}
