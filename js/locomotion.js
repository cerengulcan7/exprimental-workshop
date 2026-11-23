import * as THREE from 'three';
import {ACTIONS} from './gestures.js';
const up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(0,0,-1),q=new THREE.Quaternion(),facing=new THREE.Vector3(),before=new THREE.Vector3(),after=new THREE.Vector3(),offset=new THREE.Vector3();
export class Locomotion{
 constructor(rig,camera,{startX=0,startZ=8,walkSpeed=1.2,turnSpeed=0.9}={}){this.rig=rig;this.camera=camera;this.spawn=new THREE.Vector3(startX,0,startZ);this.walkSpeed=walkSpeed;this.turnSpeed=turnSpeed;this.yaw=0;this.localReferenceY=0;this.lastMetrics={walk:0,rotation:0};this.reset();}
 setLocalReferenceFallback(local){this.localReferenceY=local?1.6:0;this.rig.position.y=this.localReferenceY;}
 reset(viewerPose=null){this.yaw=0;this.rig.rotation.set(0,0,0);const p=viewerPose?.transform?.position;this.rig.position.set(this.spawn.x-(p?.x||0),this.localReferenceY,this.spawn.z-(p?.z||0));this.lastMetrics={walk:0,rotation:0};}
 update(action,dt,pose=null,desktopDirection=null){
  const step=Math.min(.05,Math.max(0,dt));const p=pose?.transform?.position,o=pose?.transform?.orientation;
  const turn=action===ACTIONS.RIGHT?-this.turnSpeed:action===ACTIONS.LEFT?this.turnSpeed:0;
  if(turn&&step){const angle=turn*step;if(p){offset.set(p.x,0,p.z);before.copy(offset).applyAxisAngle(up,this.yaw);after.copy(offset).applyAxisAngle(up,this.yaw+angle);this.rig.position.x+=before.x-after.x;this.rig.position.z+=before.z-after.z;}this.yaw+=angle;this.rig.rotation.y=this.yaw;}
  const walk=action===ACTIONS.WALK?this.walkSpeed:0;
  if(walk&&step){
   if(o){q.set(o.x,o.y,o.z,o.w).premultiply(this.rig.quaternion);facing.copy(forward).applyQuaternion(q);}
   else if(desktopDirection)facing.copy(desktopDirection);else this.camera.getWorldDirection(facing);
   facing.y=0;if(facing.lengthSq()>1e-6)this.rig.position.addScaledVector(facing.normalize(),walk*step);
  }
  return this.lastMetrics={walk,rotation:turn};
 }
}