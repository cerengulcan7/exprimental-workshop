import * as THREE from 'three';
export class XRHUD {
 constructor(scene){
  this.canvas=document.createElement('canvas');this.canvas.width=512;this.canvas.height=128;
  this.ctx=this.canvas.getContext('2d');
  this.texture=new THREE.CanvasTexture(this.canvas);
  this.material=new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,side:THREE.DoubleSide});
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(.64,.16),this.material);this.mesh.renderOrder=999;
  this.mesh.visible=false;scene.add(this.mesh);
 }
 update(pose,rig,action,count){
  const p=pose.transform.position,o=pose.transform.orientation;
  const q=new THREE.Quaternion(o.x,o.y,o.z,o.w);
  const local=new THREE.Vector3(p.x,p.y,p.z).add(new THREE.Vector3(0,-.32,-.85).applyQuaternion(q));
  this.mesh.position.copy(local);this.mesh.applyMatrix4(new THREE.Matrix4().identity());this.mesh.position.applyQuaternion(rig.quaternion).add(rig.position);
  this.mesh.quaternion.copy(rig.quaternion).multiply(q);
  const c=this.ctx;c.clearRect(0,0,512,128);c.fillStyle='rgba(9,24,31,.78)';c.fillRect(0,0,512,128);c.font='bold 27px system-ui';c.textAlign='center';c.fillStyle='#8bffca';c.fillText(action.toUpperCase()+'  |  '+count+' HAND(S)',256,77);this.texture.needsUpdate=true;this.mesh.visible=true;
 }
 setVisible(flag){this.mesh.visible=flag;}
 dispose(){this.mesh.geometry.dispose();this.material.dispose();this.texture.dispose();this.mesh.parent?.remove(this.mesh);}
}