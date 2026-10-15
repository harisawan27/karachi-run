# Karachi Run

**A mobile-first, browser-based 3D endless runner inspired by Karachi.** Sprint through a stylized city, weave between buses and rickshaws, ride rooftop ramps, collect coins, and follow a route from Saddar to Sea View.

Karachi Run is an independent project. It uses familiar three-lane endless-runner controls, with original code, city scenery, interface, and game assets. Its districts and landmarks are stylized interpretations arranged into a compressed game route; the course is not a surveyed or geographically exact map.

> **Project status:** playable browser prototype / beta foundation. Runs, coins, settings, missions, character selection, and the store are implemented in the browser. The project does not currently provide accounts, server-backed saves, online leaderboards, real-money purchases, advertising, or a published Android/iOS app. See [LAUNCH-PLAN.md](LAUNCH-PLAN.md) for the current release gates.

## What is in the game

- A continuously looping route through eight Karachi-inspired districts: Saddar Bazaar, Empress Market, Mazar-e-Quaid, Old Town Streets, Merewether Tower, Clifton Boulevard, Teen Talwar, and Sea View.
- Three-lane running with lane changes, jumps, rolls, ramps, and rooftop sections. The run animation cadence stays controlled as speed rises, so the runner does not look frantic at the top speed. Open plazas and the coast break up the street sections.
- Incoming Mazda-style buses, rickshaws, barriers, and low overhead obstacles. Traffic and obstacle placement reserve a way through each encounter.
- A chase sequence with the Warden, plus an opening scene that can be skipped.
- Collectible rupee-style coins, score multipliers, landmark discoveries, and rotating street missions.
- A character collection. Haris is the starter runner; the Warden is the chase character. Imran Khan and Asim Munir are unlockable characters bought with earned in-game coins.
- A Bazaar with Coin Magnet and Double Points energies, plus Wapsi Tickets used to continue after a crash.
- Local records for coins, best score, total score, completed runs, settings, character ownership, energies, tickets, and mission progress.
- Mobile touch controls and keyboard controls for desktop. The layout adapts to portrait and landscape screens.

Prices and balance are prototype values and may change. The rupee symbol is part of the in-game presentation; it does not represent a real-money purchase.

## Play controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move one lane left or right | `←` / `→` or `A` / `D` | Swipe left or right; on-screen arrows are also available |
| Jump | `↑`, `W`, or `Space` | Swipe up or tap the jump button |
| Roll / slide | `↓` or `S` | Swipe down or tap the roll button |
| Pause or resume | `Esc` or `P` | Pause button during a run |

Make a short, deliberate swipe. A direct collision ends the run. A glancing contact causes a stumble; another stumble before recovery can end the run. A ramp leads onto a rooftop path with a ground-level bypass, and the route continues smoothly down its exit ramp.

### Run, score, and rewards

- The runner starts at 14 m/s. Speed rises with distance, reaching 20 m/s at 500 m, 26 m/s at 1,000 m, and a cap of 32 m/s at 1,500 m.
- Score grows with distance. Its multiplier increases during a longer run, up to ×8. Double Points temporarily doubles the score gain.
- Coins are added to the saved wallet as they are collected, including during a run. Ending or crashing does not credit the same coins again.
- Discovering a landmark awards 100 points. Coin, obstacle, distance, and jump missions award bonus coins when completed.
- Coins stay on their route and are collected only when the runner reaches them; they move toward the runner only while a Coin Magnet is active. If the magnet expires mid-pull, affected coins ease back to their route. A Coin Magnet attracts nearby coins for 12 seconds. Double Points also lasts 12 seconds. Purchased energies are consumed at the start of the next run.
- A crash opens an eight-second continue choice. Continuing requires one Wapsi Ticket; there is no free revive. A ticket can be bought with coins at the crash screen or stocked in the Bazaar. The five-ticket bundle costs less than five individual tickets.
- The City screen lets you choose a district as the starting point. A run then continues across all eight districts and loops back to the start.

## Run locally

### Requirements

- Node.js 20.19+ or 22.12+
- npm (included with Node.js)
- A modern browser with WebGL enabled

Do not open `index.html` directly from the file system. Vite serves the application and its 3D assets during development.

### Install and start

```sh
npm ci
npm run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:5173/`). To stop the development server, press `Ctrl+C` in its terminal.

To test from a phone on the same Wi-Fi network, start Vite on the local network interface:

```sh
npx vite --host 0.0.0.0
```

Then open `http://<computer-lan-ip>:5173/` on the phone. Keep the computer and phone on the same trusted network; your operating system may ask whether the development server can accept local connections.

### Build and test

```sh
npm test
npm run build
npm run preview
```

- `npm test` runs the Node test suite for save parsing, route continuity, speed progression and run cadence, coin and magnet behavior, traffic and chase movement, obstacle reachability, collisions, character imports, and release foundations.
- `npm run build` type-checks the TypeScript, builds the production site into `dist/`, copies the explicitly listed runtime assets, and verifies the model files. It also checks that source ZIP archives and reference gameplay footage are not included in the release output.
- `npm run preview` serves the most recent production build locally. Run the build first.

