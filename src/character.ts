import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { KarachiWorld } from './world';
import { sculpt } from './sculpt';

export class Character {
  root:TransformNode;body:TransformNode;legs:TransformNode[]=[];knees:TransformNode[]=[];arms:TransformNode[]=[];elbows:TransformNode[]=[];shadow:Mesh;phase=0;
  constructor(w:KarachiWorld,police:boolean){
    this.root=new TransformNode(police?'Asim Munir articulated character':'Imran Khan articulated character',w.scene);this.body=new TransformNode('anatomical body',w.scene);this.body.parent=this.root;
    const cloth=police?'#a28d62':'#eee9dc',fold=police?'#8b7955':'#d8d2c4',skin=police?'#b98765':'#c48d69',hair=police?'#302c28':'#454039';
    const oval=(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,parent=this.body)=>{const m=MeshBuilder.CreateSphere(name,{diameter:1,segments:24},w.scene);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);m.material=w.mat(color);m.parent=parent;return m;};
    const torso=sculpt(w,'tailored shoulders chest and waist',[[1.25,.32,.20],[1.36,.35,.23],[1.6,.31,.205],[1.87,.38,.23],[2.08,.46,.24],[2.18,.39,.205],[2.24,.20,.15]],cloth,this.body);
    if(!police){
      sculpt(w,'flowing kameez skirt',[[.91,.38,.23],[1.03,.41,.235],[1.2,.39,.225],[1.4,.34,.22],[1.62,.31,.215]],cloth,this.body);
      sculpt(w,'fitted green waistcoat',[[1.38,.35,.24],[1.48,.335,.245],[1.75,.34,.24],[2.04,.445,.255],[2.16,.37,.22],[2.2,.20,.15]],'#315b43',this.body);
      for(const side of [-1,1]){const lapel=oval('waistcoat collar',side*.10,2.04,.229,.12,.33,.075,'#224b36');lapel.rotation.z=side*.25;for(let i=0;i<3;i++)oval('kameez cloth fold',side*(.16+i*.075),1.09,.205,.045,.30,.035,fold);}
      for(let i=0;i<5;i++)oval('waistcoat button',0,1.47+i*.12,.251,.037,.037,.023,'#b6a075');
    }else{
      sculpt(w,'leather belt',[[1.30,.345,.237],[1.39,.345,.237]],'#453d2e',this.body);w.box('brass buckle',.11,.08,.035,0,1.345,.245,'#c4ad67',this.body);
      for(const side of [-1,1]){oval('shirt pocket',side*.20,1.92,.23,.23,.19,.047,fold);oval('pocket flap',side*.20,2,.249,.24,.057,.034,cloth);const ep=oval('shoulder rank',side*.40,2.16,.01,.21,.055,.30,'#c9b681');ep.rotation.z=-side*.14;oval('red collar tabs',side*.10,2.16,.16,.095,.14,.038,'#933f35');}
      for(let i=0;i<5;i++)w.box('medal ribbon',.036,.049,.026,-.28+i*.04,2.055,.253,['#ae3932','#577963','#cba942','#51859b','#b79655'][i],this.body);
    }
    sculpt(w,'neck',[[2.19,.135,.125],[2.36,.14,.12]],skin,this.body);
    sculpt(w,'sculpted jaw cheekbones and forehead',[[2.33,.085,.085,0,.055],[2.37,.13,.12,0,.045],[2.43,police?.175:.155,.16],[2.53,.193,.175],[2.64,.19,.175],[2.74,.175,.155],[2.8,.13,.115],[2.83,.025,.025]],skin,this.body);
    oval('chin',0,2.38,.137,.19,.10,.092,skin);oval('nose bridge',0,2.565,.168,.068,.145,.075,skin);oval('nose tip',0,2.50,.222,.085,.069,.092,skin);
    for(const side of [-1,1]){
      oval('ear',side*.19,2.56,-.012,.073,.136,.064,skin);oval('ear concha',side*.215,2.56,.01,.022,.073,.03,'#a56e53');
      oval('cheekbone',side*.111,2.52,.131,.14,.105,.073,skin);
      oval('eye socket',side*.081,2.63,.153,.101,.061,.044,'#99694f');oval('eye white',side*.081,2.634,.174,.076,.028,.025,'#e5dfd1');oval('iris',side*.08,2.635,.187,.026,.029,.015,'#3a332b');
      const brow=oval('expressive brow',side*.081,2.672,.165,.104,.027,.037,hair);brow.rotation.z=side*(police?-.10:.10);
    }
    oval('upper lip',0,2.435,.165,.112,.020,.034,'#946047');oval('lower lip',0,2.418,.163,.099,.024,.028,'#b77d64');
    oval('sculpted hair cap',0,2.774,-.025,.385,.20,.35,hair);oval('hair at nape',0,2.64,-.148,.32,.24,.069,hair);
    if(police){
      for(const side of [-1,1]){const moustache=oval('thick moustache',side*.048,2.463,.186,.112,.044,.04,hair);moustache.rotation.z=side*.13;}
      oval('peaked officer cap',0,2.854,-.005,.47,.15,.40,'#655f43');sculpt(w,'cap band',[[2.795,.21,.19],[2.838,.215,.19]],'#3b3b2a',this.body);oval('curved cap visor',0,2.805,.18,.38,.042,.22,'#302f24');oval('cap insignia',0,2.875,.186,.07,.084,.02,'#c6ad58');
    }else{
      for(let i=0;i<7;i++){const lock=oval('swept back hair',-.15+i*.05,2.80+Math.sin(i*.48)*.027,.018-i*.012,.10,.12,.29,hair);lock.rotation.z=.25;lock.rotation.x=-.25;}
      for(const side of [-1,1])oval('silver temple',side*.179,2.715,-.01,.045,.16,.19,'#91897c');
    }
    for(const side of [-1,1]){
      const hip=new TransformNode('hip joint',w.scene);hip.parent=this.body;hip.position.set(side*.20,1.36,0);this.legs.push(hip);
      sculpt(w,'shaped trouser thigh',[[-.65,.145,.15],[-.53,.18,.17],[-.27,police?.195:.215,.19],[-.04,.18,.18],[.03,.14,.145]],cloth,hip);
      const knee=new TransformNode('bending knee',w.scene);knee.parent=hip;knee.position.y=-.63;this.knees.push(knee);oval('covered knee',0,0,0,.29,.29,.29,cloth,knee);
      sculpt(w,'tapered shalwar calf',[[-.55,.085,.095],[-.49,.12,.125],[-.32,.155,.145],[-.1,.15,.14],[.04,.14,.14]],cloth,knee);
      oval('rounded leather shoe',0,-.62,.075,.245,.18,.43,'#453b30',knee);oval('shoe sole',0,-.695,.078,.25,.047,.435,'#292b28',knee);
      const shoulder=new TransformNode('shoulder joint',w.scene);shoulder.parent=this.body;shoulder.position.set(side*.425,2.105,0);this.arms.push(shoulder);
      oval('rounded sleeve shoulder',0,-.085,0,.29,.33,.29,cloth,shoulder);sculpt(w,'upper sleeve',[[-.40,.103,.105],[-.31,.12,.115],[-.08,.145,.14]],cloth,shoulder);
      const elbow=new TransformNode('bending elbow',w.scene);elbow.parent=shoulder;elbow.position.y=-.40;this.elbows.push(elbow);oval('elbow cloth',0,0,0,.215,.22,.22,cloth,elbow);
      sculpt(w,'forearm sleeve',[[-.36,.078,.083],[-.29,.095,.10],[-.04,.107,.11]],cloth,elbow);oval('shirt cuff',0,-.345,0,.18,.082,.18,fold,elbow);
      oval('human hand',0,-.435,.012,.145,.20,.10,skin,elbow);oval('thumb',-side*.072,-.41,.035,.06,.105,.065,skin,elbow);
      for(let i=0;i<4;i++)oval('curled fingers',-.045+i*.029,-.50,.041,.031,.078,.043,skin,elbow);
    }
    // Merge only rigid parts of each joint; keep knee and elbow transforms articulated.
    this.shadow=MeshBuilder.CreateDisc('ground contact shadow',{radius:.58,tessellation:32},w.scene);this.shadow.rotation.x=Math.PI/2;this.shadow.position.y=.019;this.shadow.scaling.y=.7;this.shadow.material=w.mat('shadow','#3d5050');this.shadow.visibility=.36;
  }
  animate(t:number,running:boolean,y:number,slide:boolean,speed=14,dt=.016){
    if(running)this.phase+=dt*(12+Math.max(0,speed-14)*.28);const cycle=this.phase;
    this.root.position.y=y;this.body.position.y=running?Math.abs(Math.sin(cycle))*.055:Math.sin(t*2)*.018;this.body.rotation.x=slide?-1.05:running?.13:0;this.body.scaling.y=slide?.56:1;
    this.body.rotation.z=running&&!slide?Math.sin(cycle)*.028:0;this.body.rotation.y=running?Math.sin(cycle)*.045:0;
    this.legs.forEach((l,i)=>{const p=cycle+i*Math.PI;l.rotation.x=running&&!slide?Math.sin(p)*.69:slide?(i===0?-1.05:.5):0;this.knees[i].rotation.x=running&&!slide?Math.max(0,-Math.sin(p))*.98+.09:slide?1.0:.045;});
    this.arms.forEach((a,i)=>{a.rotation.x=running?Math.sin(cycle+(i+1)*Math.PI)*.59:-.07;a.rotation.z=i===0?.10:-.10;this.elbows[i].rotation.x=running?-1.15-Math.sin(cycle+i*Math.PI)*.15:-.13;});
    this.shadow.position.x=this.root.position.x;this.shadow.position.z=this.root.position.z;this.shadow.scaling.x=1-y*.12;this.shadow.visibility=Math.max(.12,.36-y*.08);
  }
}
