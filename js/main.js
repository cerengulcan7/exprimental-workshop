import * as THREE from 'three';
import {GestureEngine,ACTIONS} from './gestures.js';
import {XRHandTracker} from './hand-tracking.js';
import {Locomotion} from './locomotion.js';
import {DesktopHandTracker} from './desktop-hands.js';
import {XRSessionManager} from './xr-manager.js';
import {createArchitecturalScene} from './scene.js';
import {XRHUD} from './xr-hud.js';
const $=id=>document.getElementById(id);
const status={xr:$('debug-xr'),tracking:$('debug-tracking'),hand:$('debug-hand'),pinch:$('debug-pinch'),action:$('debug-action'),walk:$('debug-walk'),rotation:$('debug-rotation'),fps:$('debug-fps'),reference:$('debug-reference')};
const buttons={vr:$('enter-vr'),start:$('start-camera'),stop:$('stop-camera'),reset:$('reset-position')};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x7f9198);scene.fog=new THREE.FogExp2(0x9cadb0,.014);
const camera=new THREE.PerspectiveCamera(72,window.innerWidth/window.innerHeight,.025,200);
camera.position.set(0,1.6,0);
const rig=new THREE.Group();rig.name='WorldScaleXRLocomotionRig';rig.add(camera);scene.add(rig);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
renderer.xr.enabled=true;renderer.xr.setFoveation(1);renderer.xr.setFramebufferScaleFactor(.9);
$('scene').appendChild(renderer.domElement);
const environment=createArchitecturalScene(scene);
const hud=new XRHUD(scene),gestures=new GestureEngine(),xrHands=new XRHandTracker();
const locomotion=new Locomotion(rig,camera,{startX:0,startZ:8});
let gestureState=gestures.snapshot,desktopHands=[],needsXRRecenter=false,xrStartAt=0,xrHandsWarningShown=false,lastFrameMs=0,lastDebugMs=0,fpsSmoothed=60,toastTimer=0;
const pressedKeys=new Set(),viewDirection=new THREE.Vector3();
function toast(message,duration=7000){const el=$('toast');el.textContent=String(message);el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},duration);}
function onCameraStatus(message){$('support-text').textContent=message;buttons.start.disabled=desktop.active||desktop.starting||xrManager.session!==null;buttons.stop.disabled=!desktop.active&&!desktop.starting;}
const desktop=new DesktopHandTracker({video:$('camera-video'),canvas:$('landmarks'),preview:$('preview'),
 onHands:hands=>{desktopHands=hands;if(!xrManager.session)gestureState=gestures.update(hands);},
 onStatus:onCameraStatus,onError:error=>toast('Camera / MediaPipe: '+(error.message||error))
});
const xrManager=new XRSessionManager(renderer,{
 onStart:({session,referenceType})=>{
  xrHands.reset();gestures.reset();gestureState=gestures.snapshot;desktopHands=[];
  camera.position.set(0,0,0);camera.rotation.set(0,0,0);
  locomotion.setLocalReferenceFallback(referenceType==='local');needsXRRecenter=true;
  xrStartAt=performance.now();xrHandsWarningShown=false;
  buttons.vr.textContent='◉ EXIT VR';buttons.vr.disabled=false;buttons.start.disabled=true;buttons.stop.disabled=true;
  $('mode-dot').style.background='#79ffbf';$('mode-label').textContent='QUEST VR ACTIVE';
  if(referenceType==='local')toast('Using local tracking space. The floor offset is approximate; head motion remains 1:1.',9500);
  if(session.enabledFeatures&&!session.enabledFeatures.includes('hand-tracking')){toast('Hand-tracking permission is unavailable. Enable hand tracking in Quest settings.',11000);xrHandsWarningShown=true;}
 },
 onEnd:()=>{
  hud.setVisible(false);xrHands.reset();gestures.reset();gestureState=gestures.snapshot;needsXRRecenter=false;
  locomotion.setLocalReferenceFallback(false);locomotion.reset();
  camera.position.set(0,1.6,0);camera.rotation.set(0,0,0);camera.fov=72;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  buttons.vr.textContent='◉ ENTER VR';buttons.vr.disabled=false;buttons.start.disabled=false;buttons.stop.disabled=true;
  $('mode-dot').style.background='#93dcb7';$('mode-label').textContent='DESKTOP VIEW';
  $('support-text').textContent='VR session closed. Desktop mode ready.';
 },
 onError:error=>console.warn('WebXR setup:',error)
});
buttons.start.addEventListener('click',()=>{if(!xrManager.session)desktop.start();onCameraStatus('Starting camera / loading model…');});
buttons.stop.addEventListener('click',()=>desktop.stop('Camera stopped. W / A / D available.'));
buttons.reset.addEventListener('click',()=>{
 if(xrManager.session){const pose=xrManager.getViewerPose(renderer.xr.getFrame());if(pose)locomotion.reset(pose);else needsXRRecenter=true;}
 else{locomotion.reset();camera.position.set(0,1.6,0);camera.rotation.set(0,0,0);}
 gestures.reset();gestureState=gestures.snapshot;toast('Virtual position reset. Physical head tracking unchanged.',2500);
});
buttons.vr.addEventListener('click',()=>{
 if(xrManager.session){xrManager.exit().catch(e=>toast('Exit VR failed: '+e.message));return;}
 desktop.stop('Desktop camera stopped for VR.');buttons.vr.disabled=true;$('support-text').textContent='Requesting immersive VR session…';
 // XR requestSession must run during the original user click.
 xrManager.enter().catch(e=>{buttons.vr.disabled=false;$('support-text').textContent='Enter VR failed. Check Quest browser settings.';toast('WebXR: '+(e.message||e));});
});
for(const eventName of ['keydown','keyup'])window.addEventListener(eventName,event=>{
 const key=event.key.toLowerCase();if(['arrowup','arrowleft','arrowright',' '].includes(key))event.preventDefault();
 if(eventName==='keydown')pressedKeys.add(key);else pressedKeys.delete(key);
});
window.addEventListener('blur',()=>{pressedKeys.clear();if(!xrManager.session&&!desktop.active)gestureState=gestures.reset();});
let dragPointerId=null,dragX=0,dragY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(xrManager.session||e.button!==0)return;dragPointerId=e.pointerId;dragX=e.clientX;dragY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(xrManager.session||dragPointerId!==e.pointerId)return;
 const dx=e.clientX-dragX,dy=e.clientY-dragY;dragX=e.clientX;dragY=e.clientY;
 locomotion.yaw-=dx*.0032;rig.rotation.y=locomotion.yaw;
 camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.003,-1.3,1.3);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,()=>{dragPointerId=null;});
