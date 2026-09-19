import {Vector3, Quaternion} from 'three';
export const config={gravity:18,mass:2,linearDrag:.035,angularDrag:.12,initialAngularVelocityMin:-3,initialAngularVelocityMax:3,headRestitution:.12,handleRestitution:.48,floorRestitution:.16,friction:.55,headDamageMultiplier:1.25,handleDamageMultiplier:.018,blockResistance:38,velocityLossAfterBreakingBlock:.16,maxVelocity:90,maxAngularVelocity:18,optionalAlignmentStrength:0,sleepVelocityThreshold:.18,sleepAngularThreshold:.24,sleepTime:.75,fixedDt:1/120,probeRadius:.105,maxBodies:100};
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export const probes=[[-.92,.32,0,'head'],[-.65,.49,0,'head'],[-.32,.58,0,'head'],[0,.6,0,'head'],[.32,.58,0,'head'],[.65,.49,0,'head'],[.92,.32,0,'head'],[0,.25,0,'handle'],[0,-.12,0,'handle'],[0,-.49,0,'handle'],[0,-.86,0,'handle'],[0,-1.2,0,'handle']].map(([x,y,z,kind])=>({local:V(x,y,z),kind}));
// Slab intersection against the expanded box: swept spherical probes.
export function sweepAABB(a,b,min,max){
 const d=b.clone().sub(a);let enter=0,exit=1,normal=V();
 const inside=['x','y','z'].every(k=>a[k]>=min[k]&&a[k]<=max[k]);
 if(inside){let depth=Infinity;for(const k of ['x','y','z'])for(const s of [-1,1]){const distance=s<0?a[k]-min[k]:max[k]-a[k];if(distance<depth){depth=distance;normal.set(0,0,0);normal[k]=s;}}return {t:0,normal,depth};}
 for(const k of ['x','y','z']){if(Math.abs(d[k])<1e-10){if(a[k]<min[k]||a[k]>max[k])return null;continue;}let t1=(min[k]-a[k])/d[k],t2=(max[k]-a[k])/d[k],sign=-1;if(t1>t2){[t1,t2]=[t2,t1];sign=1;}if(t1>=enter){enter=t1;normal.set(0,0,0);normal[k]=sign;}exit=Math.min(exit,t2);if(enter>exit)return null;}
 return enter>=0&&enter<=1?{t:enter,normal,depth:0}:null;
}
export class BlockWorld{
 constructor(onBreak=()=>{}){this.blocks=[];this.onBreak=onBreak;for(let y=0;y<5;y++)for(let x=0;x<8;x++){const center=V(x-3.5,y+.5,0);this.blocks.push({center,min:center.clone().addScalar(-.48),max:center.clone().addScalar(.48),health:config.blockResistance,alive:true});}}
 sweep(a,b){let best=null;const radius=config.probeRadius;
 if(b.y<=radius){const t=a.y>radius?(a.y-radius)/(a.y-b.y):0;best={t,normal:V(0,1,0),depth:Math.max(0,radius-a.y),block:null};}
 for(const block of this.blocks){if(!block.alive)continue;const hit=sweepAABB(a,b,block.min.clone().addScalar(-radius),block.max.clone().addScalar(radius));if(hit&&(!best||hit.t<best.t))best={...hit,block};}return best;
 }
 damage(block,energy){block.health-=energy;if(block.health<=0){block.alive=false;this.onBreak(block);return true;}return false;}
}
export class PickaxeBody{
 constructor(position=V(0,8,.1),random=Math.random){this.position=position.clone();this.velocity=V();this.orientation=new Quaternion().setFromAxisAngle(V(0,0,1),Math.PI+.45);this.angularVelocity=V(...Array.from({length:3},()=>config.initialAngularVelocityMin+random()*(config.initialAngularVelocityMax-config.initialAngularVelocityMin)));this.mass=config.mass;this.inverseMass=1/this.mass;this.inverseInertia=1/(this.mass*.55);this.linearDrag=config.linearDrag;this.angularDrag=config.angularDrag;this.active=true;this.sleeping=false;this.sleepTimer=0;this.probes=probes;this.visual=null;this.sweeps=[];this.contacts=[];this.previousPosition=this.position.clone();this.previousOrientation=this.orientation.clone();}
 points(){return this.probes.map(p=>p.local.clone().applyQuaternion(this.orientation).add(this.position));}
 syncVisual(alpha=1){if(this.visual){this.visual.position.lerpVectors(this.previousPosition,this.position,alpha);this.visual.quaternion.slerpQuaternions(this.previousOrientation,this.orientation,alpha);}}
}
export function applyImpulse(body,r,impulse){body.velocity.addScaledVector(impulse,body.inverseMass);body.angularVelocity.addScaledVector(r.clone().cross(impulse),body.inverseInertia);}
export class PickaxeSimulator{
 constructor(world){this.world=world;this.bodies=[];this.accumulator=0;this.stats={head:0,handle:0,broken:0};}
 add(body){if(this.bodies.length>=config.maxBodies){const index=this.bodies.findIndex(b=>b.sleeping);if(index<0)return false;const [old]=this.bodies.splice(index,1);old.visual?.removeFromParent();}this.bodies.push(body);return true;}
 advance(delta){this.accumulator+=Math.min(delta,.1);while(this.accumulator>=config.fixedDt){this.step(config.fixedDt);this.accumulator-=config.fixedDt;}for(const b of this.bodies)b.syncVisual(this.accumulator/config.fixedDt);}
 step(dt){for(const b of this.bodies){b.previousPosition.copy(b.position);b.previousOrientation.copy(b.orientation);if(!b.active)continue;b.contacts=[];b.sweeps=[];b.velocity.y-=config.gravity*dt;b.velocity.multiplyScalar(Math.exp(-b.linearDrag*dt));b.angularVelocity.multiplyScalar(Math.exp(-b.angularDrag*dt));b.velocity.clampLength(0,config.maxVelocity);b.angularVelocity.clampLength(0,config.maxAngularVelocity);
 // Angular substeps keep curved probe trajectories close to swept segments.
 const count=Math.max(2,Math.ceil(b.angularVelocity.length()*dt/.025));let supported=false;
 for(let s=0;s<count;s++){let remaining=dt/count;for(let iteration=0;iteration<16&&remaining>1e-7;iteration++){
 const oldP=b.position.clone(),oldQ=b.orientation.clone(),before=b.points();b.position.addScaledVector(b.velocity,remaining);const speed=b.angularVelocity.length();if(speed>1e-9)b.orientation.premultiply(new Quaternion().setFromAxisAngle(b.angularVelocity.clone().divideScalar(speed),speed*remaining)).normalize();const after=b.points();let first=null;
 for(let i=0;i<before.length;i++){b.sweeps.push([before[i],after[i]]);const hit=this.world.sweep(before[i],after[i]);if(hit&&(!first||hit.t<first.t))first={...hit,i};}
 if(!first)break;
 b.position.lerpVectors(oldP,b.position,first.t);b.orientation.slerpQuaternions(oldQ,b.orientation,first.t);const probe=b.probes[first.i],point=probe.local.clone().applyQuaternion(b.orientation).add(b.position),r=point.clone().sub(b.position),n=first.normal;
 const contactVelocity=b.angularVelocity.clone().cross(r).add(b.velocity),vn=contactVelocity.dot(n),normalSpeed=Math.max(0,-vn);supported ||= n.y>.5;
 b.contacts.push({point:point.clone(),normal:n.clone(),kind:probe.kind});let broken=false;
 if(first.block&&normalSpeed>.5){this.stats[probe.kind]++;const energy=.5*b.mass*normalSpeed**2*(probe.kind==='head'?config.headDamageMultiplier:config.handleDamageMultiplier);broken=this.world.damage(first.block,energy);}
 if(broken){this.stats.broken++;const j=normalSpeed*b.mass*config.velocityLossAfterBreakingBlock;applyImpulse(b,r,n.clone().multiplyScalar(j*.4));b.velocity.multiplyScalar(1-config.velocityLossAfterBreakingBlock);}
 else{b.position.addScaledVector(n,first.depth+.001);if(vn<0){const restitution=normalSpeed<1?0:!first.block?config.floorRestitution:probe.kind==='head'?config.headRestitution:config.handleRestitution;const denom=b.inverseMass+b.inverseInertia*r.clone().cross(n).lengthSq();const j=-(1+restitution)*vn/denom;applyImpulse(b,r,n.clone().multiplyScalar(j));const tangent=contactVelocity.clone().addScaledVector(n,-vn);if(tangent.lengthSq()>1e-10){const speedT=tangent.length();tangent.divideScalar(speedT);const jt=Math.min(config.friction*j,speedT/(b.inverseMass+b.inverseInertia*r.clone().cross(tangent).lengthSq()));applyImpulse(b,r,tangent.multiplyScalar(-jt));}}}
 remaining*=1-first.t;if(first.t<1e-5)remaining=Math.max(0,remaining-1e-5);b.velocity.clampLength(0,config.maxVelocity);b.angularVelocity.clampLength(0,config.maxAngularVelocity);
 }}
 if(supported&&b.velocity.length()<config.sleepVelocityThreshold&&b.angularVelocity.length()<config.sleepAngularThreshold)b.sleepTimer+=dt;else b.sleepTimer=0;if(b.sleepTimer>config.sleepTime){b.sleeping=true;b.active=false;b.velocity.set(0,0,0);b.angularVelocity.set(0,0,0);}
 }}
}
