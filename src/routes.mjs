const districts = [
  {id:'saddar',name:'Saddar Bazaar',urdu:'صدر بازار',length:1800,kind:'street',subtitle:'The heart of the city'},
  {id:'empress',name:'Empress Market',urdu:'ایمپریس مارکیٹ',length:1800,kind:'plaza',subtitle:'Through the old city',landmark:1100},
  {id:'mazar',name:'Mazar-e-Quaid',urdu:'مزار قائد',length:1800,kind:'garden',subtitle:'A little room to breathe',landmark:1100},
  {id:'arcade',name:'Old Town Streets',urdu:'پرانا شہر',length:1800,kind:'street',subtitle:'Back into the bustle'},
  {id:'tower',name:'Merewether Tower',urdu:'میری ویدر ٹاور',length:1800,kind:'plaza',subtitle:'Meet you at Tower',landmark:1100},
  {id:'clifton',name:'Clifton Boulevard',urdu:'کلفٹن',length:1800,kind:'garden',subtitle:'Follow the sea breeze'},
  {id:'talwar',name:'Teen Talwar',urdu:'تین تلوار',length:1800,kind:'garden',subtitle:'Three swords. One city.',landmark:1100},
  {id:'seaview',name:'Sea View',urdu:'سی ویو',length:2000,kind:'coast',subtitle:'The Arabian Sea is calling',landmark:1100},
];
let offset=0;export const ROUTES= districts.map(r=>{const route={...r,start:offset};offset+=r.length;return route;});export const ROUTE_LENGTH=offset;
export function routeAt(distance){const d=((distance%ROUTE_LENGTH)+ROUTE_LENGTH)%ROUTE_LENGTH;const index=ROUTES.findIndex(r=>d>=r.start&&d<r.start+r.length);const route=ROUTES[index];return {...route,index,progress:(d-route.start)/route.length,remaining:Math.ceil(route.start+route.length-d),lap:Math.floor(Math.max(0,distance)/ROUTE_LENGTH),next:ROUTES[(index+1)%ROUTES.length].name};}

// Open squares break up long streets without advancing the district.
export function environmentAt(distance){const route=routeAt(distance);const local=route.progress*route.length;return route.kind==='street'&&local%450>=324?{...route,kind:'plaza'}:route;}
