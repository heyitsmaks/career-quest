import * as T from 'three';
import {createIslands} from './islands.js';

const V = (x,y,z)=>new T.Vector3(x,y,z);

function missionBoard(scene, station) {
  const {x,z}=station, group=new T.Group();
  group.position.set(x+2.18,0,z+3.7);
  group.rotation.y=.28;scene.add(group);
  const dark=new T.MeshLambertMaterial({color:'#3a4045'}), brass=new T.MeshLambertMaterial({color:'#bd9766'});
  function bar(cx,cy,cz,sx,sy,sz,material){
    const mesh=new T.Mesh(new T.BoxGeometry(sx,sy,sz),material);mesh.position.set(cx,cy,cz);group.add(mesh);
  }
  for(const side of [-1,1])bar(side*.93,1.20,0,.11,2.40,.12,dark);
  bar(0,1.90,0,2.18,1.31,.15,brass);bar(0,2.58,.03,2.30,.10,.31,dark);
  const page=document.createElement('canvas');page.width=768;page.height=432;
  const tex=new T.CanvasTexture(page);tex.colorSpace=T.SRGBColorSpace;
  const face=new T.Mesh(new T.PlaneGeometry(2.06,1.18),new T.MeshBasicMaterial({map:tex,toneMapped:false}));
  face.position.set(0,1.90,.081);group.add(face);
  let cached='';
  function label(name,action) {
    const key=name+'\n'+action;if(cached===key)return;cached=key;
    const ctx=page.getContext('2d');ctx.fillStyle='#182737';ctx.fillRect(0,0,768,432);
    ctx.strokeStyle='#9b845e';ctx.lineWidth=3;ctx.strokeRect(13,13,742,406);
    ctx.fillStyle='#efb878';ctx.font='600 36px Arial';ctx.fillText(name.toLocaleUpperCase('ru'),43,79,675);
    ctx.fillStyle='#e8ecf2';ctx.fillRect(44,102,58,4);
    ctx.font='600 48px Arial';let row='',lines=[];
    for(const word of action.split(/\s+/)){
      const next=(row+' '+word).trim();
      if(row&&ctx.measureText(next).width>680){lines.push(row);row=word}else row=next;
    }
    if(row)lines.push(row);
    lines.slice(0,5).forEach((line,i)=>ctx.fillText(line,43,164+i*52,680));tex.needsUpdate=true;
  }
  return {label,group};
}
export function mountWorld(canvas){
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})}
  catch{canvas.hidden=true;return {supported:false,move(){},fly(){}}}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
  const {scene,camera,stations,waterMat,sky}=createIslands();
  const boards=stations.map(s=>missionBoard(scene,s));
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),keys=new Set();
  const position=V(0,0,0),focus=V(0,0,0),destination=V(0,0,0),destinationFocus=V(0,0,0);
  const origin=V(0,0,0),originFocus=V(0,0,0);
  let station=-1,progress=1,seconds=3,last=0,yaw=0,pitch=0,drag=null,boost=false;
  function ready(arrived){
    document.body.classList.toggle('flying',!arrived);
    const label=document.getElementById('flight');if(label)label.textContent=arrived?'На станции':'В полёте';
  }
  function frame(){
    if(station<0)return;
    const s=stations[station], tall=canvas.clientWidth/canvas.clientHeight<.85;
    destination.set(s.x+(tall?6.1:7.0),tall?4.65:4.2,s.z+(tall?18.8:14.1));
    destinationFocus.set(s.x+(tall?-.25:1.65),tall?.65:2.32,s.z+.9);
  }
  function move(index,name,action){
    const next=((index%stations.length)+stations.length)%stations.length;
    boards[next].label(name,action);
    if(next===station)return;
    const first=station<0;station=next;frame();
    if(first){position.copy(destination).add(V(8.3,4.1,12.5));focus.copy(destinationFocus).add(V(-2,1.65,-2))}
    origin.copy(position);originFocus.copy(focus);
    yaw=0;pitch=0;progress=0;seconds=reduce.matches?.01:first?2.55:3.5;
    ready(false);
  }
  function inspect(dx,dy) {
    yaw=T.MathUtils.clamp(yaw+dx,-.93,.93);pitch=T.MathUtils.clamp(pitch+dy,-.32,.40);
  }
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;inspect((drag.x-e.clientX)*.0047,(e.clientY-drag.y)*.0039);
    drag={x:e.clientX,y:e.clientY};
  });
  for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{drag=null});
  const boostButton=document.getElementById('boost');
  boostButton?.addEventListener('pointerdown',e=>{boost=true;boostButton.setPointerCapture(e.pointerId)});
  for(const event of ['pointerup','pointercancel'])boostButton?.addEventListener(event,()=>{boost=false});
  window.addEventListener('keydown',e=>{
    if(!canvas.clientWidth||document.querySelector('dialog[open]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();keys.add(e.key);
  });
  window.addEventListener('keyup',e=>keys.delete(e.key));
  window.addEventListener('blur',()=>{keys.clear();boost=false});
  const ray=new T.Raycaster();
  canvas.addEventListener('click',e=>{
    if(station<0||progress<1)return;
    const box=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(2*(e.clientX-box.left)/box.width-1,1-2*(e.clientY-box.top)/box.height),camera);
    if(ray.intersectObject(boards[station].group,true).length)document.querySelector('#mission button')?.focus({preventScroll:true});
  });
  let prevWidth=0,prevHeight=0;
  function animate(now){
    requestAnimationFrame(animate);
    if(document.hidden||station<0||!canvas.clientWidth||now-last<31)return;
    const delta=Math.min(.24,(now-last)/1000);last=now;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(prevWidth!==width||prevHeight!==height){
      prevWidth=width;prevHeight=height;renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.fov=camera.aspect<.85?53:48;camera.updateProjectionMatrix();frame();
    }
    const prev=progress;progress=Math.min(1,progress+delta*(boost||keys.has('ArrowUp')?2.7:1)/seconds);
    if(prev<1&&progress===1)ready(true);
    if(keys.has('ArrowLeft'))inspect(-delta*.65,0);if(keys.has('ArrowRight'))inspect(delta*.65,0);
    if(keys.has('ArrowDown'))inspect(0,-delta*.4);
    const k=progress*progress*(3-2*progress),lift=Math.sin(Math.PI*k);
    position.lerpVectors(origin,destination,k);position.y+=lift*7.6;position.z+=lift*3.8;
    focus.lerpVectors(originFocus,destinationFocus,k);focus.y+=lift*1.45;
    camera.position.copy(position);
    if(!reduce.matches){camera.position.y+=.024*Math.sin(now*.001);waterMat.uniforms.clock.value=now*.001}
    camera.lookAt(focus);camera.rotateY(-yaw);camera.rotateX(pitch);
    sky.position.copy(camera.position);renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
  return {supported:true,move,fly(){if(station>=0){origin.copy(position).add(V(5,3,7));originFocus.copy(focus);progress=0;ready(false)}}};
}
window.mountWorld=mountWorld;