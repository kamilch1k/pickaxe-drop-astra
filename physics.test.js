import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {BlockWorld,PickaxeBody,PickaxeSimulator,applyImpulse,config,sweepAABB,enforceZConstraint,spawnPosition} from './src/physics.js';
test('lane cancels outward depth velocity without changing XY or rotation',()=>{
 for(const sign of [-1,1]){const b=new PickaxeBody();b.position.set(2,30,config.wallCenterZ+sign*10);b.velocity.set(3,-4,sign*80);const spin=b.angularVelocity.clone(),q=b.orientation.clone();enforceZConstraint(b);assert.equal(b.position.z,config.wallCenterZ+sign*config.corridorHalfDepth);assert.equal(b.velocity.z,0);assert.equal(b.position.x,2);assert.equal(b.position.y,30);assert.equal(b.velocity.x,3);assert.equal(b.velocity.y,-4);assert.ok(b.angularVelocity.equals(spin));assert.ok(b.orientation.equals(q));}
});
test('depth collision impulses retain full three-dimensional torque',()=>{
 for(const sign of [-1,1]){const b=new PickaxeBody(new Vector3(0,30,config.wallCenterZ+sign*config.corridorHalfDepth));b.angularVelocity.set(0,0,0);const r=new Vector3(.2,.3,.1),impulse=new Vector3(2,3,sign*20),expected=r.clone().cross(impulse).multiplyScalar(b.inverseInertia);applyImpulse(b,r,impulse);assert.equal(b.velocity.z,0);assert.equal(b.velocity.x,1);assert.equal(b.velocity.y,1.5);assert.ok(b.angularVelocity.distanceTo(expected)<1e-10);}
});
test('spawn extremes remain safely inside the enlarged wall and lane',()=>{
 assert.equal(new BlockWorld().blocks.length,440);
 for(const value of [0,.5,1]){const p=spawnPosition(()=>value);assert.ok(Math.abs(p.x)<=config.wallColumns/2-config.spawnEdgeMargin);assert.equal(p.z,config.wallCenterZ);assert.ok(p.y>config.wallRows+1);}
});
test('high depth speeds and repeated side impulses cannot escape the corridor',()=>{
 const s=new PickaxeSimulator(new BlockWorld()),b=new PickaxeBody(spawnPosition(()=>.5));b.velocity.set(1,-10,90);b.angularVelocity.set(3,4,5);s.add(b);const start=b.orientation.clone();
 for(let i=0;i<120*8;i++){if(i%30===0)applyImpulse(b,new Vector3(.2,.3,0),new Vector3(0,0,i%60===0?100:-100));s.step(config.fixedDt);assert.ok(Math.abs(b.position.z-config.wallCenterZ)<=config.corridorHalfDepth+1e-10);assert.ok(Number.isFinite(b.angularVelocity.length()));}
 assert.ok(start.angleTo(b.orientation)>.1);assert.ok(s.stats.head+s.stats.handle>0);
});
test('sweeps catch a block even when both endpoints are outside',()=>{const h=sweepAABB(new Vector3(0,20,0),new Vector3(0,-20,0),new Vector3(-1,-1,-1),new Vector3(1,1,1));assert.ok(h);assert.equal(h.t,.475);assert.equal(h.normal.y,1);});
test('off-center impulses create spin; center impulses do not',()=>{const a=new PickaxeBody(),b=new PickaxeBody();a.angularVelocity.set(0,0,0);b.angularVelocity.set(0,0,0);applyImpulse(a,new Vector3(),new Vector3(0,2,0));applyImpulse(b,new Vector3(1,0,0),new Vector3(0,2,0));assert.equal(a.angularVelocity.length(),0);assert.ok(b.angularVelocity.z>1);});
test('head impact breaks blocks without stopping the body',()=>{const w=new BlockWorld(),s=new PickaxeSimulator(w),b=new PickaxeBody(new Vector3(.5,config.wallRows+1.0,0));b.angularVelocity.set(0,0,0);b.velocity.y=-65;s.add(b);for(let i=0;i<7;i++)s.step(config.fixedDt);assert.ok(s.stats.broken>=2,JSON.stringify(s.stats));assert.ok(b.velocity.y<0);assert.ok(b.position.y>0);});
test('handle damages far less and rebounds more strongly',()=>{function impact(head){const w=new BlockWorld(),s=new PickaxeSimulator(w),b=new PickaxeBody(new Vector3(.5,head?config.wallRows+.5:config.wallRows+.8,0));b.orientation.identity();if(head)b.orientation.setFromAxisAngle(new Vector3(0,0,1),Math.PI);b.angularVelocity.set(0,0,0);b.velocity.y=-10;s.add(b);for(let i=0;i<30;i++)s.step(config.fixedDt);return {s,b};}const head=impact(true),handle=impact(false);assert.ok(head.s.stats.broken>handle.s.stats.broken);assert.ok(handle.s.stats.handle>0);});
test('many independent bodies remain finite and settle',()=>{let seed=29;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const s=new PickaxeSimulator(new BlockWorld());for(let i=0;i<24;i++)s.add(new PickaxeBody(new Vector3((rand()-.5)*6,config.wallRows+3+rand()*2,(rand()-.5)*.3),rand));for(let i=0;i<120*25;i++)s.step(config.fixedDt);for(const b of s.bodies){assert.ok(Number.isFinite(b.position.length()));assert.ok(b.position.y>-.1);assert.ok(b.velocity.length()<=config.maxVelocity+.001);assert.ok(Math.abs(b.orientation.length()-1)<1e-6);}const sleeping=s.bodies.filter(b=>b.sleeping).length;console.log(`settled: ${sleeping}/24, destroyed: ${s.stats.broken}`);assert.ok(sleeping>=20);});
