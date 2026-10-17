// Continuous truck decks with a loading ramp and a gentle exit.
export function convoyLayout(z,depth,row){
 const count=Math.floor(row/8)%2===0?2:3,gap=0;
 const centers=Array.from({length:count},(_,i)=>z+i*(depth+gap));
 return {centers,gap,entry:z-depth/2-12,exit:centers.at(-1)+depth/2+16};
}

// Deliberate street phrases; traffic waves and roof sections are orchestrated separately.
const PHRASES = [
 {name:'bazaar',safe:[1,1,0,1,2,1,0,1],kinds:['barrier','rickshaw','arch','barrier']},
 {name:'boulevard',safe:[1,2,2,1,0,0,1,1],kinds:['bus','barrier','rickshaw','arch']},
 {name:'market',safe:[1,0,0,1,2,2,1,1],kinds:['arch','rickshaw','barrier','bus']},
];
export function streetRow(index,seed=0){
 const phrase=PHRASES[(Math.floor(index/16)+(seed>>>0)%PHRASES.length)%PHRASES.length];
 const safeLane=index<4?1:phrase.safe[index%8];
 const obstacles=[];
 for(let lane=0;lane<3;lane++){
  if(lane===safeLane||(index<4&&lane!==(index%2?2:0)))continue;
  obstacles.push({lane,kind:index<4?(index%2?'arch':'barrier'):phrase.kinds[(index+lane)%phrase.kinds.length]});
 }
 const beat=index%8,breather=index>=4&&beat===7;
 // Optional skill lines reward jump/roll while the guaranteed bypass stays open.
 const challenge=index>=4&&(beat===2||beat===5)?{lane:safeLane===0?1:safeLane===2?1:(beat===2?0:2),kind:beat===2?'barrier':'arch'}:null;
 if(challenge){const prop=obstacles.find(o=>o.lane===challenge.lane);if(prop)prop.kind=challenge.kind;}
 return {safeLane,obstacles:breather?[]:obstacles,challenge,breather,phrase:index<4?'warmup':breather?'breather':phrase.name};
}
