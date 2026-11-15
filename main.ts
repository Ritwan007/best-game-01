// Kilnfire — the program that hands the game in (Node 22, standard library only).
// It copies this repository's game/ (static files, no build step, no network)
// and screenshots/ into /output and writes /output/dossier.json with the
// vendored make.fun library, exactly as the kit's starter does. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './game/vendor/makefun-game.ts';

// The repository root is the directory beside this file.
const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, from the kit's reference/gate.json: game/ holds at most
// 993 files and 48 MiB with every path under 1000 bytes; screenshots/ holds
// at most 4 files of 256 KiB each; the dossier text is capped at 160 KiB.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  throw new Error(`Kilnfire hand-in refused: ${message}`);
}

function countGameEntries(dir: string, seen = 0): number {
  let total = seen;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    total += 1;
    if (statSync(path).isDirectory()) total = countGameEntries(path, total);
  }
  return total;
}

const gameDir = join(root, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (countGameEntries(gameDir) > CAPS.game_max_files) fail('game/ holds more than 993 entries');

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) {
  for (const name of readdirSync(shotsDir)) {
    if (name.startsWith('.')) continue;
    const path = join(shotsDir, name);
    if (statSync(path).size > CAPS.screenshots.max_bytes) fail(`screenshot ${name} is over 256 KiB`);
    cpSync(path, join(outDir, 'screenshots', name));
  }
}

// buildDossier reads game/ and screenshots/ out of the output directory and
// writes the summary the judge reads; the scorer rebuilds it and compares
// the two byte for byte, so nothing here may add or drop a file afterwards.
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
console.log(`Kilnfire handed in: game/ + screenshots/ + dossier.json in ${outDir}`);
