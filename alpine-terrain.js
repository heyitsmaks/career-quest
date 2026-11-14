import * as T from 'three';

function hash(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let a = x - ix, b = z - iz;
  a = a * a * (3 - 2 * a); b = b * b * (3 - 2 * b);
  return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), a), T.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), a), b);
}
function fractal(x,z) {
  return noise(x,z)*.55 + noise(x*2.03+4,z*2.03)*.27 + noise(x*4.17,z*4.17+2)*.12 + noise(x*8.3+8,z*8.3)*.06;
}

export function addLandscape(scene,stations) {
  const terrain=(x,z)=>{
    let base = -5.1 + 2.7 * fractal(x*.14,z*.14);
    for (const s of stations) {
      const dx=x-s.x,dz=z-s.z;
      const radius=Math.sqrt(dx*dx*.84+dz*dz*1.17);
      const coast=1-T.MathUtils.smoothstep(radius + (fractal(x*.17,z*.17)-.5)*3, 5.4,14.5);
      base=Math.max(base,-4.5+coast*(4.53+.4*noise(x*.7,z*.7)*T.MathUtils.smoothstep(radius,3.5,7)));
    }
    return base;
  };
  const marker=new T.Vector3(),normal=new T.Vector3(),delta=new T.Vector3(),col=new T.Color();
  const surface=(nx,nz,coordinates,shade)=>{
    const points=[],colors=[];
    const grid=Array.from({length:nz+1},(_,j)=>Array.from({length:nx+1},(__,i)=>coordinates(i,j)));
    function triangle(a,b,c) {
      normal.subVectors(b,a).cross(delta.subVectors(c,a)).normalize();
      if(normal.y<0)normal.multiplyScalar(-1);
      marker.copy(a).add(b).add(c).multiplyScalar(1/3);
      shade(marker,normal,col);
      for(const p of [a,b,c]){points.push(p.x,p.y,p.z);colors.push(col.r,col.g,col.b)}
    }
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
      const [a,b,c,d]=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];
      if(hash(i,j)>.5){triangle(a,d,b);triangle(d,c,b)}else{triangle(a,c,b);triangle(a,d,c)}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));scene.add(mesh);
  };
  const rock = new T.Color('#384255'), earth = new T.Color('#64726b');
  surface(104,85,(i,j)=>{
    const x=i*1.24-65+(hash(i,j)-.5)*.64,z=j*1.24-58+(hash(j,i)-.5)*.64;
    return new T.Vector3(x,terrain(x,z),z);
  },(p,n,c)=>c.copy(rock).lerp(earth,T.MathUtils.smoothstep(p.y,-1.4,.15)).multiplyScalar(.76+noise(p.x*.32,p.z*.32)*.39));
  // Broken mountain ridges are built as concentric relief meshes, including lit granite faces and irregular snow lines.
  const granite=new T.Color(), snow=new T.Color();
  for(let layer=0;layer<3;layer++){
    const distance=[92,119,158][layer], height=[17,30,42][layer], granites=['#344559','#4a5970','#6d7089'], snows=['#b7b8c8','#d2c6d0','#decdd7'];
    granite.set(granites[layer]);snow.set(snows[layer]);
    surface(352,16,(i,j)=>{
      const ang=2*Math.PI*(i%352)/352, radial=j/16, co=Math.cos(ang),si=Math.sin(ang);
      const f=fractal(co*9+1.3*layer,si*9+layer*3);
      const crest=1-Math.abs(radial-.57)*1.75;
      const ridge=Math.pow(crest,1.6) * (.3+f*1.12 + .36*Math.pow(1-Math.abs(Math.sin(ang*13+f*5+layer)),2.1));
      const r=distance+radial*35+(noise(co*9+17,si*9)-.5)*9;
      const y=-5.6+height*ridge +2.1*fractal(co*31+radial*5,si*31+radial*6);
      return new T.Vector3(co*r,y,si*r);
    },(p,n,c)=>{
      const drift=fractal(p.x*.115,p.z*.115);
      const cover=T.MathUtils.smoothstep(p.y/height + .24*n.y + drift*.23, .80,.99);
      c.copy(granite).lerp(snow,cover).multiplyScalar(.74+.22*n.x+.24*drift+.18*n.y);
    });
  }
  const skyUniforms={sunDir:{value:new T.Vector3(-.62,.20,-.91).normalize()}};
  const vertex='varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const skyFragment=`
    varying vec3 direction;uniform vec3 sunDir;
    float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+1.),f.x),f.y);}
    float fb(vec2 p){return noise(p)*.52+noise(p*2.10)*.27+noise(p*4.31)*.14+noise(p*8.4)*.07;}
    void main(){
      vec3 d=normalize(direction);float y=max(d.y,0.);float glow=max(dot(d,sunDir),0.);
      vec3 c=mix(vec3(.285,.34,.48),vec3(.052,.105,.225),smoothstep(-.015,.57,y));
      c+=vec3(.30,.14,.095)*pow(glow,8.)*exp(-abs(y-.085)*5.);
      vec2 air=d.xz/(y+.065);
      float streak=fb(air*vec2(.7,3.8)+vec2(3.,8.));
      c=mix(c,vec3(.57,.45,.49),smoothstep(.56,.76,streak)*.45*smoothstep(.03,.19,y));
      float separation=length(d-sunDir);
      c+=vec3(.11,.095,.09)*exp(-separation*14.);
      float disk=1.-smoothstep(.018,.0195,separation);
      c=mix(c,vec3(.99,.89,.74)*(1.-.045*fb(d.xz*290.)),disk);
      gl_FragColor=vec4(c,1.);
    }`;
  const sky=new T.Mesh(new T.SphereGeometry(240,48,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:vertex,fragmentShader:skyFragment}));
  sky.renderOrder=-2;scene.add(sky);
  const stars=[];
  for(let i=0;i<1150;i++){
    const a=hash(i,11)*Math.PI*2,y=.13+hash(i,31)*.84,h=Math.sqrt(1-y*y);
    stars.push(h*Math.cos(a)*212,212*y,h*Math.sin(a)*212);
  }
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(stars,3));
  scene.add(new T.Points(sg,new T.PointsMaterial({size:.16,color:'#a4b3d2',opacity:.62,transparent:true,fog:false,depthWrite:false})));
  const waterMat=new T.ShaderMaterial({uniforms:{clock:{value:0}},vertexShader:'varying vec3 w;void main(){w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    varying vec3 w; uniform float clock;
    void main(){vec2 p=w.xz;float wv=sin(p.x*.48+p.y*.53+clock*.28)+.5*sin(p.y*5.9-p.x*.57+clock*.51)+.45*sin(p.y*4.3+p.x*.8);
      float sheen=smoothstep(.81,1.89,wv);float light=exp(-abs((w.x+11.)-w.z*.21)*.091);
      float far=smoothstep(10.,80.,distance(w,cameraPosition));
      vec3 c=mix(vec3(.10,.20,.27),vec3(.32,.37,.48),far*.83);
      c+=sheen*(.025+light*.071)*vec3(1.25,.94,.83);gl_FragColor=vec4(c,1.);
    }`});
  const lake=new T.Mesh(new T.PlaneGeometry(185,185),waterMat);lake.rotation.x=-Math.PI/2;lake.position.y=-1.02;scene.add(lake);
  return {terrain,waterMat,sky};
}