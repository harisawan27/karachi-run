# Original Karachi Run characters — appearance review

Status: both reference designs approved by the user. Actual GLB modeling and rigging are pending access to a suitable 3D-authoring pipeline. The existing playable characters remain unchanged until replacements pass animation review. Full prompts are recorded in GENERATION.md; the planned free and earned-coin cast is recorded in roster.json.

Candidate model check: `node scripts/check-character-model.mjs path/to/character.glb`. Export self-contained GLBs with skeletal clips named idle, run, jump, roll and stumble. This checks metadata and prevents accepting another static mesh as a finished animated character; it does not certify visual deformation or performance. Then perform the visual acceptance review below.

## Cast and ownership

| Character | Role | Intended availability |
| --- | --- | --- |
| Original Pakistani boy, working name undecided | Default runner | Free |
| Original heavyset Sindh-inspired warden, working name undecided | Default chaser | Free |
| Imran Khan | Optional runner | Unlock using earned game coins |
| Asim Munir | Optional chaser | Unlock using earned game coins |

Coin prices will be tuned with the store and progression step. Do not charge coins, change current ownership, or reset saved balances in the character-art step. Preserve public/imran.zip, public/asim.zip, their GLBs, arm mask, and UI portraits. Runner and chaser selection will be separate slots, so unlocking the warden does not replace the runner.

## Appearance target

Boy: original young adult Pakistani face, lean athletic proportions, textured short black hair, teal-blue shalwar kameez, off-white running sneakers. Cotton seams and folds, natural fingers and facial anatomy. No resemblance to the current political characters.

Warden: original middle-aged Pakistani face, broad cheeks, salt-and-pepper moustache, heavy belly and thick legs, black short-sleeve uniform and cap. Expressive and determined. A fictional design without official rank insignia, copied character details, or weapons.

Approve front, side and back references before sculpting. Match the detail and silhouette quality of the supplied models; primitive or capsule-body substitutes do not meet this requirement.

## Model and animation handoff

- Deliver original textured GLB models in a symmetrical A-pose with parallel feet, separated hands and torso, correct scale, and neutral applied transforms.
- Create a real skeleton: pelvis, spine, chest, neck, head, clavicles, upper/lower arms, wrists, thighs, knees, ankles and toes. Finger joints where needed for visible hand poses.
- Model and weight clothing deliberately. The kameez hem follows pelvis/cloth joints; it must not inherit wrist weights. Give cloth around elbows and knees enough topology for bending. A texture-colour mask is not the final production rigging method.
- Author in-place idle, sprint, jump ascent, airborne, landing, 0.85-second forward roll, left/right dodge and stumble clips. The heavy warden needs his own body mechanics and animation proportions.
- Use animation blending without changing collider dimensions to conceal visual problems. Freeze animation consistently on pause. Match roll clearance to the collision window.
- Keep detailed source files separately. Export browser assets with compressed textures and appropriately reduced geometry, preserving silhouettes and joint deformation.

## Acceptance gate before changing defaults

1. Both new faces and silhouettes are distinct from the old cast and from existing commercial game characters.
2. Hands clear the shirt throughout the run and roll; no shirt stretching, inverted elbows, broken fingers or foot stagger baked into idle.
3. Feet land naturally; the roll stays above the road and below the overhead obstacle. No flattened/scaled body trick.
4. Asim/warden lane commitment and continuous obstacle collisions remain intact. No side-to-side indecision, clipping or animation snapping around buses.
5. Test normal play on a representative mobile device at a documented frame-rate target before describing the characters as production-ready.
6. Existing save data and old character assets survive the switch. Store unlocks are implemented and tested in the later store step.

## Current boundary

The available image tool can create reference sheets but cannot export sculpted, skinned, animated GLB models. Real 3D authoring or a suitable 3D asset-generation pipeline is still required after the appearance review. Do not present generated reference images as playable models or replace the game with image billboards.
