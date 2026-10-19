// Contain a portrait film without cutting off its shutter, runner or warden.
export function cinematicViewport(width,height,progress=0){
 const aspect=width/Math.max(1,height),film=9/16,p=Math.max(0,Math.min(1,progress)),blend=p*p*(3-2*p);
 const initialWidth=aspect>film?film/aspect:1,initialHeight=aspect<film?aspect/film:1;
 const w=initialWidth+(1-initialWidth)*blend,h=initialHeight+(1-initialHeight)*blend;
 return {x:(1-w)/2,y:(1-h)/2,width:w,height:h,blend};
}

// Crop only the decorative backdrop. The foreground always uses contain.
export function cinematicBackdropCrop(sourceWidth,sourceHeight,targetWidth,targetHeight){
 if(Math.min(sourceWidth,sourceHeight,targetWidth,targetHeight)<=0)return null;
 const aspect=targetWidth/targetHeight,sourceAspect=sourceWidth/sourceHeight;
 const width=sourceAspect>aspect?sourceHeight*aspect:sourceWidth,height=sourceAspect>aspect?sourceHeight:sourceWidth/aspect;
 return {x:(sourceWidth-width)/2,y:(sourceHeight-height)/2,width,height};
}
