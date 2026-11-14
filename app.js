'use strict';
const el=id=>document.getElementById(id),plan=JSON.parse(el('plan').textContent),nodes=new Map(plan.nodes.map(n=>[n.id,n])),route=plan.route,terms=plan.terms||[],key='career-quest:'+plan.id;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blocks=plan.aiBlocks||[{title:'Искусственный интеллект и машинное обучение',stage:'Основы',indices:terms.map((_,i)=>i),minutes:10}];
const dtext=s=>new Date(s+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const two=n=>String(n).padStart(2,'0'),time=ms=>{const s=Math.floor(ms/1000);return two(Math.floor(s/3600))+':'+two(Math.floor(s/60)%60)+':'+two(s%60)};
const btn=(id,label,main=false)=>'<button data-act="'+id+'" class="'+(main?'primary':'secondary')+'">'+esc(label)+'</button>';
let data,session,cloud,tab='voyage';
try{data=JSON.parse(localStorage.getItem(key))}catch{}
function setState(state){data=state||{};data.items??={};data.history??=[];session=data.voyage??={round:1,stop:0,reads:{},term:0,active:null,project:0};
session.learned??=Array.from({length:Math.min(terms.length,session.term||0)},(_,i)=>i);
if(!session.read15&&plan.readers?.eng?.pages===15){const rd=session.reads.eng;if(rd?.target>0&&rd.target-rd.page<=5)rd.target+=10;session.read15=true}
session.term=session.learned.length}
setState(data);
function save(){try{localStorage.setItem(key,JSON.stringify(data));cloud?.changed()}catch{el('notice').textContent='Не удалось сохранить прогресс на устройстве.'}}
function rec(id){return data.items[id]??={done:[],note:'',extra:[]}}
function rd(id){return session.reads[id]??={book:0,page:0,target:0}}
function reminder(id){return !plan.readers?.[id]&&id!=='ai'}
function available(id){const n=nodes.get(id);if(!n||rec(id).closed||n.blocked&&!rec(id).unblocked)return false;if(id==='ai')return session.term<terms.length;if(plan.readers?.[id])return rd(id).book<plan.readers[id].books.length;return true}
function project(){const all=(plan.projectStops||[]).filter(available);return all.length?all[session.project%all.length]:null}
function lane(){return [...route,project()]}
function current(){return lane()[session.stop]}
function advance(){if(++session.stop>=lane().length){session.stop=0;session.round++;session.project++}}
function normalize(){if(![...route,...(plan.projectStops||[])].some(available))return null;for(let j=0;j<lane().length+1;j++){if(available(current()))return current();advance()}return null}
function nextBlock(){const known=new Set(session.learned);for(const b of blocks){const indices=b.indices.filter(i=>!known.has(i));if(indices.length)return {...b,indices}}}
function labelTerm(i){return terms[i]?.term||''}
function assignment(id){const n=nodes.get(id);if(id==='ai'){const b=nextBlock();return {title:b.title,tag:'Самостоятельное изучение',body:'Темы для поиска',block:b,meta:'≈ '+b.minutes+' мин'}}
 if(plan.readers?.[id]){const r=rd(id),cfg=plan.readers[id],end=r.target||r.page+cfg.pages,book=cfg.books[r.book];return {title:book.split(' · ')[0].split(' — ')[0],tag:'Чтение',body:'Прочитай страницы '+(r.page+1)+'–'+end+'.',meta:(end-r.page)+' стр.',book,end,author:book.split(/ · | — /)[1]||''}}
 return {title:n.title,tag:'Напоминание',body:n.desc,meta:n.due?'До '+dtext(n.due):'Проект'}}
const world=window.mountWorld(el('sky'));document.body.classList.toggle('fallback-mode',!world.supported);if(!world.supported)el('flight').textContent='Панорама';
const dialog=el('sheet');function modal(title,html){dialog.innerHTML='<h2>'+esc(title)+'</h2>'+html;if(!dialog.open)dialog.showModal()}function close(){if(dialog.open)dialog.close()}
function stamp(a){return (a?.ms||0)+(a?.start?Math.max(0,Date.now()-a.start):0)}
function start(){if(!session.active){session.active={start:Date.now(),ms:0,total:0,completed:[]};save();render()}}
const locationNames=['Читальный дом','Обсерватория','Торговая станция','Сигнальная башня','Дом связи','Мастерская'];
function namesFor(b){return b.indices.map(labelTerm).join(' · ')}
function searchLinks(b){const q=encodeURIComponent(b.title+' '+b.indices.map(labelTerm).join(' '));return '<div class="search"><a target="_blank" rel="noreferrer" href="https://www.youtube.com/results?search_query='+q+'">YouTube ↗</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q='+q+'">Поиск ↗</a></div>'}
function descFor(t){return t.block?namesFor(t.block):t.book?t.body+' '+t.title:t.title}
function render(){const id=normalize(),a=session.active;el('roundCaption').textContent='Круг '+two(session.round);
 if(!id){el('mission').innerHTML='<h2>Маршрут пройден</h2>';el('itinerary').innerHTML='';return}
 const t=assignment(id),n=nodes.get(id),here=session.stop,where=locationNames[here]||n.short;
 world.move(here,n.short,descFor(t));el('locNum').textContent=two(here+1);el('locName').textContent=where;
 el('itinerary').innerHTML='<div class="over"><h3>Текущий круг</h3>'+btn('route','Закрыть')+'</div><ol class="route">'+lane().map((i,j)=>i&&available(i)?'<li class="'+(j===here?'current':'')+'"><b>'+two(j+1)+'</b><span>'+esc(descFor(assignment(i)))+'</span></li>':'').join('')+'</ol>';
 const content=t.block?'<p class="hint">Темы для самостоятельного поиска:</p><ul class="terms">'+t.block.indices.map(i=>'<li>'+esc(labelTerm(i))+'</li>').join('')+'</ul>'+searchLinks(t.block):'<p class="taskText">'+esc(t.body)+'</p>';
 const actions=a?(t.block?btn('learn','Изучил темы →',true):t.book?btn('finish','Отметить страницы →',true):btn('next','Дальше по маршруту →',true))+btn('pause',a.start?'Пауза':'Продолжить')+btn('stop','На сегодня всё'):reminder(id)?btn('next','Дальше по маршруту →',true)+btn('start','Засечь время'):btn('start',session.partial?'Продолжить':'Начать',true)+(t.book?btn('bookmark','Указать страницу'):'');
 el('mission').innerHTML='<div class="over"><span class="kicker">'+esc(t.tag)+' / '+esc(n.short)+'</span><span class="meta">'+esc(t.meta)+'</span></div><h2>'+esc(t.title)+'</h2>'+(t.author?'<div class="author">'+esc(t.author)+'</div>':'')+content+(rec(id).note?'<p class="note">'+esc(rec(id).note)+'</p>':'')+'<div class="actions">'+actions+'</div>'+(a?'<div class="clockline"><span aria-hidden="true">◷</span> <span id="clock">'+time(stamp(a))+'</span></div>':'');
}
function bookSheet(complete){const id=current(),r=rd(id),t=assignment(id);modal(complete?'Где закончил чтение?':'На сегодня всё','<p>'+esc(t.title)+'</p><label>Последняя прочитанная страница<input id="page" type="number" min="'+r.page+'" step="1" required value="'+(complete?t.end:r.page)+'"></label>'+(complete?'<label class="check"><input id="chapter" type="checkbox">Глава закончилась раньше</label><label class="check"><input id="bookEnd" type="checkbox">Книга закончена</label>':'')+'<label>Закладка <small>необязательно</small><input id="note" maxlength="600" value="'+esc(session.partial||'')+'"></label><p id="err" role="alert"></p><div class="actions">'+btn(complete?'confirmBook':'confirmStop','Сохранить',true)+btn('close','Назад')+'</div>')}
function finish(complete,done=false){const id=current(),t=assignment(id),a=session.active||{ms:0,total:0},ms=stamp(a),note=el('note')?.value?.trim()||'';let result=t.block?namesFor(t.block):t.book?t.title:t.title;
 if(t.book){const input=el('page');if(!input||!input.reportValidity())return;const r=rd(id),page=Number(input.value),bookEnd=el('bookEnd')?.checked;
 if(complete&&!bookEnd&&page<t.end&&!(el('chapter')?.checked&&page>r.page)){el('err').textContent='Чтобы остановиться здесь, отметь конец главы или выбери «На сегодня всё».';return}
 r.page=page;r.target=complete?0:t.end;result+=' · стр. '+page;if(bookEnd){r.book++;r.page=0}}
 if(t.block&&complete){session.learned=[...new Set([...session.learned,...t.block.indices])];session.term=session.learned.length}
 const total=(a.total||0)+ms,prior=a.completed||[];data.history.unshift({id,ms,at:new Date().toISOString(),result:(complete?'':'Остановка · ')+result,note});
 rec(id).note=note;session.partial=complete?'':(note||' ');
 if(complete){if(done)rec(id).closed=true;advance();const next=normalize();session.active=next&&session.active?{ms:0,start:Date.now(),total,completed:[...prior,result]}:null}
 else session.active=null;
 close();save();render();if(!complete)modal('Занятие сохранено','<p>'+esc(result)+'</p><p>Время за занятие: '+time(total)+'</p>'+(prior.length?'<ul>'+prior.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'')+btn('close','К маршруту',true))}
function view(which){tab=which;for(const s of ['voyage','atlas','journal'])el(s).hidden=s!==which;document.body.dataset.screen=which;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===which?'page':'false'));el('itinerary').hidden=true;
 if(which==='journal')el('journal').innerHTML='<div class="sectionHead"><small>Бортовой журнал</small><h1>Мои занятия</h1></div><div class="entries">'+(data.history.length?data.history.map(v=>'<article><small>'+esc(new Date(v.at).toLocaleDateString('ru-RU'))+' · '+time(v.ms)+'</small><h3>'+esc(v.result)+'</h3><p>'+esc(v.note)+'</p></article>').join(''):'После первой остановки здесь появится запись.')+'</div>';
 if(which==='atlas'){const stages=[...new Set(blocks.map(b=>b.stage))],left=terms.length-session.term,days=plan.horizon?Math.max(1,Math.ceil((new Date(plan.horizon+'T23:59:59')-Date.now())/864e5)):0,known=new Set(session.learned);
 const ai='<article class="study"><small>Самостоятельное изучение</small><h2>Путь по AI и ML</h2><p>'+session.term+' из '+terms.length+' терминов'+(days?' · к '+dtext(plan.horizon)+' · ориентир '+Math.ceil(left*7/days)+' терм. в неделю':'')+'</p><progress value="'+session.term+'" max="'+terms.length+'"></progress>'+stages.map((s,j)=>'<details><summary>'+two(j+1)+' / '+esc(s)+'</summary><ol>'+blocks.filter(b=>b.stage===s).map(b=>'<li>'+ (b.indices.every(i=>known.has(i))?'✓ ':'')+'<b>'+esc(b.title)+'</b><br>'+esc(namesFor(b))+'</li>').join('')+'</ol></details>').join('')+(nodes.get('ai')?.reference?'<p>'+esc(nodes.get('ai').reference)+'</p>':'')+'</article>';
 el('atlas').innerHTML='<div class="sectionHead"><small>Атлас</small><h1>Мой план</h1></div><div class="inventory">'+ai+plan.nodes.filter(n=>n.id!=='ai').map(n=>'<article><small>'+esc(n.group)+'</small><h2>'+esc(n.title)+'</h2><p>'+esc(n.desc)+'</p>'+(n.due?'<p class="deadline">До '+dtext(n.due)+'</p>':'')+(n.books?'<details><summary>Список книг</summary><ol>'+n.books.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ol></details>':'')+(n.blocked&&!rec(n.id).unblocked?'<p>'+esc(n.blocked)+'</p>'+btn('unlock:'+n.id,n.id==='planner'?'Ответ получен':'Книги изучены'):reminder(n.id)?btn('toggle:'+n.id,rec(n.id).closed?'Вернуть напоминание':'Снять напоминание'):'')+'</article>').join('')+'</div>'}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.view){view(b.dataset.view);return}const act=b.dataset.act,id=current();
 if(b.id==='routeToggle'||act==='route'){el('itinerary').hidden=!el('itinerary').hidden;return}
 if(act==='start')start();if(act==='close')close();
 if(act==='pause'&&session.active){const a=session.active;a.ms=stamp(a);a.start=a.start?null:Date.now();save();render()}
 if(act==='bookmark'){modal('Моя закладка','<label>Последняя прочитанная страница<input type="number" min="0" step="1" required id="mark" value="'+rd(id).page+'"></label><div class="actions">'+btn('mark','Сохранить',true)+btn('close','Назад')+'</div>')}
 if(act==='mark'&&el('mark').reportValidity()){let r=rd(id);r.page=+el('mark').value;r.target=r.page+plan.readers[id].pages;save();close();render()}
 if(act==='learn'||act==='next')finish(true);
 if(act==='finish')bookSheet(true);if(act==='confirmBook')finish(true);
 if(act==='stop'){if(plan.readers?.[id])bookSheet(false);else modal('На сегодня всё','<p>В следующий раз откроется эта же остановка.</p><label>Закладка <small>необязательно</small><input id="note" maxlength="600"></label><div class="actions">'+btn('confirmStop','Сохранить',true)+btn('close','Назад')+'</div>')}
 if(act==='confirmStop')finish(false);
 if(act?.startsWith('unlock:')||act?.startsWith('toggle:')){const n=act.split(':')[1];if(act.startsWith('unlock'))rec(n).unblocked=true;else rec(n).closed=!rec(n).closed;save();render();view('atlas')}
});
el('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else el('notice').textContent='Игра уже занимает доступный экран.'}catch{el('notice').textContent='Полный экран недоступен.'}};
window.addEventListener('storage',e=>{if(e.key===key)location.reload()});setInterval(()=>{if(el('clock')&&session.active)el('clock').textContent=time(stamp(session.active))},500);
render();cloud=connectProgress(key,()=>data,remote=>{if(!remote?.voyage)return;const changed=JSON.stringify(remote)!==JSON.stringify(data);setState(remote);localStorage.setItem(key,JSON.stringify(data));if(changed){close();render();view(tab)}});