# Karachi Run

A browser-based 3D endless runner, built with Babylon.js, TypeScript, and Vite. Eight connected districts alternate busy Urdu-signed streets, landmark plazas, gardens, and the Sea View coast. Saddar, Empress Market, Mazar-e-Quaid, Old Town, Merewether Tower, Clifton, Teen Talwar, and Sea View form a compressed fictional course inspired by Karachi, not a surveyed map.

## Play

- Left/right arrows or A/D: change lanes.
- Up, W, or Space: jump over barriers.
- Down or S: slide under low signs; drop quickly while airborne.
- Escape or P: pause/resume.
- Mobile: swipe in any direction, or use the on-screen controls.
- Coins are saved immediately on collection. Horseshoe magnets attract coins for 12 seconds; gold ×2 pickups double points for 12 seconds.
- Every direct obstacle hit stops the run. An eight-second choice offers revive or finish. First revive per run is free; subsequent revives cost 25, 50, 100, then 200 coins each. A three-second countdown and cleared space allow a safe restart.
- Challenges award banked bonus coins. Landmark discoveries award points; the score multiplier increases during longer runs.
- City Route lets you start at any district. The course continues through all eight and loops.
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

The `karachi-run.save.v1` localStorage key is retained across upgrades. Its version-2 record holds banked coins, personal best, total completed-run score, completed-run count, mute preference, and challenge progress. Legacy records retain their coins and scores. Best score checkpoints every two seconds and on pause/page exit. Coins are banked individually, so finishing a run never credits them twice. Storage errors fall back to an in-memory session with a visible message. Backgrounding pauses gameplay and suspends the revive countdown.

Scores are local and unauthenticated, so they are not suitable for a competitive global leaderboard. An auth-backed profile and server score validation can be added behind the persistence boundary in `src/core.mjs` later. Clearing site data or changing browser/origin starts a separate profile. In-progress runs are not resumed after reload.

## Structure

- `src/world.ts`: original procedural 3D art, Urdu atlas, lighting, environment sections, animated characters, object construction.
- `src/game.ts`: game lifecycle, capped frame stepping, object recycling, input, UI, effects, local saving.
- `src/city-route.ts`: landmark models, coast scenery, pedestrians, seagulls, and moving district sections.
- `src/routes.mjs`: district order, lengths, and route progress.
- `src/core.mjs`: defensive save parsing, collision rules, safe-lane obstacle generation.
- `tests/core.test.mjs`: storage recovery, reload persistence, swept collisions, generation safety, revive pricing, and route continuity.

The runner follows familiar three-lane endless-runner mechanics. It does not reuse Subway Surfers source code, branding, maps, or models. Imran Khan and Asim Munir are stylized characters for a fictional political satire, using generated portraits and face textures on articulated procedural bodies. They are not sculpted likeness models. Roof traversal, hoverboards, jetpacks, and online accounts remain outside this build. See ARTWORK.md for asset provenance and prompts.

The game works without WebMCP. Where supported, the optional `get_karachi_run_progress` tool exposes read-only local records. Fonts are loaded from Google Fonts; Urdu signs fall back to the browser's available Arabic-script font if loading fails.
