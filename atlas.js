'use strict';
// The same projected coordinates position a landmark and its keyboard-accessible label.
function paintAtlas(canvas, nodes, selected) {
  const ctx=canvas.getContext('2d'), w=900,h=625;
  canvas.width=w*2;canvas.height=h*2;ctx.scale(2,2);
  ctx.fillStyle='#b9d6c9';ctx.fillRect(0,0,w,h);
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function oval(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fillStyle=color;ctx.fill();}
  const shore=[[0,68],[93,34],[210,55],[345,21],[475,59],[645,33],[841,62],[902,111],[911,471],[831,552],[655,583],[507,566],[346,603],[210,575],[76,590],[-10,517]];
  poly(shore.map(([x,y])=>[x,y+12]),'#779780');poly(shore,'#d9e2b8');
  let seed=45;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
  for(let i=0;i<260;i++){let x=rnd()*w,y=rnd()*h;ctx.fillStyle='#78978038';ctx.fillRect(x,y,3+rnd()*9,1)}
  function path(from,to){ctx.beginPath();ctx.moveTo(from.x*w/100,from.y*h/100-12);ctx.bezierCurveTo(from.x*w/100,(from.y+to.y)*h/200,to.x*w/100,(from.y+to.y)*h/200,to.x*w/100,to.y*h/100-12);ctx.lineCap='round';ctx.strokeStyle='#b5ae8c';ctx.lineWidth=12;ctx.stroke();ctx.strokeStyle='#f1e8c7';ctx.lineWidth=8;ctx.stroke()}
  nodes.forEach((n,i)=>{if(i){const near=nodes.slice(0,i).reduce((a,b)=>Math.hypot(n.x-a.x,n.y-a.y)<Math.hypot(n.x-b.x,n.y-b.y)?a:b);path(n,near)}});
  function tree(x,y,s){oval(x+4,y+1,8*s,3*s,'#84997866');ctx.fillStyle='#897556';ctx.fillRect(x-1,y-9*s,2,10*s);for(let j=0;j<2;j++)poly([[x,y-(24+j*7)*s],[x-9*s+j*2,y-(6+j*7)*s],[x+9*s-j*2,y-(6+j*7)*s]],j?'#567e63':'#6b906e')}
  for(let i=0;i<115;i++){let x=20+rnd()*(w-40),y=86+rnd()*(h-160);if(nodes.every(n=>Math.hypot((x-n.x*w/100)/1.3,y-n.y*h/100+12)>52))tree(x,y,.55+rnd()*.65)}
  nodes.slice().sort((a,b)=>a.y-b.y).forEach((n)=>{const x=n.x*w/100,y=n.y*h/100-8, s=n.id===selected?1.16:1;
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);oval(5,0,33,9,'#71876755');
    if(n.id===selected){ctx.strokeStyle='#286246';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-1,36,13,0,0,7);ctx.stroke()}
    const colors=n.group==='Учёба'?['#c1734d','#985339']:n.group==='Идеи'?['#849aa8','#5b7484']:['#548475','#365e55'];
    poly([[-24,-7],[0,4],[0,-24],[-24,-34]],'#efe2bd');poly([[0,4],[22,-7],[22,-34],[0,-24]],'#d4c8a4');
    poly([[-29,-34],[-7,-47],[1,-24],[-1,-20]],colors[0]);poly([[-7,-47],[17,-38],[28,-30],[1,-20]],colors[1]);
    for(let j=0;j<2;j++){poly([[-19+j*10,-25+j*4],[-13+j*10,-22+j*4],[-13+j*10,-16+j*4],[-19+j*10,-19+j*4]],'#62786a')}
    poly([[8,-12],[15,-15],[15,-4],[8,-1]],'#86745c');ctx.restore();
  });
}
