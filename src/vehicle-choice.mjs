// Visual traffic variants are chosen independently of the safe-lane planner.
export const VEHICLE_VARIANTS={bus:[0,1,6],rickshaw:[2,3]};
export function createVehiclePicker(seed=0){let state=(seed^0x9e3779b9)>>>0;return kind=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);const choices=VEHICLE_VARIANTS[kind];return choices[Math.floor(((t^(t>>>14))>>>0)/4294967296*choices.length)];};}
