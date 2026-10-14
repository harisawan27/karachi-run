# Karachi Run: September release plan

Target: September 30, 2026. Owner: solo founder, with Codex implementing and verifying changes in this workspace during active sessions. No automatic background work is configured.

The deliverable is a polished browser beta and, if mobile setup and real-device checks succeed, an Android test build. Public Play Store availability and revenue are not promised. A new personal Play developer account may require 12 closed testers continuously opted in for 14 days before a production-access application, so a new test starting September 19 cannot finish by September 30.

## Product decisions
- Karachi only; fictional Pakistani boy and warden remain default.
- Preserve existing characters, models, wallet and records.
- Continuous connected rooftop decks, gentle entry/exit ramps, regular oncoming buses and a ground bypass.
- Delivery mechanic remains removed.
- Portrait is primary; landscape and desktop remain supported.
- Core running first; no new city, multiplayer, full live-ops system, or engine rewrite this month.
- Release accounts, identity verification, payments and device access stay with the founder. Never request credentials in chat.

## Schedule and acceptance gates
| Target | Deliverable | Evidence required |
|---|---|---|
| Sep 19–21 | Release foundation, deliberate street phrases, collision diagnostics | Tests and actual production assets pass; no archive/video leakage; problem report downloads locally |
| Sep 21–23 | First 90 seconds and mobile presentation | Observe 5–10 people; clear controls, readable traffic, reliable pause/revive/home; repeat known ramp cases |
| Sep 23–25 | Essential settings and earned-coin character store | Purchases cannot overspend or disappear on reload; old saves survive; no real-money checkout yet |
| Sep 24–27 | Android packaging experiment on founder's Infinix | Installable test build; measure sustained FPS, load time, heat, interruptions and offline behavior; fix or defer based on evidence |
| Sep 27–29 | Limited browser beta and release materials | Independent testers, resolved critical bugs, audited model/audio rights, privacy/support pages, real screenshots |
| Sep 30 | Browser beta candidate; Android closed/internal test if ready | No known release-blocking bugs; tested saves; deployment approval when concrete build is ready |

These are working targets. Quality gates take precedence; Android/store work depends on device details and account availability.

## Started in this pass
- Production model manifest shared with runtime loaders; all eight active GLBs ship in release builds.
- Build verifies exact copied model bytes and excludes source archives/reference video.
- Three authored street phrases with a gentle opening, seeded selection and adjacent safe-lane transitions before traffic safety filtering.
- Local bounded problem reports record recent inputs, nearby obstacle geometry, collision context and frame timing. Reports are user-downloaded, not uploaded. They support investigation, not full deterministic replay.
- Existing ramps, continuous roofs, traffic reservations and saves retained.
- Production browser smoke test: scene loads, run starts, pause and results work. Portrait results inspected; landscape results compacted to keep retry visible.
- Automated foundation suite: 38 tests pass. Production build verifies all eight runtime models. Phone performance and report-download compatibility remain to be checked on real devices.
- Android SDK directory exists on this computer; a complete working Android build toolchain has not been verified.

## Outstanding before a commercial release
- Full generated-course reachability simulation, including moving vehicles and transitions; row-level tests alone do not prove this.
- Manual production-build testing in portrait and landscape; older Android WebView testing.
- Real-phone performance and memory measurement; loading and asset budget.
- Settings persistence, character ownership/equip migration, currency balance.
- Android toolchain, packaging, native interruption handling and distribution account.
- Optional ads only after consent/audience decisions and retained-player evidence; verify reward callbacks and failure behavior before launch.
- Asset license/provenance audit, privacy disclosure, support contact and store requirements.
- Public deployment is a separate action; no release was published in this pass.

## Founder tasks in plain language
1. Test on the Infinix and report its model when possible.
2. Recruit 5–10 people who have not watched development. Let them play without coaching.
3. Tell us whether a Play Console account already exists; create/verify it yourself if needed.
4. Report exact confusing moments; use “Save a problem report” after a run for collision issues.
5. Approve final branding, public release and any spend. No ad/revenue target is guaranteed.

## Suggested 10-minute phone test
- Play portrait, then landscape; check swipes and buttons do not obscure obstacles.
- Ride a whole convoy without jumping; jump and roll on the entry and exit.
- Watch a bus approach; check a ground escape stays reachable.
- Crash, revive, pause, switch apps, return home and restart.
- Reload and confirm saved coins and best score persist.
- After sustained play, note heat, slowing, delayed swipes or audio problems.

## References verified September 19, 2026
- Google testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Google target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Capacitor platform setup: https://capacitorjs.com/docs/getting-started/environment-setup
