'use strict';
// Writes are conditional on the revision read from the account, on every device.
function connectProgress(key,readState,adopt){
 const label=document.getElementById('sync');
 if(!document.querySelector('meta[name="account-sync"]')){label.textContent='На устройстве';return {changed(){}}}
 const metaKey=key+':account-v1';
 let meta=JSON.parse(localStorage.getItem(metaKey)||'{"revision":null,"dirty":false}');
 let generation=0,running=false,again=false,loaded=false;
 function hasProgress(s){const v=s.voyage;return !!(s.active||s.history?.length||v?.active||v?.term||v?.stop||v?.round>1||Object.values(v?.reads||{}).some(r=>r.page||r.book)||Object.values(s.items||{}).some(r=>r.note||r.done?.length||r.unblocked||r.extra?.length))}
 function status(s){label.textContent=s}
 function persist(){localStorage.setItem(metaKey,JSON.stringify(meta))}
 function backup(s){localStorage.setItem(key+':device-backup',JSON.stringify(s))}
 async function pull(){
  const res=await fetch('/api/progress',{cache:'no-store'});if(!res.ok)throw Error(String(res.status));
  return await res.json()
 }
 function use(remote){meta={revision:remote.revision,dirty:false};persist();adopt(remote.state)}
 async function update(){
  if(running){again=true;return}running=true;
  try{
   if(!loaded||!meta.dirty){
    const remote=await pull();loaded=true;
    if(remote.state&&remote.revision!==meta.revision){
      if(meta.dirty||!meta.revision)backup(readState());
      use(remote);
    }else if(!remote.state){meta.revision=null;meta.dirty=meta.dirty||hasProgress(readState());persist()}
   }
   if(meta.dirty){
    status('Сохранение…');const seq=generation,snapshot=JSON.stringify({revision:meta.revision,state:readState()});
    const res=await fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:snapshot});
    if(res.status===409){const remote=await pull();backup(readState());use(remote);document.getElementById('notice').textContent='Получен более свежий прогресс. Копия изменений этого устройства сохранена локально.'}
    else{if(!res.ok)throw Error(String(res.status));const saved=await res.json();meta.revision=saved.revision;meta.dirty=seq!==generation;persist();if(meta.dirty)again=true}
   }
   status('Синхронизировано')
  }catch(e){status('Ожидает связи');}finally{running=false;if(again){again=false;queueMicrotask(update)}}
 }
 function changed(){meta.dirty=true;generation++;persist();status('Сохранение…');update()}
 window.addEventListener('focus',update);window.addEventListener('online',update);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 setInterval(()=>{if(!document.hidden)update()},5000);
 update();return {changed};
}