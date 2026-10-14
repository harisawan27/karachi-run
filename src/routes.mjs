const districts = [
  {id:'saddar',name:'Saddar Bazaar',urdu:'صدر بازار',length:180,kind:'street',subtitle:'The heart of the city'},
  {id:'empress',name:'Empress Market',urdu:'ایمپریس مارکیٹ',length:126,kind:'plaza',subtitle:'Through the old city',landmark:60},
  {id:'mazar',name:'Mazar-e-Quaid',urdu:'مزار قائد',length:180,kind:'garden',subtitle:'A little room to breathe',landmark:80},
  {id:'arcade',name:'Old Town Streets',urdu:'پرانا شہر',length:108,kind:'street',subtitle:'Back into the bustle'},
  {id:'tower',name:'Merewether Tower',urdu:'میری ویدر ٹاور',length:144,kind:'plaza',subtitle:'Meet you at Tower',landmark:65},
  {id:'clifton',name:'Clifton Boulevard',urdu:'کلفٹن',length:108,kind:'garden',subtitle:'Follow the sea breeze'},
  {id:'talwar',name:'Teen Talwar',urdu:'تین تلوار',length:144,kind:'garden',subtitle:'Three swords. One city.',landmark:65},
  {id:'seaview',name:'Sea View',urdu:'سی ویو',length:270,kind:'coast',subtitle:'The Arabian Sea is calling',landmark:60},
];
let offset=0;export const ROUTES= districts.map(r=>{const route={...r,start:offset};offset+=r.length;return route;});export const ROUTE_LENGTH=offset;
export function routeAt(distance){const d=((distance%ROUTE_LENGTH)+ROUTE_LENGTH)%ROUTE_LENGTH;const index=ROUTES.findIndex(r=>d>=r.start&&d<r.start+r.length);const route=ROUTES[index];return {...route,index,progress:(d-route.start)/route.length,remaining:Math.ceil(route.start+route.length-d),lap:Math.floor(Math.max(0,distance)/ROUTE_LENGTH),next:ROUTES[(index+1)%ROUTES.length].name};}
