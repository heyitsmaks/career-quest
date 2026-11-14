import * as T from 'three';
export function createIslands() {
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.1,180);
 scene.background=new T.Color(0xaecfd5);scene.fog=new T.FogExp2(0xb5d8df,.016);
 scene.add(new T.HemisphereLight(0xfff4ce,0x627a93,2.65));const sun=new T.DirectionalLight(0xffe3aa,3.6);sun.position.set(-9,20,8);scene.add(sun);
 const palette=new Map(),geos=new Map();
 function part(parent,kind,c,x,y,z,sx,sy,sz,rot=0){
  if(!palette.has(c))palette.set(c,new T.MeshStandardMaterial({color:c,flatShading:true,roughness:.84}));
  if(!geos.has(kind))geos.set(kind,({box:()=>new T.BoxGeometry(1,1,1),round:()=>new T.CylinderGeometry(1,1,1,10),spire:()=>new T.ConeGeometry(1,1,8),stone:()=>new T.IcosahedronGeometry(1,0),ball:()=>new T.SphereGeometry(1,14,10),dome:()=>new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2)})[kind]());
  const m=new T.Mesh(geos.get(kind),palette.get(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=rot;parent.add(m);return m;
 }
 const stops=[[-8,0,2],[-4,2,-5],[.7,-1,3],[5,2.6,-6],[9,.2,1]];
 function chamber(g,x,z,r,h,roof){part(g,'round',0xe6d7ad,x,h/2,z,r,h,r);part(g,'spire',roof,x,h+.48*r,z,r*1.18,1.02*r,r*1.18);for(let j=0;j<5;j++){const a=j*1.256;part(g,'box',0x375b6c,x+.98*r*Math.cos(a),h*.65,z+.98*r*Math.sin(a),.16,.36,.14,a)}}
 stops.forEach(([x,y,z],i)=>{
  const g=new T.Group();g.position.set(x,y,z);scene.add(g);const r=i===0?3.25:i===2?3:2.55;
  part(g,'spire',0x7b8391,0,-2.1,0,r,4.1,r).rotation.z=Math.PI;
  part(g,'round',0xc4b49b,0,-.24,0,r,.54,r);part(g,'round',0xa5bd83,0,.06,0,r*1.01,.14,r*1.01);
  for(let j=0;j<13;j++){let a=j*.485+.3*i;part(g,'stone',j%2?0x929898:0xb2ad9e,r*.88*Math.cos(a),-.9-(j%3)*.36,r*.88*Math.sin(a),.73,.8+(j%4)*.25,.6,a)}
  if(i===0){chamber(g,0,0,1.08,1.32,0xa86e45);part(g,'dome',0xb77d51,0,1.55,0,1.2,1.25,1.2);part(g,'box',0x335867,.57,1.92,.52,.47,.48,1.8,.6);chamber(g,-1.29,.73,.45,.95,0x57758a)}
  if(i===1){chamber(g,0,0,.8,2.5,0x45638b);part(g,'stone',0x5cb8df,0,3.65,0,.52,1.02,.52);for(let j=0;j<3;j++)chamber(g,Math.cos(j*2)*1.1,Math.sin(j*2)*1.1,.36,1.5,0x5985a4)}
  if(i===2){for(let j=0;j<6;j++)chamber(g,Math.cos(j)*1.35,Math.sin(j)*1.35,.53,1+j%2*.35,0xb56a4e);chamber(g,0,0,.56,2.15,0xa0754f)}
  if(i===3){chamber(g,0,0,.60,2.9,0xa57a42);part(g,'round',0xba7150,0,1.5,0,.61,.34,.61);part(g,'round',0xffcf78,0,3.26,0,.45,.58,.45);part(g,'spire',0x42617c,0,3.78,0,.69,.52,.69)}
  if(i===4){part(g,'box',0xd6bb94,0,.8,0,2,1.6,1.3);for(let j=0;j<4;j++)chamber(g,(j%2-.5)*2,(Math.floor(j/2)-.5)*1.45,.46,1.85,0x426080);part(g,'box',0xa64e44,0,3.05,0,.82,.39,.05);part(g,'round',0xa98d62,-.42,2.44,0,.035,1.65,.035)}
  for(let j=0;j<7;j++){const a=j*.89;const px=Math.cos(a)*r*.77,pz=Math.sin(a)*r*.77;part(g,'spire',j%2?0x5f846a:0x74946a,px,.60,pz,.28,.97,.28)}
  for(let j=0;j<3;j++)part(g,'box',j%2?0x91cfd0:0xafdce0,r*.55+j*.13,-1.6,r*.78,.13,3.4,.09);
 });
 const way=stops.map(([x,y,z])=>new T.Vector3(x,y+1.55,z+1.8));
 const arc=new T.CatmullRomCurve3(way,true,'centripetal');const line=new T.Line(new T.BufferGeometry().setFromPoints(arc.getPoints(160)),new T.LineDashedMaterial({color:0xffe6a3,dashSize:.35,gapSize:.2}));line.computeLineDistances();scene.add(line);
 for(let i=0;i<36;i++){const a=i*2.4;part(scene,'ball',i%2?0xe0e7de:0xcddede,Math.cos(a)*(14+i%7),-5+i%3,Math.sin(a)*(13+i%8),2+i%4,1,2.4)}
 return {scene,camera,way};
}