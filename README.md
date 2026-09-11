# Karachi Run

A browser-based 3D endless runner, built with Babylon.js, TypeScript, and Vite. Original stylized Karachi scenery includes Urdu shop boards, buses, rickshaws, market carts, balconies, palms, utility wires, and a stylized Mazar-e-Quaid backdrop. The road is a fictional course inspired by Karachi, not a surveyed map.

## Play

- Left/right arrows or A/D: change lanes.
- Up, W, or Space: jump over barriers.
- Down or S: slide under low signs; drop quickly while airborne.
- Escape or P: pause/resume.
- Mobile: swipe in any direction, or use the on-screen controls.
- Coins are saved immediately on collection. Magnets attract coins for 12 seconds. Shields absorb one collision, expiring after 16 seconds.
- Traffic is solid: change lanes around buses and rickshaws.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm run build
npm test
```

## Saving

The versioned `karachi-run.save.v1` localStorage record holds banked coins, personal best, total completed-run score, completed-run count, and mute preference. Best score checkpoints every two seconds and on pause/page exit. Coins are banked individually, so finishing a run never credits them twice. Storage errors fall back to an in-memory session with a visible message.

Scores are local and unauthenticated, so they are not suitable for a competitive global leaderboard. An auth-backed profile and server score validation can be added behind the persistence boundary in `src/core.mjs` later. Clearing site data or changing browser/origin starts a separate profile. In-progress runs are not resumed after reload.

## Structure

- `src/world.ts`: original procedural 3D art, Urdu atlas, lighting, environment sections, animated characters, object construction.
- `src/main.ts`: game lifecycle, fixed-size frame stepping, object recycling, input, UI, effects, local saving.
- `src/core.mjs`: defensive save parsing, collision rules, safe-lane obstacle generation.
- `tests/core.test.mjs`: storage recovery, reload persistence, collision actions, and generation safety.

The generic runner follows familiar three-lane endless-runner mechanics. It does not reuse Subway Surfers source code, branding, maps, or models. Character figures are preliminary stylized representations for a fictional political satire; custom likeness models and advanced animation are future art work. Roof traversal, hoverboards, jetpacks, missions, and online accounts are outside this first playable build.

The game works without WebMCP. Where supported, the optional `get_karachi_run_progress` tool exposes read-only local records. Fonts are loaded from Google Fonts; Urdu signs fall back to the browser's available Arabic-script font if loading fails.
