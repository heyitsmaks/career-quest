'use strict';
const plan=JSON.parse(document.querySelector('#plan').textContent);
const nodes=plan.nodes, key='career-quest:'+plan.id;
const el=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtDate=iso=>new Date(iso+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
let state;
try{state=JSON.parse(localStorage.getItem(key)||'null')}catch{}
state??={items:{},history:[],active:null};
function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{document.querySelector('footer').textContent='Сохранение в браузере недоступно. Прогресс останется только до закрытия страницы.'}}
function record(n){return state.items[n.id]??={done:[],extra:[],note:'',unblocked:false}}
function steps(n){return n.steps.concat(record(n).extra)}
function available(n){return !n.blocked||record(n).unblocked}
function next(n){return steps(n).findIndex((_,i)=>!record(n).done.includes(i))}
function dueDays(n){return n.due?(new Date(n.due+'T23:59:59')-Date.now())/86400000:Infinity}
function priority(n){const days=dueDays(n);const last=state.history.findIndex(s=>s.id===n.id);
  const recent=last===0?12:last===1?5:0;
  return (days<8?80:days<30?34:0)+(n.group==='Идеи'?0:10)+(record(n).note?2:0)-recent;
}
function recommended(){return nodes.filter(n=>available(n)&&next(n)>=0).sort((a,b)=>priority(b)-priority(a))[0]??nodes[0]}
let selected=state.active?.id||recommended().id, filter='Все';
const chosen=()=>nodes.find(n=>n.id===selected);
function select(id,scroll=false){selected=id;render();if(scroll&&matchMedia('(max-width:820px)').matches)el('card').scrollIntoView({behavior:'smooth',block:'start'})}
function btn(label,action,primary=false){return '<button type="button" class="btn '+(primary?'primary':'')+'" data-action="'+action+'">'+esc(label)+'</button>'}
function clock(ms){let sec=Math.floor(Math.max(0,ms)/1000);return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(v=>String(v).padStart(2,'0')).join(':')}
function elapsed(a){return a.ms+(a.start?Math.max(0,Date.now()-a.start):0)}
function modal(html){const d=el('sheet');d.innerHTML=html;if(!d.open)d.showModal()}
function close(){el('sheet').close()}
function render(){
 const n=chosen(),r=record(n),all=steps(n),idx=next(n),a=state.active,rec=recommended();
 el('horizon').textContent=plan.horizon?'Горизонт · '+fmtDate(plan.horizon):'';
 el('count').textContent=nodes.length+' мест';
 const world=el('world');world.querySelectorAll('button').forEach(b=>b.remove());
 paintAtlas(world.querySelector('canvas'),nodes,selected);
 for(const obj of nodes){const b=document.createElement('button');b.type='button';b.className='pin'+(obj.id===selected?' current':'');b.style.left=obj.x+'%';b.style.top=obj.y+'%';b.textContent=obj.short;b.setAttribute('aria-label',obj.title);b.setAttribute('aria-pressed',String(obj===n));b.onclick=()=>select(obj.id,true);world.append(b)}
 let html='<div class="row badge"><span>'+esc(n.group)+'</span><span>'+esc(n.due?'До '+fmtDate(n.due):'')+'</span></div><h2>'+esc(n.title)+'</h2><p>'+esc(n.desc)+'</p>';
 html+='<hr class="rule"><div class="badge">'+esc(!available(n)?n.blocked:r.unblocked?'В работе':n.status)+'</div>';
 if(r.note)html+='<p class="note last">Закладка · '+esc(r.note)+'</p>';
 if(idx>=0)html+='<h3>'+esc(all[idx])+'</h3>';
 html+='<div class="compact">Шаги · '+r.done.length+' из '+all.length+'</div><progress class="progress" max="'+all.length+'" value="'+r.done.length+'"></progress>';
 if(a&&a.id===n.id){html+='<div class="clock" id="clock">'+clock(elapsed(a))+'</div><div class="buttons">'+btn(a.start?'Пауза':'Продолжить','pause')+btn('На сегодня всё','finish',true)+'</div>'}
 else if(a){html+=btn('Вернуться к занятию','active',true)}
 else if(!available(n)){html+=btn('Отметить условие выполненным','unlock')}
 else if(idx>=0){html+=btn(r.note?'Продолжить занятие':'Начать занятие','start',true)}
 else if(n.repeat){html+=btn('Снова почитать','repeat',true)}
 if(n===rec&&idx>=0&&available(n)&&!a){html+='<p class="compact muted">'+(n.due?'В фокусе из-за близкого срока.':'Доступный следующий шаг с учётом последних занятий.')+'</p>'}
 html+='<details><summary>Этапы и материалы</summary><ol>'+all.map((s,i)=>'<li>'+esc(s)+(r.done.includes(i)?' ✓':'')+'</li>').join('')+'</ol>'+btn('Добавить свой шаг','add')+(n.books?'<p><strong>Очередь чтения</strong></p><ol>'+n.books.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':'')+(n.reference?'<p>'+esc(n.reference)+'</p>':'')+(n.source?'<p><a href="'+esc(n.source)+'" target="_blank" rel="noreferrer">Источник в ChatGPT ↗</a></p>':'')+(n.dict?'<p><a href="'+esc(n.dict)+'" target="_blank" rel="noreferrer">Словарь терминов ИИ ↗</a></p>':'')+'</details>';
 if(n.due||plan.horizon){html+='<details><summary>Темп к сроку</summary><p class="compact">Ориентир для оставшейся работы по этому направлению к '+fmtDate(n.due||plan.horizon)+'.</p><label>Осталось часов<input id="hours" type="number" min="0.1" step="any" value="'+esc(r.hours||'')+'"></label><label>Занятий до срока<input id="visits" type="number" min="1" step="1" value="'+esc(r.visits||'')+'"></label>'+btn('Рассчитать среднее','pace')+'<p id="paceOut" aria-live="polite">'+(r.visits&&r.hours?Math.ceil(r.hours*60/r.visits)+' мин в среднем за занятие':'')+'</p></details>'}
 el('card').innerHTML=html;
 el('filters').innerHTML=['Все','Проекты','Идеи','Учёба'].map(f=>'<button class="btn '+(f===filter?'primary':'')+'" data-filter="'+f+'">'+f+'</button>').join('');
 el('list').innerHTML=nodes.filter(o=>filter==='Все'||o.group===filter).map(o=>'<button class="item '+(o.id===selected?'current':'')+'" data-id="'+o.id+'">'+esc(o.title)+'<span>'+esc(o.due?'До '+fmtDate(o.due):record(o).unblocked?'В работе':o.status)+'</span></button>').join('');
 const history=state.history.slice(0,8);
 el('history').innerHTML='<h2>Мои занятия</h2>'+(history.length?history.map(s=>'<details><summary>'+esc(nodes.find(o=>o.id===s.id)?.title)+' · '+clock(s.ms)+' · '+esc(new Date(s.at).toLocaleDateString('ru-RU'))+'</summary><p>'+esc(s.result)+'</p><p class="last">'+esc(s.note)+'</p></details>').join(''):'<p class="muted">Здесь появится итог первого занятия и место, с которого продолжить.</p>');
}
function finish(){
 const a=state.active,n=chosen();if(!a||a.id!==n.id)return;
 a.ms=elapsed(a);a.start=null;save();render();
 modal('<h2>Итог занятия</h2><p>'+esc(steps(n)[a.step])+'</p><p>Таймер · '+clock(a.ms)+'</p><label>Время в минутах (можно исправить)<input id="mins" type="number" min="0" max="10080" step="any" value="'+Math.round(a.ms/600)/100+'"></label><label class="inline"><input id="done" type="checkbox">Этот шаг завершён</label><label>Где остановился и с чего продолжить<textarea id="note" maxlength="1500" rows="3">'+esc(record(n).note)+'</textarea></label><div class="buttons">'+btn('Сохранить итог','commit',true)+btn('Вернуться','cancel')+'</div>');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.id){select(b.dataset.id,true);return}
 if(b.dataset.filter){filter=b.dataset.filter;render();return}
 const n=chosen(),r=record(n),a=state.active;
 switch(b.dataset.action){
 case 'pace':{const h=el('hours'),v=el('visits');if(!h.value||!v.value||!h.reportValidity()||!v.reportValidity())return;r.hours=Number(h.value);r.visits=Number(v.value);save();el('paceOut').textContent=Math.ceil(r.hours*60/r.visits)+' мин в среднем за занятие';break}
 case 'repeat':if(n.repeat&&next(n)<0){r.extra.push(n.steps[0]);save();render();el('card').querySelector('[data-action="start"]').click()}break;
 case 'start': if(a||!available(n)||next(n)<0)return;
 modal('<div class="badge">'+esc(n.short)+'</div><h2>Войти в тему</h2><p>'+esc(n.warm||'Какой один результат покажет, что этот шаг сделан?')+'</p><label>Твой ответ <input id="warm" autocomplete="off"></label><div class="buttons">'+btn('Ответить и начать','begin',true)+btn('Пропустить вопрос','skip')+btn('Закрыть','cancel')+'</div>');break;
 case 'begin':case 'skip': if(a||!available(n)||next(n)<0)return;if(b.dataset.action==='begin'&&!el('warm').value.trim()){el('warm').focus();return}
 state.active={id:n.id,step:next(n),start:Date.now(),ms:0};save();close();render();break;
 case 'active':select(a.id,true);break;
 case 'pause':if(a.start){a.ms=elapsed(a);a.start=null}else a.start=Date.now();save();render();break;
 case 'finish':finish();break;
 case 'commit':{const input=el('mins');if(!input.value||!input.reportValidity())return;
 const note=el('note').value.trim(),done=el('done').checked,ms=Math.round(Number(input.value)*60000),step=steps(n)[a.step];
 if(done&&!r.done.includes(a.step))r.done.push(a.step);r.note=note;
 const result=(done?'Завершено · ':'В работе · ')+step;state.history.unshift({id:n.id,at:new Date().toISOString(),ms,result,note});state.active=null;save();render();
 modal('<h2>Занятие сохранено</h2><div class="clock">'+clock(ms)+'</div><p>'+esc(result)+'</p><p class="last">'+esc(note||'Следующий шаг: '+(steps(n)[next(n)]||'добавить новый этап'))+'</p>'+btn('К карте','cancel',true));break}
 case 'unlock':modal('<h2>Условие выполнено?</h2><p>'+esc(n.blocked)+'</p><div class="buttons">'+btn('Да, можно начать','confirmUnlock',true)+btn('Вернуться','cancel')+'</div>');break;
 case 'confirmUnlock':r.unblocked=true;save();close();render();break;
 case 'add':modal('<h2>Новый шаг</h2><label>Что хочешь сделать?<input id="newStep" maxlength="250"></label><div class="buttons">'+btn('Добавить','saveStep',true)+btn('Отмена','cancel')+'</div>');break;
 case 'saveStep':{const s=el('newStep').value.trim();if(!s)return;r.extra.push(s);save();close();render();break}
 case 'cancel':close();break;
 }
});
setInterval(()=>{const c=el('clock');if(c&&state.active)c.textContent=clock(elapsed(state.active))},500);
render();
