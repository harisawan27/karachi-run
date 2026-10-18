# Haris sprint animation

Source: https://github.com/swift502/Sketchbook/blob/master/build/assets/boxman.glb
Retrieved: 2026-10-18. Copyright (c) 2020 swift502; MIT license in SKETCHBOOK-LICENSE.txt.

The source GLB is retained for reproducibility and is not shipped as a game character. Only the sprint animation is adapted onto the supplied Haris skeleton. The game keeps Haris's geometry, materials, bone translations and proportions. Source scale and translation channels are deliberately excluded from the retargeted rotations. Limb rotations retain the source forward swing with a sagittal hinge, avoiding outward leg swing and upper-arm twisting on the different bind pose. The resting arm drop is shared across clavicle and upper arm, with both clavicles baked into the clip.

Run node scripts/prepare-sprint-animation.mjs after changing the source or Haris's model. It generates src/haris-sprint.mjs: 16 joints, 51 local-quaternion samples, loop duration 5/12 seconds, and a small clearance envelope. Both source and destination model SHA-256 hashes are embedded and tested. The generated clip is bundled into the application, including offline mode, without a runtime network request. The license ships at /licenses/sketchbook.txt.

This pass covers Haris's grounded sprint. Board, idle, the warden and paid-character sprints retain their existing motion. Jump and flight are extended in the airborne pass described below. The sprint head and neck retain their neutral world orientation so the runner looks forward. The shared roll uses the original continuous 0.54-second tumble, without a crouch hold. It is not a complete animation overhaul or a claim of Subway Surfers parity.

The airborne pass also retargets jump_running from the same licensed GLB. Run node scripts/prepare-sprint-animation.mjs jump_running to generate src/haris-jump.mjs. Samples use source times 0.20–0.75 seconds to skip the long anticipation, keep sagittal limb motion, limit torso bowing and keep the head forward. Runtime playback follows jump velocity rather than looping at the sprint cadence. Source root translation/scale channels are excluded; the game owns the actual jump height. No additional character model or network request is required.
