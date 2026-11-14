import * as T from 'three';
import {createIslands} from './islands.js';

// Route anchors use the same coordinate system as the painted island silhouettes.
const anchors=[[.16,.69],[.34,.39],[.51,.64],[.69,.31],[.86,.57]];
window.mountWorld=function(canvas,art){
 const positions=anchors.map(([x,y])=>new T.Vector3((x-.5)*16,(.5-y)*9,0));
 let engine;
 try {engine=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'})}
 catch {canvas.hidden=true;return {supported:false,move() {},orbit(){}}}
 engine.setPixelRatio(Math.min(devicePixelRatio,1.6));
 const scene=new T.Scene(), camera=new T.OrthographicCamera(-8,8,4.5,-4.5,.1,65);
 camera.position.z=16;
 scene.add(new T.HemisphereLight(0xfff7dc,0x34486b,2.4));
 const sun=new T.DirectionalLight(0xffe0ad,3);sun.position.set(-6,8,6);scene.add(sun);
 function mesh(g,c,parent,x,y,z){const m=new T.Mesh(g,new T.MeshStandardMaterial({color:c,roughness:.67,metalness:.11}));m.position.set(x,y,z);parent.add(m);return m}
 const ship=new T.Group();scene.add(ship);
 const hull=mesh(new T.SphereGeometry(1,24,14),0xd18a44,ship,0,.05,0);hull.scale.set(.76,.30,.31);
 for(const x of [-.42,-.22,.22,.42]){
  const r=.31*Math.sqrt(1-(x/.76)**2);
  const rib=mesh(new T.TorusGeometry(r,.016,7,32),0xffdb91,ship,x,.05,0);rib.rotation.y=Math.PI/2;
 }
 const basket=mesh(new T.BoxGeometry(.50,.13,.19),0x354957,ship,.02,-.40,0);
 for(const x of [-.19,.19])for(const z of [-.075,.075])mesh(new T.CylinderGeometry(.012,.012,.22,5),0xaf975e,ship,x,-.25,z);
 for(const z of [-.15,.15]){const fin=mesh(new T.ConeGeometry(.17,.36,3),0x407885,ship,-.64,.01,z);fin.rotation.z=1.2;fin.rotation.x=z*4}
 ship.rotation.set(.14,-.33,.04);
 const points=positions.concat(positions[0]).map(p=>p.clone().add(new T.Vector3(0,.12,.18)));
 const curvePts=[];for(let i=0;i<5;i++){const a=points[i],b=points[i+1],mid=a.clone().lerp(b,.5);mid.y+=.30;const curve=new T.QuadraticBezierCurve3(a,mid,b);curvePts.push(...curve.getPoints(28))}
 const route=new T.Line(new T.BufferGeometry().setFromPoints(curvePts),new T.LineDashedMaterial({color:0xffefbd,dashSize:.10,gapSize:.07,transparent:true,opacity:.9}));route.computeLineDistances();scene.add(route);
 const ring=mesh(new T.TorusGeometry(.32,.026,8,42),0xfbd179,scene,0,0,0);ring.rotation.x=1.04;
 let islands,orbiting=false,angle=.32,dragX=null,pitch=.49;
 const carrier=ship.clone(), flightPos=new T.Vector3();
 canvas.addEventListener('pointerdown',e=>{if(orbiting){dragX=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)}});
 canvas.addEventListener('pointermove',e=>{if(dragX){angle-=(e.clientX-dragX[0])*.009;pitch=Math.max(.14,Math.min(1.22,pitch+(e.clientY-dragX[1])*.005));dragX=[e.clientX,e.clientY]}});
 canvas.addEventListener('pointerup',()=>dragX=null);canvas.addEventListener('pointercancel',()=>dragX=null);
 let at=0,goal=positions[0].clone(),phase=0,xTilt=0,yTilt=0,prev=0;const center=new T.Vector3().copy(goal);
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 canvas.parentElement.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();xTilt=(e.clientX-r.left)/r.width-.5;yTilt=(e.clientY-r.top)/r.height-.5});
 canvas.parentElement.addEventListener('pointerleave',()=>{xTilt=yTilt=0});
 function draw(t){requestAnimationFrame(draw);if(document.hidden||t-prev<32)return;prev=t;phase=t*.001;
   const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
   if(canvas.width!==Math.floor(width*engine.getPixelRatio())||canvas.height!==Math.floor(height*engine.getPixelRatio()))engine.setSize(width,height,false);
   const ratio=width/height;camera.left=-8;camera.right=8;camera.top=8/ratio;camera.bottom=-8/ratio;camera.updateProjectionMatrix();
   if(orbiting){const cam=islands.camera;cam.aspect=ratio;cam.updateProjectionMatrix();const dist=Math.max(23,37/ratio);cam.position.set(dist*Math.sin(angle)*Math.cos(pitch),dist*Math.sin(pitch),dist*Math.cos(angle)*Math.cos(pitch));cam.lookAt(0,.1,0);flightPos.lerp(islands.way[at],reduce.matches?1:.08);carrier.position.copy(flightPos);carrier.position.y+=.5+(reduce.matches?0:.09*Math.sin(phase));engine.render(islands.scene,cam);return}
   scene.scale.y=(16/ratio)/9;
   center.lerp(goal,reduce.matches?1:.09);ship.position.copy(center);ship.position.y+=.68+(reduce.matches?0:Math.sin(phase*1.8)*.045);ship.rotation.y=-.33+(reduce.matches?0:xTilt*.5+Math.sin(phase*.6)*.10);ship.rotation.x=.14+yTilt*.2;
   ring.position.copy(positions[at]);ring.scale.setScalar(reduce.matches?1:1+.08*Math.sin(phase*2));engine.render(scene,camera)
 }
 requestAnimationFrame(draw);
 return {supported:true,move(i){at=i%5;goal.copy(positions[at]);goal.z=.5},orbit(on){orbiting=on;if(on&&!islands){islands=createIslands();islands.scene.add(carrier);carrier.scale.setScalar(1.3);flightPos.copy(islands.way[at])}}};
};
