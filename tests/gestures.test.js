import {GestureEngine,ACTIONS,distance3,getNormalizedPinches} from '../js/gestures.js';
const log=document.querySelector('#results');let passed=0,failed=0;
const point=(x,y=0,z=0)=>({x,y,z});
function hand(id='left',tip='none',d=.01){
 const joints={indexBase:point(0),pinkyBase:point(1),thumb:point(0,.5),index:point(.8,.8),ring:point(.8,.7),pinky:point(.9,.9)};
 if(tip!=='none')joints[tip]=point(0,.5+d);
 return {id,label:id,joints};
}
function test(name,fn){try{fn();passed++;log.textContent+='✓ '+name+'\n';}catch(e){failed++;log.textContent+='✗ '+name+' → '+e.message+'\n';}}
function equal(a,b){if(a!==b)throw Error('Expected '+b+' got '+a);}
test('distance3 evaluates a 3D length',()=>equal(distance3(point(0),point(3,4)),5));
test('null joint returns Infinity',()=>equal(distance3(null,point(0)),Infinity));
test('valid palm normalizes distances',()=>equal(getNormalizedPinches(hand().joints)[ACTIONS.WALK]>0,true));
test('missing palm returns no ratios',()=>equal(getNormalizedPinches({}),null));
test('initial state is stopped',()=>equal(new GestureEngine().snapshot.action,ACTIONS.NONE));
test('index pinch walks',()=>equal(new GestureEngine().update([hand('left','index')]).action,ACTIONS.WALK));
test('pinky pinch turns right',()=>equal(new GestureEngine().update([hand('left','pinky')]).action,ACTIONS.RIGHT));
test('ring pinch turns left',()=>equal(new GestureEngine().update([hand('left','ring')]).action,ACTIONS.LEFT));
test('no pinch stops',()=>equal(new GestureEngine().update([hand()]).action,ACTIONS.NONE));
test('no hand stops',()=>equal(new GestureEngine().update([]).action,ACTIONS.NONE));
test('losing tracked hand stops immediately',()=>{const e=new GestureEngine();e.update([hand('left','index')]);equal(e.update([]).action,ACTIONS.NONE);});
test('held action survives release threshold',()=>{const e=new GestureEngine();e.update([hand('left','index')]);equal(e.update([hand('left','index',.34)]).action,ACTIONS.WALK);});
test('release threshold stops action',()=>{const e=new GestureEngine();e.update([hand('left','index')]);equal(e.update([hand('left','index',.45)]).action,ACTIONS.NONE);});
test('other hand cannot steal held action',()=>{const e=new GestureEngine();e.update([hand('left','index')]);equal(e.update([hand('left','index'),hand('right','pinky')]).action,ACTIONS.WALK);});
test('walk prioritized across hands',()=>equal(new GestureEngine().update([hand('right','pinky'),hand('left','index')]).action,ACTIONS.WALK));
test('right prioritized over left',()=>equal(new GestureEngine().update([hand('right','ring'),hand('left','pinky')]).action,ACTIONS.RIGHT));
test('gesture resets',()=>{const e=new GestureEngine();e.update([hand('left','index')]);equal(e.reset().action,ACTIONS.NONE);});
test('tracking state reflects hands',()=>equal(new GestureEngine().update([hand()]).tracking,true));
test('invalid thresholds rejected',()=>{let ok=false;try{new GestureEngine({pressThreshold:.5,releaseThreshold:.2});}catch{ok=true;}equal(ok,true);});
log.textContent+='\n'+passed+' passed, '+failed+' failed';document.querySelector('#summary').textContent=passed+' passed · '+failed+' failed';if(failed)document.querySelector('#summary').style.color='#ff8f8f';
