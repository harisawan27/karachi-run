// Babylon's hardware scale is the inverse of the render-pixel ratio.
export function usesMobileResolution({width,height,coarsePointer=false,mobileUserAgent=false}){
 return mobileUserAgent||(coarsePointer&&Math.min(width,height)<=1024);
}

export function renderScale({width,height,dpr=1,mobile=false,low=false,preview=false}){
 const ratio=Number.isFinite(dpr)&&dpr>0?dpr:1;
 if(!mobile)return preview?Math.max(1.5,ratio/1.5):low?Math.max(1.7,ratio):Math.max(1,ratio/1.5);
 const pixelBudget=preview?540000:low?800000:1800000;
 const ceiling=low&&!preview?1.25:2;
 const area=Math.max(1,width)*Math.max(1,height);
 return 1/Math.min(ratio,ceiling,Math.sqrt(pixelBudget/area));
}
