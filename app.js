'use strict';
const plan=JSON.parse(document.getElementById('plan').textContent);
const byId=new Map(plan.nodes.map(n=>[n.id,n]));
const key='career-quest:'+plan.id, route=plan.route, terms=plan.terms||[];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const two=n=>String(n).padStart(2,'0');
const dateText=v=>new Date(v+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const millis=a=>a.ms+(a.start?Math.max(0,Date.now()-a.start):0);
const duration=ms=>{let n=Math.floor(ms/1000);return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(two).join(':')};
let data;try{data=JSON.parse(localStorage.getItem(key)||'null')}catch{}
data??={};data.items??={};data.history??=[];
const session=data.voyage??={round:1,stop:0,progress:{},reads:{},term:0,active:null,project:0};
function save(){try{localStorage.setItem(key,JSON.stringify(data))}catch{$('notice').textContent='Браузер не сохранил прогресс. Проверь доступное место.'}}
function rec(id){return data.items[id]??={done:[],note:'',extra:[]}}
function reading(id){return session.reads[id]??={book:0,page:0,target:0}}
function steps(id){return [...(plan.guides?.[id]||byId.get(id)?.steps||[]),...(rec(id).extra||[])]}
function nextIndex(id){return steps(id).findIndex((_,i)=>!rec(id).done.includes(i))}
function open(id){
 const n=byId.get(id);if(!n||n.blocked&&!rec(id).unblocked)return false;
 if(plan.readers?.[id])return reading(id).book<plan.readers[id].books.length;
 if(id==='ai')return session.term<terms.length;
 return nextIndex(id)>=0;
}
function project(){const pool=(plan.projectStops||[]).filter(open);if(!pool.length)return null;
 const urgent=pool.find(id=>byId.get(id).due&&new Date(byId.get(id).due+'T23:59:59')-Date.now()<30*86400000);
 return urgent&&session.project%2===0?urgent:pool[session.project%pool.length]}
function stops(){return [...route,project()].filter(Boolean)}
function current(){return stops()[session.stop]}
function advance(){session.stop++;if(session.stop>=stops().length){session.stop=0;session.round++;session.project++}}
function normalize(){if(!plan.nodes.some(n=>open(n.id)&&(route.includes(n.id)||plan.projectStops?.includes(n.id))))return null;
 for(let i=0;i<route.length+3;i++){if(current()&&open(current()))return current();advance()}return null}
function moveAfter(wasProject){if(wasProject){session.stop=0;session.round++;session.project++}else advance();normalize()}
function aiTask(){
 const n=terms[session.term],name=n.term,definition=n.meaning;
 const starter={
 'AI — Artificial Intelligence':['Опиши распознавание речи в телефоне. Что система получает на вход и что выдаёт человеку?','Пример AI вокруг тебя и его результат.','Какая функция телефона понимает речь?'],
 'ML — Machine Learning':['Представь фильтр спама. Назови примеры, по которым он может научиться отличать письма.','Одна пара «пример → правильный ответ».','Как телефон узнаёт нежелательное письмо?'],
 'Dataset':['Вообрази таблицу из десяти квартир. Перечисли три столбца, которые понадобятся для оценки цены.','Названия трёх столбцов и одна строка-пример.','Какие сведения отличают одну квартиру от другой?'],
 'Feature':['Выбери квартиру. Назови два признака, известных до продажи, и объясни, как один из них может быть связан с ценой.','Два признака и их роль.','Что можно измерить перед продажей?']};
 const prompts={3:'Разбери учебную задачу. Опиши, какие данные в ней нужны и какой результат даёт этот метод.',4:'На примере таблицы квартир покажи, где возникает это понятие при подготовке данных.',5:'Нарисуй маленькую нейросеть и отметь место, где используется это понятие.',6:'Набросай вход, главный компонент и выход архитектуры или механизма.',7:'Проследи один запрос к языковой модели. Отметь, на каком этапе появляется это понятие.',8:'Приведи безопасный пример диалога с ассистентом, в котором это понятие имеет значение.',9:'Объясни, какую задачу это решает при обучении модели. Приведи один конкретный пример.',10:'Возьми помощника по книгам. Объясни роль этого понятия при ответе на вопрос читателя.',11:'Предложи пример оценки классификатора. Объясни, что измеряет или выявляет это понятие.',12:'На примере запуска модели объясни назначение понятия и один связанный с ним параметр.',13:'Опиши смысл для пользователя и одно защитное действие или ограничение на простом бытовом примере.',14:'Набросай схему из двух-трёх элементов и покажи роль понятия в работе нервной системы или устройства.'};
 const ex=starter[name]||[prompts[n.section]||'Приведи свой пример применения и объясни, какую задачу он решает.','Одно предложение своими словами и конкретный пример.','Что об этом понятии ты уже знаешь?'];
 return {title:name,body:definition,instruction:n.exercise||ex[0],proof:ex[1],warm:ex[2],meta:'Термин '+(session.term+1)+' / '+terms.length,unit:n.unit}
}
function task(id){
 const n=byId.get(id);if(id==='ai')return aiTask();
 if(plan.readers?.[id]){const r=reading(id),cfg=plan.readers[id];r.target ||=r.page+cfg.pages;
 return {title:cfg.books[r.book],body:'Читай со страницы '+(r.page+1)+' по '+r.target+'. Если уже начал книгу, уточни закладку перед чтением.',instruction:id==='eng'?'Выбери одну фразу героя. Прочитай её вслух и сохрани, если хочешь вернуться к ней.':'Отметь одну идею автора и найди пример из жизни. Если книга закончится раньше, отметь это в итоге шага.',proof:'Последняя прочитанная страница.',warm:id==='eng'?'Какая деталь запомнилась из прошлого чтения? Если начинаешь книгу, что подсказывает название?':'Какое экономическое решение ты принимал на этой неделе?',meta:'Чтение · до '+cfg.pages+' стр.'}}
 const i=nextIndex(id),s=steps(id)[i];return {title:s,body:n.desc,instruction:plan.guides?.[id]?s:'Подготовь результат этого этапа и сохрани ссылку или короткую запись о сделанном.',proof:'Запись о результате, по которой можно продолжить работу.',warm:n.warm||'Какой результат ты хочешь получить в конце этого шага?',meta:'Этап '+(i+1)+' / '+steps(id).length}
}

const world=window.mountWorld($('sky'));
const cameraButton=$('camera');
cameraButton.hidden=!world.supported;
cameraButton.onclick=()=>{const on=cameraButton.getAttribute('aria-pressed')==='false';cameraButton.setAttribute('aria-pressed',String(on));cameraButton.textContent=on?'↩ Панорама':'⟲ Облететь в 3D';$('sky').parentElement.classList.toggle('orbiting',on);world.orbit(on)};
const pos=[[16,69],[34,39],[51,64],[69,31],[86,57]];
const action=(id,label,main=false)=>'<button type="button" data-action="'+id+'" class="'+(main?'primary':'quiet')+'">'+esc(label)+'</button>';
function modal(title,body){const d=$('sheet');d.innerHTML='<h2>'+esc(title)+'</h2>'+body;if(!d.open)d.showModal()}
function closeModal(){if($('sheet').open)$('sheet').close()}
function pace(){if(!plan.horizon||!terms.length)return '';const today=new Date();today.setHours(0,0,0,0);const days=Math.max(0,Math.round((new Date(plan.horizon+'T00:00:00')-today)/86400000)+1),left=terms.length-session.term;
 return '<div class="pace"><div class="row"><b>Словарь AI</b><span class="pct">'+session.term+' / '+terms.length+'</span></div><progress value="'+session.term+'" max="'+terms.length+'"></progress><p>'+(days?Math.ceil(left*7/days)+' терм. в неделю к '+dateText(plan.horizon):'Срок прошёл · осталось '+left+' терминов')+'</p></div>'}
function render(){const id=normalize(),a=session.active;
 $('horizon').textContent=plan.horizon?'До '+dateText(plan.horizon):'';
 $('roundCaption').textContent='Экспедиция  /  Круг '+two(session.round);
 const anchors=route.map((v,i)=>'<span class="pin '+(current()===v?'here':'')+'" style="left:'+pos[i][0]+'%;top:'+pos[i][1]+'%">'+(i+1)+'</span>');$('markers').innerHTML=anchors.join('');
 world.move(session.stop<5?session.stop:4);
 const lane=stops();$('itinerary').innerHTML='<div class="row"><h3>Путь на день</h3><span class="tag">Круг '+two(session.round)+'</span></div><ol class="route">'+lane.map((v,i)=>'<li class="'+(id===v?'current':'')+'"><i>'+(open(v)?two(i+1):'✓')+'</i><span>'+esc(byId.get(v).short)+'</span>'+(id===v?' <small>• сейчас</small>':'')+'</li>').join('')+'</ol>'+pace();
 if(!id){$('mission').innerHTML='<h2>Маршрут пройден</h2><p>Все доступные этапы завершены.</p>';return}
 const n=byId.get(id),t=task(id);
 $('mission').innerHTML='<div class="over"><span class="eyebrow">Текущий шаг · '+esc(n.short)+'</span><span class="muted">'+esc(t.meta)+'</span></div><h2>'+esc(t.title)+'</h2><div class="mission-body"><p>'+esc(t.body)+'</p>'+(t.instruction!==t.title?'<p class="instruction">'+esc(t.instruction)+'</p>':'')+'</div>'+(rec(id).note?'<p class="bookmark sml">'+esc(rec(id).note)+'</p>':'')+(a?'<div class="row"><span class="timer" id="clock">'+duration(millis(a))+'</span><small>Время шага</small></div><div class="actions">'+action('done','Завершить шаг →',true)+action('pause',a.start?'Пауза':'Продолжить')+action('stop','На сегодня всё')+'</div>':'<div class="actions">'+action('warm',session.partial?'Продолжить путь →':'Начать путь →',true)+(plan.readers?.[id]?action('bookmark','Уточнить страницу'):'')+'</div>');
}
function view(which){['voyage','atlas','journal'].forEach(id=>{$(id).hidden=id!==which});document.querySelectorAll('[data-view]').forEach(b=>b.dataset.view===which?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
 if(which==='journal')$('journal').innerHTML='<h1 class="page-title">Журнал экспедиции</h1><div class="content-box journal-list">'+(data.history.length?data.history.map(s=>'<div class="entry"><div class="row"><span class="eyebrow">'+esc(byId.get(s.id)?.short)+'</span><small>'+esc(new Date(s.at).toLocaleDateString('ru-RU'))+' · '+duration(s.ms)+'</small></div><p>'+esc(s.result)+'</p><small>'+esc(s.note)+'</small></div>').join(''):'Здесь появится запись после первого занятия.')+'</div>';
 if(which==='atlas')$('atlas').innerHTML='<h1 class="page-title">Атлас направлений</h1><div class="inventory">'+plan.nodes.map(n=>'<div class="content-box"><span class="eyebrow">'+esc(n.group)+'</span><h3>'+esc(n.title)+'</h3><p>'+esc(n.desc)+'</p>'+(n.due?'<p class="tag">До '+dateText(n.due)+'</p>':'')+'<details><summary>Материалы и этапы</summary><ol>'+steps(n.id).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+(n.books?'<ol>'+n.books.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':'')+(n.id==='ai'?'<p>'+terms.length+' понятий · к '+(plan.horizon?dateText(plan.horizon):'концу маршрута')+'</p>':'')+(n.reference?'<p>'+esc(n.reference)+'</p>':'')+(n.source?'<a href="'+esc(n.source)+'" target="_blank" rel="noreferrer">Открыть источник ↗</a>':'')+(n.blocked?'<p>'+esc(n.blocked)+'</p>'+(!rec(n.id).unblocked?action('release-'+n.id,'Условие выполнено'):'Условие подтверждено'):'')+'</details></div>').join('')+'</div>';
}
function recordSheet(complete){const id=current(),a=session.active;if(!a)return;a.ms=millis(a);a.start=null;save();render();const t=task(id),rd=plan.readers?.[id]?reading(id):null;
 modal(complete?'Завершить шаг':'На сегодня всё','<span class="tag">'+esc(t.title)+'</span><p>'+esc(complete?t.proof:'Сохрани место остановки. При возвращении маршрут продолжится с этого шага.')+'</p><label>Минуты без пауз<input id="minutes" type="number" step="any" min="0" required value="'+Math.round(a.ms/600)/100+'"></label>'+(rd?'<label>Последняя прочитанная страница<input type="number" required min="'+rd.page+'" id="page" value="'+(complete?rd.target:rd.page)+'"></label>'+(complete?'<label class="inline"><input id="bookEnd" type="checkbox">Книга закончена</label>':''):'')+'<label>'+(id==='ai'&&complete?'Объяснение своими словами и пример':'Результат или закладка')+'<textarea id="answer" maxlength="2500" rows="2">'+esc(session.partial||'')+'</textarea></label><p id="err" class="error" role="alert"></p><div class="actions">'+action(complete?'confirm':'end',complete?'К следующему шагу →':'Сохранить итог',true)+action('close','Назад')+'</div>');
}
function commit(complete){const id=current(),a=session.active;if(!a)return;const t=task(id),minutes=$('minutes');if(!minutes.reportValidity())return;
 const note=$('answer').value.trim();if(id==='ai'&&complete&&!note){$('err').textContent='Запиши хотя бы одно предложение о понятии.';return}
 const rd=plan.readers?.[id]?reading(id):null;
 if(rd){const inp=$('page');if(!inp.reportValidity())return;const p=Number(inp.value),bookEnd=$('bookEnd')?.checked;
 if(complete&&!bookEnd&&p<rd.target){$('err').textContent='Для частичного чтения выбери «На сегодня всё». Следующая станция откроется после страницы '+rd.target+' или конца книги.';return}
 rd.page=p;if(complete){rd.target=0;if(bookEnd){rd.book++;rd.page=0}}}
 const ms=Math.round(Number(minutes.value)*60000),result=(complete?'Пройдено · ':'Остановка · ')+t.title;
 data.history.unshift({id,ms,at:new Date().toISOString(),result,note});a.total+=ms;const total=a.total;
 const completed=[...(a.completed||[])];if(complete)completed.push(t.title);
 rec(id).note=note;session.partial=complete?'':note;
 if(complete){const extra=session.stop>=route.length;if(id==='ai')session.term++;else if(!rd)rec(id).done.push(nextIndex(id));moveAfter(extra);session.active=current()?{ms:0,start:Date.now(),total,completed}:null}
 else session.active=null;
 save();closeModal();render();
 if(complete&&!session.active)modal('Экспедиция завершена','<p>Все доступные шаги пройдены.</p><p class="timer">'+duration(total)+'</p>'+action('close','К карте',true));
 if(!complete)modal('Занятие сохранено','<p class="timer">'+duration(total)+'</p>'+(completed.length?'<h3>Пройденные шаги</h3><ul>'+completed.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'')+'<p>'+esc(result)+'</p><p>'+esc(note)+'</p><p class="muted">Продолжение · '+esc(t.title)+'</p>'+action('close','К карте',true));
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.view){view(b.dataset.view);return}const act=b.dataset.action,id=current(),a=session.active;
 if(act?.startsWith('release-')){const n=act.slice(8);rec(n).unblocked=true;save();view('atlas');render();return}
 if(act==='warm'){modal('Войти в тему','<p>'+esc(task(id).warm)+'</p><label>Короткий ответ<input id="focus"></label><div class="actions">'+action('begin','Начать занятие',true)+action('close','Назад')+'</div>');return}
 if(act==='begin'&&!a){session.active={ms:0,start:Date.now(),total:0};save();closeModal();render()}
 if(act==='bookmark'){modal('Закладка','<label>Последняя прочитанная страница<input type="number" min="0" required id="mark" value="'+reading(id).page+'"></label>'+action('mark','Сохранить',true))}
 if(act==='mark'&&$('mark').reportValidity()){const r=reading(id);r.page=Number($('mark').value);r.target=r.page+plan.readers[id].pages;save();closeModal();render()}
 if(act==='pause'&&a){a.ms=millis(a);a.start=a.start?null:Date.now();save();render()}
 if(act==='done')recordSheet(true);if(act==='stop')recordSheet(false);
 if(act==='confirm')commit(true);if(act==='end')commit(false);if(act==='close')closeModal();
});
window.addEventListener('storage',e=>{if(e.key===key)location.reload()});
setInterval(()=>{if($('clock')&&session.active)$('clock').textContent=duration(millis(session.active))},500);
render();
if(data.active&&!data.converted){
 const old=data.active,n=byId.get(old.id);
 const minutes=Math.round(((old.ms||0)+(old.start?Math.max(0,Date.now()-old.start):0))/600)/100;
 modal('Сохранить прежнее занятие','<p>'+esc(n?.steps?.[old.step]||n?.title||'Занятие')+'</p><label>Проверь длительность в минутах<input id="oldMinutes" type="number" min="0" step="any" required value="'+minutes+'"></label><div class="actions"><button id="archive" class="primary">Записать в журнал</button></div>');
 $('archive').onclick=()=>{const m=$('oldMinutes');if(!m.reportValidity())return;data.history.unshift({id:old.id,at:new Date().toISOString(),ms:Number(m.value)*60000,result:'Прежнее занятие · '+(n?.steps?.[old.step]||n?.title||''),note:rec(old.id).note});data.active=null;data.converted=true;save();closeModal()};
}
