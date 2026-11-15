# Kilnfire — The Kiln-Keeper's Firing

A complete 2D arena game for make.fun's **best-game-01** ("Make the best game").
You are the keeper of a brick kiln in a terracotta yard at dusk. Gather embers,
keep the kiln's heat in the **gold zone** so the clay pots on the racks fire and
score, and drive off the cold drafts that chill the kiln — and you. Let the heat
hit zero and the kiln dies; let it pass 95 and the kiln cracks unless you vent it.

## How to play

- **WASD / arrows** — move the keeper (the kiln in the middle is solid)
- **Mouse** — aim; **click** — throw a spark at drafts and ash imps
- **SHIFT** — dash · **SPACE** — vent steam to cool an overheating kiln
- **1 / 2 / 3** — pick an upgrade after each 25-second wave
- **M** — mute · **R** — restart after game over

Score from embers (+10), shattered drafts (+15), imps (+25), fired pots (+50)
and wave bonuses (+25). Three hearts; a heart is lost to a draft's chill, an
imp's touch, a cold kiln, or a cracked one.

## Run it

No build step, no network: `node serve.ts`, then open http://localhost:8080.

## Screenshots

`?shot=title|play|upgrade|end&seed=N` renders one deterministic scene (see
`shots.json` for the four submitted shots).

## Layout

- `game/src/config.js` — tuning numbers and palette
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard + mouse
- `game/src/world.js` — pure game logic (heat, waves, pots, foes, collisions)
- `game/src/render.js` — all canvas drawing
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/upgrades.js` — the 8 upgrades
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/main.js` — loop, screens, wiring
- `game/vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)

MIT licensed. Original game: own idea, art, sounds and names.
