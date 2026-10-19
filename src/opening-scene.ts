import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {CATCH_CYCLE,THROW_AT,WALL_AFTER,CATCH_AFTER,WARDEN_AFTER,ESCAPE_AFTER,SHUTTER,catchPhase,normalBall,badBall,ease} from './shutter-opening.mjs';
import type {KarachiWorld} from './world';

/** Dedicated, pooled opening set. Nothing here is a track collider or a gameplay pickup. */
export class OpeningScene {
  root:TransformNode;ball:Mesh;private shutter:TransformNode;private bowl:TransformNode;private spoon:TransformNode;
  private released=new Vector3();private releaseId=-Infinity;private frozenBowl=new Vector3();private lastAction=-Infinity;
  constructor(private w:KarachiWorld){
    const root=this.root=new TransformNode('shutter catch opening',w.scene);
    // A proper closed shop at the start of the street; the face points towards the road.
    w.box('closed shop masonry',.46,4.7,6.5,-7.56,2.40,1.35,'#c6b496',root);
    w.box('shop fascia trim',.55,.72,6.6,-7.38,4.20,1.35,'#245d54',root);
    w.sign(5,5.9,.65,-7.08,4.19,1.35,-Math.PI/2,root);
    this.shutter=new TransformNode('corrugated shutter',w.scene);this.shutter.parent=root;this.shutter.position.set(-7.16,0,1.35);
    w.box('steel shutter backing',.12,3.37,4.72,0,1.73,0,'#527773',this.shutter);
    for(let i=0;i<22;i++)w.box('horizontal rolled steel slat',.16,.045,4.70,.032,.14+i*.15,0,i%2?'#648e87':'#41675f',this.shutter);
    for(const z of [-2.42,2.42])w.box('shutter side guide',.23,3.65,.12,.03,1.85,z,'#284e47',this.shutter);
    w.box('shutter bottom rail',.21,.13,4.72,.03,.13,0,'#284e47',this.shutter);
    w.box('raised shutter latch',.11,.11,.32,.11,SHUTTER.y,0,'#d2b16e',this.shutter);
    const chalk=MeshBuilder.CreateTorus('chalk practice target',{diameter:.80,thickness:.032,tessellation:32},w.scene);chalk.parent=root;chalk.position.set(-7.025,1.90,1.35);chalk.rotation.z=Math.PI/2;chalk.material=w.mat('chalk','#eadfc5');
    for(const z of [.96,1.35,1.74])w.box('chalk wicket',.012,.83,.035,-7.025,.64,z,'#eadfc5',root);
    w.box('chalk wicket bail',.012,.035,.84,-7.024,1.07,1.35,'#eadfc5',root);
    // A curb and threshold connect the set to the existing street without putting props in lanes.
    w.box('shop threshold',1.18,.13,5.1,-7.20,.07,1.35,'#9b9d8a',root);
    // Join the shutter to the street, without a detached stage or empty lot.
    const frontage=new TransformNode('joined opening street frontage',w.scene);frontage.parent=root;
    w.box('first shop building',6.1,9,6.5,-10.5,4.72,1.35,'#c6b496',frontage);
    w.box('first shop cornice',6.4,.26,6.6,-10.5,9.35,1.35,'#f0dbc1',frontage);
    for(const y of [5.75,8])for(const z of [-.60,1.35,3.30]){
      w.box('first shop window frame',.17,1.48,1.26,-7.37,y,z,'#fff2d7',frontage);
      w.box('first shop window glass',.20,1.20,1.01,-7.25,y,z,'#477984',frontage);
    }
    for(const z of [9,18,27])w.building(frontage,-1,z,9+z/9);
    for(const z of [0,9,18,27])w.building(frontage,1,z,12+z/9);
    w.merge(frontage);
    this.ball=MeshBuilder.CreateSphere('Haris tape ball',{diameter:.20,segments:16},w.scene);this.ball.parent=root;this.ball.material=w.mat('tape ball','#e8ee63');
    const seam=MeshBuilder.CreateTorus('tape ball seam',{diameter:.202,thickness:.016,tessellation:20},w.scene);seam.parent=this.ball;seam.material=w.mat('ball tape','#e46b49');seam.rotation.z=.8;
    this.bowl=new TransformNode('warden biryani bowl',w.scene);
    const bowl=MeshBuilder.CreateCylinder('steel biryani plate',{height:.10,diameterTop:.40,diameterBottom:.28,tessellation:20},w.scene);bowl.parent=this.bowl;bowl.material=w.mat('bowl metal','#d4d8c6');
    const rice=MeshBuilder.CreateSphere('warden biryani rice',{diameter:.33,segments:12},w.scene);rice.scaling.y=.30;rice.position.y=.06;rice.parent=this.bowl;rice.material=w.mat('saffron rice','#f1c779');
    for(let i=0;i<6;i++){const garnish=w.ball('biryani garnish',.04,Math.cos(i*2.4)*.09,.10,Math.sin(i*2.4)*.09,i%2?'#559359':'#b66c34',this.bowl);garnish.scaling.z=1.3;}
    this.spoon=new TransformNode('warden paused spoon',w.scene);
    const handle=w.cyl('spoon handle',.018,.20,0,0,0,'#d9dfca',this.spoon,undefined,8);
    const tip=w.ball('spoon bowl',.07,0,.12,0,'#d9dfca',this.spoon);tip.scaling.set(.60,1,.20);
    w.merge(this.shutter);w.merge(this.bowl);w.merge(this.spoon);
    this.root.setEnabled(false);this.bowl.setEnabled(false);this.spoon.setEnabled(false);
  }
  reset(){this.releaseId=-Infinity;this.lastAction=-Infinity;}
  update(){
    const w=this.w,visible=w.mode==='menu'||w.mode==='intro';this.root.setEnabled(visible);
    const action=w.mode==='intro'?w.openingElapsed-w.openingDelay:-Infinity;
    const reveal=w.mode==='intro'&&action>=WALL_AFTER+.05,food=reveal&&action<ESCAPE_AFTER+.30;
    this.bowl.setEnabled(food);this.spoon.setEnabled(food);
    if(!visible)return;
    const hand=w.runner.handPoint('right'),phase=catchPhase(w.lobbyClock),age=phase-THROW_AT;
    const id=Math.floor(w.lobbyClock/CATCH_CYCLE),bad=w.mode==='intro'&&action>=0;
    if(id!==this.releaseId&&age>=0&&(!bad||action<.10)){this.releaseId=id;this.released.copyFrom(hand);}
    if(!bad){
      const point=age>=0&&age<CATCH_AFTER?normalBall(this.released,hand,age):hand;this.ball.position.copyFromFloats(point.x,point.y,point.z);
    }else{
      const bowlHand=w.pursuer.handPoint('left');bowlHand.y+=.055;
      if(action<WARDEN_AFTER||this.lastAction<0)this.frozenBowl.copyFrom(bowlHand);
      const point=badBall(this.released,this.frozenBowl,action);this.ball.position.copyFromFloats(point.x,point.y,point.z);
    }
    this.ball.rotation.set(w.lobbyClock*6,w.lobbyClock*4,0);
    const impactAge=bad?action-WALL_AFTER:age-WALL_AFTER;
    this.shutter.rotation.y=impactAge>=0&&impactAge<.28?Math.sin(impactAge*70)*.012*(1-impactAge/.28):0;
    if(food){
      const handLeft=w.pursuer.handPoint('left'),handRight=w.pursuer.handPoint('right');
      // Keep the plate supported by the palm; settle the spoon into it after the surprise.
      this.bowl.position.copyFrom(handLeft).addInPlace(new Vector3(0,.055,0));
      const surprise=action-WARDEN_AFTER;this.bowl.rotation.z=surprise>=0&&surprise<.28?Math.sin(surprise*28)*.12*(1-surprise/.28):0;
      const spoonDown=ease((action-WARDEN_AFTER)/.20);
      this.spoon.position.copyFrom(Vector3.Lerp(handRight,this.bowl.position.add(new Vector3(.06,.07,0)),spoonDown));
      this.spoon.rotation.set(-.6,0,spoonDown*1.2);
    }
    this.lastAction=action;
  }
}
