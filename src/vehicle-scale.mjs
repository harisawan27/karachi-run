// Characters are 2.86 units tall. Preserve supplied vehicle proportions.
export function vehicleFit(size,kind){const scale=Math.min((kind==='bus'?4.4:3.15)/size.y,(kind==='bus'?3:2.7)/size.x);return {scale,width:size.x*scale,height:size.y*scale,depth:size.z*scale};}
