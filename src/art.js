import * as T from 'three';

// Original, deterministic pixel textures drawn locally; no external game assets.
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function texture(canvas){const map=new T.CanvasTexture(canvas);map.magFilter=T.NearestFilter;map.minFilter=T.NearestFilter;map.generateMipmaps=false;map.colorSpace=T.SRGBColorSpace;return map;}
export function rockMaterial(kind,seed=1){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const c=canvas.getContext('2d'),random=rng(seed);
 const base=kind==='bedrock'?48:kind==='granite'?130:kind==='diorite'?175:116;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=Math.floor(base+(random()-.5)*(kind==='bedrock'?95:44));c.fillStyle=kind==='granite'?`rgb(${v+25},${v-25},${v-39})`:`rgb(${v},${v+2},${v+1})`;c.fillRect(x,y,1,1);}
 const ore={coal:['#242525','#424747'],gold:['#c08413','#ffe267'],redstone:['#9a1716','#ff4030'],lapis:['#193d91','#4c85f5'],diamond:['#138f96','#77f7e9'],emerald:['#18743b','#53e773'],copper:['#996446','#d79b65'],moss:['#43552b','#829345']}[kind];
 if(ore)for(let i=0;i<8;i++){const x=1+Math.floor(random()*12),y=1+Math.floor(random()*12);c.fillStyle='#494b46';c.fillRect(x,y,3,2);c.fillStyle=ore[0];c.fillRect(x,y,2,2);c.fillStyle=ore[1];c.fillRect(x,y,2,1);}
 const map=texture(canvas);return new T.MeshLambertMaterial({map,color:0xffffff});
}
export function makeBackdrop(){
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=256;const c=canvas.getContext('2d'),random=rng(14);
 const gradient=c.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#353253');gradient.addColorStop(.6,'#a57980');gradient.addColorStop(1,'#e7a36c');c.fillStyle=gradient;c.fillRect(0,0,160,256);
 c.fillStyle='#efb692';for(let i=0;i<12;i++){const x=random()*160,y=15+random()*125;c.fillRect(x,y,9+random()*15,4);c.fillRect(x+4,y-3,8,3);}
 for(let layer=0;layer<3;layer++){c.fillStyle=['#6a6570','#56595a','#394944'][layer];for(let x=0;x<160;x+=4){const y=167+layer*20+Math.sin(x*.04+layer*2)*12+random()*6;c.fillRect(x,y,4,256-y);}}
 for(let i=0;i<24;i++){const x=random()*160,y=205+random()*38;c.fillStyle='#55412e';c.fillRect(x,y-10,2,17);c.fillStyle='#344832';c.fillRect(x-4,y-18,10,12);c.fillStyle='#52633a';c.fillRect(x-2,y-21,6,7);}
 return new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:texture(canvas)}));
}
