import type {Engine} from '@babylonjs/core/Engines/engine';
import {renderScale,usesMobileResolution} from './render-resolution.mjs';

export function resizeGameCanvas(engine:Engine,canvas:HTMLCanvasElement,low=false,preview=false){
 const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight;
 const mobile=usesMobileResolution({width:innerWidth,height:innerHeight,coarsePointer:window.matchMedia('(pointer: coarse)').matches,
  mobileUserAgent:/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)});
 const scale=renderScale({width,height,dpr:window.devicePixelRatio,mobile,low,preview});
 if(Math.abs(engine.getHardwareScalingLevel()-scale)>1e-6)engine.setHardwareScalingLevel(scale);
 else engine.resize();
}
