[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Ritwan007/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Ritwan007/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)


# Kilnfire — The Kiln-Keeper's Great Firing

A complete 2D arena game for make.fun's **best-game-01** ("Make the best game").
You are the keeper of a brick kiln in a terracotta yard. Gather embers, keep
the kiln's heat in the **gold band** so the clay pots standing **inside the
gold zone ring** around the kiln fire and score, and drive off the cold
drafts, ash imps and frost wraiths that chill the kiln — and you.

**V3 — the campaign update.** One firing is now a finite **10-wave campaign,
THE GREAT FIRING**: the **Ash Golem** mini-boss waits at wave 5 and the
**Frost Herald** — a three-phase boss that summons wraiths and calls a cold
front that shrinks the gold ring — at wave 10. Kill the Herald and the firing
is **won**: a victory screen awards 1–3 stars (the win, 30+ pots fired, 4+
masterpiece pots) with full run stats and a Play Again, plus an optional
**endless firing** afterwards. Waves 6–10 re-skin the yard as the **Night
Firing** (deep indigo, cyan frost). Three **difficulties** (Apprentice /
Stoker / Kilnmaster) are chosen on the title screen, and every wave break
offers one **upgrade reroll** for 5 embers.

## How to play

- **WASD / arrows** — move the keeper (the kiln in the middle is solid)
- **Mouse** — aim; **click** — throw a spark at drafts, imps, wraiths, bosses
- **SHIFT** — dash (with i-frames) · **SPACE** — vent steam to cool an overheating kiln
- **1 / 2 / 3** — pick a difficulty on the title screen; pick an upgrade after each wave
- **R** — reroll the upgrade choice once per wave break (5 embers); restart after game over
- **E** — endless firing from the victory screen · **M** — mute

Score from embers (+10), shattered drafts (+15), imps (+25), frost wraiths
(+40), fired pots (+50, plus combo bonuses), the Golem (+200) and the Herald
(+500). Chaining pots without leaving the gold band builds a **combo** (each
extra pot pays +25 more, up to x8); reaching combo x6 in a wave fires a
**Masterpiece pot (+250)**. A **draft surge** hits mid-wave from wave 2;
**frost wraiths** (wave 3+) weave fast at the keeper and drop an ember when
shattered. A pot fires only while the heat is in the gold band **and** the pot
stands inside the gold ring — the ring grows with the heat, so a hotter kiln
reaches the far racks, and the Herald's cold front shrinks it again. Let the
heat hit zero and the kiln dies; let it pass 95 and the kiln cracks unless
you vent it. Three hearts; a heart is lost to a foe's touch, a boss's slam,
a cold kiln, or a cracked one. 11 upgrades (Kiln Rhythm, Frostbane Sparks
and Stoker's Craft synergise with the combo, wraith and firing systems).
Best score and best firing are saved in the browser.

## Run it

No build step, no network: `node serve.ts`, then open http://localhost:8080.

## Screenshots

`?shot=title|play|boss|victory&seed=N` renders one deterministic scene (see
`shots.json` for the four submitted shots: title, mid-surge play, the Frost
Herald boss fight, and the victory screen).

## Layout

One job per file, named for what it does (24 authored modules):

- `game/src/config.js` — tuning numbers, palette, event names
- `game/src/random.js` — seeded RNG · `game/src/input.js` — keyboard + mouse
- `game/src/world.js` — the simulation orchestrator (wires the systems)
- `game/src/campaign.js` — the 10-wave Great Firing, bosses, victory stars
- `game/src/difficulties.js` — Apprentice / Stoker / Kilnmaster
- `game/src/gold-zone.js` — the spatial gold ring: radius, firing rule
- `game/src/pot-racks.js` — the six pot stands in a ring around the kiln
- `game/src/keeper.js` — the player: movement, dash i-frames, hurt
- `game/src/combo.js` — the combo chain · `game/src/masterpiece.js` — masterpiece pots
- `game/src/draft-surge.js` — the mid-wave surge event
- `game/src/frost-wraiths.js` — the weaving third foe kind
- `game/src/boss.js` — Ash Golem + the three-phase Frost Herald
- `game/src/biomes.js` — Dusk Yard vs Night Firing palettes
- `game/src/particles.js` — bursts and floating score text (the juice)
- `game/src/upgrades.js` — the 11 upgrades + the ember reroll
- `game/src/saves.js` — best score / best firing in localStorage
- `game/src/render.js` — world drawing: yard, ring, kiln, pots, actors
- `game/src/hud.js` — HUD: heat gauge, boss bar, combo meter, banners
- `game/src/screens.js` — title, upgrade, game-over and victory screens
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/shots.js` — deterministic screenshot scenes + the autopilot
- `game/src/main.js` — loop, screens, campaign flow wiring
- `game/vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)

MIT licensed. Original game: own idea, art, sounds and names.
