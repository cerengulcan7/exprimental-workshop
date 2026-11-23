/** MediaPipe webcam detector with joint contract identical to XR. */
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const KEYS={thumb:4,index:8,ring:16,pinky:20,indexBase:5,pinkyBase:17};
const CHAINS=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
export class DesktopHandTracker{
 constructor({video,canvas,preview,onHands=()=>{},onStatus=()=>{},onError=()=>{}}){
  Object.assign(this,{video,canvas,preview,onHands,onStatus,onError});this.ctx=canvas.getContext('2d');this.active=false;this.starting=false;this.generation=0;this.stream=null;this.landmarker=null;this.lastVideoTime=-1;this.lastInferenceMs=0;this.lastResultMs=0;
 }
 async start(){
  if(this.active||this.starting)return;this.starting=true;const token=++this.generation;
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext)throw new Error('Camera requires HTTPS and browser support.');
   this.onStatus('Requesting camera permission…');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
   if(this.generation!==token){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;stream.getTracks().forEach(t=>t.addEventListener('ended',()=>{if(this.generation===token)this.stop('Camera stream ended.');},{once:true}));
   this.video.srcObject=stream;await this.video.play();if(this.generation!==token)return;
   this.preview.hidden=false;this.canvas.width=this.video.videoWidth||640;this.canvas.height=this.video.videoHeight||480;
   this.onStatus('Loading MediaPipe…');
   const {FilesetResolver,HandLandmarker}=await import(CDN+'/vision_bundle.mjs');
   if(this.generation!==token)return;
   const vision=await FilesetResolver.forVisionTasks(CDN+'/wasm');
   if(this.generation!==token)return;
   const opt={baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5};
   try{this.landmarker=await HandLandmarker.createFromOptions(vision,opt);}catch(e){console.warn('GPU fallback',e);opt.baseOptions.delegate='CPU';this.landmarker=await HandLandmarker.createFromOptions(vision,opt);}
   if(this.generation!==token){this.landmarker.close();this.landmarker=null;return;}
   this.active=true;this.lastVideoTime=-1;this.lastResultMs=performance.now();this.onHands([]);this.onStatus('Camera on · show your hands');
  }catch(e){if(this.generation===token){this.stop('Camera unavailable');this.onError(e);}}
  finally{if(this.generation===token)this.starting=false;}
 }
 tick(nowMs){
  if(!this.active||!this.landmarker)return;
  if(!this.stream?.active||this.video.readyState<2){this.onHands([]);if(!this.stream?.active)this.stop('Camera ended');return;}
  if(nowMs-this.lastInferenceMs<41)return;
  if(this.video.currentTime===this.lastVideoTime){if(nowMs-this.lastResultMs>280)this.onHands([]);return;}
  this.lastInferenceMs=nowMs;this.lastVideoTime=this.video.currentTime;
  try{
   const result=this.landmarker.detectForVideo(this.video,nowMs);this.lastResultMs=nowMs;this.draw(result.landmarks||[]);
   const hands=(result.landmarks||[]).map((landmarks,i)=>{
    const wp=result.worldLandmarks?.[i];const useWorld=wp?.length===21;const src=useWorld?wp:landmarks;const joints={};
    for(const [key,j] of Object.entries(KEYS)){const v=src[j];joints[key]=useWorld?{x:v.x,y:v.y,z:v.z}:{x:v.x*this.canvas.width,y:v.y*this.canvas.height,z:(v.z??0)*this.canvas.width};}
    const side=result.handednesses?.[i]?.[0]?.categoryName||('Hand '+i);
    return {id:'mp-'+side.toLowerCase(),label:side+' (Webcam)',joints};
   });this.onHands(hands);
  }catch(e){this.onHands([]);this.stop('Tracking failed');this.onError(e);}
 }
 draw(hands){
  const c=this.ctx,canvas=this.canvas;c.clearRect(0,0,canvas.width,canvas.height);
  for(const pts of hands){
   const xy=i=>[pts[i].x*canvas.width,pts[i].y*canvas.height];
   c.lineWidth=3;c.lineCap='round';c.strokeStyle='#62e4ca';
   for(const chain of CHAINS){c.beginPath();chain.forEach((i,k)=>{const [x,y]=xy(i);if(k)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();}
   for(let i=0;i<pts.length;i++){const [x,y]=xy(i);c.beginPath();c.arc(x,y,[4,8,16,20].includes(i)?5:3,0,Math.PI*2);c.fillStyle=[4,8,16,20].includes(i)?'#ffc77b':'#ffffff';c.fill();}
  }
 }
 stop(message='Camera stopped'){
  ++this.generation;this.active=false;this.starting=false;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
  this.landmarker?.close();this.landmarker=null;this.video.pause();this.video.srcObject=null;
  this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.preview.hidden=true;this.onHands([]);this.onStatus(message);
 }
}