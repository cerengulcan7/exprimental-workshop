import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export function createArchitecturalScene(scene){
 const group=new THREE.Group();scene.add(group);
 const materials={floor:new THREE.MeshStandardMaterial({color:0xc2c3b9,roughness:.9}),wall:new THREE.MeshStandardMaterial({color:0xdad6c8,roughness:.9}),wood:new THREE.MeshStandardMaterial({color:0x9b6d49}),accent:new THREE.MeshStandardMaterial({color:0x398a7b}),glass:new THREE.MeshStandardMaterial({color:0xa0cde1,transparent:true,opacity:.32,metalness:.2})};
 const box=(w,h,d,x,y,z,mat=materials.wall)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
 box(40,.16,40,0,-.08,0,materials.floor);
 const grid=new THREE.GridHelper(40,40,0x8b9a9b,0xb4b9b8);grid.position.y=.005;group.add(grid);
 // Full-size architectural floor plan. Door openings are explicit gaps.
 box(.18,3.1,24,-9,1.55,0);
 box(.18,3.1,24,9,1.55,0);
 box(18,.18,3,0,1.55,-12); // back wall with horizontal guides
 box(7,3.1,.2,-5.5,1.55,-10);
 box(7,3.1,.2,5.5,1.55,-10);
 box(4,3.1,.18,-7,1.55,4);
 box(4,3.1,.18,7,1.55,4);
 box(.18,3.1,6,-2,1.55,-4);
 box(.18,3.1,6,3,1.55,-4);
 box(2,.04,1,0,.02,3,materials.accent); // walking arrow guide
 for(let i=0;i<5;i++){box(.9,.35+i*.35,.9,-5+i*2.3,.175+i*.175,-2,materials.wood);}
 for(let i=0;i<3;i++){box(1,.1,1,-4+i*3,.05,7,materials.accent);}
 const door=box(1.7,2.1,.045,0,1.05,-10,materials.glass);door.name='Sample Door';
 const axes=new THREE.AxesHelper(2);axes.position.set(0,.02,0);group.add(axes);
 const loader=new GLTFLoader();const loaded=[];
 async function loadArchitecturalModel(url,{units='real'}={}){
  const gltf=await loader.loadAsync(url);const root=gltf.scene;
  // Asset in real metres: keep 1:1 within XR metre scene. Miniature asset:
  // inverse its 1/70 authoring scale to get life-size visitor perspective.
  root.scale.setScalar(units==='miniature'?70:1);
  scene.add(root);loaded.push(root);return root;
 }
 function dispose(){for(const root of loaded){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});}group.traverse(o=>{o.geometry?.dispose();});Object.values(materials).forEach(m=>m.dispose());scene.remove(group);}
 return {loadArchitecturalModel,dispose};
}