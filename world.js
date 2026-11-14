import * as T from 'three';
import {createIslands} from './islands.js';

export function mountWorld(canvas){
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}
 catch{canvas.hidden=true;return {supported:false,move(){},fly(){}}}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 const {scene,camera,way}=createIslands();
 const ship=new T.Group();scene.add(ship);
 function piece(parent,g,c,xyz,scale=[1,1,1]){
  const m=new T.Mesh(g,new T.MeshStandardMaterial({color:c,roughness:.65,metalness:.12}));
  m.position.set(...xyz);m.scale.set(...scale);parent.add(m);return m
 }
 piece(ship,new T.SphereGeometry(1,28,18),0xc77c43,[0,0,0],[.43,.40,.88]);
 for(const z of [-.62,-.34,0,.34,.62]){
  const band=piece(ship,new T.TorusGeometry(.42*Math.sqrt(1-(z/.88)**2),.018,7,32),0xffdc8f,[0,0,z]);band.scale.y=.94
 }
 piece(ship,new T.BoxGeometry(.32,.17,.68),0x644a38,[0,-.58,0]);
 for(const x of [-.135,.135])for(const z of [-.24,.24])piece(ship,new T.CylinderGeometry(.012,.012,.31,5),0x937955,[x,-.43,z]);
 for(const x of [-.17,.17]){const fin=piece(ship,new T.ConeGeometry(.25,.43,3),0x419b96,[x,.08,.68]);fin.rotation.x=.85;fin.rotation.z=x*3}
 const prop=new T.Group();prop.position.set(0,-.57,.42);ship.add(prop);for(let j=0;j<2;j++){const blade=piece(prop,new T.BoxGeometry(.51,.048,.055),0xb59860,[0,0,0]);blade.rotation.z=j*Math.PI/2}
 // Wooden landing boards and keepers stand beside each house.
 const boards=[],signTextures=[];
 for(const [i,p] of way.entries()){
  const g=new T.Group();g.position.set(p.x+.80,p.y-1.36,p.z-.18);scene.add(g);g.rotation.y=.18;
  for(const x of [-.74,.74])piece(g,new T.BoxGeometry(.09,1.25,.10),0x6c4934,[x,.62,0]);
  piece(g,new T.BoxGeometry(1.84,.93,.13),0x795333,[0,1.09,0]);
  const surface=document.createElement('canvas');surface.width=640;surface.height=288;
  const texture=new T.CanvasTexture(surface);texture.colorSpace=T.SRGBColorSpace;
  const face=new T.Mesh(new T.PlaneGeometry(1.74,.82),new T.MeshBasicMaterial({map:texture}));face.position.set(0,1.09,.073);g.add(face);boards.push(g);signTextures.push([surface,texture]);
  const npc=new T.Group();npc.position.set(-1.2,.02,.07);g.add(npc);piece(npc,new T.ConeGeometry(.21,.49,8),[0x2b827d,0x665994,0xc47743,0x527a8c,0x9f5549,0x668569][i],[0,.28,0]);piece(npc,new T.SphereGeometry(.142,10,8),0xc59875,[0,.60,0]);piece(npc,new T.ConeGeometry(.205,.22,8),0x49394a,[0,.76,0]);
 }
 function sign(i,name,action){
  const [surface,texture]=signTextures[i],ctx=surface.getContext('2d');ctx.fillStyle='#f0d7a0';ctx.fillRect(0,0,640,288);ctx.strokeStyle='#926f46';ctx.lineWidth=4;ctx.strokeRect(8,8,624,272);
  ctx.fillStyle='#745534';ctx.font='bold 29px Georgia';ctx.textAlign='center';ctx.fillText(name,320,57,580);ctx.fillStyle='#273a3c';ctx.font='bold 38px Georgia';
  const lines=[];let line='';for(const word of action.split(' ')){const next=(line+' '+word).trim();if(ctx.measureText(next).width>568&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);
  lines.slice(0,4).forEach((s,j)=>ctx.fillText(s,320,111+j*43,570));texture.needsUpdate=true;
 }
 way.forEach((_,i)=>sign(i,'Причал '+(i+1),'Доска заданий'));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const start=new T.Vector3(-10,6,16),end=new T.Vector3(),shipAt=start.clone(),view=new T.Vector3(),aim=new T.Vector3(),offset=new T.Vector3();
 let at=-1,elapsed=0,travel=2.8,last=0,yaw=.10,pitch=.08,speed=false,initial=true,drag=null;
 const keys=new Set();
 function ready(on){document.body.classList.toggle('flying',!on);document.getElementById('flight').textContent=on?'У причала':'В полёте';}
 function routeTo(i,name,action){sign(i,name,action);if(i===at)return;at=i;start.copy(shipAt);end.copy(way[i]).add(new T.Vector3(-.95,.24,1.15));elapsed=0;travel=reduce.matches?.01:initial?2.7:3.7;initial=false;ready(false)}
 canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=Math.max(-1.1,Math.min(1.1,yaw-(e.clientX-drag[0])*.007));pitch=Math.max(-.3,Math.min(.7,pitch+(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY]});
 for(const evt of ['pointerup','pointercancel'])canvas.addEventListener(evt,()=>drag=null);
 const accel=document.getElementById('boost');
 accel.addEventListener('pointerdown',e=>{speed=true;accel.setPointerCapture(e.pointerId)});for(const evt of ['pointerup','pointercancel'])accel.addEventListener(evt,()=>speed=false);
 window.addEventListener('keydown',e=>{if(!document.querySelector('dialog[open]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();keys.add(e.key)}});
 window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();speed=false});
 const ray=new T.Raycaster();canvas.addEventListener('click',e=>{if(at<0||elapsed<travel)return;const box=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-box.left)/box.width-1,1-2*(e.clientY-box.top)/box.height),camera);if(ray.intersectObject(boards[at],true).length)document.getElementById('mission').classList.remove('folded')});
 function draw(t){requestAnimationFrame(draw);if(document.hidden||at<0||!canvas.clientWidth||t-last<30)return;const dt=Math.min(.09,(t-last)/1000);last=t;
  const width=canvas.clientWidth,height=canvas.clientHeight;const ratio=width/height;
  if(canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=ratio;camera.updateProjectionMatrix()}
  const was=elapsed;elapsed=Math.min(travel,elapsed+dt*(speed||keys.has('ArrowUp')?2.5:1));if(was<travel&&elapsed===travel)ready(true);
  if(keys.has('ArrowDown'))pitch=Math.max(-.3,pitch-dt*.45);yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt;const p=elapsed/travel,k=p*p*(3-2*p);
  shipAt.lerpVectors(start,end,k);shipAt.y+=Math.sin(Math.PI*k)*(2.4+pitch);shipAt.x+=Math.sin(Math.PI*k)*Math.sin(yaw)*2.1;
  prop.rotation.z=reduce.matches?0:t*.007;ship.position.copy(shipAt);ship.position.y+=reduce.matches?0:.035*Math.sin(t*.002);ship.rotation.y=Math.atan2(start.x-end.x,start.z-end.z);ship.rotation.z=reduce.matches?0:.04*Math.sin(t*.0018);
  const back=ratio<.9?8:6.6;offset.set(Math.sin(yaw)*back,2.3+pitch*4,Math.cos(yaw)*back);view.copy(shipAt).add(offset);
  camera.position.lerp(view,reduce.matches?1:Math.min(1,dt*5));aim.copy(shipAt).lerp(way[at],.45*k);aim.y-=ratio<.9?1.35:.58;camera.lookAt(aim);renderer.render(scene,camera)
 }
 camera.position.copy(start).add(new T.Vector3(2,4,9));requestAnimationFrame(draw);
 return {supported:true,move:routeTo,fly(){at=-1;shipAt.add(new T.Vector3(0,2,7))}};
}
window.mountWorld=mountWorld;