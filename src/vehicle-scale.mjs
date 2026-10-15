// Keep the Karachi minibus imposing and the rickshaw road-sized beside a 2.86m runner.
export function vehicleFit(size,kind){const caps=kind==='bus'?{height:5,width:3.45,depth:9.5}:{height:3.55,width:3.05,depth:5.8};const scale=Math.min(caps.height/size.y,caps.width/size.x,caps.depth/size.z);return {scale,width:size.x*scale,height:size.y*scale,depth:size.z*scale};}