function desktopKeyboardAction(){if(pressedKeys.has('w')||pressedKeys.has('arrowup'))return ACTIONS.WALK;if(pressedKeys.has('d')||pressedKeys.has('arrowright'))return ACTIONS.RIGHT;if(pressedKeys.has('a')||pressedKeys.has('arrowleft'))return ACTIONS.LEFT;return ACTIONS.NONE;}
function refreshDebug(now,metrics){
 if(now-lastDebugMs<165)return;lastDebugMs=now;
 const isXR=!!xrManager.session;status.xr.textContent=isXR?'IMMERSIVE VR':'Inactive';
 status.tracking.textContent=isXR?(xrHands.seenValidPose?gestureState.handCount+' hand(s) tracked':xrHands.seenHandSource?'Seeking joints':'Awaiting hands'):(desktop.active?desktopHands.length+' hand(s) tracked':desktop.starting?'Initializing…':'Off');
 status.hand.textContent=gestureState.handLabel;status.pinch.textContent=gestureState.pinch;
 status.action.textContent=gestureState.action===ACTIONS.NONE?'STOPPED':gestureState.action.toUpperCase().replace('-',' ');
 status.walk.textContent=metrics.walk.toFixed(2)+' m/s';status.rotation.textContent=THREE.MathUtils.radToDeg(metrics.rotation).toFixed(1)+' °/s';
 status.fps.textContent=String(Math.round(fpsSmoothed));status.reference.textContent=isXR?xrManager.referenceType:'Desktop · 1.60 m';
}
function animate(now,xrFrame){
 const dt=lastFrameMs?Math.min(.05,Math.max(0,(now-lastFrameMs)/1000)):0;lastFrameMs=now;
 if(dt>0)fpsSmoothed=.94*fpsSmoothed+.06/dt;
 const inXR=Boolean(xrManager.session&&xrFrame);let pose=null,action=ACTIONS.NONE;
 if(inXR){
  pose=xrManager.getViewerPose(xrFrame);
  if(pose&&needsXRRecenter){locomotion.reset(pose);needsXRRecenter=false;}
  const hands=pose?xrHands.read(xrFrame,xrManager.getReferenceSpace(),xrManager.session):[];
  gestureState=gestures.update(hands);action=pose?gestureState.action:ACTIONS.NONE;
  if(!xrHands.seenHandSource&&!xrHandsWarningShown&&performance.now()-xrStartAt>4500){
   xrHandsWarningShown=true;toast('No native XR hands detected. Put controllers down and enable hand tracking.',13000);
  }
 }else if(!xrManager.session){
  if(desktop.active){desktop.tick(now);action=gestureState.action;}
  else{action=desktopKeyboardAction();if(!desktop.starting)gestureState=gestures.reset();}
 }
 if(!inXR){rig.updateMatrixWorld(true);camera.getWorldDirection(viewDirection);}
 const metrics=locomotion.update(action,dt,pose,inXR?null:viewDirection);
 if(inXR&&pose)hud.update(pose,rig,action,gestureState.handCount);else hud.setVisible(false);
 refreshDebug(now,metrics);renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
function resize(){if(!xrManager.session){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}}
window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>{desktop.stop();if(xrManager.session)xrManager.exit().catch(()=>{});hud.dispose();environment.dispose();renderer.dispose();});
(async()=>{const ok=await xrManager.supported();buttons.vr.disabled=!ok;$('support-text').textContent=ok?'Immersive VR available. Enter VR in Quest Browser. Webcam works on desktop.':'Immersive VR unavailable here. Desktop webcam tracking is supported.';})();
const params=new URLSearchParams(location.search),model=params.get('model');
if(model){try{const url=new URL(model,document.baseURI);if(url.origin!==location.origin)throw new Error('Model must be hosted on same origin.');environment.loadArchitecturalModel(url.href,{units:params.get('units')==='miniature'?'miniature':'real'}).then(()=>toast('Model loaded.')).catch(e=>toast('Model failed: '+e.message));}catch(e){toast('Invalid model: '+e.message);}}