Deploy the contents of `dist/` to a static web host that serves JavaScript modules and binary GLB files with normal web MIME types. The app has no server-side route handling. Serve it over HTTPS in production so browser storage and audio behave consistently across devices.

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/game.ts` | Game lifecycle, frame updates, input, HUD, menus, store, missions, settings, rewards, and local persistence |
| `src/world.ts` | Babylon.js scene, lighting, procedural environment, signs, obstacles, pickups, and character integration |
| `src/city-route.ts` | District scenery, landmark models, coastline, pedestrians, and ambient city details |
| `src/character.ts` | Gameplay character wrapper and loading boundary |
| `src/model-character.ts` | GLB loading, character setup, procedural movement, jump/roll poses, and geometry grounding |
| `src/character-preview.ts` | Isolated 3D character viewer used in the collection/store |
| `src/core.mjs` | Save validation, economy helpers, collision rules, mission definitions, speed progression, run cadence, and coin attraction |
| `src/routes.mjs` | District order, route lengths, progress, and environment transitions |
| `src/track.mjs` | Seeded obstacle phrases and safe-lane planning |
| `src/traffic.mjs` | Moving-traffic placement, swept collision helpers, chase movement, and rooftop convoy layout |
| `src/surfaces.mjs` | Ramp and rooftop surface calculations |
| `src/mazda.ts` | Detailed Karachi minibus construction and decorative bus artwork |
| `src/landmarks.ts` | Procedural landmark geometry |
| `src/run-report.mjs` | Bounded local capture of recent inputs, frame context, and collision details for a user-downloaded problem report |
| `src/asset-manifest.mjs` | Explicit list of runtime GLB models included in production builds |
| `public/` | Runtime models and character imagery served by the game |
| `scripts/` | Asset preparation and production asset checks |
| `tests/` | Node tests for game rules and release foundations |
| `ARTWORK.md` | Artwork notes, supplied asset context, and location-photo references |
| `LAUNCH-PLAN.md` | Release scope, acceptance gates, and remaining launch work |

## Assets and character models

The city, signs, traffic, pickups, and landmarks combine project-authored Babylon.js geometry with GLB models. The active gameplay roster includes the starter Pakistani boy, the Warden, and the unlockable Imran and Asim models. The character assets are loaded locally by the browser; the game does not send them to a service.

Some supplied scans do not contain a skeleton or animation clips. The gameplay character code adds procedural motion for running, jumping, and rolling. The locker uses a neutral static preview for scans that do not have a suitable authored idle animation. These approaches keep the models usable in the current prototype, but final character animation quality still depends on the source mesh and its rig.

Original GLB archives and reference video are kept out of the production bundle. `src/asset-manifest.mjs` is the source of truth for the eight gameplay models copied into `dist/`; the build also copies character images and the optimized model directory. If a runtime model is added or replaced, update the manifest and the relevant tests, then run the full production build.

The project has no root `LICENSE` file. The presence of a model, image, font, or reference link in the workspace should not be treated as proof of redistribution rights. Before a commercial release, record the creator, source, license, and required attribution for every shipped asset, and replace any asset whose terms do not allow the intended use. See [ARTWORK.md](ARTWORK.md) for current notes.

## Saves, privacy, and limitations

Progress is stored on the current browser and origin in `localStorage`, under the key `karachi-run.save.v1`. The save format is validated and migrated by the game code. It stores the coin balance, tickets, best and total scores, run count, sound and graphics preferences, selected and unlocked characters, energy inventory, and mission progress.

There is no account system, cloud sync, server validation, or global leaderboard. Progress belongs to that browser profile and origin. Clearing site data, using private browsing, or opening the game at a different address can make it unavailable. A storage error falls back to the current session and the interface reports that progress may not persist. The game does not currently upload run reports; a player can choose to download a local problem report for debugging.

The world is an original, stylized interpretation rather than an exact reconstruction of Karachi. It is designed as a playable browser prototype, and performance has not been certified across a representative range of phones. Android packaging, device performance qualification, account-backed persistence, online competition, advertising, analytics, and real-money purchases are outside the current browser build. None of those are implied by the in-game currency symbol or store UI.

## Development notes

- Keep game rules in small pure modules where practical; add focused tests when changing persistence, collision, route, or economy behavior.
- Preserve compatibility with existing local saves when changing `INITIAL_SAVE` or `parseSave` in `src/core.mjs`.
- Add production GLB files to `RUNTIME_MODELS` in `src/asset-manifest.mjs`; the Vite build intentionally does not copy the entire `public/` folder.
- Do not run `scripts/optimize-models.mjs` against an already optimized model. The script is intended for freshly extracted source assets; repeated simplification reduces quality.
- For collision reports, use the in-game **Save a problem report** action after a run. The report is a bounded diagnostic snapshot, not a full deterministic replay, and is only downloaded when the player chooses it.

## Troubleshooting

**The page opens but the 3D scene is blank.** Use a current browser with hardware acceleration and WebGL enabled. Try reloading after the initial models finish loading. Do not use `file://`; use the Vite development or preview server.

**A character or vehicle is missing from the production preview.** Run `npm run build` and check the release verification output. Confirm that the model is listed in `src/asset-manifest.mjs` and exists in `public/` at the expected path.

**Coins or settings do not persist.** Check that the browser allows site storage and that you have not changed origin (for example, from `127.0.0.1` to `localhost`). Those are separate browser storage locations.

**The game is slow on a phone.** Select **Battery saver** in Settings to reduce graphics quality. Close other heavy browser tabs and retest. Phone-specific frame rate, heat, memory, and battery behavior still need to be measured on real devices.

**The sound is silent.** Browser audio starts after a player action. Check the in-game sound button and the device volume.

## Acknowledgements

Karachi Run is an independent project and it is not affiliated with any game developing company.
