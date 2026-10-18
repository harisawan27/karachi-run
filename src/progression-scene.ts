import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import type {KarachiWorld} from './world';
export class ProgressionScene {
 letter:TransformNode;active=false;index=-1;day='';private baseY=1.45;private letterTexture:DynamicTexture;private banner:TransformNode;private bannerTexture:DynamicTexture;private bannerActive=false;
 constructor(private w:KarachiWorld){
  this.letter=new TransformNode('daily Karachi letter',w.scene);
  const ring=MeshBuilder.CreateTorus('gold letter rim',{diameter:1.55,thickness:.13,tessellation:24},w.scene);ring.rotation.x=Math.PI/2;ring.parent=this.letter;ring.material=w.mat('letter gold','#ffe192');
  const face=MeshBuilder.CreatePlane('readable daily letter',{width:1.35,height:1.35},w.scene);face.parent=this.letter;face.position.z=-.02;
  this.letterTexture=new DynamicTexture('daily letter artwork',256,w.scene,false);const material=new StandardMaterial('daily hunt gold',w.scene);material.diffuseTexture=this.letterTexture;material.emissiveColor=new Color3(.25,.21,.08);face.material=material;
  this.letter.setEnabled(false);
  this.banner=new TransformNode('personal record billboard',w.scene);const board=MeshBuilder.CreatePlane('record banner',{width:12.5,height:2.3},w.scene);board.parent=this.banner;
  this.bannerTexture=new DynamicTexture('personal record lettering',{width:1024,height:256},w.scene,false);const bannerMaterial=new StandardMaterial('record banner material',w.scene);bannerMaterial.diffuseTexture=this.bannerTexture;bannerMaterial.emissiveColor=new Color3(.2,.2,.12);board.material=bannerMaterial;this.banner.setEnabled(false);
 }
 reset(){this.active=false;this.letter.setEnabled(false);this.bannerActive=false;this.banner.setEnabled(false);}
 spawn(index:number,day:string,x:number,z:number){this.index=index;this.day=day;this.active=true;this.letter.position.set(x,this.baseY,z);this.letter.setEnabled(true);const c=this.letterTexture.getContext() as unknown as CanvasRenderingContext2D;c.fillStyle='#efbb45';c.fillRect(0,0,256,256);c.strokeStyle='#fff1b9';c.lineWidth=9;c.strokeRect(15,15,226,226);c.fillStyle='#17453b';c.font='900 170px "Barlow Condensed", sans-serif';c.textAlign='center';c.fillText('KARACHI'[index],128,191);this.letterTexture.update();}
 update(dt:number,delta:number,x:number,y:number,time:number){
  let collected=-1;if(this.active){const previous=this.letter.position.z;this.letter.position.z-=delta;this.letter.position.y=this.baseY+Math.sin(time*3)*.12;this.letter.rotation.y=Math.sin(time*2)*.12;
   if(this.letter.position.z<1.4&&previous>-1.4&&Math.abs(x-this.letter.position.x)<1.08&&Math.abs(y+1.15-this.letter.position.y)<1.35){collected=this.index;this.active=false;this.letter.setEnabled(false);}
   else if(this.letter.position.z< -5){this.active=false;this.letter.setEnabled(false);}
  }
  if(this.bannerActive){this.banner.position.z-=delta;if(this.banner.position.z< -3){this.bannerActive=false;this.banner.setEnabled(false);}}
  return collected;
 }
 milestone(title:string,subtitle:string){const c=this.bannerTexture.getContext() as unknown as CanvasRenderingContext2D;c.fillStyle='#143f35';c.fillRect(0,0,1024,256);c.fillStyle='#ffd46b';c.fillRect(0,0,1024,12);c.fillRect(0,244,1024,12);c.textAlign='center';c.font='900 83px "Barlow Condensed", sans-serif';c.fillText(title,512,113);c.fillStyle='#fff4d4';c.font='700 40px sans-serif';c.fillText(subtitle,512,188);this.bannerTexture.update();this.banner.position.set(0,9,55);this.banner.setEnabled(true);this.bannerActive=true;}
}
