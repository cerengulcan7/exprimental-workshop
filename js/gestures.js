/** Shared gesture math for XR metres and MediaPipe normalized landmarks. */
export const ACTIONS=Object.freeze({NONE:'none',WALK:'walk',RIGHT:'turn-right',LEFT:'turn-left'});
const patterns=[{action:ACTIONS.WALK,finger:'index',name:'thumb + index',priority:0},{action:ACTIONS.RIGHT,finger:'pinky',name:'thumb + pinky',priority:1},{action:ACTIONS.LEFT,finger:'ring',name:'thumb + ring',priority:2}];
export function distance3(a,b){if(!a||!b)return Infinity;return Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));}
export function getNormalizedPinches(joints){if(!joints)return null;const palm=distance3(joints.indexBase,joints.pinkyBase);if(!Number.isFinite(palm)||palm<1e-6)return null;const out={};for(const g of patterns)out[g.action]=distance3(joints.thumb,joints[g.finger])/palm;return out;}
export class GestureEngine{
 constructor({pressThreshold=0.27,releaseThreshold=0.40,ambiguityMargin=0.045}={}){if(!(pressThreshold>0&&releaseThreshold>pressThreshold))throw new RangeError('Invalid hysteresis thresholds');this.pressThreshold=pressThreshold;this.releaseThreshold=releaseThreshold;this.ambiguityMargin=ambiguityMargin;this.reset();}
 reset(){this.active={action:ACTIONS.NONE,handId:null,handLabel:'—',pinch:'—'};return this.snapshot={...this.active,handCount:0,tracking:false,ratios:null};}
 update(hands=[]){
  const valid=hands.map(h=>({...h,ratios:getNormalizedPinches(h.joints)})).filter(h=>h.ratios&&h.id!=null);
  if(this.active.action!==ACTIONS.NONE){const held=valid.find(h=>h.id===this.active.handId);if(held&&held.ratios[this.active.action]<this.releaseThreshold)return this.publish(this.active,valid,held.ratios);}
  const candidates=[];
  for(const hand of valid){
   const near=patterns.map(g=>({...g,ratio:hand.ratios[g.action],hand})).filter(g=>Number.isFinite(g.ratio)&&g.ratio<this.pressThreshold).sort((a,b)=>a.ratio-b.ratio);
   if(near.length>1&&(near[1].ratio-near[0].ratio)<this.ambiguityMargin)continue;
   if(near.length)candidates.push(near[0]);
  }
  candidates.sort((a,b)=>a.priority-b.priority||a.ratio-b.ratio||String(a.hand.id).localeCompare(String(b.hand.id)));
  const w=candidates[0];
  this.active=w?{action:w.action,handId:w.hand.id,handLabel:w.hand.label||String(w.hand.id),pinch:w.name}:{action:ACTIONS.NONE,handId:null,handLabel:'—',pinch:'—'};
  return this.publish(this.active,valid,w?.hand.ratios??null);
 }
 publish(active,valid,ratios){return this.snapshot={...active,handCount:valid.length,tracking:valid.length>0,ratios};}
}