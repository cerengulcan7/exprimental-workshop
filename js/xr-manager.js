/** Session lifecycle with local-floor -> local fallback. */
export class XRSessionManager{
 constructor(renderer,{onStart=()=>{},onEnd=()=>{},onError=()=>{}}={}){this.renderer=renderer;this.onStart=onStart;this.onEnd=onEnd;this.onError=onError;this.session=null;this.referenceType='local-floor';this.connecting=false;this.handleSessionEnd=this.handleSessionEnd.bind(this);}
 async supported(){if(!window.isSecureContext||!navigator.xr)return false;try{return await navigator.xr.isSessionSupported('immersive-vr');}catch{return false;}}
 async enter(){
  if(this.session||this.connecting)return;
  if(!navigator.xr||!window.isSecureContext)throw new Error('WebXR requires HTTPS and a compatible browser.');
  this.connecting=true;let session=null;
  try{
   session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['hand-tracking','local-floor']});
   try{await session.requestReferenceSpace('local-floor');this.referenceType='local-floor';}catch{this.referenceType='local';}
   this.renderer.xr.setReferenceSpaceType(this.referenceType);
   await this.renderer.xr.setSession(session);
   this.session=session;session.addEventListener('end',this.handleSessionEnd,{once:true});
   this.onStart({session,referenceType:this.referenceType});
  }catch(error){this.onError(error);if(session){try{await session.end();}catch{}}throw error;}
  finally{this.connecting=false;}
 }
 async exit(){if(this.session)await this.session.end();}
 handleSessionEnd(){this.session?.removeEventListener('end',this.handleSessionEnd);this.session=null;this.onEnd();}
 getReferenceSpace(){return this.renderer.xr.getReferenceSpace();}
 getViewerPose(frame){const space=this.getReferenceSpace();if(!frame||!space)return null;try{return frame.getViewerPose(space);}catch{return null;}}
}