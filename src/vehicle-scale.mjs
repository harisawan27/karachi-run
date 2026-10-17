// Preserve proportions beside the 2.86-unit runner. Trucks keep their existing fit.
export function vehicleFit(size,kind){
 const caps=kind==='bus'?{height:6,width:4.15,depth:11.8}:kind==='truck'?{height:5,width:3.45,depth:9.5}:{height:3.15,width:2.7,depth:Infinity};
 const scale=Math.min(caps.height/size.y,caps.width/size.x,caps.depth/size.z);
 return {scale,width:size.x*scale,height:size.y*scale,depth:size.z*scale};
}
