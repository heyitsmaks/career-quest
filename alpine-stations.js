import * as T from 'three';

const V = (x,y,z) => new T.Vector3(x,y,z);
export function buildStations(scene, stations, terrain) {
  const geometry = new Map(), batches = new Map();
  const dummy = new T.Object3D(), up = V(0,1,0);
  const glows=[];
  function shape(name){
    if(geometry.has(name)) return geometry.get(name);
    let g;
    if(name==='beam')g=new T.BoxGeometry(1,1,1);
    else if(name==='pole')g=new T.CylinderGeometry(1,1,1,9);
    else if(name==='dome')g=new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2);
    else if(name==='sphere')g=new T.SphereGeometry(1,10,8);
    else if(name==='boulder')g=new T.IcosahedronGeometry(1,0);
    else if(name==='gable'){
      g=new T.BufferGeometry();
      const arr=[];
      function tri(a,b,c){arr.push(...a,...b,...c)}
      const a=[-.5,0,.5],b=[.5,0,.5],c=[0,1,.5],d=[-.5,0,-.5],e=[.5,0,-.5],f=[0,1,-.5];
      tri(a,b,c);tri(e,d,f);tri(a,c,f);tri(f,d,a);tri(c,b,e);tri(e,f,c);
      g.setAttribute('position',new T.Float32BufferAttribute(arr,3));g.computeVertexNormals();
    }else{
      // Each crown layer has drooping, uneven branch tips and two rings of needles.
      const arr=[],tri=(a,b,c)=>arr.push(...a,...b,...c);
      const top=[0,1,0],ring=[],tips=[];
      for(let k=0;k<16;k++){
        const t=k*Math.PI/8, r=(k%2?.70:1)*(.90+.10*Math.sin(k*12.31));
        ring.push([Math.cos(t)*r*.72,.21+(k%2)*.12,Math.sin(t)*r*.72]);
        tips.push([Math.cos(t)*r,(k%2)*.18,Math.sin(t)*r]);
      }
      for(let k=0;k<16;k++){let n=(k+1)%16;tri(top,ring[n],ring[k]);tri(ring[k],ring[n],tips[k]);tri(tips[k],ring[n],tips[n])}
      g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(arr,3));g.computeVertexNormals();
    }
    geometry.set(name,g);return g;
  }
  const luminous=new Set(['#ffbf68','#ffdda2','#e79c5b','#b5d8ef','#f9deb0']);
  function apply(name,color) {
    const key=name+color;
    if(!batches.has(key))batches.set(key,{name,color,matrices:[]});
    dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function part(name,color,x,y,z,w,h,d,rx=0,ry=0,rz=0) {
    dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);apply(name,color);
  }
  function beam(a,b,width,color,depth=width) {
    const dir=b.clone().sub(a);dummy.position.copy(a).addScaledVector(dir,.5);dummy.scale.set(width,dir.length(),depth);
    dummy.quaternion.setFromUnitVectors(up,dir.normalize());apply('beam',color);
  }
  const stone='#566372',trim='#392e31',tile='#46576b',fascia='#9e775b',timber='#805b45',glazing='#ffbf68',steel='#475668';
  function windowFront(x,y,z,w,h,shade=glazing){
    part('beam',trim,x,y,z,w+.16,h+.16,.18);
    part('beam',shade,x,y,z+.102,w,h,.025);
    part('beam',trim,x,y,z+.128,.047,h,.03);
    part('beam',trim,x,y+.11*h,z+.129,w,.053,.03);
    part('beam',fascia,x,y-h/2-.10,z+.12,w+.29,.09,.29);
  }
  function cabin(x,z,w,d,wallH,peak,wall,roof){
    const front=z+d/2;
    part('beam',stone,x,.29,z,w+.35,.58,d+.30);
    part('beam',wall,x,.46+wallH/2,z,w,wallH,d);
    const eave=.46+wallH;
    part('gable',wall,x,eave,z,w,peak,d);
    // Horizontal timber laps, sill beams and bargeboards carry the light over the silhouette.
    for(let y=.63;y<eave;y+=.25){part('beam',timber,x,y,front+.016,w,.038,.048);part('beam',timber,x+w/2+.016,y,z,.048,.038,d);}
    for(const side of [-1,1]){
      part('beam',trim,x+side*(w*.5-.06),.46+wallH/2,front+.039,.13,wallH,.17);
      const extent=w*.5+.48,height=peak*extent/(w*.5),angle=Math.atan(peak/(w*.5));
      part('beam',roof,x+side*extent/2,eave+peak-height/2,z,Math.hypot(extent,height),.14,d+.90,0,0,-side*angle);
      beam(V(x,eave+peak+.04,front+.47),V(x+side*extent,eave+peak-height+.04,front+.47),.13,fascia);
      for(let zz=z-d/2-.32;zz<z+d/2+.44;zz+=.45) {
        beam(V(x,eave+peak+.095,zz),V(x+side*extent,eave+peak-height+.095,zz),.025,'#68717d');
      }
    }
    part('beam','#778291',x,eave+peak+.09,z,.21,.13,d+.97);
    for(let y=front-.1;y<=front+.25;y+=.28)beam(V(x-w/2,eave,y),V(x+w/2,eave,y),.15,trim);
    beam(V(x,eave,front+.07),V(x,eave+peak-.15,front+.07),.115,trim);
    beam(V(x-w*.32,eave+.06,front+.07),V(x-.1,eave+peak*.62,front+.07),.095,trim);
    beam(V(x+w*.32,eave+.06,front+.07),V(x+.1,eave+peak*.62,front+.07),.095,trim);
    const nx=Math.max(2,Math.round(w/1.35));
    for(let i=0;i<nx;i++){
      const xx=x+w*((i+.5)/nx-.5);
      if(i===Math.floor(nx/2)){part('beam',trim,xx,1.31,front+.11,.88,1.75,.13);windowFront(xx,1.55,front+.17,.44,.60,'#ffdda2')}
      else windowFront(xx,1.62,front+.12,.76,1.00);
      if(wallH>3.0)windowFront(xx,eave-.68,front+.12,.65,.66,'#e79c5b');
    }
    for (let i=0;i<3;i++){
      const zz=z-d*.33+i*d*.33;
      part('beam',trim,x+w*.5+.045,1.66,zz,.14,1.13,.81);
      part('beam','#e79c5b',x+w*.5+.123,1.66,zz,.035,.98,.64);
      part('beam',trim,x+w*.5+.157,1.66,zz,.036,1.04,.045);
    }
    // A small mullioned attic window breaks the expanse of the gable.
    windowFront(x,eave+peak*.31,front+.12,.49,.55,'#e79c5b');
    const chimney=x+w*.28;
    part('beam','#75584f',chimney,eave+peak*.72,z-d*.23,.55,1.6,.55);
    part('beam','#a58c79',chimney,eave+peak*.72+.79,z-d*.23,.67,.14,.67);
    for(let k=0;k<3;k++)part('beam','#8e8278',x+w*(.5/nx),.10+k*.10,front+.89-k*.21,1.2,.20+k*.14,.47);
  }
  function deck(x,z,w,d){
    part('beam','#514a46',x,.18,z,w,.32,d);
    for(let a=-w/2+.12;a<w/2;a+=.29)part('beam','#827065',x+a,.362,z,.265,.045,d-.04);
  }
  function streetLamp(x,z,h=3) {
    part('pole','#3a4552',x,.18,z,.18,.36,.18);
    part('pole',steel,x,h/2,z,.067,h,.067);
    beam(V(x,h-.05,z),V(x+.47,h+.13,z),.08,steel);
    part('pole',trim,x+.46,h-.06,z,.22,.09,.22);
    part('pole','#ffdda2',x+.46,h-.28,z,.13,.39,.13);
    part('pole',trim,x+.46,h-.51,z,.15,.06,.15);
    glows.push(V(x+.46,h-.28,z));
  }
  function pine(x,z,size,y,seed) {
    part('pole','#514439',x,y+size*.28,z,size*.055,size*.54,size*.055);
    const species=seed%3, colors=[['#253d43','#304a4c','#3f5655'],['#293f49','#334752','#475b61'],['#243a40','#30484b','#3f5558']][species];
    for(let i=0;i<5;i++){
      const k=1-i*.156,r=size*.245*k;
      part('needles',colors[Math.min(2,Math.floor(i/2))],x,y+size*(.11+i*.142),z,r,size*(.48-i*.037),r,0,seed+i*.59);
    }
  }
  let seed=327583;
  function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  // Groves hug the shoreline and leave a clear approach to each entrance.
  stations.forEach((s,i)=>{
    for(let k=0;k<64;k++){
      const a=rnd()*Math.PI*2,r=5.3+rnd()*7.4,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r;
      const nearApproach=(stations.some(p=>Math.abs(x-p.x-1.4)<5&&z>p.z-1&&z<p.z+13));
      const y=terrain(x,z);
      if(nearApproach||y<-.83)continue;
      pine(x,z,2+rnd()*4.9,y,i*100+k);
    }
    for(let k=0;k<52;k++){
      const a=rnd()*Math.PI*2,r=8+rnd()*5,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r,y=terrain(x,z);
      if(y< -1.8)continue;
      const size=.25+rnd()*.79;part('boulder',k%2?'#53636a':'#596572',x,y+.06,z,size,size*.54,size*.84,0,rnd()*6);
    }
  });
  // Alpine grasses, heather and small angular stones cluster on flat ground.
  for(const {x,z} of stations)for(let batch=0;batch<95;batch++){
    const a=rnd()*Math.PI*2,r=3.3+rnd()*8.6,bx=x+Math.cos(a)*r,bz=z+Math.sin(a)*r;
    if(bz<z+4&&Math.abs(bx-x)<4.5)continue;
    for(let n=0;n<7;n++){
      const px=bx+(rnd()-.5)*.74,pz=bz+(rnd()-.5)*.74,y=terrain(px,pz);
      if(y<-.68)continue;
      const height=.10+rnd()*.22;
      part('needles',n%3?'#666949':'#78795b',px,y-.01,pz,.065,height,.059,rnd()*.24,rnd()*4);
      if(n===0||n===3)part('boulder',batch%2?'#a6938c':'#9b926e',px,y+height*.76,pz,.059,.048,.064);
    }
  }
  stations.forEach(({x,z},i)=>{
    const w=[5.4,4.6,6.2,4.2,5.5,5.4][i],d=[3.5,4.5,3.3,3.5,3.4,4.2][i];
    const front=z+d/2;
    cabin(x-1.0,z,w,d,[3.0,3.3,2.7,3.4,3.2,2.8][i],[2.4,2.0,1.9,2.2,2.4,1.9][i],['#ab7957','#81756c','#9d6a54','#b2a28b','#8c705e','#947a63'][i],['#344e61','#4c4e66','#665054','#454d62','#425b66','#60565c'][i]);
    if(i===0||i===5) {
      cabin(x-4.5,z-.85,2.25,2.85,1.75,1.16,'#916b50',tile);
      // A covered reading veranda with a bench and posts.
      deck(x-1,front+.55,4.9,1.22);
      part('beam',tile,x-1,2.63,front+.57,5.32,.14,1.72,.16);
      for(const offset of [-2.27,0,2.27])part('beam',trim,x-1+offset,1.51,front+1.13,.112,2.38,.112);
      part('beam',fascia,x-1,2.49,front+1.25,5.15,.18,.15);
      part('beam',timber,x-2.44,.82,front+.75,1.2,.14,.43);
    }
    if(i===1){
      const tx=x+2.15;
      part('pole',stone,tx,1.44,z-.4,1.29,2.9,1.29);part('pole',steel,tx,3.00,z-.4,1.46,.20,1.46);
      part('dome','#667586',tx,3.08,z-.4,1.41,1.32,1.41);
      part('beam',steel,tx,3.95,z+.49,.30,1.15,.32,-.43);
      part('pole','#b5d8ef',tx,4.55,z+.61,.13,.13,.13);
    }
    if(i===2){
      for(let k=0;k<3;k++){
        const xx=x-2.68+k*1.72;
        part('beam',k%2?'#b17b58':'#bf9e77',xx,2.63,front+.72,1.72,.13,1.59,.21);
        part('beam',timber,xx-.74,1.35,front+1.37,.08,2.70,.08);
        part('beam',fascia,xx,.85,front+.95,1.45,.19,.69);
      }
    }
    if(i===3||i===4){
      const tx=x+2.38;
      part('beam',stone,tx,2.15,z-.42,1.65,4.3,1.70);
      part('beam',fascia,tx,4.26,z-.42,1.89,.21,1.95);
      windowFront(tx,3.40,z+.49,.82,.98,'#ffdda2');
      part('gable',tile,tx,4.36,z-.42,2.24,1.22,2.18);
      part('pole',steel,tx,6.41,z-.42,.034,2.50,.034);
      if(i===4)for(let j=0;j<4;j++){part('beam',steel,tx,6.45+j*.24,z-.42,1.15-j*.16,.043,.06)}
    }
    streetLamp(x-4.46,front+2.05,2.95);streetLamp(x+4.07,front+1.73,2.77);
    for(let j=0;j<7;j++){
      part('boulder',j%2?'#83877e':'#929088',x+(.25*Math.sin(j*1.68)),.087,front+1+j*.59,.69,.07,.42,0,j*.37);
    }
  });
  // A railway viaduct crosses the lake behind the stations, with granite piers and a continuous parapet.
  for(let i=0;i<20;i++){
    const x=-49+i*5.1,z=-24;
    part('beam',stone,x,1.40,z,1.13,5.7,1.58);part('beam','#837e80',x,3.86,z,5.11,.52,1.64);
    for(const dz of [-.78,.78]){
      part('beam','#5c616c',x,4.40,z+dz,5.12,.17,.11);
      for(const dx of [-2.3,0,2.3])part('beam',stone,x+dx,4.29,z+dz,.105,.76,.105);
    }
    for(const dx of [-1,1])beam(V(x,1.35,z),V(x+2.15*dx,3.69,z),.33,stone,.8);
  }
  const grain=document.createElement('canvas');grain.width=grain.height=128;
  const pattern=grain.getContext('2d'),pixels=pattern.createImageData(128,128);
  for(let j=0;j<128;j++)for(let i=0;i<128;i++){
    const g=228+7*Math.sin(j*.94+Math.sin(i*.041)*1.4)+6*Math.sin(j*.22+i*.013)+rnd()*13;
    const offset=(j*128+i)*4;
    pixels.data[offset]=pixels.data[offset+1]=pixels.data[offset+2]=g;pixels.data[offset+3]=255;
  }
  pattern.putImageData(pixels,0,0);
  const grainMap=new T.CanvasTexture(grain);grainMap.colorSpace=T.SRGBColorSpace;
  grainMap.wrapS=grainMap.wrapT=T.RepeatWrapping;
  const wood=new Set([timber,fascia,trim,'#ab7957','#917052','#916b50','#81756c','#9d6a54','#b2a28b','#8c705e','#947a63','#827065']);
  for(const {name,color,matrices} of batches.values()){
    const mat=luminous.has(color)?new T.MeshBasicMaterial({color,toneMapped:false}):new T.MeshLambertMaterial({color,flatShading:true,map:name==='beam'&&wood.has(color)?grainMap:null,side:name==='needles'?T.DoubleSide:T.FrontSide});
    const mesh=new T.InstancedMesh(shape(name),mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();scene.add(mesh);
  }
  // Soft baked contact under the cabins and a trail of warm light at each door.
  function groundTint(x,z,w,d,inner,y){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,inner);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    const mat=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,toneMapped:false});
    const patch=new T.Mesh(new T.PlaneGeometry(w,d),mat);patch.rotation.x=-Math.PI/2;patch.position.set(x,y,z);scene.add(patch);
  }
  for(const {x,z} of stations){
    groundTint(x-1,z,11,9,'rgba(22,24,34,.85)',.082);
    groundTint(x-.4,z+3.4,3.4,4.3,'rgba(239,172,92,.26)',.092);
  }
  const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=96;
  const ctx=haloCanvas.getContext('2d'),gradient=ctx.createRadialGradient(48,48,0,48,48,48);
  gradient.addColorStop(0,'rgba(255,222,158,.90)');gradient.addColorStop(.09,'rgba(255,199,121,.53)');gradient.addColorStop(.30,'rgba(255,179,92,.19)');gradient.addColorStop(1,'rgba(255,157,78,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
  const mat=new T.SpriteMaterial({map:new T.CanvasTexture(haloCanvas),transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  for(const pos of glows){const sprite=new T.Sprite(mat);sprite.position.copy(pos);sprite.scale.set(2.38,2.38,1);scene.add(sprite)}
}