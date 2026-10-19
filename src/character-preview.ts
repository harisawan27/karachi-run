import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { ModelCharacter } from './model-character';
import type { KarachiWorld } from './world';
import '@babylonjs/loaders/glTF';

/** Locker viewer. Haris keeps his authored idle rig; static scans stay untouched. */
export class CharacterPreview {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private current: ModelCharacter | TransformNode | null = null;
  private generation = 0;
  private materials = new Map<string, StandardMaterial>();
  private readonly previewWorld: KarachiWorld;
  private readonly cameraHome = { alpha: -Math.PI / 2, beta: 1.22, radius: 4.5 };

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { antialias: true, stencil: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    this.engine.setHardwareScalingLevel(Math.max(1.5, window.devicePixelRatio / 1.5));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(.035, .18, .16, 1);
    this.scene.ambientColor = new Color3(.18, .2, .17);
    this.camera = new ArcRotateCamera('locker camera', this.cameraHome.alpha, this.cameraHome.beta, this.cameraHome.radius, new Vector3(0, 1.36, 0), this.scene);
    this.camera.minZ=.03;
    this.camera.lowerRadiusLimit = 3.5;
    this.camera.upperRadiusLimit = 5.8;
    this.camera.lowerBetaLimit = .95;
    this.camera.upperBetaLimit = 1.55;
    this.camera.wheelPrecision = 80;
    this.camera.attachControl(canvas, true);
    new HemisphericLight('locker softbox', new Vector3(-.2, 1, -.2), this.scene).intensity = 1.15;
    const key = new DirectionalLight('locker key light', new Vector3(-.45, -1, .55), this.scene);
    key.intensity = 1.5;
    key.diffuse = new Color3(1, .82, .58);
    const previewWorld = {
      scene: this.scene,
      mode: 'menu',
      airborne: false,
      mat: (name: string, color: string) => {
        const key = `${name}:${color}`;
        let material = this.materials.get(key);
        if (!material) {
          material = new StandardMaterial(key, this.scene);
          material.diffuseColor = Color3.FromHexString(color);
          this.materials.set(key, material);
        }
        return material;
      },
    };
    this.previewWorld = previewWorld as unknown as KarachiWorld;
    this.engine.runRenderLoop(() => {
      if (!this.scene.isDisposed) this.scene.render();
    });
    window.addEventListener('resize', this.resize);
  }

  private resize = () => this.engine.resize();

  private resetCamera() {
    this.camera.alpha = this.cameraHome.alpha;
    this.camera.beta = this.cameraHome.beta;
    this.camera.radius = this.cameraHome.radius;
    this.camera.setTarget(new Vector3(0, 1.36, 0));
    this.camera.inertialAlphaOffset = 0;
    this.camera.inertialBetaOffset = 0;
    this.camera.inertialRadiusOffset = 0;
    this.camera.inertialPanningX = 0;
    this.camera.inertialPanningY = 0;
  }

  async show(source: string) {
    const generation = ++this.generation;
    if (this.current instanceof ModelCharacter) this.current.dispose();
    else this.current?.dispose(false, true);
    this.current = null;
    this.resetCamera();

    if (source === 'pakistani_boy.glb') {
      const model = new ModelCharacter(this.previewWorld, false, source);
      this.current = model;
      await model.ready;
      if (generation !== this.generation || this.scene.isDisposed) { model.dispose(); return; }
      model.root.rotation.y = Math.PI;
      model.root.position.set(0, 0, 0);
      for(let i=0;i<30;i++)model.animate(0, false, 0, false, 14, 1 / 30, 0);
    } else {
      const imported = await SceneLoader.ImportMeshAsync(null, '/models/', source, this.scene);
      if (generation !== this.generation || this.scene.isDisposed) {
        for (const mesh of imported.meshes) mesh.dispose(false, true);
        for (const node of imported.transformNodes) node.dispose(false, true);
        return;
      }
      const root = new TransformNode(`${source} locker root`, this.scene);
      this.current = root;
      // Keep the scanned geometry and its authored rest pose intact. The scans
      // have no skeleton/animation clips, so auto-rigging them in the preview
      // was deforming the entire body into a broken statue.
      for (const mesh of imported.meshes) if (!mesh.parent) mesh.parent = root;
      for (const node of imported.transformNodes) if (!node.parent) node.parent = root;
      const meshes = imported.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
      const min = new Vector3(Infinity, Infinity, Infinity);
      const max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const mesh of meshes) {
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getBoundingInfo().boundingBox;
        min.minimizeInPlace(bounds.minimumWorld);
        max.maximizeInPlace(bounds.maximumWorld);
      }
      const height = max.y - min.y;
      if (Number.isFinite(height) && height > 0) {
        const scale = 2.86 / height;
        root.scaling.setAll(scale);
        root.position.set(-(min.x + max.x) * .5 * scale, -min.y * scale, -(min.z + max.z) * .5 * scale);
      }
      // The scans face +Z; the locker camera is at -Z, so turn them around.
      root.rotation.y = Math.PI;
      for (const mesh of meshes) { mesh.alwaysSelectAsActiveMesh = true; mesh.isPickable = false; }
    }
    await this.scene.whenReadyAsync();
    if(generation!==this.generation||this.scene.isDisposed)return;
    this.resetCamera();
    this.scene.render();
  }

  captureFacePortrait() {
    if (!this.current || this.scene.isDisposed) return '';
    const target=this.camera.target.clone(),alpha=this.camera.alpha,beta=this.camera.beta,radius=this.camera.radius,lower=this.camera.lowerRadiusLimit,upper=this.camera.upperRadiusLimit;
    this.camera.lowerRadiusLimit=null;this.camera.upperRadiusLimit=null;
    this.camera.alpha=-Math.PI/2;this.camera.beta=Math.PI/2;
    this.camera.setTarget(new Vector3(0,2.57,0));this.camera.radius=.82;
    this.scene.render();
    const portrait=document.createElement('canvas');portrait.width=portrait.height=256;
    const context=portrait.getContext('2d');
    if(context){const size=Math.min(this.canvas.width,this.canvas.height);context.drawImage(this.canvas,(this.canvas.width-size)/2,(this.canvas.height-size)/2,size,size,0,0,256,256);}
    const result=portrait.toDataURL('image/webp',.94);
    this.camera.lowerRadiusLimit=lower;this.camera.upperRadiusLimit=upper;this.camera.alpha=alpha;this.camera.beta=beta;this.camera.radius=radius;this.camera.setTarget(target);this.scene.render();
    return result;
  }

  dispose() {
    ++this.generation;
    window.removeEventListener('resize', this.resize);
    if (this.current instanceof ModelCharacter) this.current.dispose();
    else this.current?.dispose(false, true);
    this.current = null;
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
    this.materials.clear();
  }
}





