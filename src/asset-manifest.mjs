// Runtime models must also ship in the production bundle.
export const CHARACTER_FILES=['pakistani_boy.glb','police_man_from_the_u.s.a._t-pose_rig_mixamo.glb'];
// Keep stalls at indices 4/5; the supplied side-on truck needs a quarter turn.
export const STREET_ASSETS=[
 {file:'decorative_pakistani_bus_with_passengers.glb',kind:'bus',yaw:0},
 {file:'colorful_decorated_truck.glb',kind:'truck',yaw:0},
 {file:'auto_rickshaw.glb',kind:'rickshaw',yaw:0},
 {file:'low_poly_autorickshaw_aka_tuktuk.glb',kind:'rickshaw',yaw:0},
 {file:'biryani_stall.glb',kind:'stall',yaw:0},
 {file:'gola_ganda_stall.glb',kind:'stall',yaw:0},
 {file:'pakistani-truck.glb',kind:'truck',yaw:Math.PI/2},
];
export const STREET_FILES=STREET_ASSETS.map(asset=>asset.file);
export const RUNTIME_MODELS=[...CHARACTER_FILES,...STREET_FILES];

// Only this approved cinematic ships; raw Flow experiments stay source-only.
export const RUNTIME_MEDIA=['cinematics/haris-intro.mp4'];
