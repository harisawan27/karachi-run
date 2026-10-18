# Karachi Run

**A mobile-first, browser-based 3D endless runner inspired by Karachi.** Sprint through a stylized city, weave between buses and rickshaws, ride rooftop ramps, collect coins, and follow a route from Saddar to Sea View.

Karachi Run is an independent project. It uses familiar three-lane endless-runner controls, with original code, city scenery, interface, and game assets. Its districts and landmarks are stylized interpretations arranged into a compressed game route; the course is not a surveyed or geographically exact map.

> **Project status:** playable browser prototype / beta foundation. Runs, coins, settings, missions, character selection, the store, Google account sign-in, and per-account cloud saves are implemented. Neon Auth, the Data API, and the save-table security migration are connected; New deployments must configure their public service URLs and trusted domains in Neon. An installable PWA and optional offline game download are implemented. The project does not currently provide online leaderboards, real-money purchases, advertising, or a published Android/iOS store app. See [LAUNCH-PLAN.md](LAUNCH-PLAN.md) for the current release gates.

### Haris movement pass — October 18

Haris now uses a retargeted, MIT-licensed sprint clip from [Sketchbook](https://github.com/swift502/Sketchbook). Sixteen joints, including both clavicles, follow sampled animation rotations, preserving his supplied model and bone lengths. Grounding includes a short airborne interval; running remains separate from gameplay collision height. Startup cadence is integrated consistently at different refresh rates, and the portrait camera preserves a minimum horizontal view on tall phones. The limb retarget uses forward-and-back hinges to avoid leg splay and upper-arm twist; the arm drop is shared across the shoulder and upper arm. The head faces the horizon during the sprint. Rolls use the original continuous 0.54-second tumble, without a crouch hold. Jump, flight, board and the other characters retain their previous motion in this pass.

Start the development server and open [/movement-lab.html](http://127.0.0.1:5173/movement-lab.html) for a repeatable 45-second course with New Sprint/Previous and Chase/Side views, phone swipes, buses, a roof ramp, a jump barrier and a roll obstacle. The lab imports no account or save code and never changes player progression; it is a development entry, excluded from the production build. The new sprint is also enabled for Haris in the main game.

Frequent coin/mission updates now batch local persistence at 200 ms intervals instead of writing on every animation frame. Run end, crash, pause and page exit still checkpoint immediately through the existing cloud queue. Coin feedback uses animation without a forced layout read. These changes remove known sources of avoidable main-thread work; they do not establish a measured phone frame rate.

Animation provenance, regeneration and license: [art/motion/README.md](art/motion/README.md). Automated checks cover real-model deformation and grounding at 30/60/120 FPS, loop continuity, model hashes and bounded persistence. Browser and phone playtesting remain necessary to judge feel.

### Phase 1: game feel and movement polish — complete

Phase 1 tightens the moment-to-moment run without changing the route or starting the later roadmap phases. It includes responsive lane changes, a 160 ms jump input buffer for landing and ramp transitions, controlled run animation cadence as speed rises, coin collection feedback, and brief camera shake on a graze, board break, or hard landing. Coins keep their route positions when no magnet is active; the Coin Magnet is the only effect that pulls them toward Haris, and coins return smoothly to their route if the magnet runs out mid-pull.

The Karachi Cruiser is a player-activated board shield, not a board pickup placed on the track. A fresh local save starts with five free Cruiser rides (and an older save receives the starter allotment the first time it is upgraded). In guest mode, the allotment and purchases stay on this browser. Once Neon Auth is configured, account saves sync the balance and purchases across browsers. After that, buy a ride for ₨ 90 or a five-ride pack for ₨ 350 in the Boards tab of the Bazaar. Each activation consumes one ride: press **Space**, **B**, or **Enter** on a keyboard, or double-tap on a touchscreen. The visible board appears under the runner for up to 25 seconds and absorbs one collision or stumble. Breaking on a hit starts a 20-second cooldown and gives a short 1.8-second grace window; letting its timer expire starts a 15-second cooldown. The HUD and board screen show the remaining ride count.

Coin pickup also pulses the coin counter and plays the pickup sound. Phase 3 progression is described below; launch and distribution remain separate work.

### Phase 2: Desi soundscape and power-ups — complete

The run now has an original, speed-synced Karachi beat built from dhol-style low percussion, hand-played rhythm accents, and plucked melodic notes. Tempo rises with course speed and the mix runs through a compressor to keep the sound comfortable. Coin, lane-change, jump, landing, slide, crash, power-up, and approaching-bus sounds use layered Web Audio synthesis. No third-party recordings or unverified music are bundled.

Urdu quips are optional and use the browser’s installed Urdu speech voice when one is available; the game never imitates a real person’s voice. The Settings screen saves separate Street Effects, Karachi Beat, and Urdu Voice Quips preferences.

Five Karachi-themed powers appear as track pickups: **Coin Magnet** draws nearby coins, **Double Points** doubles score, **Dhabba Chai Jetpack** rises above the rooftops for a sky-coin trail, **Khazana Biryani** doubles score and coin rewards, and **Peshawari Bounce** boosts jumps. Pickups now wait for a distance-based cooldown equivalent to roughly 18–28 seconds of running, skip about three in ten eligible opportunities, and keep an opening stretch clear before the first one. This spaces rewards out even as speed rises. The Bazaar upgrades each pickup’s duration with earned coins, up to level 5; it does not sell one-run power stock. The pickups have distinct 3D silhouettes: a horseshoe magnet, a gold ×2 token, a steaming chai glass and saucer, an open biryani handi, and Peshawari sandals with a bounce cue. Chai flight adds visible twin plumes and a halo, eases the camera into a high city view, and returns it smoothly on landing. While airborne, a continuous zigzag of coins covers all three lanes; the last coin is placed at the predicted end of the remaining flight. Save migration preserves existing wallet, character, ticket, board, energy, and record data while converting old energy counts into upgrade levels.

### Phase 3: mission sets, daily hunt, and cloud progression

Three missions now run together in a set: collect coins, cover distance, clear jump barriers, roll under signs, run on elevated routes, collect power-ups, or pass traffic. Counters carry across runs and devices. Completing all three makes a set reward available in Missions or the results screen. Collecting it awards coins and permanently raises the base score multiplier by one, up to **×30**. Later sets still award coins at the cap. This permanent base replaces the old time-based run multiplier; Double Points and Biryani bonuses stack separately. Earlier single-mission completions are credited in groups of three, and the remaining completed slots/current progress are carried into the migrated set. Wallet, ownership, upgrades, tickets, boards, scores, settings, and account saves remain intact.

The daily **K–A–R–A–C–H–I** hunt uses seven distinct letter positions, including both As. Gold 3D letter tokens spawn on checked ground lanes with room to collect them; missed letters return later, and crashes do not clear collected letters. The hunt resets at **midnight Asia/Karachi (UTC+5)**. Collect all seven across any number of runs to open one free Khazana pot. Possible packs are shown before opening: 500 coins + 2 Cruiser rides, 350 coins + 2 Wapsi Tickets, or 800 coins + 1 Cruiser ride. There is no real-money purchase or paid random reward. Personal-best approach and record-break billboards mark score milestones without adding collision geometry.

The phone-first Missions screen shows three progress cards, a permanent-multiplier medal, a daily-hunt tab, letter tiles, a pot reveal, reward details, and a Pakistan-midnight countdown. Run results show mission gains and letters found in that run. Reduced-motion preferences suppress decorative motion. The seven-letter HUD stays compact during play.

**Cloud consistency:** the complete version-8 progression stays in each player's existing Neon `player_saves.save_data` JSON. Account writes use the revision-aware `sync_player_save` RPC; a stale device cannot silently overwrite a newer snapshot. Profile offers an explicit load-latest action and keeps the unsynced local snapshot as a browser backup. Atomic `claim_player_reward` transactions check completion, add wallet/inventory rewards, advance the mission set or daily claim, and write an immutable per-account receipt in `player_reward_claims`. Repeated requests return the same receipt without paying again. RLS restricts both saves and receipts to their owner. Daily claims use the database's Pakistan date. Signed-in reward claims require connectivity; offline run progress remains queued locally and retries on reconnection. Guests claim once locally and their daily state/mission progress merge when they link an account.

Apply [migration 004](db/migrations/004_progression_rewards.sql) after migrations 001–003 when setting up another Neon project. It adds no frontend database credential and needs no separate application server. The migration has been applied to this project's existing Neon database. Automated tests cover migration, all seven letters, daily rollover, multiplier caps, guest merging, revision conflicts, and complete cloud snapshots. Live Neon transaction tests cover duplicate mission/daily claims, incomplete/expired rewards, stale writes, receipt RLS, and cross-account isolation; test data and the temporary test identity are rolled back. Full browser visual verification remains a manual release check.

## Recent prototype updates

Vehicle/chase framing update: rickshaws use their exact earlier fit (3.15 height / 2.7 width caps), the passenger bus is about 20% larger, and cargo trucks retain their previous size. Imported and fallback collider sizes follow their visual models. The warden now loses ground behind the camera at full opacity, then closes the distance after a bump. Powered jumps raise and slightly pull back the ground camera to keep the full runner visible in portrait and landscape; normal jumps and Chai flight keep their separate framing.


The athletic movement pass uses a handcrafted key-pose sprint cycle (contact, compression, push-off, heel recovery, knee drive and extension), with a roughly 0.42–0.38-second cycle as speed grows. Footstep sounds follow the actual stride phase. Rolls use the original continuous 0.54-second tumble; normal jumps have a brisker arc, while Peshawari Bounce preserves clearance above full-size buses. The stall opening turns Haris toward the route before the escape. Ordinary jumps leave the camera steady, and high jumps receive only a limited elevation adjustment.

Imran and Asim use the shared procedural fallback driver for sprint cadence, arm counter-swing, knee recovery, ankle motion, jumps, tucked rolls, board balance, flight and landing. Haris now uses the separate retargeted Sketchbook clip for his grounded sprint; the remaining actions still use that shared driver. Their static scans receive a fitted 18-joint humanoid skeleton, a neutralized baked foot stagger and corrected rest-angle retargeting. Imran's arm weights are smoothed over welded mesh topology so hands and sleeves move together while the loose kameez stays with the torso. Locker previews retain their separate static presentation. Character ownership, selection and cloud saves are unchanged. Real-model tests run the actual animation class through Babylon's headless engine; an artist-authored rig would still offer finer cloth deformation.

Street phrases now include optional jump-arc and low roll coin lines with an open bypass, plus regular breather rows. Oncoming traffic and continuous truck roofs retain their safety checks. Chai flight keeps a reachable five-coin dwell in each lane, warns before ending, and eases down over 1.05 seconds. Haris’s grounded sprint uses the licensed Sketchbook animation described above; other actions use the shared procedural driver.


The movement pass adds frame-rate-independent damped lane changes, blended run/jump/roll/board/flight poses, moderated sprint limb angles, articulated elbows in their moving parent frame, and a hip-centred tucked roll. Foot grounding reads the current skeletal pose rather than the previous rendered frame, and rooftop shadows follow the deck height. Normal and sneaker jumps retain the ground-following camera; the city-flight camera activates only for Chai flight. Flight altitude and its coin trail share a fixed pickup elevation, so passing traffic cannot move them up and down. Touch gestures use a phone-sized threshold, recognize fast swipes on release, and discard cancelled gestures. The 2.4-second opening blends the stall escape into the run. Jump, roll, flight and board actions use the shared procedural driver; Haris’s grounded sprint uses the licensed clip described above.


Peshawari Bounce now boosts every jump input, including buffered jumps, high enough to clear a full-size bus or truck. Vehicle roofs support descending landings and remain walkable when the power expires. Side brushes recoil into a clear lane with a brief recovery window, bringing the Warden closer instead of turning the same contact into a fatal head-on hit; another stumble within five seconds can still end a run. The portrait lobby presents the full 3D runner and Warden in the street scene, with floating records, an arcade logo, a pulsing Tap to Run button, and thumb-sized navigation. Compact phone layouts keep the character and play control clear.

The home screen and navigation now use a game-style layout built for phone screens first. The bottom bar opens Home, Missions, Me, Shop, and City; the large **Run** button on Home starts a run. The mobile camera widens its view and reduces lateral tracking in portrait mode so the runner and all three lanes remain easier to follow. Touch controls adapt to small screens, and the gameplay instruction hint fades after the opening seconds.

The Bazaar includes the Karachi Cruiser ride inventory. New local saves start with five rides, and older saves receive that starter allotment once during migration. A single ride costs ₨ 90 and a five-ride pack costs ₨ 350 in game coins. Activating the board consumes one ride; it lasts up to 25 seconds and shields one hit or stumble. The board is not a track pickup. Inventory is saved locally and is not a real-money purchase.

Startup updates optional wallet and inventory UI only when those elements exist, so removing a navigation badge cannot throw before the lobby initializes. Scene creation is staged across browser frames: street sections, landmarks, and open-city scenery are built in small steps while the loading screen reports progress. Local vehicle and stall models have an eight-second timeout with simple in-game fallbacks, so a delayed optional model does not hold startup indefinitely. Character readiness is still required before the lobby becomes playable.
## What is in the game

- A continuously looping route through eight Karachi-inspired districts: Saddar Bazaar, Empress Market, Mazar-e-Quaid, Old Town Streets, Merewether Tower, Clifton Boulevard, Teen Talwar, and Sea View.
- Three-lane running with lane changes, jumps, rolls, ramps, and rooftop sections. The run animation cadence stays controlled as speed rises, so the runner does not look frantic at the top speed. Open plazas and the coast break up the street sections.
- Incoming Mazda-style buses, rickshaws, barriers, and low overhead obstacles. Bus and rickshaw models are normalized to a human-relative road scale, with collision bounds matched to their displayed size; fallback models use the same scale. Traffic and obstacle placement reserve a way through each encounter.
- A chase sequence with the Warden, plus an opening scene that can be skipped.
- Collectible rupee-style coins, score multipliers, landmark discoveries, and rotating street missions.
- A character collection. Haris is the starter runner; the Warden is the chase character. Imran Khan and Asim Munir are unlockable characters bought with earned in-game coins.
- An arcade-style Bazaar where Coin Magnet, Double Points, Dhabba Chai Jetpack, Khazana Biryani, and Peshawari Bounce appear as route pickups. Earned coins upgrade their pickup duration; the Bazaar also offers Cruiser rides, character unlocks, and Wapsi Tickets used to continue after a crash.
- Local records for coins, best score, total score, completed runs, settings, character ownership, power-up levels, tickets, Cruiser rides, and mission progress.
- Mobile touch controls and keyboard controls for desktop. The layout adapts to portrait and landscape screens.

Prices and balance are prototype values and may change. The rupee symbol is part of the in-game presentation; it does not represent a real-money purchase.

## Play controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move one lane left or right | `←` / `→` or `A` / `D` | Swipe left or right; on-screen arrows are also available |
| Jump | `↑` or `W` | Swipe up or tap the jump button |
| Activate Karachi Cruiser board | `Space`, `B`, or `Enter` | Double-tap during a run |
| Roll / slide | `↓` or `S` | Swipe down or tap the roll button |
| Pause or resume | `Esc` or `P` | Pause button during a run |

Make a short, deliberate swipe. A direct body hit ends the run. A glancing contact or a fast lane-change brush causes a stumble; another stumble within five seconds can end the run. Clothing clearance is ignored, and the hit checks use the displayed vehicle dimensions. A ramp leads onto a rooftop path with a ground-level bypass, and the route continues smoothly down its exit ramp.

### Run, score, and rewards

- The runner starts at 14 m/s. Speed rises with distance, reaching 20 m/s at 500 m, 26 m/s at 1,000 m, and a cap of 32 m/s at 1,500 m.
- Score grows with distance. Its permanent base multiplier advances through completed mission sets, up to ×30. Double Points and Khazana Biryani temporarily double score; when both overlap, their bonuses stack.
- Coins are added to the saved wallet as they are collected, including during a run. Ending or crashing does not credit the same coins again.
- Discovering a landmark awards 100 points. Collecting a completed three-mission set awards bonus coins and advances the permanent base multiplier.
- Coins stay on their route and are collected only when the runner reaches them; they move toward the runner only while a Coin Magnet is active. If the magnet expires mid-pull, affected coins ease back to their route. A Coin Magnet attracts nearby coins for 12 seconds, Double Points lasts 12 seconds, Dhabba Chai lifts Haris above Karachi rooftops for an aerial coin trail, Khazana Biryani doubles score and coins for 12 seconds, and Peshawari Bounce boosts jumps for 8 seconds. Bazaar upgrades extend each pickup duration, up to level 5. None activates before its route pickup is collected. Chai flight eases into a high city view and descends smoothly when its timer ends.
- A crash opens an eight-second continue choice. Continuing requires one Wapsi Ticket; there is no free revive. A ticket can be bought with coins at the crash screen or stocked in the Bazaar. The five-ticket bundle costs less than five individual tickets.
- The City screen lets you choose a district as the starting point. A run then continues across all eight districts and loops back to the start.

## Run locally

### Installable game and approved branding

The approved Karachi Run artwork replaces the K placeholder in the browser favicon, header, illustrated lobby title, initial page splash, 3D loading screen, loading-error screen, install panel and app icons. Original approved PNGs and prompts remain in `art/branding/`. `node scripts/prepare-branding.mjs` exports the PNG/ICO/WebP sizes without redrawing the artwork; the production build runs it automatically. Apple receives an opaque touch icon, and Android has a separate full-bleed maskable icon with the wordmark inside its central safe area.

The lobby's **Install Game** shortcut and Settings open the same install panel. Chromium browsers use their native prompt when available; other browsers receive instructions, including Share → Add to Home Screen on iPhone/iPad. The shortcut hides after an installation event or inside a standalone app window. The manifest uses a stable root identity, standalone display and either screen orientation. Installation availability depends on the browser. On a device that opens the installed app with separate browser storage, sign into the same Google account from Profile to recover cloud progression.

**Save for Offline** is optional: it downloads the city's runtime models, all three runners and character portraits, with actual progress and a storage/network retry state. The panel displays the pack's size from the current build. Ordinary play also caches public assets as they are requested. The small application shell is cached separately; opening the page does not automatically download every optional 3D model. Offline-ready status appears only after the complete pack is present. External Google fonts may fall back to installed fonts offline, and the browser can evict cached files under storage pressure.

Neon Auth, Google OAuth, API requests, authenticated headers and writes bypass the service worker completely. Account saves remain local and pending while offline, retaining the last account's display identity and acknowledged revision; no auth token is stored in the offline-owner record. Reconnection uses the existing revision checks, so another device's newer save produces a visible conflict instead of a silent overwrite. Cloud sync and account reward claims require a connection. Signing out clears the cached account identity.

Worker versions are derived from shipped content. Updates wait until explicitly applied from the lobby/Settings, save pending progress first, and never automatically reload an active run. `vercel.json` keeps the worker and manifest fresh. The worker is registered only in production builds so Vite's development source and hot reload are never trapped in an offline cache.

To test PWA behavior locally, build and run `npm run preview` (normally `http://127.0.0.1:4173/`). HTTPS on Vercel or a localhost origin is required; a plain HTTP LAN address on a phone is useful for gameplay testing but does not provide the normal secure PWA install environment. In development preview on port 5173, the install guide and artwork are visible but the production offline worker is disabled. Actual native installation, home-screen appearance and phone touch behavior remain device release checks.

References: [MDN installation guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [maskable-icon guidance](https://web.dev/articles/maskable-icon).

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
| `src/model-character.ts` | GLB loading, shared joint animation, jump/roll poses, and geometry grounding |
| `src/scan-rig.mjs` | Fitted humanoid skeletons and skin weights for the supplied static character scans |
| `src/character-preview.ts` | Isolated 3D character viewer used in the collection/store |
| `src/core.mjs` | Save validation, economy helpers, collision rules, mission definitions, speed progression, run cadence, and coin attraction |
| `src/routes.mjs` | District order, route lengths, progress, and environment transitions |
| `src/pwa.ts` | Install prompt, offline-pack status, and user-controlled app updates |
| `src/service-worker.js` | Versioned public-asset cache; Auth/API requests always bypass it |
| `src/account-owner.mjs` | Last account display identity/revision for offline pending saves; no credentials |
| `scripts/build-pwa.mjs` | Content-versioned worker and public offline asset list |
| `src/progression.mjs` | Version-8 mission sets, daily hunt, rewards, migration, and safe letter lanes |
| `src/progression-view.mjs` | Mission, daily-hunt, reward-reveal, and run-results markup |
| `src/progression-scene.ts` | Pooled 3D letter token and personal-record billboard |
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

Guest progress is stored on the current browser and origin in localStorage, under the key `karachi-run.save.v1`. The validated save includes coins, tickets, best and total scores, run count, preferences, selected and unlocked characters, power levels, Cruiser rides, board inventory, and mission progress. Guest mode remains available if Neon is not configured or cannot be reached.

Google accounts can sync that save through Neon Auth and the Neon Data API. Each signed-in player has a row in `public.player_saves`; the complete progression snapshot is stored in its `save_data` JSONB field. Writes are throttled during play so continuous coin collection cannot postpone them, and flushed immediately when a run ends. PostgreSQL row-level security scopes reads and writes to the authenticated user. When a guest signs in, the game merges local progress into the account save so guest-earned progress is retained. The profile button beside Settings opens sign-in or the account panel, which shows sync status and offers retry and sign-out controls. Once signed in, the guest sign-in prompt is hidden. Failed uploads retain an account-specific pending snapshot and retry with a delay capped at 30 seconds; reconnecting also triggers a retry. The game shows success only after the database returns the matching player row. Run results display the current sync status.

The app uses only public service URLs in browser configuration; never put a database connection string, password, OAuth client secret, or private key in a `VITE_` variable. RLS prevents one account from reading or changing another account's row, but this client-side game does not validate a player's own coin balance or scores. Treat progression as user-owned, not as a trusted commercial entitlement, until server-side validation is added. Run reports remain local and are uploaded only when a player chooses to download them.

### Enable Google accounts and cloud saves

1. Enable Neon Auth and the Data API for the same database branch **before running the SQL migrations**. In the Data API setup, use Neon Auth and leave broad public-schema grants off; the migrations grant access only to the save resources. Merely setting the Data API URL does not enable the service. The linked database has the player save table, JWT helper, and own-save RLS policies from `db/migrations/001_player_saves.sql`.
2. Configure Google as a social provider in Neon Auth. Add the game's local and production origins to Neon Auth's trusted domains; use the exact site origin, such as `https://your-game.example`, without a trailing slash. The sign-in request asks Google to show account selection and consent.
3. For a new database branch, run `db/migrations/001_player_saves.sql`, then `db/migrations/002_player_save_identity.sql`, in the Neon SQL Editor. For a branch that previously had a manually-created authenticated role, also apply `db/migrations/003_managed_api_save_permissions.sql` after Neon provisions its managed role. All three migrations are applied to the currently linked branch. The second uses an owner-privilege view for JWT identity, avoiding the managed auth-schema ACL and SECURITY DEFINER initialization issue.
4. Add the branch's `NEON_AUTH_BASE_URL` and `NEON_DATA_API_URL` values to `.env.local`. The Data API URL must include the `/rest/v1` path shown by Neon. Vite exposes these as `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` to browser code; it never exposes `DATABASE_URL`.
5. Restart the Vite dev server. For Vercel, set `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` as build environment variables, then redeploy.

Google's OAuth client ID and secret belong in Neon Auth's provider settings, not in this repository or browser environment. Do not send a Neon database connection string for this frontend-only integration. On first sign-in, guest progress is merged into the account's cloud save; subsequent sign-ins load that account's progress. Signing out returns to the local guest save. Cloud sync needs a working network connection; local browser storage remains available when the service is unavailable.

The world is an original, stylized interpretation rather than an exact reconstruction of Karachi. It is designed as a playable browser prototype, and performance has not been certified across a representative range of phones. Android packaging, device performance qualification, online competition, advertising, analytics, and real-money purchases are outside the current browser build. Account-backed saves are implemented for the browser and become active after Neon setup. None of those are implied by the in-game currency symbol or store UI.

## Development notes

- Keep game rules in small pure modules where practical; add focused tests when changing persistence, collision, route, or economy behavior.
- Preserve compatibility with existing local saves when changing `INITIAL_SAVE` or `parseSave` in `src/core.mjs`.
- Add production GLB files to `RUNTIME_MODELS` in `src/asset-manifest.mjs`; the Vite build intentionally does not copy the entire `public/` folder.
- Do not run `scripts/optimize-models.mjs` against an already optimized model. The script is intended for freshly extracted source assets; repeated simplification reduces quality.
- For collision reports, use the in-game **Save a problem report** action after a run. The report is a bounded diagnostic snapshot, not a full deterministic replay, and is only downloaded when the player chooses it.

## Troubleshooting

**The page opens but the 3D scene is blank.** Use a current browser with hardware acceleration and WebGL enabled. Try reloading after the initial models finish loading. Do not use `file://`; use the Vite development or preview server.

**A character or vehicle is missing from the production preview.** Run `npm run build` and check the release verification output. Confirm that the model is listed in `src/asset-manifest.mjs` and exists in `public/` at the expected path.

**The account exists but `player_saves` is empty.** Open Neon → production branch → Postgres database → Data API and confirm it is enabled with Neon Auth. An API URL alone does not provision it. If enabling fails with “authenticated role already exists,” a manually-created role is conflicting with provisioning: preserve that role under a legacy name, enable the API so Neon creates its managed role, then apply migration 003 to rebind the own-save policies and grants. Reload the game and check Profile for the acknowledged cloud-save status.

**Coins or settings do not persist.** Check that the browser allows site storage and that you have not changed origin (for example, from `127.0.0.1` to `localhost`). Those are separate browser storage locations.

**The game is slow on a phone.** Select **Battery saver** in Settings to reduce graphics quality. Close other heavy browser tabs and retest. Phone-specific frame rate, heat, memory, and battery behavior still need to be measured on real devices.

**The sound is silent.** Browser audio starts after a player action. Check the in-game sound button and the device volume.

## Acknowledgements

Karachi Run is an independent project and it is not affiliated with any game developing company.
