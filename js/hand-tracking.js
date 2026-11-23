/** WebXR native hand input; does not read controllers. */
const JOINTS={thumb:'thumb-tip',index:'index-finger-tip',ring:'ring-finger-tip',pinky:'pinky-finger-tip',indexBase:'index-finger-metacarpal',pinkyBase:'pinky-finger-metacarpal'};
export class XRHandTracker{
 constructor(){this.reset();}
 reset(){this.seenHandSource=false;this.seenValidPose=false;}
 read(frame,referenceSpace,session){
  if(!frame||!referenceSpace||!session)return [];
  const hands=[];
  for(const source of session.inputSources){
   if(!source.hand)continue;
   this.seenHandSource=true;
   const joints={};let complete=true;
   for(const [name,jointName] of Object.entries(JOINTS)){
    const space=source.hand.get(jointName);const pose=space?frame.getJointPose(space,referenceSpace):null;
    if(!pose){complete=false;break;}
    const {x,y,z}=pose.transform.position;joints[name]={x,y,z};
   }
   if(!complete)continue;
   this.seenValidPose=true;
   const side=source.handedness==='left'?'Left':source.handedness==='right'?'Right':'Unknown';
   hands.push({id:'xr-'+(source.handedness||'unknown'),label:side+' (XR)',joints});
  }
  return hands;
 }
}