import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {rockMaterial,makeBackdrop} from './art.js';
import {PickaxeBody,PickaxeSimulator,BlockWorld,config,spawnPosition} from './physics.js';
const scene=new T.Scene();scene.background=new T.Color('#15171b');
let renderer;try{renderer=new T.WebGLRenderer({antialias:true});}catch(e){document.querySelector('#error').hidden=false;document.querySelector('#error').textContent='This experiment requires WebGL 2. Please open it in a browser with hardware acceleration enabled.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.prepend(renderer.domElement);
// Start in front; camera orbit never changes the wall-plane physics constraint.
const camera=new T.OrthographicCamera(-7,7,10,-10,.1,150);camera.position.set(0,config.wallRows-4,40);camera.lookAt(0,camera.position.y,0);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,camera.position.y,0);controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.5;controls.maxZoom=3;controls.update();
renderer.domElement.addEventListener('dblclick',()=>{camera.position.copy(controls.target).add(new T.Vector3(0,0,40));camera.zoom=1;camera.updateProjectionMatrix();controls.update();});
let trackedBody=null;
scene.add(new T.AmbientLight('#ffffff',2.0));
const sun=new T.DirectionalLight('#fff1d5',1.8);sun.position.set(-10,30,30);scene.add(sun);
const backdrop=makeBackdrop();backdrop.position.z=-3;scene.add(backdrop);
const cubeGeometry=new T.BoxGeometry(.985,.985,.96),blocks=new Map(),fragments=[];
const world=new BlockWorld(block=>{const mesh=blocks.get(block);mesh.visible=false;for(let i=0;i<6;i++){const chip=new T.Mesh(chipGeometry,mesh.material);chip.position.copy(block.center).add(new T.Vector3((Math.random()-.5)*.7,(Math.random()-.5)*.7,(Math.random()-.5)*.7));scene.add(chip);fragments.push({mesh:chip,velocity:new T.Vector3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3),life:1.2});}});
const kinds=[...Array(12).fill('stone'),'coal','copper','gold','redstone','lapis','diamond','emerald','moss','granite','diorite'];
const palette=kinds.map((kind,i)=>rockMaterial(kind,51+i*117));
for(const block of world.blocks){const hash=Math.abs(Math.sin(block.center.x*127.1+block.center.y*311.7)*43758.5453)%1;const mesh=new T.Mesh(cubeGeometry,palette[Math.floor(hash*palette.length)]);mesh.position.copy(block.center);scene.add(mesh);blocks.set(block,mesh);}
const bedrock=rockMaterial('bedrock',81),borderGeometry=new T.BoxGeometry(1,1,1.1);
for(let y=0;y<config.wallRows+8;y++)for(const x of [-config.wallColumns/2-.5,config.wallColumns/2+.5]){const mesh=new T.Mesh(borderGeometry,bedrock);mesh.position.set(x,y+.5,0);scene.add(mesh);}
const chipGeometry=new T.BoxGeometry(.16,.16,.16),wood=new T.MeshStandardMaterial({color:'#9b592b',roughness:.8}),metal=new T.MeshStandardMaterial({color:'#ffd441',metalness:.25,roughness:.38,emissive:'#694100',emissiveIntensity:.25}),grip=new T.MeshStandardMaterial({color:'#49392e',roughness:1});
const handleGeometry=new T.CylinderGeometry(.09,.075,1.86,10),collarGeometry=new T.CylinderGeometry(.14,.14,.25,10),gripGeometry=new T.CylinderGeometry(.092,.08,.43,10);
const outline=new T.Shape();outline.moveTo(-.99,.29);outline.lineTo(-.72,.59);outline.lineTo(-.28,.72);outline.lineTo(.28,.72);outline.lineTo(.72,.59);outline.lineTo(.99,.29);outline.lineTo(.54,.43);outline.lineTo(.16,.49);outline.lineTo(-.16,.49);outline.lineTo(-.54,.43);outline.closePath();const headGeometry=new T.ExtrudeGeometry(outline,{depth:.18,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,steps:1});headGeometry.translate(0,0,-.09);
function makePickaxe(){const group=new T.Group();for(const [geometry,material,y] of [[handleGeometry,wood,-.32],[headGeometry,metal,0],[collarGeometry,metal,.53],[gripGeometry,grip,-1.02]]){const mesh=new T.Mesh(geometry,material);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}group.scale.setScalar(config.pickaxeScale);return group;}
const simulator=new PickaxeSimulator(world);
function drop(many=false){for(let i=0;i<(many?8:1);i++){const b=new PickaxeBody(spawnPosition());b.orientation.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),(Math.random()-.5)*1.8));b.visual=makePickaxe();if(simulator.add(b)){scene.add(b.visual);b.syncVisual();trackedBody=b;const shift=b.position.y-3-controls.target.y;controls.target.y+=shift;camera.position.y+=shift;}}}
document.querySelector('#drop').onclick=()=>drop();document.querySelector('#many').onclick=()=>drop(true);
let debug=false;const debugGroup=new T.Group();scene.add(debugGroup);const debugMaterial=new T.LineBasicMaterial({vertexColors:true,depthTest:false}),debugGeometry=new T.BufferGeometry(),debugLines=new T.LineSegments(debugGeometry,debugMaterial);debugLines.frustumCulled=false;debugLines.renderOrder=10;debugGroup.add(debugLines);
addEventListener('keydown',e=>{if(e.key.toLowerCase()==='d'&&!e.repeat){debug=!debug;document.body.classList.toggle('debug',debug);debugGroup.visible=debug;}});debugGroup.visible=false;
function drawDebug(){const positions=[],colors=[];function line(a,b,color){positions.push(...a.toArray(),...b.toArray());const c=new T.Color(color);colors.push(...c.toArray(),...c.toArray());}function cross(p,size,color){for(const axis of [new T.Vector3(size,0,0),new T.Vector3(0,size,0),new T.Vector3(0,0,size)])line(p.clone().sub(axis),p.clone().add(axis),color);}
for(const z of [config.wallCenterZ-config.corridorHalfDepth,config.wallCenterZ+config.corridorHalfDepth]){
 const corners=[new T.Vector3(-config.wallColumns/2,0,z),new T.Vector3(config.wallColumns/2,0,z),new T.Vector3(config.wallColumns/2,config.wallRows+config.spawnHeight+2,z),new T.Vector3(-config.wallColumns/2,config.wallRows+config.spawnHeight+2,z)];
 corners.forEach((p,i)=>line(p,corners[(i+1)%4],'#548996'));
}
for(const b of simulator.bodies){cross(b.position,.13,'white');b.points().forEach((p,i)=>cross(p,.06,b.probes[i].kind==='head'?'#ffcf64':'#ff70cb'));b.sweeps.forEach(([a,z])=>line(a,z,'#4de0f5'));line(b.position,b.position.clone().addScaledVector(b.velocity,.18),'#79fa8a');line(b.position,b.position.clone().addScaledVector(b.angularVelocity,.18),'#c394ff');b.contacts.forEach(c=>line(c.point,c.point.clone().add(c.normal),'#ff665e'));}debugGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));debugGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));document.querySelector('#debug').textContent=`D | DEBUG\nRotation: Z only (X/Y locked)\nLane: Z +/-${config.corridorHalfDepth} | max offset ${Math.max(0,...simulator.bodies.map(b=>Math.abs(b.position.z-config.wallCenterZ))).toFixed(3)}\nWhite: center of mass\nGold / pink: head / handle probes\nCyan: sweeps | green: velocity\nPurple: angular velocity | red: contact normal\n${simulator.bodies.length} bodies | ${simulator.bodies.filter(b=>b.sleeping).length} sleeping\n${simulator.stats.broken} broken | ${simulator.stats.head} head / ${simulator.stats.handle} handle impacts`;
}
function resize(){const h=innerHeight,w=Math.min(innerWidth,h*.72);renderer.setSize(w,h);renderer.domElement.style.margin='0 auto';const halfWidth=config.wallColumns/2+1;camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();backdrop.scale.set(halfWidth*2,camera.top*2,1);}addEventListener('resize',resize);resize();
function followCamera(dt){
 if(trackedBody){const desired=Math.max(camera.top-1,trackedBody.position.y-camera.top*.25);const shift=(desired-controls.target.y)*(1-Math.exp(-8*dt));controls.target.y+=shift;camera.position.y+=shift;}
 controls.update();backdrop.position.y=controls.target.y;backdrop.visible=camera.position.z>5;
}
let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.1);last=now;simulator.advance(dt);for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.life-=dt;f.velocity.y-=config.gravity*dt;f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.rotation.x+=dt*3;f.mesh.scale.setScalar(Math.max(0,f.life/1.2));if(f.life<=0){f.mesh.removeFromParent();fragments.splice(i,1);}}followCamera(dt);if(debug)drawDebug();renderer.render(scene,camera);});

drop();
