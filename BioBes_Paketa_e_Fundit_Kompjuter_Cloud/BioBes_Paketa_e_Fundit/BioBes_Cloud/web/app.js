
'use strict';
const ICONS={
 home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V20h14V9.8M9 20v-6h6v6"/>',
 book:'<path d="M5 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 4v16M11 8h5M11 12h5"/>',
 chart:'<path d="M4 20h16M6 17v-5M11 17V6M16 17V9M21 17V4"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', edit:'<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z"/><path d="m13.8 6.7 3.5 3.5M14 20h6"/>',
 save:'<path d="M5 3h12l3 3v15H4V3h1Z"/><path d="M7 3v6h9V3M7 21v-8h10v8"/>',
 download:'<path d="M12 3v12M8 11l4 4 4-4M4 17v3h16v-3"/>',upload:'<path d="M12 16V4M8 8l4-4 4 4M4 17v3h16v-3"/>',
 alert:'<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4M12 16h.01"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
 box:'<path d="M4 7 12 3l8 4-8 4-8-4ZM4 7v10l8 4 8-4V7M12 11v10"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 stack:'<path d="m3 8 9-5 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
 arrow:'<path d="m7 10 5 5 5-5"/>',trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/>',
 check:'<path d="m5 12 4 4L19 6"/>',eye:'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 printer:'<path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM17 11h2"/>'
};
function icon(name,size=18){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||''}</svg>`}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon,15));
const KEY='biobes-blloku-ditor-v1';
const VERSION=1;
const emptyDB=()=>({version:VERSION,nextNr:1,catalog:{responsibles:[],products:[],employees:[],packages:[],statuses:[],units:[],sources:[]},records:[]});
const str=(v,max=Infinity)=>String(v??'').slice(0,max);
const esc=v=>str(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function'?globalThis.crypto.randomUUID():`r-${Date.now()}-${Math.random().toString(36).slice(2,11)}`;
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateValid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d}
function dayName(s){if(!dateValid(s))return '—';const [y,m,d]=s.split('-').map(Number);return ['E diel','E hënë','E martë','E mërkurë','E enjte','E premte','E shtunë'][new Date(Date.UTC(y,m-1,d)).getUTCDay()]}
function weekNumber(s){if(!dateValid(s))return null;const [y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));const first=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil(((x-first)/86400000+1)/7)}
function formatDate(s){if(!dateValid(s))return '—';const [y,m,d]=s.split('-');return `${d}.${m}.${y}`}
function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(String(v).trim().replace(',','.'));return Number.isFinite(x)?x:NaN}
function fmt(v,digits=2){return new Intl.NumberFormat('sq-AL',{maximumFractionDigits:digits}).format(Number.isFinite(v)?v:0)}
function fmtMaybe(v){return v===null?'—':fmt(v)}
function hoursFor(e){if(!/^\d\d:\d\d$/.test(e.start||'')||!/^\d\d:\d\d$/.test(e.end||''))return null;const [h1,m1]=e.start.split(':').map(Number),[h2,m2]=e.end.split(':').map(Number);if(h1>23||h2>23||m1>59||m2>59)return null;let a=h1*60+m1,b=h2*60+m2;if(b<a)b+=1440;return (b-a)/60}
// Round only aggregate hours, after adding exact minute-based employee durations.
function roundHoursTotal(hours){if(!Number.isFinite(hours))return 0;const minutes=Math.round(hours*60);return Math.floor((minutes+30)/60)}
function newRow(){return {bags:'',kg:'',packaging:'',sum:''}}
function newGroup(){return {product:'',source:'',sourceLabel:'',rows:Array.from({length:25},newRow)}}
// Rreshtat e punonjësve: njëjtë në modelin PDF, në Excel dhe në ndërtuesin e formularit.
const EMPLOYEE_ROWS=12;
function blankRecord(nr){return {id:uid(),nr:String(nr).padStart(3,'0'),date:today(),room:'',responsible:{name:'',signature:''},assistant:{name:'',signature:''},plan:Array.from({length:3},()=>({product:'',status:'',planned:'',actual:'',unit:'',packaging:'',client:'',packageCount:'',comment:''})),employees:Array.from({length:EMPLOYEE_ROWS},()=>({name:'',start:'',end:'',comment:'',signature:''})),weighings:Array.from({length:6},newGroup),comments:'',isDemo:false,attachments:[]}}
function normalizeRecord(r){
 const n=blankRecord(str(r?.nr||'001',12));n.id=str(r?.id||uid(),120);n.nr=str(r?.nr||'001',12);n.date=str(r?.date||'',10);n.room=str(r?.room);n.responsible={name:str(r?.responsible?.name),signature:str(r?.responsible?.signature)};n.assistant={name:str(r?.assistant?.name),signature:str(r?.assistant?.signature)};
 n.plan=n.plan.map((_,i)=>{const x=Array.isArray(r?.plan)?r.plan[i]||{}:{};return {product:str(x.product),status:str(x.status),planned:str(x.planned),actual:str(x.actual),unit:str(x.unit),packaging:str(x.packaging),client:str(x.client),packageCount:str(x.packageCount),comment:str(x.comment)}});
 n.employees=n.employees.map((_,i)=>{const x=Array.isArray(r?.employees)?r.employees[i]||{}:{};return {name:str(x.name),start:str(x.start),end:str(x.end),comment:str(x.comment),signature:str(x.signature)}});
 const originalGroups=Array.isArray(r?.weighings)&&r.weighings.length?r.weighings:n.weighings;n.weighings=originalGroups.map(g=>{g=g||{};const originalRows=Array.isArray(g.rows)?g.rows:[];const rows=originalRows.map(x=>({bags:str(x?.bags),kg:str(x?.kg),packaging:str(x?.packaging),sum:str(x?.sum)}));while(rows.length<25)rows.push(newRow());return {product:str(g.product),source:['','stock','other'].includes(g.source)?g.source:'',sourceLabel:str(g.sourceLabel||(g.source==='stock'?'Marrë nga stoku':g.source==='other'?'Tjetër / jo nga stoku':'')),rows}});
 n.comments=str(r?.comments);n.isDemo=!!r?.isDemo;n.attachments=Array.isArray(r?.attachments)?r.attachments.filter(a=>a&&typeof a.path==='string'&&typeof a.name==='string').map(a=>({name:str(a.name,300),path:str(a.path,600),type:str(a.type,100),size:Number(a.size)||0})):[];return n;
}

function normalizeDB(raw){const d=emptyDB();d.nextNr=Math.max(1,parseInt(raw?.nextNr,10)||1);for(const k of ['responsibles','products','employees','packages','statuses','units'])d.catalog[k]=Array.isArray(raw?.catalog?.[k])?raw.catalog[k].map(x=>str(x).trim()).filter(Boolean):[];d.catalog.sources=Array.isArray(raw?.catalog?.sources)?raw.catalog.sources.filter(x=>x&&str(x.label).trim()&&['stock','other'].includes(x.kind)).map(x=>({label:str(x.label).trim(),kind:x.kind})):[];d.records=Array.isArray(raw?.records)?raw.records.map(normalizeRecord):[];return d}
let storageOK=true,storageNotice='';let db=emptyDB(); // Primary data are loaded from Supabase after sign-in.
const state={route:'dashboard',tab:'details',side:0,mode:'new',draft:null,editorBase:null,dirty:false,weightOpen:new Set([0]),search:'',report:{from:'',to:'',product:'',employee:'',exportType:'products'},attendance:{month:today().slice(0,7),employee:''},print:{mode:'saved',selected:new Set(),search:'',start:'',count:'15',continuationSheets:'0'}};
const view=document.getElementById('view');let toastTimer=null;
function toast(message,kind=''){const e=document.getElementById('toast');e.textContent=message;e.className='toast'+(kind?' '+kind:'');e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{e.hidden=true},4800)}
async function commit(next,options={}){return cloudCommit(next,options)}
function savedMessage(){return 'Të dhënat u ruajtën në cloud.'}
function modal({title,body,confirm='Vazhdo',danger=false}){return new Promise(resolve=>{const root=document.getElementById('dialog-root');root.innerHTML=`<div class="modal-layer" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">${esc(title)}</h2><p>${esc(body)}</p><div class="modal-actions"><button type="button" class="btn" data-modal="cancel">Anulo</button><button type="button" class="btn ${danger?'btn-danger':'btn-primary'}" data-modal="confirm">${esc(confirm)}</button></div></div></div>`;const done=x=>{root.innerHTML='';document.removeEventListener('keydown',onkey);resolve(x)};const onkey=e=>{if(e.key==='Escape')done(false)};root.querySelector('[data-modal="cancel"]').onclick=()=>done(false);root.querySelector('[data-modal="confirm"]').onclick=()=>done(true);root.querySelector('.modal-layer').onclick=e=>{if(e.target.classList.contains('modal-layer'))done(false)};document.addEventListener('keydown',onkey);root.querySelector('[data-modal="confirm"]').focus()})}
async function canLeave(){
 if(batchState.busy||batchIsReview()||(state.route==='batch'&&batchState.groups.some(g=>g.results?.length))){const ok=await modal({title:'Formularë të paruajtur',body:'Nëse vazhdon, formularët e lexuar që nuk janë ruajtur do të humbasin. Gjatë kontrollit mund të shkarkosh draftet.',confirm:'Vazhdo pa ruajtur',danger:true});if(ok){await batchResetCloud(db);state.dirty=false}return ok}
 if(state.route==='editor'&&state.dirty&&state.mode!=='view')return modal({title:'Ndryshime të paruajtura',body:'Nëse vazhdon, ndryshimet në këtë formular nuk do të ruhen.',confirm:'Vazhdo pa ruajtur',danger:true});return true
}
function nextNr(){const max=db.records.reduce((m,r)=>Math.max(m,parseInt(r.nr,10)||0),0);return Math.max(db.nextNr,max+1,1)}
function setPath(obj,path,val){const a=path.split('.');let p=obj;for(let i=0;i<a.length-1;i++){if(p[a[i]]===undefined)return;p=p[a[i]]}p[a[a.length-1]]=val}
function nonempty(v){return v!==null&&v!==undefined&&String(v).trim()!==''}
function distinct(values){const out=[],seen=new Set();for(const value of values){const x=str(value).trim(),k=x.toLocaleLowerCase('sq');if(x&&!seen.has(k)){seen.add(k);out.push(x)}}return out.sort((a,b)=>a.localeCompare(b,'sq'))}
function allProducts(){return distinct([...db.catalog.products,...db.records.flatMap(r=>[...r.plan.map(p=>p.product),...r.weighings.map(w=>w.product)])])}
function updateDatalists(){} // Kept as a compatibility hook; all suggestions use the custom search component.
function updateNav(){const routes=[['dashboard','home','Pamja kryesore'],['records','book','Regjistrimet'],['reports','chart','Raportet'],['batch','upload','Lexo formularë'],['print','printer','Printim & Excel'],['catalog','grid','Të dhënat bazë']];document.getElementById('navigation').innerHTML=routes.map(([id,ic,label])=>`<button type="button" class="nav-btn ${state.route===id?'active':''}" data-nav="${id}" ${state.route===id?'aria-current="page"':''}>${icon(ic,17)}<span>${label}</span>${id==='records'&&db.records.length?`<span class="nav-count">${db.records.length}</span>`:''}</button>`).join('');document.getElementById('breadcrumb').textContent=({dashboard:'Pamja kryesore',records:'Regjistrimet',reports:'Raportet',batch:'Lexo formularë',print:'Printim & Excel',catalog:'Të dhënat bazë',editor:'Formulari ditor'})[state.route]||''}
const BASE_STATUSES=['Planifikuar','Në proces','Përfunduar','Anuluar'];
const BASE_UNITS=['kg','copë','thasë','kuti','l'];
const BASE_SOURCES=[{label:'Marrë nga stoku',kind:'stock'},{label:'Tjetër / jo nga stoku',kind:'other'}];
const fold=x=>str(x).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sq');
let activeCombo=null,activeOptions=[],suppressComboFocus=false;
const comboBox=document.getElementById('combo-popover');
function uniqueOptions(items){const seen=new Set(),out=[];for(const item of items){const o=typeof item==='string'?{label:item,value:item}:item,key=fold(o.label);if(key&&!seen.has(key)){seen.add(key);out.push(o)}}return out}
function comboOptions(kind){
 if(kind==='report-products')kind='products';
 if(kind==='responsibles')return uniqueOptions(db.catalog.responsibles);
 if(kind==='products')return uniqueOptions(allProducts());
 if(kind==='employees')return uniqueOptions([...db.catalog.employees,...db.records.flatMap(r=>r.employees.map(e=>e.name))]);
 if(kind==='packages')return uniqueOptions([...db.catalog.packages,...db.records.flatMap(r=>r.plan.map(p=>p.packaging))]);
 if(kind==='statuses')return uniqueOptions([...BASE_STATUSES,...db.catalog.statuses,...db.records.flatMap(r=>r.plan.map(p=>p.status))]);
 if(kind==='units')return uniqueOptions([...BASE_UNITS,...db.catalog.units,...db.records.flatMap(r=>r.plan.map(p=>p.unit))]);
 if(kind==='sources')return uniqueOptions([...BASE_SOURCES,...db.catalog.sources,...db.records.flatMap(r=>r.weighings.filter(g=>g.source&&g.sourceLabel).map(g=>({label:g.sourceLabel,kind:g.source})))]);
 return [];
}
function hideCombo(){if(activeCombo)activeCombo.setAttribute('aria-expanded','false');activeCombo=null;activeOptions=[];comboBox.hidden=true;comboBox.innerHTML=''}
function positionCombo(el){if(!el||!el.isConnected||comboBox.hidden)return;const r=el.getBoundingClientRect(),w=Math.min(Math.max(r.width,245),Math.max(180,innerWidth-16)),maxH=Math.min(260,innerHeight*.45);comboBox.style.width=w+'px';comboBox.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';const below=innerHeight-r.bottom,above=r.top;if(below<maxH&&above>below){comboBox.style.top=Math.max(8,r.top-Math.min(maxH,above-8))+'px'}else comboBox.style.top=Math.min(innerHeight-45,r.bottom+4)+'px';comboBox.style.maxHeight=maxH+'px'}
function showCombo(el){
 if(!el||el.disabled)return;if(activeCombo&&activeCombo!==el)activeCombo.setAttribute('aria-expanded','false');activeCombo=el;el.setAttribute('aria-expanded','true');
 const query=el.value.trim(),kind=el.dataset.combo,all=comboOptions(kind),listOnOpen=kind==='responsibles';
 const matches=(query?all.filter(x=>fold(x.label).includes(fold(query))):(listOnOpen?all:[])).slice(0,12);activeOptions=matches;
 const exact=all.some(x=>fold(x.label)===fold(query));
 const options=matches.map((x,i)=>`<button type="button" class="combo-option" role="option" data-combo-option="${i}">${icon('search',13)} <span>${esc(x.label)}</span>${kind==='sources'?`<span class="tag" style="margin-left:auto">${x.kind==='stock'?'Stok':'Tjetër'}</span>`:''}</button>`).join('');
 const empty=query?'Nuk u gjet asnjë rezultat. Mund ta shtosh emrin e ri.':listOnOpen?'Lista është bosh. Shkruaj emrin për ta shtuar.':'Shkruaj për të kërkuar.';
 comboBox.innerHTML=(matches.length?options:`<div class="combo-empty">${empty}</div>`)+(query&&!exact?`<button type="button" class="combo-add" data-combo-add="1">${icon('plus',14)} Shto shpejt: “${esc(query)}”</button>`:'');
 comboBox.hidden=false;positionCombo(el)
}
function setComboValue(el,opt,refocus=true){const oldValue=el.dataset.bind?el.dataset.bind.split('.').reduce((o,k)=>o?.[k],state.draft):state.report.product;const oldSource=el.dataset.combo==='sources'?el.dataset.bind.replace(/sourceLabel$/,'source').split('.').reduce((o,k)=>o?.[k],state.draft):null;el.value=opt.label;if(el.dataset.bind&&state.route==='editor'){setPath(state.draft,el.dataset.bind,opt.label);if(el.dataset.combo==='sources')setPath(state.draft,el.dataset.bind.replace(/sourceLabel$/,'source'),opt.kind);if(oldValue!==opt.label||(el.dataset.combo==='sources'&&oldSource!==opt.kind)){state.dirty=true;batchMarkChanged()}updateDerived(el.dataset.bind)}else if(el.dataset.combo==='report-products'){state.report.product=opt.label;hideCombo();if(oldValue!==opt.label)render();return}hideCombo();if(refocus&&el.isConnected&&document.activeElement!==el){suppressComboFocus=true;el.focus();suppressComboFocus=false}}
function chooseComboOption(i){const el=activeCombo,opt=activeOptions[i];if(el&&opt)setComboValue(el,opt)}
function finishCombo(el){if(!el||!el.isConnected||activeCombo!==el)return;const value=el.value.trim(),exact=comboOptions(el.dataset.combo).find(x=>fold(x.label)===fold(value));if(exact){setComboValue(el,exact,false);return}if(el.dataset.combo==='report-products'){if(!value){state.report.product='';hideCombo();render()}else{el.value=state.report.product;hideCombo();toast('Zgjidh një produkt nga rezultatet ose shtoje shpejt.','warn')}return}hideCombo()}
function handleComboKey(e){if(e.key==='Escape'){hideCombo();return true}if(e.key==='ArrowDown'){e.preventDefault();const first=comboBox.querySelector('[data-combo-option], [data-combo-add]');first?.focus();return true}if(e.key==='Enter'&&!comboBox.hidden){e.preventDefault();const value=e.target.value.trim(),exact=activeOptions.findIndex(o=>fold(o.label)===fold(value));if(exact>=0)chooseComboOption(exact);else if(e.target.dataset.combo==='responsibles'&&activeOptions.length){toast('Zgjidh emrin nga lista ose shtoje shpejt.','warn')}else if(activeOptions.length===1)chooseComboOption(0);else if(comboBox.querySelector('[data-combo-add]'))quickAddCombo();return true}return false}
function chooseSourceKind(label){return new Promise(resolve=>{const root=document.getElementById('dialog-root');root.innerHTML=`<div class="modal-layer"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="source-title"><h2 id="source-title">Si llogaritet ky burim?</h2><p>“${esc(label)}” do të ruhet si burim i ri. Zgjidh nëse peshimet me këtë emër merren nga stoku apo janë burim tjetër.</p><div class="modal-actions" style="flex-wrap:wrap"><button class="btn" data-source-choice="cancel">Anulo</button><button class="btn" data-source-choice="other">Tjetër / jo nga stoku</button><button class="btn btn-primary" data-source-choice="stock">Marrë nga stoku</button></div></div></div>`;const done=v=>{root.innerHTML='';document.removeEventListener('keydown',onkey);resolve(v)};const onkey=e=>{if(e.key==='Escape')done(null)};root.querySelectorAll('[data-source-choice]').forEach(b=>b.onclick=()=>done(b.dataset.sourceChoice==='cancel'?null:b.dataset.sourceChoice));document.addEventListener('keydown',onkey);root.querySelector('[data-source-choice="stock"]').focus()})}
async function quickAddCombo(){const el=activeCombo;if(!el)return;const label=el.value.trim(),rawKind=el.dataset.combo,kind=rawKind==='report-products'?'products':rawKind;if(!label||!['responsibles','products','employees','packages','statuses','units','sources'].includes(kind))return;const existing=comboOptions(kind).find(o=>fold(o.label)===fold(label));if(existing){setComboValue(el,existing);return}let choice=null;if(kind==='sources'){choice=await chooseSourceKind(label);if(!choice){if(el.isConnected){el.focus();showCombo(el)}return}}const next=clone(db);next.catalog[kind].push(kind==='sources'?{label,kind:choice}:label);if(!await commit(next))return;const option={label,value:label,kind:choice};if(el.isConnected)setComboValue(el,option);toast(storageOK?'U shtua dhe u ruajt në listën bazë.':'U shtua vetëm për këtë sesion; shkarko backup.',''+(storageOK?'':'warn'))}
function resolveExactSources(r){for(const g of r.weighings){if(!g.sourceLabel.trim()){g.source='';continue}const exact=comboOptions('sources').find(o=>fold(o.label)===fold(g.sourceLabel));if(exact){g.sourceLabel=exact.label;g.source=exact.kind}}for(const p of r.plan){for(const [key,kind] of [['status','statuses'],['unit','units']]){const exact=comboOptions(kind).find(o=>fold(o.label)===fold(p[key]));if(exact)p[key]=exact.label}}}
comboBox.addEventListener('mousedown',e=>e.preventDefault());

function addWeighing(){if(!state.draft||state.mode==='view')return;state.draft.weighings.push(newGroup());const index=state.draft.weighings.length-1;state.weightOpen=new Set([index]);state.dirty=true;render();const card=view.querySelector(`[data-weight-index="${index}"]`);card?.scrollIntoView({block:'start',behavior:'smooth'})}
function addWeightRows(index,count){if(!state.draft||state.mode==='view')return;const g=state.draft.weighings[index];if(!g||![1,10].includes(count))return;g.rows.push(...Array.from({length:count},newRow));state.weightOpen.add(index);state.dirty=true;render()}
async function deleteWeighing(index){if(!state.draft||state.mode==='view')return;const list=state.draft.weighings,g=list[index];if(!g)return;if(list.length<=1){toast('Duhet të mbetet të paktën një peshim.','warn');return}if(g.product||g.source||g.sourceLabel||g.rows.some(row=>Object.values(row).some(nonempty))){if(!await modal({title:'Fshi peshimin?',body:`Peshimi ${index+1} dhe rreshtat e tij do të hiqen nga formulari.`,confirm:'Fshi peshimin',danger:true}))return}list.splice(index,1);state.weightOpen=new Set([...state.weightOpen].filter(x=>x!==index).map(x=>x>index?x-1:x));state.dirty=true;render()}
async function deleteWeightRow(index,row){if(!state.draft||state.mode==='view')return;const g=state.draft.weighings[index],r=g?.rows[row];if(!r)return;if(g.rows.length<=1){toast('Duhet të mbetet të paktën një rresht.','warn');return}if(Object.values(r).some(nonempty)){if(!await modal({title:'Fshi rreshtin?',body:`Rreshti ${row+1} i peshimit ${index+1} dhe vlerat e tij do të hiqen.`,confirm:'Fshi rreshtin',danger:true}))return}g.rows.splice(row,1);state.weightOpen.add(index);state.dirty=true;render()}

function groupTotals(g){const out={bags:0,kg:0,packaging:0,sum:0,used:0,seen:{bags:false,kg:false,packaging:false,sum:false}};for(const row of g.rows){let used=false;for(const k of ['bags','kg','packaging','sum']){const v=num(row[k]);if(v!==null&&!Number.isNaN(v)){out[k]+=v;out.seen[k]=true;used=true}}if(used)out.used++}return out}
function metrics(records,product=''){
 const norm=x=>str(x).trim().toLocaleLowerCase('sq'),matches=x=>!product||norm(x)===norm(product),pmap=new Map(),kmap=new Map(),cmap=new Map(),emap=new Map(),smap=new Map(),tables=[];let producedKg=0,hours=0,stockKg=0,unknownKg=0,stockMissingKg=0;
 for(const r of records){
  for(const p of r.plan){
   if(!p.product.trim()||!matches(p.product))continue;
   const count=num(p.packageCount),pack=p.packaging.trim()||'Pa paketim të shënuar';
   if(count!==null&&!Number.isNaN(count)&&p.packaging.trim()){const key=norm(pack),v=cmap.get(key)||{packaging:pack,count:0,records:new Set()};v.count+=count;v.records.add(r.id);cmap.set(key,v)}
   const q=num(p.actual);if(q===null||Number.isNaN(q)||!p.unit)continue;
   const key=JSON.stringify([norm(p.product),norm(pack),p.unit]),v=pmap.get(key)||{product:p.product,packaging:pack,unit:p.unit,qty:0,records:new Set()};v.qty+=q;v.records.add(r.id);pmap.set(key,v);
   const kkey=JSON.stringify([norm(pack),p.unit]),kv=kmap.get(kkey)||{packaging:pack,unit:p.unit,qty:0,records:new Set()};kv.qty+=q;kv.records.add(r.id);kmap.set(kkey,kv);if(p.unit==='kg')producedKg+=q;
  }
  for(const e of r.employees){const h=hoursFor(e);if(!e.name.trim()||h===null)continue;hours+=h;const key=norm(e.name),v=emap.get(key)||{name:e.name,hours:0,records:new Set()};v.hours+=h;v.records.add(r.id);emap.set(key,v)}
  r.weighings.forEach((g,i)=>{if(!matches(g.product))return;const t=groupTotals(g);if(!t.used)return;const source=g.sourceLabel?`${g.sourceLabel}${g.source==='stock'?' (stok)':g.source==='other'?' (tjetër)':''}`:g.source==='stock'?'Marrë nga stoku':g.source==='other'?'Tjetër / jo nga stoku':'I papërcaktuar';tables.push({date:r.date,nr:r.nr,group:i+1,product:g.product,source,totals:t});if(g.source==='stock'&&g.product.trim()){stockKg+=t.kg;stockMissingKg+=g.rows.filter(row=>Object.values(row).some(nonempty)&&!nonempty(row.kg)).length;const key=norm(g.product),v=smap.get(key)||{product:g.product,kg:0,bags:0,rows:0,records:new Set()};v.kg+=t.kg;v.bags+=t.bags;v.rows+=t.used;v.records.add(r.id);smap.set(key,v)}else if(!g.source){unknownKg+=t.kg}});
 }
 const sort=(x,key)=>[...x.values()].sort((a,b)=>String(a[key]).localeCompare(String(b[key]),'sq'));
 return {producedKg,hours,stockKg,unknownKg,stockMissingKg,products:sort(pmap,'product'),packages:sort(kmap,'packaging'),packageCounts:sort(cmap,'packaging'),employees:sort(emap,'name'),stock:sort(smap,'product'),tables};
}
function weighingStages(record){if(!record)return [];const all=record.weighings||[],initial=[null,null],extra=[];for(let base=0;base<all.length;base+=3){const batch=all.slice(base,base+3),maxRows=Math.max(1,...batch.map(g=>g.rows.length)),segments=Math.ceil(maxRows/25);for(let seg=0;seg<segments;seg++){const offset=seg*25,groups=Array.from({length:3},(_,k)=>{const group=batch[k];return group&&offset<group.rows.length?{index:base+k,group,rows:group.rows.slice(offset,offset+25)}:null});const stage={offset,groups};if(seg===0&&base<6)initial[base/3]=stage;else extra.push(stage)}}return [...initial,...extra]}
function planPrintPages(items){const pages=[];for(const item of items){const stages=weighingStages(item.record),needed=item.record?Math.max(2,stages.length):2+2*(item.continuationSheets||0),count=needed+(needed%2);for(let i=0;i<count;i++)pages.push({kind:i%2?'back':'front',item,stages:[stages[i]||null],continuation:i>=2,recordPage:i+1,recordPages:count})}return pages}

function embeddedBytes(id){const s=document.getElementById(id).textContent.trim(),raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function printNum(value){const n=num(value);return n===null||Number.isNaN(n)?'':fmt(n)}
function planPrintComment(p){return str(p.comment)}
function weighingTitle(g){return (g.product||'').trim()+(g.product&&g.source==='stock'?' (stok)':g.product&&g.source==='other'?' (tjetër)':'')}
function labelWarnings(warnings){return [...new Set(warnings)]}
function pdfSanitize(text,font,warnings,label){const supported=font._biobesCharSet||(font._biobesCharSet=new Set(font.getCharacterSet()));let replaced=false;let out='';for(const ch of str(text)){const code=ch.codePointAt(0);if(ch==='\n'||ch==='\r'||ch==='\t'){out+=ch;continue}if(supported.has(code))out+=ch;else{out+='?';replaced=true}}if(replaced)warnings.push(`${label}: disa shenja nuk mbështeten nga fonti`);return out}
function fitLine(font,text,width,maxSize,minSize,warnings,label){let t=pdfSanitize(text,font,warnings,label).replace(/[\r\n\t]+/g,' ').trim();let size=maxSize;while(size>minSize&&font.widthOfTextAtSize(t,size)>width)size=Math.max(minSize,size-.25);if(font.widthOfTextAtSize(t,size)>width){const original=t;while(t.length&&font.widthOfTextAtSize(t+'…',size)>width)t=Array.from(t).slice(0,-1).join('');t+=(t?'…':'');if(t!==original)warnings.push(`${label}: tekst i shkurtuar në print`)}return {text:t,size}}
// Map the original PDF coordinates to the enlarged employee rows on page 1.
// The original template was segmented and rescaled while preserving two A4 pages.
const enlargedPdfFrontPages=new WeakSet();
function pdfFrontY(y){const segments=[[0,75.67,1],[75.67,118.66,.75],[118.66,167.03,1],[167.03,215.03,.88],[215.03,263.391,1],[263.391,407.391,1.35],[407.391,816,1]];let out=0;for(const [a,b,f] of segments){if(y<=b)return out+(y-a)*.96*f;out+=(b-a)*.96*f}return out+(y-816)*.96}
function pdfPrintRect(page,rect){if(!enlargedPdfFrontPages.has(page))return rect;const x=(595.2756-595.2756*.96)/2;return [x+rect[0]*.96,pdfFrontY(rect[1]),x+rect[2]*.96,pdfFrontY(rect[3])]}
function drawFit(page,font,text,rect,warnings,label,options={}){rect=pdfPrintRect(page,rect);if(!nonempty(text))return;const [x0,top,x1,bottom]=rect,w=Math.max(1,x1-x0-4),line=fitLine(font,text,w,options.size||8,options.min||5,warnings,label);if(!line.text)return;const x=options.center?x0+(x1-x0-font.widthOfTextAtSize(line.text,line.size))/2:x0+2;const y=page.getHeight()-(top+bottom)/2-line.size*.32;page.drawText(line.text,{x,y,size:line.size,font,color:PDFLib.rgb(0,0,0)})}
function wrapMeasured(text,font,size,width,maxLines,warnings,label){const safe=pdfSanitize(text,font,warnings,label).replace(/\r\n?/g,'\n');const lines=[];let overflow=false;const blocks=safe.split('\n');for(let bi=0;bi<blocks.length;bi++){const words=blocks[bi].split(/\s+/).filter(Boolean);let line='';if(!words.length){lines.push('');if(lines.length>maxLines){overflow=true;break}continue}for(let word of words){let test=line?line+' '+word:word;if(font.widthOfTextAtSize(test,size)<=width){line=test;continue}if(line){lines.push(line);line='';if(lines.length>=maxLines){overflow=true;break}}while(word&&font.widthOfTextAtSize(word,size)>width){let part='';for(const ch of Array.from(word)){if(part&&font.widthOfTextAtSize(part+ch,size)>width)break;part+=ch}if(!part)part=Array.from(word)[0];lines.push(part);word=word.slice(part.length);if(lines.length>=maxLines){overflow=true;break}}if(overflow)break;line=word}if(overflow)break;if(line)lines.push(line);if(lines.length>=maxLines&&bi<blocks.length-1){overflow=true;break}}
 if(lines.length>maxLines){lines.length=maxLines;overflow=true}if(overflow){warnings.push(`${label}: teksti tejkalon hapësirën e formularit`);let last=lines[maxLines-1]||'';while(last&&font.widthOfTextAtSize(last+'…',size)>width)last=Array.from(last).slice(0,-1).join('');lines[maxLines-1]=last+'…'}return lines.slice(0,maxLines)}
function drawWrappedInBox(page,font,text,rect,warnings,label,size=7){rect=pdfPrintRect(page,rect);if(!nonempty(text))return;const [x0,top,x1,bottom]=rect,lineHeight=size*1.12,maxLines=Math.max(1,Math.floor((bottom-top-4)/lineHeight)),lines=wrapMeasured(text,font,size,x1-x0-4,maxLines,warnings,label),blockH=lines.length*lineHeight,start=top+((bottom-top)-blockH)/2;lines.forEach((line,i)=>{if(line)page.drawText(line,{x:x0+2,y:page.getHeight()-(start+i*lineHeight+size*.83),size,font,color:PDFLib.rgb(0,0,0)})})}
const EMPLOYEE_TOP=263.3914,EMPLOYEE_PITCH=12;   // rreshtat e punonjësve tek modeli PDF
const APPROVED_FRONT_TOP=EMPLOYEE_TOP+EMPLOYEE_PITCH*EMPLOYEE_ROWS,APPROVED_PESH_BOTTOM=784.1343;   // peshat fillojnë menjëherë poshtë tabelës dhe mbarojnë te vija e fiksuar e shumës
const APPROVED_GRID={frontTop:APPROVED_FRONT_TOP,backTop:84.0,headerHeight:510.0629-445.5755,rowHeight:(APPROVED_PESH_BOTTOM-(APPROVED_FRONT_TOP+(510.0629-445.5755)))/25,totalHeight:803.83875-APPROVED_PESH_BOTTOM,edges:[[40.0252,78.382,123.9955,165.4623,207.9658],[220.9242,259.281,304.8945,346.3613,388.8648],[401.8232,440.18,485.7935,527.2603,569.7638]]};
function eraseInside(page,rect){rect=pdfPrintRect(page,rect);const [x0,t,x1,b]=rect;page.drawRectangle({x:x0+.7,y:page.getHeight()-b+.7,width:Math.max(0,x1-x0-1.4),height:Math.max(0,b-t-1.4),color:PDFLib.rgb(1,1,1)})}
function printHeaderField(page,font,text,box,warnings,label,options={}){eraseInside(page,box);drawFit(page,font,text,box,warnings,label,options)}
function drawApprovedWeighings(page,stage,which,font,bold,warnings,tag){if(!stage)return;const top=which==='front'?APPROVED_GRID.frontTop:APPROVED_GRID.backTop,data=top+APPROVED_GRID.headerHeight,rowH=APPROVED_GRID.rowHeight,keys=['bags','kg','packaging','sum'];
 if(stage.offset){for(let j=0;j<25;j++){const y=data+j*rowH;eraseInside(page,[25.52,y,40.02,y+rowH]);drawFit(page,bold,String(stage.offset+j+1),[25.52,y,40.02,y+rowH],warnings,`${tag} rreshti`,{size:7,min:4,center:true})}}
 stage.groups.forEach((part,k)=>{if(!part)return;const e=APPROVED_GRID.edges[k],g=part.group,head=[e[0],top+(427.096-407.3914),e[4],top+(454.861-407.3914)],title=weighingTitle(g);if(nonempty(title)||part.index>=6){eraseInside(page,[head[0],head[1],head[2],head[1]+13]);drawFit(page,bold,`PESHIMI ${part.index>=6?part.index+1:k+1} —`,[e[0]+1,head[1],e[0]+57,head[1]+13],warnings,`${tag} peshimi`,{size:7.5,min:4.8});drawFit(page,font,title,[e[0]+57,head[1],e[4]-1,head[1]+13],warnings,`${tag} produkti i peshimit`,{size:7,min:4.6})}
  part.rows.forEach((row,j)=>{const y=data+j*rowH;keys.forEach((key,c)=>drawFit(page,font,nonempty(row[key])?printNum(row[key]):'',[e[c],y,e[c+1],y+rowH],warnings,`${tag} peshimi ${part.index+1}, rreshti ${stage.offset+j+1}`,{size:7.4,min:4.4,center:true}))});
  const total=groupTotals({rows:part.rows}),y=data+25*rowH;keys.forEach((key,c)=>drawFit(page,bold,total.seen[key]&&total[key]!==0?fmt(total[key]):'',[e[c],y,e[c+1],y+APPROVED_GRID.totalHeight],warnings,`${tag} shuma e peshimit`,{size:7.2,min:4.4,center:true}));
 });
}
// Acrobat/Reader executes WillPrint at the computer's current date/time.
// Other viewers may display the placeholder instead; never substitute creation time.
function addPrintClockField(doc,page){const form=doc.getForm(),field=form.createTextField(`print_stamp_${doc.getPageCount()}`);field.setText('Data/ora e printimit: plotesohet ne Acrobat');field.addToPage(page,{x:165,y:page.getHeight()-833,width:265,height:15,font:doc.__clockFont,textColor:PDFLib.rgb(0,0,0),borderWidth:0});field.setFontSize(7.5);field.enableReadOnly()}
function addPrintClockActions(doc){const {PDFName,PDFString}=PDFLib;const make=code=>doc.context.obj({S:PDFName.of('JavaScript'),JS:PDFString.of(code)});const count=doc.getPageCount(),prefix=`for (var i=1;i<=${count};i++) { var f=this.getField("print_stamp_"+i); if(f) f.value=`;const will=make('var s="Data dhe ora e printimit: " + util.printd("dd.mm.yyyy HH:MM", new Date()); '+prefix+'s; }'),did=make(prefix+'"Data/ora e printimit: plotesohet ne Acrobat"; }');doc.catalog.set(PDFName.of('AA'),doc.context.obj({WP:will,DP:did}))}
async function generatePrintablePDF(items){const {PDFDocument,PDFName,PDFBool}=PDFLib,source=await PDFDocument.load(embeddedBytes('approved-pdf')),out=await PDFDocument.create();out.registerFontkit(fontkit);const font=await out.embedFont(embeddedBytes('font-regular'),{subset:true}),bold=await out.embedFont(embeddedBytes('font-bold'),{subset:true}),warnings=[];out.__clockFont=await out.embedFont(PDFLib.StandardFonts.Helvetica);out.setTitle('BioBes – Formularë ditorë');out.catalog.set(PDFName.of('ViewerPreferences'),out.context.obj({Duplex:PDFName.of('DuplexFlipLongEdge'),PrintScaling:PDFName.of('None'),PickTrayByPDFSize:PDFBool.True}));
 for(const layout of planPrintPages(items)){const [page]=await out.copyPages(source,[layout.kind==='front'?0:1]);out.addPage(page);if(layout.kind==='front')enlargedPdfFrontPages.add(page);addPrintClockField(out,page);const r=layout.item.record,tag=`Nr. ${layout.item.nr}`,nrbox=layout.kind==='front'?[101.19,50.59,165.46,75.67]:[101.19,25.51,165.46,50.59];printHeaderField(page,bold,`Nr.: ${layout.item.nr}`,nrbox,warnings,`${tag} numri`,{size:8.5,min:5});
  if(r&&layout.kind==='front'){
   if(nonempty(r.room))printHeaderField(page,bold,`DHOMA ${r.room}`,[101.19,25.51,569.76,50.59],warnings,`${tag} dhoma`,{size:18,min:9,center:true});
   if(dateValid(r.date)){printHeaderField(page,bold,`Data: ${formatDate(r.date)}`,[165.46,50.59,346.36,75.67],warnings,`${tag} data`,{size:8.5});printHeaderField(page,bold,`Dita: ${dayName(r.date)}`,[346.36,50.59,485.79,75.67],warnings,`${tag} dita`,{size:8.5});printHeaderField(page,bold,`Java: ${weekNumber(r.date)??''}`,[485.79,50.59,569.76,75.67],warnings,`${tag} java`,{size:8.5})}
   if(!layout.continuation){drawFit(page,font,r.responsible.name,[124,75.67,401.82,97.16],warnings,`${tag} përgjegjësja`);drawFit(page,font,r.responsible.signature,[440.18,75.67,569.76,97.16],warnings,`${tag} firma`);drawFit(page,font,r.assistant.name,[124,97.16,401.82,118.66],warnings,`${tag} ndihmësja`);drawFit(page,font,r.assistant.signature,[440.18,97.16,569.76,118.66],warnings,`${tag} firma ndihmëses`);
    const pl=[59.20398,144.7289,186.71405,240.1026,325.6279,388.8648,569.76379];r.plan.forEach((p,i)=>{const t=167.0258+i*16,b=t+16;for(const [x0,x1,v,label] of [[pl[0],pl[1],p.product,'produkti'],[pl[1],pl[2],p.status,'statusi'],[pl[2],pl[3],nonempty(p.planned)?`${printNum(p.planned)} ${p.unit||''}`.trim():'','sasia e porositur'],[pl[3],pl[4],p.packaging,'paketimi'],[pl[4],pl[5],p.client,'klienti']])drawFit(page,font,v,[x0,t,x1,b],warnings,`${tag} ${label} ${i+1}`,{size:7.2,min:4.4});drawWrappedInBox(page,font,planPrintComment(p),[pl[5],t,pl[6],b],warnings,`${tag} komente produkti ${i+1}`,6.6)});
    const sl=[59.20398,207.9658,240.1026,282.08775,321.1854,479.174,569.76379];r.employees.forEach((e,i)=>{const t=EMPLOYEE_TOP+i*EMPLOYEE_PITCH,b=t+EMPLOYEE_PITCH,h=hoursFor(e);drawFit(page,font,e.name,[sl[0],t,sl[1],b],warnings,`${tag} punonjësi ${i+1}`,{size:6.9,min:4.3});drawFit(page,font,e.start,[sl[1],t,sl[2],b],warnings,`${tag} fillimi ${i+1}`,{size:6.8,min:4.3,center:true});drawFit(page,font,e.end,[sl[2],t,sl[3],b],warnings,`${tag} mbarimi ${i+1}`,{size:6.8,min:4.3,center:true});drawFit(page,font,h===null?'':fmt(h),[sl[3],t,sl[4],b],warnings,`${tag} orët ${i+1}`,{size:6.8,min:4.3,center:true});drawFit(page,font,e.comment,[sl[4],t,sl[5],b],warnings,`${tag} komenti i punonjësit ${i+1}`,{size:6.8,min:4.3});drawFit(page,font,e.signature,[sl[5],t,sl[6],b],warnings,`${tag} firma e punonjësit ${i+1}`,{size:6.8,min:4.3})});
   }
  }
  if(r&&layout.kind==='back'&&!layout.continuation&&nonempty(r.comments)){const lines=wrapMeasured(r.comments,font,9,536,5,warnings,`${tag} komentet`);lines.forEach((line,i)=>{if(line)page.drawText(line,{x:28,y:page.getHeight()-(592+i*45),size:9,font,color:PDFLib.rgb(0,0,0)})})}
  drawApprovedWeighings(page,layout.stages[0],layout.kind,font,bold,warnings,tag);
 }
 addPrintClockActions(out);return {bytes:await out.save(),warnings:labelWarnings(warnings)};
}

const XML_MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main',XML_REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships',XML_PKG='http://schemas.openxmlformats.org/package/2006/relationships',XML_TYPES='http://schemas.openxmlformats.org/package/2006/content-types';
function xmlRead(bytes){const x=new DOMParser().parseFromString(fflate.strFromU8(bytes),'application/xml');if(x.querySelector('parsererror'))throw new Error('Excel XML template error');return x}
function xmlSave(doc){return fflate.strToU8(new XMLSerializer().serializeToString(doc))}
function nodes(doc,ns,name){return [...doc.getElementsByTagNameNS(ns,name)]}
function cleanXmlValue(v){return str(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,' ')}
function makeSheetTools(doc){const map=new Map(nodes(doc,XML_MAIN,'c').map(c=>[c.getAttribute('r'),c]));function reset(c){c.removeAttribute('t');for(const child of [...c.childNodes])if(child.nodeType===1&&['f','v','is'].includes(child.localName))c.removeChild(child)}return {
 text(addr,value){const c=map.get(addr);if(!c)throw new Error('Missing Excel cell '+addr);if(value===null||value===undefined||String(value)==='')return;reset(c);c.setAttribute('t','inlineStr');const is=doc.createElementNS(XML_MAIN,'is'),t=doc.createElementNS(XML_MAIN,'t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=cleanXmlValue(value).slice(0,32767);is.appendChild(t);c.appendChild(is)},
 number(addr,value){const c=map.get(addr);if(!c)throw new Error('Missing Excel cell '+addr);const v=num(value);if(v===null||Number.isNaN(v))return;reset(c);const n=doc.createElementNS(XML_MAIN,'v');n.textContent=String(v);c.appendChild(n)},
 formula(addr,value,cached){const c=map.get(addr);if(!c)throw new Error('Missing Excel cell '+addr);reset(c);const f=doc.createElementNS(XML_MAIN,'f');f.textContent=value;c.appendChild(f);const v=doc.createElementNS(XML_MAIN,'v');if(cached!==null&&cached!==undefined&&cached!==''){if(typeof cached==='string')c.setAttribute('t','str');v.textContent=String(cached)}else c.setAttribute('t','str');c.appendChild(v)}
 }}
const EMPLOYEE_TOP_ROW=12;   // rreshti i parë i punonjësve në fletën e modelit
function excelTime(s){if(!/^\d\d:\d\d$/.test(s||''))return '';const [h,m]=s.split(':').map(Number);return (h*60+m)/1440}
function excelCommentLines(text,warnings,label){const lines=[],parts=str(text).replace(/\r\n?/g,'\n').split('\n');let overflow=false;for(let i=0;i<parts.length;i++){let block=parts[i];if(!block){lines.push('');if(lines.length>=5&&i<parts.length-1){overflow=true;break}continue}while(block.length){let cut=Math.min(108,block.length);if(cut<block.length){const sp=block.lastIndexOf(' ',cut);if(sp>50)cut=sp}if(cut<block.length&&/[\uD800-\uDBFF]/.test(block[cut-1]))cut--;lines.push(block.slice(0,cut));block=block.slice(cut).replace(/^\s+/,'');if(lines.length>=5&&(block||i<parts.length-1)){overflow=true;break}}if(overflow)break}if(overflow){warnings.push(`${label}: komentet tejkalojnë 5 rreshtat e formularit`);if(lines[4])lines[4]=lines[4].slice(0,105)+'…'}return lines.slice(0,5)}
function populateApprovedExcelStage(t,stage,config,warnings,tag){if(!stage)return;const {start,total,head}=config,cols=[['B','D','F','H'],['K','M','O','R'],['U','W','Z','AB']],keys=['bags','kg','packaging','sum'];if(stage.offset)for(let j=0;j<25;j++)t.number(`A${start+j}`,stage.offset+j+1);for(let k=0;k<3;k++){const part=stage.groups[k];if(!part)continue;const g=part.group,title=weighingTitle(g);if(title||part.index>=6)t.text(`${cols[k][0]}${head}`,`PESHIMI ${part.index>=6?part.index+1:k+1} — ${title}\n____________________________`);if(title.length>28)warnings.push(`${tag}: emri te peshimi ${part.index+1} mund të mos duket i plotë në print`);part.rows.forEach((row,j)=>keys.forEach((key,c)=>t.number(`${cols[k][c]}${start+j}`,row[key])));const sum=groupTotals({rows:part.rows});keys.forEach((key,c)=>{const col=cols[k][c],v=sum[key];t.formula(`${col}${total}`,`IF(SUM(${col}${start}:${col}${start+24})=0,"",SUM(${col}${start}:${col}${start+24}))`,sum.seen[key]&&v!==0?v:'')})}}
function populateApprovedExcelSheet(doc,front,back,warnings){const t=makeSheetTools(doc),r=front.item.record,tag=`Nr. ${front.item.nr}`,numLabel=`Nr.: ${front.item.nr}`;t.text('E2',numLabel);t.formula('E55','E2',numLabel);
 if(r){if(nonempty(r.room))t.text('E1',`DHOMA ${r.room}`);if(dateValid(r.date)){t.text('H2',`Data: ${formatDate(r.date)}`);t.text('R2',`Dita: ${dayName(r.date)}`);t.text('Z2',`Java: ${weekNumber(r.date)??''}`)}
  if(!front.continuation){t.text('F3',r.responsible.name);t.text('W3',r.responsible.signature);t.text('F4',r.assistant.name);t.text('W4',r.assistant.signature);r.plan.forEach((p,i)=>{const row=7+i;t.text(`C${row}`,p.product);t.text(`G${row}`,p.status);if(nonempty(p.planned)){if(p.unit)t.text(`I${row}`,`${printNum(p.planned)} ${p.unit}`);else t.number(`I${row}`,p.planned)}t.text(`L${row}`,p.packaging);t.text(`Q${row}`,p.client);t.text(`T${row}`,planPrintComment(p));if(str(p.comment).length>90)warnings.push(`${tag}: komentet e produktit ${i+1} mund të shkurtohen në print`)});
   r.employees.forEach((e,i)=>{const row=EMPLOYEE_TOP_ROW+i,h=hoursFor(e);t.text(`C${row}`,e.name);t.number(`J${row}`,excelTime(e.start));t.number(`L${row}`,excelTime(e.end));t.formula(`N${row}`,`IF(OR(J${row}="",L${row}=""),"",ROUND(MOD(L${row}-J${row},1)*24,2))`,h===null?'':Math.round(h*100)/100);t.text(`P${row}`,e.comment);t.text(`Y${row}`,e.signature)});
  }
  if(!back.continuation){const lines=excelCommentLines(r.comments,warnings,tag);lines.forEach((line,i)=>t.text(`A${88+i*2}`,line))}
 }
 populateApprovedExcelStage(t,front.stages[0],{start:27,total:52,head:25},warnings,tag);populateApprovedExcelStage(t,back.stages[0],{start:61,total:86,head:59},warnings,tag);
}

function xmlEscapeText(s){return cleanXmlValue(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function splitExcelString(s,max=30000){const out=[];for(let i=0;i<s.length;){let end=Math.min(i+max,s.length);if(end<s.length&&/[\uD800-\uDBFF]/.test(s[end-1]))end--;out.push(s.slice(i,end));i=end}return out.length?out:['']}
function dataSheetXML(items){const cell=(ref,val)=>`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscapeText(val)}</t></is></c>`;let rows=`<row r="1">${cell('A1','Nr. formulari')}${cell('B1','Pjesa')}${cell('C1','JSON i plotë i regjistrimit')}</row>`,line=2;for(const item of items){if(!item.record)continue;const json=JSON.stringify({...item.record,attachments:[]}).replace(/[\uFFFE\uFFFF]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));const parts=splitExcelString(json);parts.forEach((part,i)=>{rows+=`<row r="${line}">${cell('A'+line,item.nr)}${cell('B'+line,`${i+1}/${parts.length}`)}${cell('C'+line,part)}</row>`;line++})}return fflate.strToU8(`<worksheet xmlns="${XML_MAIN}"><sheetData>${rows}</sheetData></worksheet>`)}
async function generateFormWorkbook(items){const zip=fflate.unzipSync(embeddedBytes('approved-xlsx')),template={sheet:zip['xl/worksheets/sheet1.xml'],drawing:zip['xl/drawings/drawing1.xml'],drawingRel:zip['xl/drawings/_rels/drawing1.xml.rels'],sheetRel:zip['xl/worksheets/_rels/sheet1.xml.rels']},wb=xmlRead(zip['xl/workbook.xml']),rels=xmlRead(zip['xl/_rels/workbook.xml.rels']),types=xmlRead(zip['[Content_Types].xml']),warnings=[];
 for(const k of Object.keys(zip))if(/^xl\/(?:worksheets\/sheet\d+\.xml|worksheets\/_rels\/sheet\d+\.xml\.rels|drawings\/drawing\d+\.xml|drawings\/_rels\/drawing\d+\.xml\.rels)$/.test(k))delete zip[k];
 const sheets=nodes(wb,XML_MAIN,'sheets')[0],defined=nodes(wb,XML_MAIN,'definedNames')[0];for(const x of [...sheets.childNodes])sheets.removeChild(x);for(const x of [...defined.childNodes])defined.removeChild(x);for(const rel of nodes(rels,XML_PKG,'Relationship'))if((rel.getAttribute('Type')||'').endsWith('/worksheet'))rel.remove();for(const o of nodes(types,XML_TYPES,'Override'))if(/^\/xl\/(?:worksheets\/sheet|drawings\/drawing)\d+\.xml$/.test(o.getAttribute('PartName')||''))o.remove();
 function addRelationship(id,index){const e=rels.createElementNS(XML_PKG,'Relationship');e.setAttribute('Type',XML_REL+'/worksheet');e.setAttribute('Target',`/xl/worksheets/sheet${index}.xml`);e.setAttribute('Id',id);rels.documentElement.appendChild(e)}function addType(path,type){const e=types.createElementNS(XML_TYPES,'Override');e.setAttribute('PartName',path);e.setAttribute('ContentType',type);types.documentElement.appendChild(e)}
 const pages=planPrintPages(items);let index=0;for(let i=0;i<pages.length;i+=2){const front=pages[i],back=pages[i+1];if(!front||!back||front.item!==back.item)throw new Error('Print pages are not paired');index++;const nr=front.item.nr,part=Math.floor((front.recordPage-1)/2)+1,name=`NR_${nr}${part>1?'_V'+part:''}`.slice(0,31),id=`rIdForm${index}`,sheet=wb.createElementNS(XML_MAIN,'sheet');sheet.setAttribute('name',name);sheet.setAttribute('sheetId',String(index));sheet.setAttribute('state','visible');sheet.setAttributeNS(XML_REL,'r:id',id);sheets.appendChild(sheet);addRelationship(id,index);const area=wb.createElementNS(XML_MAIN,'definedName');area.setAttribute('name','_xlnm.Print_Area');area.setAttribute('localSheetId',String(index-1));area.textContent=`'${name}'!$A$1:$AC$53,'${name}'!$A$55:$AC$106`;defined.appendChild(area);
  const doc=xmlRead(template.sheet);populateApprovedExcelSheet(doc,front,back,warnings);zip[`xl/worksheets/sheet${index}.xml`]=xmlSave(doc);zip[`xl/drawings/drawing${index}.xml`]=template.drawing;zip[`xl/drawings/_rels/drawing${index}.xml.rels`]=template.drawingRel;const sr=xmlRead(template.sheetRel);for(const rel of nodes(sr,XML_PKG,'Relationship'))if((rel.getAttribute('Type')||'').endsWith('/drawing'))rel.setAttribute('Target',`/xl/drawings/drawing${index}.xml`);zip[`xl/worksheets/_rels/sheet${index}.xml.rels`]=xmlSave(sr);addType(`/xl/worksheets/sheet${index}.xml`,'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');addType(`/xl/drawings/drawing${index}.xml`,'application/vnd.openxmlformats-officedocument.drawing+xml');
 }
 if(items.some(x=>x.record)){index++;const name='TE_DHENAT_PLOTA',id=`rIdForm${index}`,sheet=wb.createElementNS(XML_MAIN,'sheet');sheet.setAttribute('name',name);sheet.setAttribute('sheetId',String(index));sheet.setAttribute('state','hidden');sheet.setAttributeNS(XML_REL,'r:id',id);sheets.appendChild(sheet);addRelationship(id,index);zip[`xl/worksheets/sheet${index}.xml`]=dataSheetXML(items);addType(`/xl/worksheets/sheet${index}.xml`,'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')}
 zip['xl/workbook.xml']=xmlSave(wb);zip['xl/_rels/workbook.xml.rels']=xmlSave(rels);zip['[Content_Types].xml']=xmlSave(types);return {bytes:fflate.zipSync(zip,{level:6}),warnings:labelWarnings(warnings)}
}

const printableUrls=[];
function renderPrintResult(kind,warnings,link=''){const target=document.getElementById('print-result');if(!target)return;const list=labelWarnings(warnings);target.innerHTML=`<div class="${list.length?'notice':'tip print-feedback'}" style="margin:0;display:block"><strong>${kind==='pdf'?'PDF-ja është gati.':'Excel-i është përgatitur.'}</strong> ${kind==='pdf'?'Për datën dhe orën e printimit, shkarko dhe hap PDF-në në Acrobat Reader; cakto A4 dhe dy anët. Shikues të tjerë mund të mos e plotësojnë orën.':''} ${link?`<a href="${link}" download="BioBes_formulare.pdf" style="font-weight:800">Shkarko PDF</a>`:''}${list.length?`<p style="margin:7px 0 0"><strong>Kujdes:</strong> ${esc(list.slice(0,4).join('; '))}${list.length>4?` dhe ${list.length-4} të tjera`:''}. Regjistrimi i plotë nuk ndryshohet.</p>`:''}</div>`}
async function createPrintPDF(){const items=printItems();if(!items)return;let popup=null;try{popup=window.open('','_blank');if(popup){popup.document.title='BioBes – duke përgatitur';popup.document.body.style.cssText='font:16px system-ui;padding:35px;color:#243b4d';popup.document.body.textContent='Duke përgatitur formularët për printim…'}}catch(e){popup=null}toast(`Po përgatiten ${items.length} formularë, ${planPrintPages(items).length} faqe…`);try{const result=await generatePrintablePDF(items),url=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));printableUrls.push(url);renderPrintResult('pdf',result.warnings,url);if(popup&&!popup.closed)popup.location.href=url;else{download('BioBes_formulare.pdf',result.bytes,'application/pdf');toast('PDF-ja u shkarkua. Hape për ta printuar.','warn')}if(result.warnings.length)toast('Disa fusha të gjata mund të jenë shkurtuar në print.','warn')}catch(e){if(popup&&!popup.closed)popup.close();console.error(e);toast('PDF-ja nuk u përgatit. Provo me më pak formularë.','error')}}
async function createPrintWorkbook(){const items=printItems();if(!items)return;toast(`Po përgatitet Excel-i me ${planPrintPages(items).length} fletë për print…`);try{const result=await generateFormWorkbook(items);download('BioBes_formulare.xlsx',result.bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');renderPrintResult('xlsx',result.warnings);toast(result.warnings.length?'Excel-i u shkarkua; kontrollo shënimin për tekstet e gjata.':'Excel-i u përgatit.',result.warnings.length?'warn':'')}catch(e){console.error(e);toast('Excel-i nuk u përgatit. Provo me më pak formularë.','error')}}
window.addEventListener('unload',()=>printableUrls.forEach(url=>URL.revokeObjectURL(url)));

function stat(label,value,unit,note,ic){return `<div class="stat"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon">${icon(ic,16)}</span></div><div class="stat-value">${value} ${unit?`<span class="stat-unit">${unit}</span>`:''}</div><div class="stat-note">${note}</div></div>`}
function demoNotice(){return db.records.some(r=>r.isDemo)?`<div class="notice demo-banner">${icon('info',16)}<p><strong>Të dhëna shembull.</strong></p><button class="btn btn-small" data-action="clear-demo">Fshij shembullin</button></div>`:''}
function recordRows(records){return records.map(r=>{const products=distinct(r.plan.map(x=>x.product)).join(', ')||'—',h=r.employees.reduce((s,e)=>s+(hoursFor(e)||0),0);return `<tr><td class="strong">${esc(r.nr)} ${r.isDemo?'<span class="tag demo">Shembull</span>':''}</td><td>${formatDate(r.date)}<br><span class="muted">Java ${weekNumber(r.date)??'—'}</span></td><td>${esc(r.responsible.name||'—')}</td><td>${esc(products)}</td><td>${fmt(roundHoursTotal(h))} orë</td><td><div class="actions-inline"><button class="btn btn-small" data-action="open-record" data-id="${esc(r.id)}">Shiko</button><button class="btn btn-small btn-quiet" data-action="edit-record" data-id="${esc(r.id)}">Ndrysho</button><button class="btn btn-small" data-action="print-record" data-id="${esc(r.id)}">Printo</button><button class="btn btn-small btn-danger" data-action="delete-record" data-id="${esc(r.id)}" aria-label="Fshi formularin ${esc(r.nr)}">Fshi</button></div></td></tr>`}).join('')}
function sortedRecords(){return [...db.records].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(parseInt(b.nr,10)||0)-(parseInt(a.nr,10)||0))}
function dashboardHTML(){const m=metrics(db.records),list=sortedRecords().slice(0,5);return `<div class="page-head"><div><div class="eyebrow">BioBes / Blloku ditor</div><h1 class="page-title">Pamja kryesore</h1></div><div class="head-actions"><button class="btn btn-soft" data-nav="batch">${icon('upload',16)} Lexo formularë</button><button class="btn btn-primary" data-action="new">${icon('plus',16)} Regjistrim i ri</button></div></div>${demoNotice()}<div class="stat-grid">${stat('Regjistrime',String(db.records.length),'','','file')}${stat('Prodhim i regjistruar',fmt(m.producedKg),'kg','','box')}${stat('Orë pune (rrumb.)',fmt(roundHoursTotal(m.hours)),'orë','','clock')}${stat('Marrë nga stoku',fmt(m.stockKg),'kg','','stack')}</div><div class="card"><div class="card-head"><h2>Regjistrimet e fundit</h2><button class="btn btn-small btn-quiet" data-nav="records">Shiko të gjitha →</button></div>${list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Nr.</th><th>Data</th><th>Përgjegjësja</th><th>Produkti</th><th>Orët (rrumb.)</th><th></th></tr></thead><tbody>${recordRows(list)}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">${icon('book',20)}</div><h3>Ende nuk ka regjistrime</h3><div class="inline-buttons"><button class="btn btn-primary btn-small" data-action="new">${icon('plus',14)} Regjistrim i ri</button><button class="btn btn-small" data-action="sample">Provo shembullin</button></div></div>`}</div>`}

function historyHTML(){return `<div class="page-head"><div><div class="eyebrow">Blloku i punës</div><h1 class="page-title">Regjistrimet ditore</h1><p class="page-sub">Shiko, hap ose modifiko çdo formular të ruajtur në cloud.</p></div><div class="head-actions"><button class="btn" data-action="export-all">${icon('download',15)} Të gjitha në CSV</button><button class="btn btn-primary" data-action="new">${icon('plus',15)} I ri</button></div></div>${demoNotice()}<div class="list-tools"><div class="search">${icon('search',15)}<label class="sr-only" for="history-search">Kërko regjistrim</label><input id="history-search" class="input" placeholder="Kërko nr., produkt ose emër..." value="${esc(state.search)}"></div><span class="small-note" id="history-count"></span></div><div class="card"><div id="history-list"></div></div>`}
function renderHistoryList(){const target=document.getElementById('history-list');if(!target)return;const q=state.search.trim().toLocaleLowerCase('sq'),list=sortedRecords().filter(r=>!q||[r.nr,r.date,formatDate(r.date),r.responsible.name,...r.plan.map(p=>p.product),...r.employees.map(e=>e.name)].join(' ').toLocaleLowerCase('sq').includes(q));document.getElementById('history-count').textContent=`${list.length} regjistrime`;target.innerHTML=list.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Nr.</th><th>Data / java</th><th>Përgjegjësja</th><th>Produkti</th><th>Orët (rrumb.)</th><th>Veprimi</th></tr></thead><tbody>${recordRows(list)}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">${icon('book',20)}</div><h3>Nuk u gjet asnjë regjistrim</h3><p>Provo një kërkim tjetër ose krijo formularin e parë.</p><button class="btn btn-primary btn-small" data-action="new">${icon('plus',14)} Regjistrim i ri</button></div>`}
function input(path,value,options={}){const {type='text',placeholder='',list='',extra='',disabled=false,label='',className='',step='any',combo=''}=options;const kind=combo||({'product-options':'products','employee-options':'employees','package-options':'packages'}[list]||'');const numeric=type==='number',whole=numeric&&step==='1',htmlType=numeric?'text':type;return `<input class="input ${esc(className)}" type="${htmlType}" ${numeric?`inputmode="${whole?'numeric':'decimal'}"`:''} ${kind?`data-combo="${esc(kind)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="combo-popover" autocomplete="off"`:''} ${label?`aria-label="${esc(label)}"`:''} placeholder="${esc(placeholder)}" value="${esc(value)}" data-bind="${path}" ${disabled?'disabled':''} ${extra}>`}
function field(label,content,hint='',extraClass=''){return `<div class="field ${extraClass}"><label>${label}</label>${content}${hint?`<small>${hint}</small>`:''}</div>`}
function planHTML(r,off){return r.plan.map((p,i)=>`<div class="plan-card"><div class="plan-top"><span class="plan-num">0${i+1}</span><strong>Produkti ${i+1}</strong></div><div class="fields">${field('Produkti',input(`plan.${i}.product`,p.product,{list:'product-options',placeholder:'Shkruaj produktin',disabled:off,label:`Produkti ${i+1}`}))}${field('Statusi',input(`plan.${i}.status`,p.status,{combo:'statuses',placeholder:'Shkruaj statusin',disabled:off,label:`Statusi për produktin ${i+1}`}))}${field('Sasia e porositur',input(`plan.${i}.planned`,p.planned,{type:'number',placeholder:'0',disabled:off,label:`Sasia e porositur ${i+1}`}))}${field('Lloji i paketimit',input(`plan.${i}.packaging`,p.packaging,{list:'package-options',placeholder:'p.sh. thasë, kuti',disabled:off,label:`Paketimi ${i+1}`}))}</div><div class="fields" style="margin-top:12px">${field('Klienti',input(`plan.${i}.client`,p.client,{placeholder:'Klienti',disabled:off,label:`Klienti ${i+1}`}))}${field('Komente',input(`plan.${i}.comment`,p.comment,{placeholder:'Komente',disabled:off,label:`Komente për produktin ${i+1}`}),'','field-span-2')}</div><div class="form-subhead">Të dhëna shtesë për raportet</div><div class="fields">${field('Sasia e prodhuar',input(`plan.${i}.actual`,p.actual,{type:'number',placeholder:'0',disabled:off,label:`Sasia e prodhuar ${i+1}`}))}${field('Njësia',input(`plan.${i}.unit`,p.unit,{combo:'units',placeholder:'p.sh. kg, copë',disabled:off,label:`Njësia për produktin ${i+1}`}))}${field('Nr. i ambalazheve',input(`plan.${i}.packageCount`,p.packageCount,{type:'number',step:'1',placeholder:'Opsionale',disabled:off,label:`Numri i ambalazheve për produktin ${i+1}`}))}</div></div>`).join('')}
function detailsHTML(r,off){return `<div class="editor-stack"><div class="card"><div class="card-head"><div class="section-heading"><span class="section-index">01</span><div><h2>Të dhënat e ditës</h2></div></div><span class="tag">Faqja 1</span></div><div class="card-body"><div class="fields">${field('Dhoma',input('room',r.room,{placeholder:'Dhoma',disabled:off,label:'Dhoma'}),'','field-span-2')}${field('Nr. i formularit',input('nr',r.nr,{placeholder:'001',disabled:off,label:'Numri i formularit',extra:'inputmode="numeric" maxlength="9"'}))}${field('Data',input('date',r.date,{type:'date',disabled:off,label:'Data'}))}${field('Dita',`<input class="input readonly" id="display-day" value="${esc(dayName(r.date))}" readonly aria-label="Dita e javës">`)}${field('Java ISO',`<input class="input readonly" id="display-week" value="${weekNumber(r.date)??'—'}" readonly aria-label="Java ISO">`)}</div><div class="form-subhead">Përgjegjëset</div><div class="fields">${field('Përgjegjësja',input('responsible.name',r.responsible.name,{combo:'responsibles',placeholder:'Zgjidh ose shkruaj emrin',disabled:off,label:'Përgjegjësja'}))}${field('Firma e përgjegjëses',input('responsible.signature',r.responsible.signature,{placeholder:'Emri / konfirmimi',disabled:off,label:'Firma e përgjegjëses'}))}${field('Ndihmës përgjegjësja',input('assistant.name',r.assistant.name,{combo:'responsibles',placeholder:'Zgjidh ose shkruaj emrin',disabled:off,label:'Ndihmës përgjegjësja'}))}${field('Firma e ndihmëses',input('assistant.signature',r.assistant.signature,{placeholder:'Emri / konfirmimi',disabled:off,label:'Firma e ndihmëses'}))}</div><div class="tip">${icon('info',15)}<span>Firmat janë tekst konfirmimi, jo nënshkrime elektronike të verifikuara.</span></div></div></div><div class="card"><div class="card-head"><div class="section-heading"><span class="section-index">02</span><div><h2>Plani i punës</h2></div></div><span class="tag">3 produkte</span></div><div class="card-body">${planHTML(r,off)}</div></div></div>`}
function staffHTML(r,off){const rows=r.employees.map((e,i)=>`<tr><td class="number-cell">${String(i+1).padStart(2,'0')}</td><td>${input(`employees.${i}.name`,e.name,{list:'employee-options',placeholder:'Emri dhe mbiemri',disabled:off,label:`Emri i punonjësit ${i+1}`,className:'name-input'})}</td><td>${input(`employees.${i}.start`,e.start,{type:'time',disabled:off,label:`Fillimi i punonjësit ${i+1}`})}</td><td>${input(`employees.${i}.end`,e.end,{type:'time',disabled:off,label:`Mbarimi i punonjësit ${i+1}`})}</td><td><span class="calculated" id="emp-hours-${i}">${fmtMaybe(hoursFor(e))}</span></td><td>${input(`employees.${i}.comment`,e.comment,{placeholder:'Komente',disabled:off,label:`Komente për punonjësin ${i+1}`,className:'comment-input'})}</td><td>${input(`employees.${i}.signature`,e.signature,{placeholder:'Emri / konfirmimi',disabled:off,label:`Firma e punonjësit ${i+1}`,className:'sig-input'})}</td></tr>`).join('');const total=r.employees.reduce((s,e)=>s+(hoursFor(e)||0),0);return `<div class="card"><div class="card-head"><div class="section-heading"><span class="section-index">03</span><div><h2>Punonjësit</h2></div></div><span class="tag">${EMPLOYEE_ROWS} rreshta</span></div><div class="scroll-hint">↔ Rrëshqit tabelën anash.</div><div class="table-wrap"><table class="table staff-table"><thead><tr><th>Nr.</th><th>Emri e mbiemri</th><th>Fillim pune</th><th>Mbarim pune</th><th>Orë gjithsej</th><th>Komente</th><th>Firma e punonjësit</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="table-foot"><td colspan="4">Orë gjithsej (rrumb.)</td><td colspan="3"><span id="staff-total">${fmt(roundHoursTotal(total))}</span> orë</td></tr></tfoot></table></div></div>`}

function weighGroupHTML(g,index,off){const n=index+1,t=groupTotals(g);const rows=g.rows.map((row,j)=>`<tr><td class="number-cell">${j+1}</td>${['bags','kg','packaging','sum'].map((key,k)=>`<td>${input(`weighings.${index}.rows.${j}.${key}`,row[key],{type:'number',placeholder:'—',disabled:off,label:`Peshimi ${n}, rreshti ${j+1}, ${['numri i thasëve','kilogramë','ambalazhi','shuma'][k]}`,step:key==='bags'?'1':'any'})}</td>`).join('')}<td><button type="button" class="icon-btn" data-action="delete-weight-row" data-index="${index}" data-row="${j}" aria-label="Fshi rreshtin ${j+1} të peshimit ${n}" ${off?'disabled':''}>${icon('trash',15)}</button></td></tr>`).join('');return `<details class="weight-card" data-weight-index="${index}" ${state.weightOpen.has(index)?'open':''}><summary><span class="plan-num">${String(n).padStart(2,'0')}</span><strong>Peshimi ${n}</strong><span class="small-note" id="weight-summary-${index}">${t.used} / ${g.rows.length} rreshta · ${t.seen.kg?fmt(t.kg)+' kg':'—'}</span><span class="arrow">${icon('arrow',17)}</span></summary><div class="weight-meta"><div class="weight-meta-grid">${field('Produkti',input(`weighings.${index}.product`,g.product,{list:'product-options',placeholder:'Shkruaj produktin',disabled:off,label:`Produkti i peshimit ${n}`}))}${field('Burimi',input(`weighings.${index}.sourceLabel`,g.sourceLabel,{combo:'sources',placeholder:'Shkruaj: stok ose tjetër',disabled:off,label:`Burimi i peshimit ${n}`}))}</div></div><div class="scroll-hint">↔ Rrëshqit tabelën anash.</div><div class="table-wrap"><table class="table weight-table"><thead><tr><th class="index-col">Nr.</th><th>Nr. thasëve</th><th>KG</th><th>Ambalazhi</th><th>Shuma</th><th></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>SH</td>${['bags','kg','packaging','sum'].map(k=>`<td id="weight-total-${index}-${k}">${fmt(t[k])}</td>`).join('')}<td></td></tr></tfoot></table></div><div class="weight-actions"><button class="btn btn-small" data-action="add-weight-rows" data-index="${index}" data-count="1" ${off?'disabled':''}>${icon('plus',14)} Shto rresht</button><button class="btn btn-small" data-action="add-weight-rows" data-index="${index}" data-count="10" ${off?'disabled':''}>${icon('plus',14)} Shto 10 rreshta</button><button class="btn btn-small btn-danger" data-action="delete-weighing" data-index="${index}" ${off?'disabled':''}>${icon('trash',14)} Fshi peshimin</button></div></details>`}
function weightsHTML(r,off){return `<div class="card"><div class="card-head"><div class="section-heading"><span class="section-index">04</span><div><h2>Peshimet</h2></div></div><span class="tag">${r.weighings.length} peshime</span></div><div class="card-body"><div class="head-actions" style="justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary" data-action="add-weighing" ${off?'disabled':''}>${icon('plus',15)} Shto peshim</button></div>${r.weighings.map((g,i)=>`${i===0?'<div class="form-subhead">Faqja 1 · Peshimet 1–3</div>':i===3?'<div class="form-subhead">Faqja 2 · Peshimet 4–6</div>':i===6?'<div class="form-subhead">Vazhdim</div>':''}${weighGroupHTML(g,i,off)}`).join('')}</div></div>`}

function commentsHTML(r,off){return `<div class="card"><div class="card-head"><div class="section-heading"><span class="section-index">05</span><div><h2>Komente</h2><p>Përmbajtja e faqes së pasme</p></div></div><span class="tag">Faqja 2</span></div><div class="card-body">${field('Komente dhe shënime',`<textarea class="textarea notes-area" data-bind="comments" ${off?'disabled':''} placeholder="Shkruaj komentet e ditës..." aria-label="Komentet e ditës">${esc(r.comments)}</textarea>`,'')}</div></div>`}
function cloudAttachmentsHTML(record){const items=record.attachments||[];if(!items.length)return '';return `<div class="card cloud-documents"><div class="card-head"><h2>Dokumentet origjinale</h2></div><div class="card-body cloud-file-list">${items.map((a,i)=>`<button type="button" class="btn btn-small" data-action="cloud-open-original" data-index="${i}">${icon('download',14)} ${esc(a.name)}</button>`).join('')}</div></div>`}
function editorHTML(){const r=state.draft,off=state.mode==='view',body=detailsHTML(r,off)+staffHTML(r,off)+weightsHTML(r,off)+commentsHTML(r,off);return `<div class="page-head"><div><div class="eyebrow">Formular ditor · Nr. ${esc(r.nr||'—')}</div><h1 class="page-title">${state.mode==='new'?'Regjistrim i ri':state.mode==='edit'?'Modifiko regjistrimin':'Formulari i ditës'}</h1><p class="page-sub">Plotëso të dhënat si në bllokun e punës. Të gjitha seksionet janë në një ekran; rrotullo për të kontrolluar planin, punonjësit, peshimet dhe komentet.</p></div><div class="head-actions"><button class="btn" data-action="new">${icon('plus',15)} I ri</button><button class="btn" data-action="print-record" data-id="${esc(r.id)}" ${state.mode==='new'?'disabled':''}>${icon('printer',15)} Printo</button><button class="btn" data-action="enable-edit" ${off?'':'disabled'}>${icon('edit',15)} Modifiko</button><button class="btn btn-primary" data-action="save" ${off?'disabled':''}>${icon('save',15)} Ruaj</button><button class="btn btn-soft" data-action="save-next" ${off?'disabled':''}>${icon('plus',15)} Ruaj dhe i radhës</button></div></div><div class="editor-bar"><div class="editor-status"><span class="tag ${off?'good':''}">${off?'I RUAJTUR':state.mode==='new'?'FORMULAR I RI':'NË NDRYSHIM'}</span> </div><button class="btn btn-small btn-quiet" data-nav="records">← Te regjistrimet</button></div>${importReviewHTML()}${cloudAttachmentsHTML(r)}<div class="editor-stack editor-all">${body}</div><div class="head-actions" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-nav="records">Kthehu</button><button class="btn btn-primary" data-action="save" ${off?'disabled':''}>${icon('save',15)} Ruaj</button><button class="btn btn-soft" data-action="save-next" ${off?'disabled':''}>${icon('plus',15)} Ruaj dhe i radhës</button></div>`}
function reportRecords(){return db.records.filter(r=>(!state.report.from||r.date>=state.report.from)&&(!state.report.to||r.date<=state.report.to))}
function reportTable(headers,rows){return rows.length?`<div class="table-wrap"><table class="table"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="mini-empty">Nuk ka të dhëna për këtë përzgjedhje.</div>'}
function timecardData(records, employee){
 const key=str(employee).trim().toLocaleLowerCase('sq');
 const rows=[];
 if(key) for(const r of records) for(const e of r.employees) if(e.name.trim().toLocaleLowerCase('sq')===key){
  const hours=hoursFor(e);rows.push({date:r.date,nr:r.nr,start:e.start,end:e.end,minutes:hours===null?null:Math.round(hours*60),comment:e.comment,isDemo:r.isDemo});
 }
 rows.sort((a,b)=>a.date.localeCompare(b.date)||str(a.nr).localeCompare(str(b.nr),undefined,{numeric:true}));
 return {rows,minutes:rows.reduce((sum,row)=>sum+(row.minutes??0),0),incomplete:rows.filter(row=>row.minutes===null).length};
}
function durationText(minutes){return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`}
function timecardNames(){
 const names=new Map();for(const value of [...db.catalog.employees,...db.records.flatMap(r=>r.employees.map(e=>e.name))]){const name=str(value).trim(),key=name.toLocaleLowerCase('sq');if(name&&!names.has(key))names.set(key,name)}
 return [...names.values()].sort((a,b)=>a.localeCompare(b,'sq'));
}
function timecardChoices(query=''){
 const names=timecardNames(),matching=names.map((name,index)=>({name,index})).filter(x=>fold(x.name).includes(fold(query)));
 return matching.length?matching.map(x=>`<button type="button" class="combo-option" data-action="timecard-select" data-index="${x.index}" ${x.name.toLocaleLowerCase('sq')===str(state.report.employee).trim().toLocaleLowerCase('sq')?'aria-current="true"':''}>${esc(x.name)}</button>`).join(''):`<div class="combo-empty">${names.length?'Nuk u gjet asnjë punonjës.':'Nuk ka punonjës në të dhënat bazë ose në formularët e ruajtur.'}</div>`;
}
function timecardHTML(records){
 const data=timecardData(records,state.report.employee);
 const rows=data.rows.map(r=>[formatDate(r.date),r.nr,r.start||'—',r.end||'—',r.minutes===null?'E paplotë':durationText(r.minutes),r.comment||'—',r.isDemo?'Po':'Jo']);
 return `<div class="card report-wide"><div class="card-head"><div><h3>Timecard i punonjësit</h3><p>Hyrjet dhe daljet sipas datave më sipër; filtri i produktit nuk ndikon. Emrat e njëjtë grupohen së bashku.</p></div><div class="inline-buttons"><button class="btn btn-small" data-action="timecard-pdf" ${!state.report.employee?'disabled':''}>PDF</button><button class="btn btn-small" data-action="timecard-xlsx" ${!state.report.employee?'disabled':''}>Excel</button><button class="btn btn-small" data-action="export-timecard" ${!state.report.employee?'disabled':''}>${icon('download',13)} Eksporto CSV</button></div></div><div class="card-body">${field('Kërko punonjësin',`<input class="input" id="timecard-search" type="search" placeholder="Shkruaj emrin e punonjësit" aria-label="Kërko punonjësin" aria-controls="timecard-choices" autocomplete="off">`)}<p class="small-note">Zgjidh emrin nga lista më poshtë. Shfaqen edhe punonjësit e të dhënave bazë.</p><div id="timecard-choices" aria-label="Punonjësit" style="max-height:200px;overflow:auto;border:1px solid #dce3e7;border-radius:6px">${timecardChoices()}</div>${state.report.employee?`<p><strong>Punonjësi: ${esc(state.report.employee)} · Totali: ${durationText(data.minutes)} orë</strong> (orë:minuta, pa rrumbullakim)${data.incomplete?` · ${data.incomplete} rreshta të paplotë nuk përfshihen në total`:''}</p><p class="small-note">Dalja para hyrjes llogaritet ditën pasuese. Pushimet nuk zbriten automatikisht.</p>`:'<p class="small-note">Zgjidh një punonjës për të parë raportin.</p>'}</div>${state.report.employee?reportTable(['Data','Nr. formularit','Hyrja','Dalja','Orë:minuta','Komente','Shembull'],rows):''}</div>`
}
function exportTimecard(){
 if(!state.report.employee)return;
 const data=timecardData(reportRecords(),state.report.employee);
 const rows=[['Punonjësi','Nga data','Deri më','Data','Nr. formularit','Hyrja','Dalja','Orë:minuta','Komente','Shembull'],...data.rows.map(r=>[state.report.employee,state.report.from,state.report.to,r.date,r.nr,r.start,r.end,r.minutes===null?'E paplotë':durationText(r.minutes),r.comment,r.isDemo?'Po':'Jo']),['Totali','','','','','','',durationText(data.minutes),'Rreshta të paplotë: '+data.incomplete,'']];
 csv('BioBes_timecard.csv',rows);toast('Timecard-i CSV u përgatit.');
}
async function exportTimecardXlsx(){
 if(!state.report.employee)return;
 try{
  const data=timecardData(reportRecords(),state.report.employee);
  const rows=[['Timecard i punonjësit'],['Punonjësi',state.report.employee],['Nga data',state.report.from||'Pa kufi','Deri më',state.report.to||'Pa kufi'],['Data','Nr. formularit','Hyrja','Dalja','Orë pune','Komente','Shembull'],...data.rows.map(r=>[r.date,r.nr,r.start,r.end,r.minutes===null?'E paplotë':r.minutes/1440,r.comment,r.isDemo?'Po':'Jo']),['Totali','','','',data.minutes/1440,`Rreshta të paplotë: ${data.incomplete}`],['Dalja para hyrjes llogaritet ditën pasuese. Pushimet nuk zbriten automatikisht.']];
  const sheet=XLSX.utils.aoa_to_sheet(rows);for(let i=0;i<data.rows.length;i++){const cell=sheet[XLSX.utils.encode_cell({r:i+4,c:4})];if(cell&&cell.t==='n')cell.z='[h]:mm'}sheet[XLSX.utils.encode_cell({r:4+data.rows.length,c:4})].z='[h]:mm';sheet['!cols']=[{wch:15},{wch:18},{wch:12},{wch:12},{wch:14},{wch:42},{wch:12}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,sheet,'Timecard');download('BioBes_timecard.xlsx',XLSX.write(wb,{bookType:'xlsx',type:'array'}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast('Excel-i u shkarkua.');
 }catch(e){console.error(e);toast('Excel-i nuk u përgatit.','error')}
}
async function exportTimecardPDF(){
 if(!state.report.employee)return;
 try{
  const data=timecardData(reportRecords(),state.report.employee),pdf=await PDFLib.PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(embeddedBytes('font-regular'),{subset:true}),bold=await pdf.embedFont(embeddedBytes('font-bold'),{subset:true});
  let page,y;const newPage=()=>{page=pdf.addPage([595,842]);y=800;page.drawText('BioBes · Timecard i punonjësit',{x:40,y,size:16,font:bold});y-=25};
  const line=(text,opts={})=>{const f=opts.bold?bold:font,size=opts.size||10,max=515;for(const paragraph of str(text).split(/\r?\n/)){let part='';for(const char of paragraph){if(part&&f.widthOfTextAtSize(part+char,size)>max){if(y<45)newPage();page.drawText(part,{x:40,y,size,font:f});y-=15;part=''}part+=char}if(y<45)newPage();if(part)page.drawText(part,{x:40,y,size,font:f});y-=15}};
  newPage();line(`Punonjësi: ${state.report.employee}`,{bold:true});line(`Periudha: ${state.report.from||'pa kufi'} – ${state.report.to||'pa kufi'}`);line(`Totali: ${durationText(data.minutes)} orë (orë:minuta) · Rreshta të paplotë: ${data.incomplete}`,{bold:true});line('Dalja para hyrjes llogaritet ditën pasuese. Pushimet nuk zbriten automatikisht.');y-=8;
  if(!data.rows.length)line('Nuk ka të dhëna për këtë përzgjedhje.');
  for(const r of data.rows){line(`${formatDate(r.date)}  |  Formulari: ${r.nr}  |  Hyrja: ${r.start||'—'}  |  Dalja: ${r.end||'—'}  |  Orë: ${r.minutes===null?'E paplotë':durationText(r.minutes)}${r.isDemo?'  |  Shembull':''}`,{bold:true});if(r.comment)line(`Komente: ${r.comment}`);y-=5}
  download('BioBes_timecard.pdf',await pdf.save(),'application/pdf');toast('PDF-ja u shkarkua.');
 }catch(e){console.error(e);toast('PDF-ja nuk u përgatit.','error')}
}
// Listëprezenca përdor datën e formularit dhe mbledh të gjitha intervalet e ditës.
function attendanceData(records,names,month,employee=''){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))<100)return null;
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const selected=employee?names.filter(n=>n.trim().toLocaleLowerCase('sq')===employee.trim().toLocaleLowerCase('sq')):names;
 const rows=selected.map(name=>({name,days:Array.from({length:days},()=>({minutes:0,complete:0,incomplete:0})),total:0}));
 const byName=new Map(rows.map(row=>[row.name.trim().toLocaleLowerCase('sq'),row]));let hasDemo=false;
 for(const r of records){if(!dateValid(r.date)||!r.date.startsWith(month+'-'))continue;const day=Number(r.date.slice(8));for(const e of r.employees){const row=byName.get(str(e.name).trim().toLocaleLowerCase('sq'));if(!row)continue;if(r.isDemo)hasDemo=true;const cell=row.days[day-1],h=hoursFor(e);if(h===null)cell.incomplete++;else{const minutes=Math.round(h*60);cell.minutes+=minutes;cell.complete++;row.total+=minutes}}}
 const sundays=Array.from({length:days},(_,i)=>new Date(Date.UTC(year,m-1,i+1)).getUTCDay()===0);
 return {month,days,rows,sundays,hasDemo};
}
function attendanceCell(cell){return (cell.complete?durationText(cell.minutes):'—')+(cell.incomplete?'*':'')}
function attendanceReportData(){return attendanceData(db.records,timecardNames(),state.attendance.month,state.attendance.employee)}
function attendanceHTML(){
 const data=attendanceReportData(),names=timecardNames(),selected=state.attendance.employee;
 const head=data?Array.from({length:data.days},(_,i)=>`<th style="${data.sundays[i]?'background:#fff7bb':''}">${i+1}</th>`).join(''):'';
 const body=data?.rows.map(row=>`<tr><td>${esc(row.name)}</td>${row.days.map((cell,i)=>`<td style="${data.sundays[i]?'background:#fffbe1':''}">${attendanceCell(cell)}</td>`).join('')}<td><strong>${durationText(row.total)}</strong></td></tr>`).join('')||'';
 return `<div class="card report-wide"><div class="card-head"><div><h3>Listëprezenca mujore</h3><p>Një ose të gjithë punonjësit · orë:minuta për çdo ditë</p></div><div class="inline-buttons"><button class="btn btn-small" data-action="attendance-pdf" ${!data||!data.rows.length?'disabled':''}>PDF</button><button class="btn btn-small" data-action="attendance-xlsx" ${!data||!data.rows.length?'disabled':''}>Excel</button></div></div><div class="card-body"><div class="fields">${field('Muaji',`<input class="input" type="month" data-attendance="month" value="${esc(state.attendance.month)}" aria-label="Muaji i listëprezencës">`)}${field('Punonjësi',`<select class="input" data-attendance="employee" aria-label="Punonjësi i listëprezencës"><option value="">Të gjithë punonjësit</option>${names.map(name=>`<option value="${esc(name)}" ${name===selected?'selected':''}>${esc(name)}</option>`).join('')}</select>`)}</div><p class="small-note">Të dielat janë të shënuara me të verdhë. — = pa interval të plotë; * = ka interval të paplotë, i cili nuk përfshihet në total. Ora e daljes para hyrjes llogaritet ditën pasuese. Pushimet nuk zbriten. Filtrat e tjerë të raportit nuk ndikojnë.</p>${data?.hasDemo?'<div class="notice">Raporti përmban të dhëna shembull.</div>':''}${!data?'<div class="notice">Zgjidh një muaj të vlefshëm.</div>':!data.rows.length?'<div class="mini-empty">Nuk ka punonjës në të dhënat bazë ose në formularët e ruajtur.</div>':''}</div>${data&&data.rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Punonjësi</th>${head}<th>Totali</th></tr></thead><tbody>${body}</tbody></table></div>`:''}</div>`
}
async function exportAttendanceXlsx(){
 const data=attendanceReportData();if(!data||!data.rows.length)return;
 try{const rows=[['Listëprezenca mujore',data.month,data.hasDemo?'Përmban të dhëna shembull':''],['— = pa interval të plotë; * = interval i paplotë, i papërfshirë në total. Dalja para hyrjes është ditën pasuese; pushimet nuk zbriten.'],['Punonjësi',...Array.from({length:data.days},(_,i)=>i+1),'Totali'],...data.rows.map(row=>[row.name,...row.days.map(cell=>cell.incomplete?attendanceCell(cell):cell.complete?cell.minutes/1440:'—'),row.total/1440])];
 const sheet=XLSX.utils.aoa_to_sheet(rows);for(let r=0;r<data.rows.length;r++)for(let c=1;c<=data.days+1;c++){const cell=sheet[XLSX.utils.encode_cell({r:r+3,c})];if(cell?.t==='n')cell.z='[h]:mm'}sheet['!cols']=[{wch:25},...Array.from({length:data.days},()=>({wch:8})),{wch:12}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,sheet,'Listëprezenca');download('BioBes_listeprezenca_'+data.month+'.xlsx',XLSX.write(wb,{bookType:'xlsx',type:'array'}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast('Excel-i u shkarkua.')}catch(e){console.error(e);toast('Excel-i nuk u përgatit.','error')}
}
async function exportAttendancePDF(){
 const data=attendanceReportData();if(!data||!data.rows.length)return;
 try{const pdf=await PDFLib.PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(embeddedBytes('font-regular'),{subset:true}),bold=await pdf.embedFont(embeddedBytes('font-bold'),{subset:true});const {rgb}=PDFLib;
 const width=1191,height=842,left=24,nameWidth=155,totalWidth=65,dayWidth=(width-left*2-nameWidth-totalWidth)/data.days,rowHeight=22;
 let page,y;const fit=(text,max,size,f=font)=>{text=str(text);while(size>4&&f.widthOfTextAtSize(text,size)>max)size-=.25;return size};
 const text=(value,x,yy,max,size=8,f=font)=>page.drawText(str(value),{x,y:yy,size:fit(value,max,size,f),font:f});
 const pageStart=()=>{page=pdf.addPage([width,height]);y=height-35;text('Listëprezenca mujore · '+data.month+(data.hasDemo?' · Përmban të dhëna shembull':''),left,y,1100,16,bold);y-=20;text('— pa interval të plotë; * interval i paplotë, i papërfshirë në total. Dalja para hyrjes është ditën pasuese; pushimet nuk zbriten.',left,y,1100,8);y-=24;
 page.drawRectangle({x:left,y:y-8,width:width-left*2,height:rowHeight,color:rgb(.93,.95,.96)});text('Punonjësi',left+3,y,nameWidth-6,9,bold);for(let i=0;i<data.days;i++){const x=left+nameWidth+i*dayWidth;if(data.sundays[i])page.drawRectangle({x,y:y-8,width:dayWidth,height:rowHeight,color:rgb(1,.96,.7)});text(String(i+1),x+3,y,dayWidth-4,8,bold)}text('Totali',left+nameWidth+data.days*dayWidth+3,y,totalWidth-5,8,bold);y-=rowHeight};
 pageStart();for(const row of data.rows){if(y<40)pageStart();text(row.name,left+3,y,nameWidth-6,8);for(let i=0;i<data.days;i++){const x=left+nameWidth+i*dayWidth;if(data.sundays[i])page.drawRectangle({x,y:y-7,width:dayWidth,height:rowHeight,color:rgb(1,.98,.87)});text(attendanceCell(row.days[i]),x+2,y,dayWidth-3,7)}text(durationText(row.total),left+nameWidth+data.days*dayWidth+3,y,totalWidth-5,8,bold);page.drawLine({start:{x:left,y:y-8},end:{x:width-left,y:y-8},thickness:.4,color:rgb(.8,.84,.87)});y-=rowHeight}
 download('BioBes_listeprezenca_'+data.month+'.pdf',await pdf.save(),'application/pdf');toast('PDF-ja u shkarkua.')}catch(e){console.error(e);toast('PDF-ja nuk u përgatit.','error')}
}
function reportsHTML(){const rs=reportRecords(),m=metrics(rs,state.report.product),products=allProducts(),invalid=state.report.from&&state.report.to&&state.report.from>state.report.to;const prod=m.products.map(x=>[x.product,x.packaging,fmt(x.qty),x.unit,String(x.records.size)]),packs=m.packageCounts.map(x=>[x.packaging,fmt(x.count),String(x.records.size)]),staff=m.employees.map(x=>[x.name,fmt(roundHoursTotal(x.hours)),String(x.records.size)]),stock=m.stock.map(x=>[x.product,fmt(x.kg),'kg',fmt(x.bags),String(x.rows)]),weightRows=m.tables.map(x=>[formatDate(x.date),x.nr,String(x.group),x.product,x.source,...['bags','kg','packaging','sum'].map(k=>x.totals.seen[k]?fmt(x.totals[k]):'—')]);return `<div class="page-head"><div><div class="eyebrow">Nga të dhënat e ruajtura</div><h1 class="page-title">Raportet</h1><p class="page-sub">Shiko prodhimin, paketimet, orët dhe peshimet e marra nga stoku.</p></div></div>${demoNotice()}<div class="card" style="margin-bottom:16px"><div class="card-body"><div class="report-filters">${field('Nga data',`<input class="input" type="date" data-report="from" value="${esc(state.report.from)}" aria-label="Nga data">`)}${field('Deri më',`<input class="input" type="date" data-report="to" value="${esc(state.report.to)}" aria-label="Deri më">`)}${field('Produkti',`<input class="input" data-combo="report-products" value="${esc(state.report.product)}" role="combobox" aria-label="Filtro produktin" aria-autocomplete="list" aria-expanded="false" aria-controls="combo-popover" autocomplete="off" placeholder="Shkruaj për të kërkuar">`)}<button class="btn" data-action="clear-filters">Pastro filtrat</button></div>${invalid?'<div class="notice" style="margin:14px 0 0">Data e fillimit është pas datës së mbarimit.</div>':''}</div></div><div class="stat-grid">${stat('Formularë',String(rs.length),'','Sipas datave të zgjedhura','file')}${stat('Prodhim i regjistruar',fmt(m.producedKg),'kg','Vetëm sasitë e prodhuara në kg','box')}${stat('Orë pune (rrumb.)',fmt(roundHoursTotal(m.hours)),'orë','Për gjithë ditët e filtruara','clock')}${stat('Marrë nga stoku',fmt(m.stockKg),'kg','Vetëm peshime të shënuara si stok','stack')}</div>${m.unknownKg||m.stockMissingKg?`<div class="notice">${icon('alert',15)}<span>${m.unknownKg?`${fmt(m.unknownKg)} kg pa burim.`:''} ${m.stockMissingKg?`${m.stockMissingKg} rreshta pa KG.`:''}</span></div>`:''}<div class="list-tools"><div><span class="eyebrow">Përmbledhje</span></div><div class="report-actions"><span class="small-note">Eksporto CSV:</span>${[['products','Prodhimi'],['packages','Paketimet'],['hours','Orët'],['stock','Stoku'],['weights','Peshimet']].map(([value,label])=>`<button class="btn btn-small" data-action="export-report" data-type="${value}">${icon('download',13)} ${label}</button>`).join('')}</div></div><div class="report-grid">${attendanceHTML()}${timecardHTML(rs)}<div class="card"><div class="card-head"><div><h3>Prodhimi sipas produktit</h3><p>Sasitë e prodhuara, të ndara sipas njësisë</p></div></div>${reportTable(['Produkti','Paketimi','Sasia','Njësia','Formularë'],prod)}</div><div class="card"><div class="card-head"><div><h3>Paketimet e përdorura</h3><p>Numri i ambalazheve, i futur veçmas në formular</p></div></div>${reportTable(['Paketimi','Nr. ambalazheve','Formularë'],packs)}</div><div class="card"><div class="card-head"><div><h3>Orët e punës</h3></div></div>${reportTable(['Punonjësi','Orë (rrumb.)','Formularë'],staff)}</div><div class="card"><div class="card-head"><div><h3>Marrjet nga stoku</h3><p>Vetëm peshimet e shënuara si stok</p></div></div>${reportTable(['Produkti','Pesha','Njësia','Thasë','Rreshta'],stock)}</div><div class="card report-wide"><div class="card-head"><div><h3>Totalet e tabelave të peshimit</h3><p>Σ për çdo tabelë, si në formular; ambalazhi dhe shuma janë vlera të futura manualisht</p></div></div>${reportTable(['Data','Nr.','Peshimi','Produkti','Burimi','Σ thasë','Σ KG','Σ ambalazhi','Σ shuma'],weightRows)}</div></div>`}
function printHTML(){const saved=state.print.mode==='saved';return `<div class="page-head"><div><div class="eyebrow">Modeli i fundit i miratuar</div><h1 class="page-title">Printim & Excel</h1><p class="page-sub">Përgatit formularë të plotësuar ose bosh, me nga dy faqe A4 për secilin.</p></div></div>${demoNotice()}<div class="tab-line"><button class="pill-tab ${saved?'active':''}" data-action="print-mode" data-mode="saved">Formularë të ruajtur</button><button class="pill-tab ${!saved?'active':''}" data-action="print-mode" data-mode="blank">Formularë bosh, me numra</button></div><div class="print-grid"><div class="card"><div class="card-head"><div><h2>${saved?'Zgjidh regjistrimet':'Formularë bosh'}</h2><p>${saved?'Zgjidh një ose disa formularë për t’i përgatitur së bashku.':'Vendos numrin e parë dhe sa formularë dëshiron.'}</p></div><span class="tag">2+ faqe / formular</span></div><div class="card-body">${saved?`<div class="list-tools"><div class="search">${icon('search',15)}<label class="sr-only" for="print-search">Kërko formular</label><input class="input" id="print-search" placeholder="Kërko nr., datë ose produkt..." value="${esc(state.print.search)}"></div><span class="small-note" id="print-count"></span></div><div class="head-actions" style="margin-bottom:12px"><button class="btn btn-small" data-action="print-select-all">Zgjidh të dukshmet</button><button class="btn btn-small" data-action="print-select-none">Pastro përzgjedhjen</button></div><div class="table-wrap" id="print-list"></div>`:`<div class="fields three">${field('Nr. i parë',`<input class="input" type="number" min="1" max="999999999" step="1" data-print-setting="start" value="${esc(state.print.start||String(nextNr()))}" aria-label="Numri i parë">`)}${field('Sa formularë?',`<input class="input" type="number" min="1" max="50" step="1" data-print-setting="count" value="${esc(state.print.count)}" aria-label="Numri i formularëve">`,'Për shembull 10 ose 15; maksimumi 50 njëherësh.')}${field('Fletë vazhdimi (dy anë)',`<input class="input" type="number" min="0" max="10" step="1" data-print-setting="continuationSheets" value="${esc(state.print.continuationSheets)}" aria-label="Fletë vazhdimi për formular">`)}</div><p class="small-note">Numrat bosh nuk rezervohen automatikisht.</p>`}</div></div><div class="card"><div class="card-head"><div><h2>Gati për përgatitje</h2><p>Modeli i miratuar, me të dyja faqet</p></div></div><div class="card-body"><div class="tag" style="margin-bottom:16px">A4 · Dy anë · Ana e gjatë</div><div class="head-actions"><button class="btn btn-primary" data-action="print-pdf">${icon('printer',15)} Hap PDF për printim</button><button class="btn" data-action="print-xlsx">${icon('download',15)} Eksporto Excel .xlsx</button></div><div id="print-result" class="print-result" aria-live="polite"></div></div></div></div>`}
function printFiltered(){const q=fold(state.print.search);return sortedRecords().filter(r=>!q||fold([r.nr,r.date,formatDate(r.date),r.responsible.name,...r.plan.map(p=>p.product)].join(' ')).includes(q))}
function updatePrintCount(){const e=document.getElementById('print-count');if(e)e.textContent=`${[...state.print.selected].filter(id=>db.records.some(r=>r.id===id)).length} të zgjedhur`}
function renderPrintList(){const target=document.getElementById('print-list');if(!target)return;const rs=printFiltered();updatePrintCount();target.innerHTML=rs.length?`<table class="table"><thead><tr><th>Zgjidh</th><th>Nr.</th><th>Data</th><th>Produkti</th></tr></thead><tbody>${rs.map(r=>`<tr><td><input class="print-check" type="checkbox" data-print-id="${esc(r.id)}" ${state.print.selected.has(r.id)?'checked':''} aria-label="Zgjidh formularin ${esc(r.nr)}"></td><td class="strong">${esc(r.nr)} ${r.isDemo?'<span class="tag demo">Shembull</span>':''}</td><td>${formatDate(r.date)}</td><td>${esc(distinct(r.plan.map(p=>p.product)).join(', ')||'—')}</td></tr>`).join('')}</tbody></table>`:'<div class="mini-empty">Nuk ka regjistrime të ruajtura për këtë kërkim.</div>'}
function selectVisiblePrint(select){if(select){const next=new Set(state.print.selected);for(const r of printFiltered())next.add(r.id);if(next.size>50){toast('Mund të përgatiten deri në 50 formularë njëherësh. Filtro listën ose zgjidh më pak.','warn');return}state.print.selected=next}else state.print.selected.clear();renderPrintList()}
async function openPrintRecord(id){if(!await canLeave())return;if(!db.records.some(r=>r.id===id)){toast('Regjistrimi nuk u gjet.','error');return}state.route='print';state.draft=null;state.dirty=false;state.print.mode='saved';state.print.selected=new Set([id]);state.print.search='';render();window.scrollTo({top:0,behavior:'smooth'})}
function printItems(){if(state.print.mode==='saved'){const rows=db.records.filter(r=>state.print.selected.has(r.id)).sort((a,b)=>(Number(a.nr)||0)-(Number(b.nr)||0)||(a.date||'').localeCompare(b.date||''));if(!rows.length){toast('Zgjidh të paktën një formular të ruajtur.','error');return null}if(rows.length>50){toast('Zgjidh maksimumi 50 formularë njëherësh.','error');return null}return rows.map(record=>({nr:record.nr,record}))}const start=Number(state.print.start||nextNr()),count=Number(state.print.count),continuationSheets=Number(state.print.continuationSheets);if(!Number.isInteger(continuationSheets)||continuationSheets<0||continuationSheets>10){toast('Zgjidh nga 0 deri në 10 fletë vazhdimi për formular.','error');return null}if(!Number.isInteger(start)||start<1||start>999999999||!Number.isInteger(count)||count<1||count>50||start+count-1>999999999){toast('Vendos një numër fillestar të vlefshëm dhe 1–50 formularë.','error');return null}return Array.from({length:count},(_,i)=>({nr:String(start+i).padStart(3,'0'),record:null,continuationSheets}))}

function catalogHTML(){const configs=[['responsibles','Përgjegjëset','Emër dhe mbiemër','book'],['products','Produktet','Emër produkti','box'],['employees','Punonjësit','Emër dhe mbiemër','book'],['packages','Paketimet','Lloj paketimi','stack'],['statuses','Statuset','Status i ri','file'],['units','Njësitë','Njësi e re','grid'],['sources','Burimet e peshimit','Emër burimi','stack']];return `<div class="page-head"><div><div class="eyebrow">Listat bazë</div><h1 class="page-title">Të dhënat bazë</h1><p class="page-sub">Ruaj emra për t’i zgjedhur më shpejt gjatë plotësimit. Mund të shkruash edhe emra të tjerë direkt në formular.</p></div></div><div class="catalog-grid">${configs.map(([key,title,placeholder,ic])=>`<div class="card"><div class="card-head"><div class="section-heading"><span class="section-index">${icon(ic,15)}</span><div><h3>${title}</h3><p>${db.catalog[key].length} të shtuara</p></div></div></div><div class="card-body"><div class="catalog-add"><label class="sr-only" for="add-${key}">${placeholder}</label><input class="input" id="add-${key}" placeholder="${placeholder}" maxlength="160"><button class="btn btn-primary btn-small" data-action="catalog-add" data-kind="${key}">${icon('plus',14)} Shto</button></div><div class="catalog-list">${db.catalog[key].length?db.catalog[key].map((entry,i)=>{const name=typeof entry==='string'?entry:entry.label;return `<div class="catalog-item"><span>${esc(name)}${key==='sources'?` <span class="tag">${entry.kind==='stock'?'Stok':'Tjetër'}</span>`:''}</span><button class="icon-btn" data-action="catalog-edit" data-kind="${key}" data-index="${i}" aria-label="Modifiko ${esc(name)}">${icon('edit',15)}</button><button class="icon-btn" data-action="catalog-delete" data-kind="${key}" data-index="${i}" aria-label="Hiq ${esc(name)}">${icon('trash',15)}</button></div>`}).join(''):'<div class="mini-empty">Lista është bosh.</div>'}</div></div></div>`).join('')}</div><div class="tip">${icon('info',15)}<span>Modifikimi ose heqja nga lista nuk ndryshon formularët e ruajtur më parë.</span></div><div class="head-actions section-space"><button class="btn" data-action="backup-export">${icon('download',15)} Shkarko backup JSON</button><button class="btn" data-action="backup-import">${icon('upload',15)} Importo backup JSON</button></div>`}
const IMPORT_LIMIT=12*1024*1024;
const importState={files:[],abort:null,busy:false,lastRaw:null,review:null,notify:false,timer:null,startedAt:0,cancelledByUser:false,pendingNotice:null};
const BATCH_MAX=10,BATCH_AI_GAP_MS=1000;
const batchState={groups:[],items:[],phase:'select',index:0,busy:false,abort:null,run:0,cancelled:false,error:'',progress:'',timer:null};
function batchIsReview(){return batchState.phase==='review'&&batchState.items.length>0&&state.route==='editor'}
function batchReset(){
 if(batchState.abort)batchState.abort.abort();batchState.run++;if(batchState.timer)clearInterval(batchState.timer);
 const urls=new Set();for(const g of batchState.groups)for(const x of (g.sources||[]))if(x.url)urls.add(x.url);for(const it of batchState.items)for(const x of (it.sources||[]))if(x.url)urls.add(x.url);for(const url of urls)URL.revokeObjectURL(url);
 batchState.groups=[];batchState.items=[];batchState.phase='select';batchState.index=0;batchState.busy=false;batchState.abort=null;batchState.cancelled=false;batchState.error='';batchState.progress='';batchState.timer=null;
}
async function batchCleanupCloud(snapshot=db,onlyItems=batchState.items){const referenced=new Set((snapshot?.records||[]).flatMap(r=>(r.attachments||[]).map(a=>a.path)));const paths=onlyItems.flatMap(it=>(it.originals||[]).map(x=>x.pendingPath||x.uploaded?.path)).filter(p=>p&&!referenced.has(p));if(paths.length&&cloud.user)await cloudRemovePaths(paths)}
async function batchResetCloud(snapshot=db){await batchCleanupCloud(snapshot);batchReset()}
function batchGroupStatus(g){return g.status==='ready'?`U lexua${g.results?.length>1?' · '+g.results.length+' formularë':''}${g.seconds?` · ${g.seconds} s`:''}`:g.status==='error'?'Nuk u lexua':'Në pritje'}
function batchGroupsHTML(){
 if(!batchState.groups.length)return '<div class="batch-empty">Asnjë skedar i zgjedhur.</div>';
 return batchState.groups.map((g,i)=>{const names=g.files.map((f,j)=>`<span>${g.files.length>1?`${j+1}. `:''}${esc(f.name)}</span>`).join('');const imageOnly=g.files.every(f=>fileKind(f).startsWith('image/'));const originalNames=(g.privateFiles||g.originalFiles||g.files).map(f=>esc(f.name)).join(' · ');const next=batchState.groups[i+1],join=next&&g.files.length===1&&next.files.length===1&&imageOnly&&fileKind(next.files[0]).startsWith('image/')&&g.status!=='ready'&&next.status!=='ready'&&!g.privateFiles&&!next.privateFiles;const lock=batchState.busy?'disabled':'';return `<div class="batch-group"><div><strong>Grupi ${i+1}</strong> <span class="batch-state ${g.status==='ready'?'good':g.status==='error'?'bad':''}">${esc(batchGroupStatus(g))}</span><div class="batch-file-names">${names}</div>${g.note?`<div class="small-note">${esc(g.note)}</div>`:''}<div class="small-note batch-private-names"><strong>Origjinale për ruajtje private:</strong> ${originalNames}</div><label class="batch-private-picker btn btn-small" for="batch-original-${esc(g.id)}">Zgjidh origjinale private</label><input class="sr-only" type="file" id="batch-original-${esc(g.id)}" data-batch-original="${esc(g.id)}" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.xlsx,.xltx,.xlsm,.xltm,.xls,.xlt,.docx,.docm,.dotx" ${lock}>${g.privateFiles?`<button type="button" class="btn btn-small" data-action="batch-original-reset" data-id="${esc(g.id)}" ${lock}>Përdor dokumentet e ngarkuara</button>`:''}<div class="small-note">${g.privateFiles?'Origjinalet e zgjedhura veçmas nuk dërgohen te Gemini.':'Si parazgjedhje ruhen dokumentet e ngarkuara, të cilat mund të dërgohen te Gemini.'}</div>${g.error?`<p class="batch-error-inline">${esc(g.error)}</p>`:''}</div><div class="batch-group-actions"><button type="button" class="btn btn-small" data-action="batch-up" data-index="${i}" ${i===0?'disabled':lock} aria-label="Lëviz grupin ${i+1} lart">↑</button><button type="button" class="btn btn-small" data-action="batch-down" data-index="${i}" ${i===batchState.groups.length-1?'disabled':lock} aria-label="Lëviz grupin ${i+1} poshtë">↓</button>${g.files.length===2&&imageOnly&&g.status!=='ready'&&!g.privateFiles?`<button type="button" class="btn btn-small" data-action="batch-swap" data-index="${i}" ${lock}>Ndërro faqet</button><button type="button" class="btn btn-small" data-action="batch-split" data-index="${i}" ${lock}>Ndaji</button>`:''}${join?`<button type="button" class="btn btn-small" data-action="batch-join" data-index="${i}" ${lock}>Bashko me tjetrin</button>`:''}<button type="button" class="btn btn-small" data-action="batch-remove" data-index="${i}" ${lock}>Hiq</button></div></div>`}).join('')
}
function batchHTML(){
 return `<div class="page-head"><div><div class="eyebrow">Regjistrim me 2 hapa</div><h1 class="page-title">1. Ngarko formularët</h1><p class="page-sub">Foto, PDF, Excel ose Word. Një formular ose deri në 10 bashkë.</p></div></div><div class="batch-steps"><span class="active">1 &nbsp; Ngarko dhe lexo</span><span>2 &nbsp; Kontrollo dhe ruaj</span></div><div class="import-grid batch-layout"><div class="card"><div class="card-head"><div><h2>Dokumentet</h2><p>Zgjidh skedarët, shtyp “Lexo formularët”, pastaj kontrollo dhe ruaj.</p></div></div><div class="card-body"><label class="upload-zone" for="batch-files">${icon('upload',21)}<strong>Zgjidh foto, PDF, Excel ose Word</strong><span>Deri në 10 formularë · 12 MB për skedar</span></label><input class="sr-only" type="file" id="batch-files" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.xlsx,.xltx,.xlsm,.xltm,.xls,.xlt,.docx,.docm,.dotx"><details class="batch-advanced"><summary>Si grupohen faqet (foto dhe PDF me disa faqe)</summary><p class="small-note">Një PDF i tërë lexohet vetëm: nëse përmban disa formularë, secili hapet si kartë kontrolli më vete. Ndarja më poshtë përdoret vetëm kur dokumenti duhet ndarë para leximit.</p><div class="field"><label for="batch-photo-mode">Kur zgjedh disa foto</label><select id="batch-photo-mode" class="input"><option value="pairs">Dy foto radhazi = një formular</option><option value="single">Çdo foto = një formular</option></select></div><div class="field"><label for="batch-pdf-mode">Nëse një PDF ka disa formularë</label><select id="batch-pdf-mode" class="input"><option value="whole">Çdo PDF = një formular</option><option value="pairs">Ndaje: çdo 2 faqe = një formular</option><option value="pages">Ndaje: çdo faqe = një formular</option></select><span class="small-note">Ndarja bëhet në pajisje. Kontrollo faqet e çdo grupi.</span></div></details><div class="batch-list-head"><strong>Grupet e dokumenteve</strong><span>Kontrollo që faqet e secilit formular të jenë bashkë.</span></div><div id="batch-groups" aria-live="polite">${batchGroupsHTML()}</div><div class="head-actions batch-start-actions"><button type="button" class="btn btn-primary" data-action="batch-read">${icon('search',15)} Lexo formularët</button><button type="button" class="btn" data-action="batch-cancel" hidden>Anulo leximin</button><button type="button" class="btn" data-action="batch-review-ready" hidden>Kontrollo të lexuarit</button><button type="button" class="btn btn-quiet" data-action="batch-reset" ${batchState.groups.length?'':'hidden'}>Fillo nga e para</button><button type="button" class="btn btn-small" data-action="batch-raw" ${batchState.groups.some(g=>g.raw)?'':'hidden'}>Shkarko leximin JSON</button></div><div id="batch-error" class="import-error" role="alert" ${batchState.error?'':'hidden'}>${esc(batchState.error)}</div><div id="batch-progress" class="read-progress" role="status" aria-live="polite" hidden><span class="read-spinner" aria-hidden="true"></span><div><strong>Po përpunohen formularët</strong><span id="batch-progress-text"></span><small id="batch-elapsed" aria-hidden="true"></small></div></div></div></div><div class="card"><div class="card-head"><div><h2>Leximi me Gemini</h2><p>Për foto, PDF, Word dhe Excel-e të tjera. Çdo formular lexohet më vete; mund të zgjasë disa minuta.</p></div></div><div class="card-body"><div class="notice import-privacy">${icon('info',16)}<span>Excel-i i modelit të BioBes lexohet në këtë pajisje pa Gemini. Dokumentet ruhen privatisht në cloud vetëm kur konfirmon ruajtjen.</span></div><p class="small-note batch-key-field">Çelësi Gemini konfigurohet privatisht vetëm në server. Çdo grup ka mundësi të zgjedhë origjinalet për ruajtje private, veçmas nga kopjet që lexon AI.</p><label class="import-consent"><input id="batch-anonymous" type="checkbox"> <span>Konfirmoj se dokumentet që do të dërgohen nuk përmbajnë emra, firma, të dhëna personale ose konfidenciale, dhe se projekti i çelësit Gemini në server është Free Tier pa faturim të lidhur.</span></label><details class="batch-advanced"><summary>Privatësia dhe kostot – lexo një herë</summary><p class="small-note">Dokumentet nuk anonimizohen automatikisht: hiqi të dhënat, mos i mbulo vetëm në pamje, dhe kontrollo metadatat. Emrat e skedarëve zëvendësohen, por përmbajtja dhe metadatat mund të dërgohen. Google mund të përdorë dhe të shqyrtojë leximet falas. Aplikacioni nuk verifikon planin; projektet me faturim mund të kenë kosto. Në EEA, Zvicër dhe MB Google kërkon shërbime me pagesë kur aplikacionet API u ofrohen përdoruesve atje. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">Kushtet e Google ↗</a></p></details><label class="import-consent"><input id="batch-catalog" type="checkbox"> <span>Pranoj shprehimisht dërgimin te Gemini të emrave në listat bazë më poshtë, vetëm nëse janë të anonimizuar dhe jokonfidencialë. Këto lista nuk anonimizohen automatikisht.</span></label><p class="small-note">Opsionale: listat bazë të përgjegjëseve, punonjësve, produkteve, paketimit, statuseve, njësive dhe burimeve. Mos e zgjidh nëse përmbajnë emra realë ose të dhëna konfidenciale.</p><label class="import-consent"><input id="batch-device-notice" type="checkbox" ${importState.notify?'checked':''}> <span>Më njofto kur të përfundojë leximi.</span></label></div></div></div>`
}
function batchError(message){batchState.error=str(message,700);const el=document.getElementById('batch-error');if(el){el.textContent=batchState.error;el.hidden=!batchState.error}}
function batchPaint(){const el=document.getElementById('batch-groups');if(el)el.innerHTML=batchGroupsHTML();const reset=view.querySelector('[data-action="batch-reset"]'),raw=view.querySelector('[data-action="batch-raw"]'),ready=view.querySelector('[data-action="batch-review-ready"]');if(reset)reset.hidden=!batchState.groups.length;if(raw)raw.hidden=!batchState.groups.some(g=>g.raw);if(ready)ready.hidden=!(batchState.groups.some(g=>g.status==='ready')&&batchState.groups.some(g=>g.status!=='ready'))}
function batchSetBusy(on,message=''){
 batchState.busy=on;batchState.progress=message;const p=document.getElementById('batch-progress'),t=document.getElementById('batch-progress-text'),read=view.querySelector('[data-action="batch-read"]'),cancel=view.querySelector('[data-action="batch-cancel"]');if(p)p.hidden=!on;if(t)t.textContent=message;if(read)read.disabled=on;if(cancel)cancel.hidden=!on;
 for(const id of ['batch-files','batch-photo-mode','batch-pdf-mode','batch-anonymous','batch-catalog','batch-device-notice']){const el=document.getElementById(id);if(el)el.disabled=on}for(const el of view.querySelectorAll('[data-action="batch-reset"],[data-action="batch-raw"],[data-action="batch-review-ready"]'))el.disabled=on;batchPaint();
 if(on&&!batchState.timer){const started=Date.now(),tick=()=>{const el=document.getElementById('batch-elapsed');if(el)el.textContent=`${Math.floor((Date.now()-started)/1000)} sekonda`};tick();batchState.timer=setInterval(tick,1000)}else if(!on&&batchState.timer){clearInterval(batchState.timer);batchState.timer=null}
}
const pdfCache=new WeakMap();
async function loadPdf(file){
 if(pdfCache.has(file))return pdfCache.get(file);
 const pdf=await PDFLib.PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false});
 pdfCache.set(file,pdf);
 return pdf;
}
async function batchSplitPdf(file,perForm,signal){
 if(file.size>IMPORT_LIMIT)throw new Error('Për ruajtjen private, PDF-i origjinal duhet të jetë deri në 12 MB.');let pdf;try{pdf=await loadPdf(file)}catch(e){throw new Error('PDF-i nuk u hap; kontrollo që nuk është i dëmtuar ose i mbrojtur.')}
 const count=pdf.getPageCount();if(!count||Math.ceil(count/perForm)>BATCH_MAX)throw new Error('PDF-i përmban më shumë se 10 grupe faqesh. Ndaje në skedarë më të vegjël.');const result=[];
 for(let i=0;i<count;i+=perForm){if(signal.aborted)throw new DOMException('aborted','AbortError');const indices=Array.from({length:Math.min(perForm,count-i)},(_,n)=>i+n),part=await PDFLib.PDFDocument.create({updateMetadata:false}),pages=await part.copyPages(pdf,indices);for(const page of pages)part.addPage(page);const bytes=await part.save(),end=i+indices.length,base=file.name.replace(/\.pdf$/i,''),label=indices.length===1?`${i+1}`:`${i+1}-${end}`,name=`${base}_faqet_${label}.pdf`,split=new File([bytes],name,{type:'application/pdf'});checkImportFiles([split]);result.push({file:split,originalFile:file,note:`Nga ${file.name}: ${indices.length===1?'faqja':'faqet'} ${label}${perForm===2&&indices.length===1?' (pa faqe çift)':''}.`})}
 return result
}
async function batchAddFiles(el){
 if(batchState.busy)return;const incoming=Array.from(el.files||[]);el.value='';if(!incoming.length)return;const controller=new AbortController(),run=++batchState.run;batchState.abort=controller;batchState.cancelled=false;
 const pair=document.getElementById('batch-photo-mode')?.value==='pairs',pdfMode=document.getElementById('batch-pdf-mode')?.value||'whole';batchError('');batchSetBusy(true,'Po përgatiten grupet e dokumenteve…');try{
  if(incoming.length>20)throw new Error('Zgjidh deri në 20 skedarë në një përpunim.');if(incoming.some(f=>/\.(doc|dot|rtf|odt)$/i.test(f.name)))throw new Error('Word i vjetër (.doc) nuk lexohet. Hape në Word dhe ruaje si .docx ose PDF.');if(incoming.some(f=>!fileKind(f)))throw new Error('Formati nuk mbështetet. Përdor foto, PDF, Excel ose Word (.docx).');if(incoming.some(f=>!f.size))throw new Error('Njëri prej skedarëve është bosh.');
  const added=[],make=(files,note='',originalFiles=files)=>({id:uid(),files,originalFiles,privateFiles:null,status:'pending',error:'',results:null,raw:null,workbook:null,sources:[],note});
  for(let i=0;i<incoming.length;i++){if(controller.signal.aborted)throw new DOMException('aborted','AbortError');const a=incoming[i],kind=fileKind(a);if(kind==='application/pdf'&&pdfMode!=='whole'){const parts=await batchSplitPdf(a,pdfMode==='pairs'?2:1,controller.signal);for(const part of parts)added.push(make([part.file],part.note,[part.originalFile]))}
   else{const files=[a];if(pair&&kind.startsWith('image/')&&i+1<incoming.length&&fileKind(incoming[i+1]).startsWith('image/'))files.push(incoming[++i]);checkImportFiles(files);added.push(make(files))}
   if(batchState.groups.length+added.length>BATCH_MAX)throw new Error('Zgjidh deri në 10 grupe. Ndaji në dy përpunime nëse ke më shumë.')
  }
  if(run!==batchState.run)return;if([...batchState.groups,...added].flatMap(g=>g.files).reduce((n,f)=>n+f.size,0)>BATCH_MAX*IMPORT_LIMIT)throw new Error('Skedarët janë shumë të mëdhenj për një përpunim. Ndaji në grupe.');batchState.groups.push(...added);batchPaint();
 }catch(e){if(run!==batchState.run)return;if(e?.name==='AbortError')batchError('Përgatitja u anulua; grupet e mëparshme mbetën të paprekura.');else batchError(e?.message||'Skedarët nuk u shtuan.')}finally{if(run===batchState.run){batchState.abort=null;batchSetBusy(false)}}
}
function batchPrivateChanged(el){if(batchState.busy)return;const g=batchState.groups.find(x=>x.id===el.dataset.batchOriginal),files=Array.from(el.files||[]);el.value='';if(!g||!files.length)return;try{checkImportFiles(files);g.privateFiles=files;batchError('');batchPaint()}catch(e){batchError(e?.message||'Origjinalet nuk u zgjodhën.')}}
function batchPrivateReset(id){if(batchState.busy)return;const g=batchState.groups.find(x=>x.id===id);if(g){g.privateFiles=null;batchError('');batchPaint()}}
function batchMove(i,step){if(batchState.busy)return;const j=i+step;if(i<0||j<0||i>=batchState.groups.length||j>=batchState.groups.length)return;[batchState.groups[i],batchState.groups[j]]=[batchState.groups[j],batchState.groups[i]];batchPaint()}
function batchSwap(i){const g=batchState.groups[i];if(batchState.busy||!g||g.status==='ready'||g.files.length!==2)return;g.files.reverse();g.status='pending';g.error='';batchPaint()}
function batchSplit(i){const g=batchState.groups[i];if(batchState.busy||!g||g.status==='ready'||g.privateFiles||g.files.length!==2||batchState.groups.length>=BATCH_MAX){if(batchState.groups.length>=BATCH_MAX)batchError('Maksimumi është 10 grupe.');return}const make=f=>({id:uid(),files:[f],originalFiles:[f],privateFiles:null,status:'pending',error:'',results:null,raw:null,workbook:null,sources:[]});batchState.groups.splice(i,1,...g.files.map(make));batchError('');batchPaint()}
function batchJoin(i){const a=batchState.groups[i],b=batchState.groups[i+1];if(batchState.busy||!a||!b||a.status==='ready'||b.status==='ready'||a.privateFiles||b.privateFiles||a.files.length!==1||b.files.length!==1||![a.files[0],b.files[0]].every(f=>fileKind(f).startsWith('image/')))return;try{const files=[a.files[0],b.files[0]];checkImportFiles(files);batchState.groups.splice(i,2,{id:uid(),files,originalFiles:files,privateFiles:null,status:'pending',error:'',results:null,raw:null,workbook:null,sources:[]});batchError('');batchPaint()}catch(e){batchError(e.message)}}
async function batchRemove(i){if(batchState.busy)return;const g=batchState.groups[i];if(!g)return;if(g.status==='ready'&&!await modal({title:'Hiq grupin e lexuar?',body:'Rezultatet e këtij grupi do të hiqen nga lista e kontrollit.',confirm:'Hiq',danger:true}))return;for(const x of g.sources||[])URL.revokeObjectURL(x.url);batchState.groups.splice(i,1);batchError('');batchPaint()}
async function batchStartOver(){if(batchState.busy)return;if(batchState.groups.some(g=>g.results?.length)&&!await modal({title:'Fillo nga e para?',body:'Rezultatet e lexuara, të paruajtura, do të hiqen.',confirm:'Fillo nga e para',danger:true}))return;batchReset();render()}
async function batchReviewCompleted(){if(batchState.busy)return;const ready=batchState.groups.filter(g=>g.status==='ready'&&g.results?.length),pending=batchState.groups.length-ready.length;if(!ready.length)return;if(pending&&!await modal({title:'Kontrollo vetëm të lexuarit?',body:`Do të kontrollosh ${ready.length} grupe të lexuara. ${pending} grupe të tjera hiqen nga kjo listë; skedarët origjinalë nuk fshihen dhe mund t’i ngarkosh sërish. Nëse duhet, shkarko më parë leximet JSON.`,confirm:'Vazhdo me të lexuarit'}))return;batchState.groups=ready;batchError('');batchBeginReview()}
function batchCancel(){if(!batchState.busy)return;batchState.cancelled=true;batchState.abort?.abort();const t=document.getElementById('batch-progress-text');if(t)t.textContent='Po anulohet…'}
function batchRawDownload(){const data=batchState.groups.filter(g=>g.raw).map(g=>({files:g.files.map(f=>f.name),seconds:g.seconds||null,reading:g.raw}));if(data.length)download('BioBes_leximet.json',JSON.stringify({type:'BioBes-Leximet',version:VERSION,items:data},null,2),'application/json;charset=utf-8')}
function batchResultsFromWorkbook(wb){
 const names=visibleSheets(wb);if(!names.length||!names.every(name=>looksLikeApproved(wb.Sheets[name])))return null;if(names.length>BATCH_MAX)throw new Error('Excel-i ka më shumë se 10 formularë. Ndaje në grupe më të vogla.');
 if(names.length===1){const found=readApprovedExcel(wb);if(!found)return null;const missing=found.warnings.some(w=>w.startsWith('Numri nuk ishte i plotësuar'));return [{...found,missingNumber:missing}]}
 const numbers=names.map(name=>afterLabel(cellRaw(wb.Sheets[name],'E2'),'Nr\\.?')),duplicates=new Map();for(const n of numbers)if(/^\d+$/.test(n))duplicates.set(Number(n),(duplicates.get(Number(n))||0)+1);
 const hidden=wb.Sheets['TE_DHENAT_PLOTA'],rows=hidden?XLSX.utils.sheet_to_json(hidden,{header:1,raw:true,defval:''}):[];
 return names.map((name,i)=>{const n=numbers[i],sub={SheetNames:[name],Sheets:{[name]:wb.Sheets[name]},Workbook:{Sheets:[{Hidden:0}]}},note=[];
  if(hidden){if(/^\d+$/.test(n)&&duplicates.get(Number(n))===1){const selected=rows.slice(1).filter(row=>/^\d+$/.test(str(row[0]).trim())&&Number(row[0])===Number(n));if(selected.length){sub.SheetNames.push('TE_DHENAT_PLOTA');sub.Sheets.TE_DHENAT_PLOTA=XLSX.utils.aoa_to_sheet([rows[0]||[],...selected]);sub.Workbook.Sheets.push({Hidden:1})}else note.push('Të dhënat e plota të fshehura nuk u gjetën për këtë numër; kontrollo dokumentin.')}
   else note.push('Numri nuk është unik; të dhënat e fshehura nuk u lidhën automatikisht.')}
  const found=readApprovedExcel(sub);if(!found)throw new Error('Një fletë e Excel-it nuk u lexua.');found.warnings.push(...note);return {...found,missingNumber:!n}
 })
}
function batchGenericFiles(files,workbook){
 const safe=files.map((f,i)=>{const ext=(f.name.match(/\.(?:jpe?g|png|webp|heic|heif|pdf|xlsx|xltx|xlsm|xltm|xls|xlt|docx|docm|dotx)$/i)||[''])[0].toLowerCase();return new File([f],`faqja-${i+1}${ext}`,{type:f.type})});const cache=new Map();if(workbook&&safe.length===1)cache.set(safe[0],workbook);return {safe,cache}
}
async function batchGemini(g,signal,catalog){
 const photoWarnings=[];
 const {safe,cache}=batchGenericFiles(g.files,g.workbook),parts=await prepareGeminiParts(safe,signal,cache,photoWarnings,catalog);if(signal.aborted)throw new DOMException('aborted','AbortError');const timer=setTimeout(()=>batchState.abort?.abort(),140000);let response;
 const started=Date.now();try{response=await cloudGemini(parts,signal)}finally{clearTimeout(timer)}
 g.seconds=Math.max(1,Math.round((Date.now()-started)/1000));const data=parseAIJson(response),read=aiReadings(data,{fileName:g.files.map(f=>f.name).join(' · '),pageCount:data?.document?.page_count });g.raw={...data,reading:{document:{fileName:g.files.map(f=>f.name).join(' · '),pageCount:read.document.pageCount,formCount:read.document.formCount},forms:read.forms.map(x=>x.reading)}};
 return read.forms.map(({record,warnings,reading},index)=>{const merged=[...warnings,...photoWarnings];if(g.workbook?.Sheets?.TE_DHENAT_PLOTA)merged.push('Të dhënat e fshehura të Excel-it nuk lexohen nga AI; kontrollo dokumentin origjinal.');return {record,warnings:merged,reading,formNumber:reading.formNumber,formCount:read.document.formCount,missingNumber:!reading.header.nr.value}})
}
function batchWait(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(new DOMException('aborted','AbortError'));return}const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve()},ms);function cancel(){clearTimeout(timer);reject(new DOMException('aborted','AbortError'))}signal.addEventListener('abort',cancel,{once:true})})}
async function batchRead(){
 if(batchState.busy)return;batchError('');const groups=batchState.groups;if(!groups.length){batchError('Zgjidh të paktën një dokument.');return}try{if(groups.length>BATCH_MAX)throw new Error('Maksimumi është 10 grupe.');for(const g of groups)checkImportFiles(g.files)}catch(e){batchError(e.message);return}
 const anonymous=!!document.getElementById('batch-anonymous')?.checked,controller=new AbortController(),run=++batchState.run;batchState.abort=controller;batchState.cancelled=false;let began=false;
 batchSetBusy(true,'Po kontrollohen dokumentet…');try{
  for(let i=0;i<groups.length;i++){const g=groups[i];if(g.status==='ready')continue;if(controller.signal.aborted)throw new DOMException('aborted','AbortError');g.status='pending';g.error='';batchSetBusy(true,`Po kontrollohet grupi ${i+1} nga ${groups.length}…`);
   if(g.files.length===1&&fileKind(g.files[0])==='excel'){
    try{g.workbook=g.workbook||await readExcelFile(g.files[0]);if(controller.signal.aborted)throw new DOMException('aborted','AbortError');const local=batchResultsFromWorkbook(g.workbook);if(local){g.results=local;g.status='ready';began=true;batchPaint()}}
    catch(e){if(e?.name==='AbortError')throw e;g.status='error';g.error=str(e.message,500);throw e}
   }
  }
  const produced=groups.reduce((n,g)=>n+(g.results?.length||1),0);if(produced>BATCH_MAX)throw new Error('Dokumentet përmbajnë më shumë se 10 formularë. Ndaji në përpunime të veçanta.');const pending=groups.filter(g=>g.status!=='ready');
  if(pending.length){if(!anonymous)throw new Error('Shëno kutinë e konfirmimit te “Leximi me Gemini” (dokumente anonime dhe projekt Free Tier pa faturim).');
   const catalog=optionalCatalog(!!document.getElementById('batch-catalog')?.checked),queue=[...pending],errors=[];
   const worker=async()=>{
    while(queue.length){
     if(controller.signal.aborted)throw new DOMException('aborted','AbortError');
     const g=queue.shift(),index=groups.indexOf(g);batchSetBusy(true,`Po lexohet grupi ${index+1} nga ${groups.length} me Gemini…`);began=true;
     try{g.results=await batchGemini(g,controller.signal,catalog);if(controller.signal.aborted)throw new DOMException('aborted','AbortError');g.status='ready';g.error='';batchPaint()}
     catch(e){if(e?.name==='AbortError')throw e;g.status='error';g.error=str(e?.message||'Leximi nuk përfundoi.',500);errors.push(e);batchPaint()}
    }
   };
   await Promise.all(Array.from({length:Math.min(2,queue.length)},worker));
   if(errors.length)throw errors[0];
  }
  if(run!==batchState.run)return;batchBeginReview();announceReading(true)
 }catch(e){if(run!==batchState.run)return;if(e?.name==='AbortError')batchError(batchState.cancelled?'Leximi u anulua. Rezultatet e përfunduara ruhen për këtë sesion.':'Leximi kaloi kohën. Rezultatet e përfunduara ruhen për këtë sesion.');else if(e instanceof TypeError)batchError('Nuk u lidh me shërbimin cloud. Kontrollo internetin; rezultatet e përfunduara nuk humbasin.');else batchError(str(e?.message||'Leximi nuk përfundoi.',600));if(began&&!batchState.cancelled&&state.route==='batch')announceReading(false)
 }finally{if(run===batchState.run){batchState.abort=null;batchSetBusy(false)}}
}
function batchAssignNumbers(items){
 const used=new Set(db.records.map(r=>Number(r.nr)).filter(n=>Number.isInteger(n)&&n>0));for(const it of items)if(!it.missingNumber&&/^\d{1,9}$/.test(str(it.record.nr).trim())&&Number(it.record.nr)>0)used.add(Number(it.record.nr));let candidate=nextNr();
 for(const it of items)if(it.missingNumber){while(used.has(candidate))candidate++;it.record.nr=String(candidate).padStart(3,'0');used.add(candidate++);it.warnings=it.warnings.filter(x=>!x.startsWith('Numri nuk u lexua')&&!x.startsWith('Numri nuk ishte i plotësuar'));it.warnings.push(`Numri nuk ishte i lexueshëm; u propozua ${it.record.nr}. Kontrolloje.`)}
}
function batchBeginReview(){
 const items=[];for(const g of batchState.groups){if(g.status!=='ready'||!g.results?.length){batchError('Jo të gjitha grupet janë lexuar.');return}for(const result of g.results){const record=normalizeRecord(result.record),warnings=[...new Set(result.warnings||[])];if(record.attachments?.length)warnings.push('Lidhjet e vjetra të dokumenteve nuk importohen; do të ruhen origjinalet e zgjedhura këtu.');record.attachments=[];record.id=uid();const sources=g.files.map(f=>({name:f.name,url:URL.createObjectURL(f)}));const originals=(g.privateFiles||g.originalFiles||g.files).map(f=>({name:f.name,file:f,uploaded:null,pendingPath:''}));items.push({record,warnings,missingNumber:!!result.missingNumber,reading:result.reading||null,formNumber:result.formNumber||null,formCount:result.formCount||null,sources,originals,confirmedDigest:''})}}
 if(items.length>BATCH_MAX){for(const it of items)for(const x of it.sources)URL.revokeObjectURL(x.url);batchError('Rezultati përmban më shumë se 10 formularë. Ndaji në grupe më të vogla.');return}batchAssignNumbers(items);batchState.items=items;batchState.phase='review';batchOpen(0)
}
function batchReviewed(item){return !!item.confirmedDigest&&item.confirmedDigest===JSON.stringify(item.record)}
function batchMarkChanged(){if(!batchIsReview())return;const item=batchState.items[batchState.index];if(item.confirmedDigest){item.confirmedDigest='';const el=document.getElementById('batch-reviewed');if(el)el.checked=false;batchUpdateSummary()}}
function batchUpdateSummary(){const text=document.getElementById('batch-review-count');if(text)text.textContent=`${batchState.items.filter(batchReviewed).length}/${batchState.items.length} të kontrolluar`}
function batchOpen(i){if(batchState.phase!=='review'||i<0||i>=batchState.items.length)return;batchState.index=i;const item=batchState.items[i];state.route='editor';state.mode='new';state.editorBase=null;state.draft=item.record;state.tab='details';state.side=0;state.weightOpen=new Set([0]);state.dirty=true;render();window.scrollTo({top:0,behavior:'smooth'})}
function readingStatusLabel(section){return section==='front'?'Faqja PARA':section==='back'?'Faqja PAS':'E paqartë'}
function readingRows(item){
 const reading=item?.reading;if(!reading)return [];
 const rows=[],add=(label,field,section)=>{if(field&&(field.value||field.needsReview))rows.push({label,field,section})};
 const header=reading.header||{},employees=reading.employees||[];
 const firstRow=key=>employees.find(person=>person[key]&&(person[key].value||person[key].needsReview));
 for(const [label,field,section] of [['Emri e Mbiemri (përgjegjësja)',header.responsible,'front'],['Fillim Pune · punonjësit',firstRow('start')?.start,'front'],['Mbarim Pune · punonjësit',firstRow('end')?.end,'front'],['Orë Gjithsej',header.totalHours,'front'],['Komente · punonjësit',firstRow('comment')?.comment,'front'],['Firma e Punonjësit',firstRow('signature')?.signature,'front']])add(label,field,section);
 if((reading.comments||[]).length)add('KOMENTE',reading.comments[0],'back');
 const keys=[['nrThas','Nr. thas.'],['kg','Kg'],['ambalazhi','Ambalazhi'],['shuma','Shuma']];
 for(const table of ['peshimi1','peshimi2','peshimi3']){
  const list=(reading.weights||{})[table]||[];
  for(const row of list)for(const key of keys)add(table.toUpperCase()+' · '+key[1]+(row.row?' · rreshti '+row.row:''),row[key[0]],'front');
 }
 return rows;
}
function readingReviewHTML(item){
 const reading=item?.reading;if(!reading)return '';
 const formCount=item.formCount||batchState.items.length,multi=formCount>1;
 const pages=reading.pages||{},rows=readingRows(item),flagged=rows.filter(row=>row.field.needsReview).length;
 const status=(reading.needsReview||flagged)?'NeedsReview = true':'NeedsReview = false';
 const cells=rows.length?rows.map(function(row){
  const page=row.section==='front'&&pages.front?String(pages.front):row.section==='back'&&pages.back?String(pages.back):(row.field.page||'—');
  const value=row.field.value==null?'[e paqartë]':String(row.field.value);
  const percent=row.field.confidence==null?'—':Math.round(row.field.confidence*100)+'%';
  return '<tr'+(row.field.needsReview?' class="reading-flag"':'')+'><td>'+esc(row.label)+'</td><td class="strong">'+esc(value)+'</td><td>'+esc(page)+'</td><td>'+esc(row.field.formArea||'—')+'</td><td>'+esc(percent)+'</td><td>'+(row.field.needsReview?'po':'jo')+'</td></tr>';
 }).join(''):'<tr><td colspan="6" class="muted">Nuk u lexua asnjë vlerë; kontrollo dokumentin.</td></tr>';
 const uncertain=(reading.uncertain||[]).length?'<p class="small-note">Të paqarta: '+reading.uncertain.map(x=>esc(x.readAs||x.formArea||'—')).join(' · ')+'</p>':'';
 const formLine=multi?'<span>Formulari <strong>'+(reading.formNumber||item.formNumber||'—')+'/'+formCount+'</strong> në dokument</span>':'';
 return '<details class="reading-panel" open><summary>Vendndodhja e çdo vlere · '+status+(flagged?' · '+flagged+' për kontroll':'')+'</summary>'
  +'<div class="reading-meta"><span>Faqja PARA: <strong>'+(pages.front||'—')+'</strong></span><span>Faqja PAS: <strong>'+(pages.back||'—')+'</strong></span>'+formLine+'</div>'
  +'<div class="table-wrap"><table class="table reading-table"><thead><tr><th>Fusha</th><th>Vlera e lexuar</th><th>Faqja</th><th>Zona e formularit</th><th>Siguria</th><th>needsReview</th></tr></thead><tbody>'+cells+'</tbody></table></div>'+uncertain+'</details>';
}
function batchReviewPanel(){const it=batchState.items[batchState.index],links=it.sources.length?it.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.name)} ↗</a>`).join(' · '):'Dokumentet origjinale nuk përfshihen në draftin JSON.',warnings=it.warnings.length?`<ul>${it.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:'';return `<div class="review-panel batch-review-panel" role="status"><div class="batch-review-heading"><strong>Formulari ${batchState.index+1} nga ${batchState.items.length}</strong><span id="batch-review-count">${batchState.items.filter(batchReviewed).length}/${batchState.items.length} të kontrolluar</span></div><p>Krahasoje me dokumentin e lexuar: ${links}</p><p>Origjinale për ruajtje private: ${it.originals.length?it.originals.map(x=>esc(x.name)).join(' · '):'Nuk ka dokumente në këtë draft.'}</p><label for="batch-review-original" class="btn btn-small batch-private-picker">Zgjidh origjinalet private për këtë formular</label><input class="sr-only" type="file" id="batch-review-original" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.xlsx,.xltx,.xlsm,.xltm,.xls,.xlt,.docx,.docm,.dotx"><div class="small-note">Këta skedarë nuk dërgohen te Gemini.</div>${warnings}${readingReviewHTML(it)}<label class="import-consent"><input type="checkbox" id="batch-reviewed" ${batchReviewed(it)?'checked':''}> <span>Konfirmoj që e kontrollova këtë formular.</span></label><div class="batch-pages">${batchState.items.map((x,i)=>`<button type="button" class="btn btn-small ${i===batchState.index?'btn-primary':''}" data-action="batch-open" data-index="${i}" aria-current="${i===batchState.index?'step':'false'}">${i+1}${batchReviewed(x)?' ✓':''}</button>`).join('')}</div></div>`}
async function batchReviewPrivateChanged(el){if(!batchIsReview()||cloud.busy)return;const files=Array.from(el.files||[]);el.value='';if(!files.length)return;try{checkImportFiles(files)}catch(e){toast(e?.message||'Origjinalet nuk u zgjodhën.','error');return}const item=batchState.items[batchState.index];cloudBusy(true,'Po përgatiten origjinalet private…');try{await batchCleanupCloud(db,[item]);item.originals=files.map(f=>({name:f.name,file:f,uploaded:null,pendingPath:''}));item.confirmedDigest='';render();toast('Origjinalet u zgjodhën; kontrollo dhe konfirmo formularin.','warn')}catch(e){toast('Origjinalet nuk u zgjodhën. Provo përsëri.','error')}finally{cloudBusy(false)}}
function batchEditorHTML(){const r=state.draft,body=detailsHTML(r,false)+staffHTML(r,false)+weightsHTML(r,false)+commentsHTML(r,false),prev=batchState.index===0?'disabled':'',next=batchState.index===batchState.items.length-1?'disabled':'';return `<div class="page-head"><div><div class="eyebrow">Regjistrim me 2 hapa</div><h1 class="page-title">2. Kontrollo dhe ruaj</h1><p class="page-sub">Formulari ${batchState.index+1} / ${batchState.items.length} · Nr. ${esc(r.nr||'—')}${batchState.items[batchState.index]?.formCount>1?` · formulari ${batchState.items[batchState.index].formNumber||batchState.index+1} nga ${batchState.items[batchState.index].formCount} formularë në dokument`:""}</p></div><div class="head-actions"><button class="btn" data-action="batch-draft">${icon('download',15)} Shkarko draftet</button><button class="btn btn-primary" data-action="batch-save">${icon('save',15)} Ruaj të gjitha</button></div></div><div class="batch-steps"><span>1 &nbsp; Ngarko dhe lexo</span><span class="active">2 &nbsp; Kontrollo dhe ruaj</span></div>${batchReviewPanel()}<div class="editor-stack editor-all">${body}</div><div class="head-actions batch-bottom"><button type="button" class="btn" data-action="batch-open" data-index="${batchState.index-1}" ${prev}>← Paraardhësi</button><button type="button" class="btn" data-action="batch-open" data-index="${batchState.index+1}" ${next}>Tjetri →</button><button type="button" class="btn btn-quiet" data-action="batch-remove-review">Hiq këtë formular</button><button type="button" class="btn btn-primary" data-action="batch-save">${icon('save',15)} Ruaj të gjitha</button></div>`}
function batchDraftDownload(){if(!batchIsReview())return;const records=batchState.items.map(it=>({record:clone(it.record),warnings:it.warnings}));download('BioBes_draftet.json',JSON.stringify({type:'BioBes-Batch-Draft',version:VERSION,exportedAt:new Date().toISOString(),records},null,2),'application/json;charset=utf-8');toast('Draftet u shkarkuan. Dokumentet origjinale nuk përfshihen.','warn')}
function batchRestore(parsed){
 if(!Array.isArray(parsed.records)||!parsed.records.length||parsed.records.length>BATCH_MAX||parsed.records.some(x=>!x?.record||typeof x.record!=='object'||Array.isArray(x.record)))throw new Error('invalid batch draft');
 batchReset();batchState.items=parsed.records.map(x=>{const record=normalizeRecord(x.record);record.id=uid();record.attachments=[];return {record,originals:[],warnings:[...(Array.isArray(x.warnings)?x.warnings.slice(0,50).map(w=>str(w,400)):[]),'Dokumentet origjinale nuk përfshihen në draft. Kontrollo numrin dhe të dhënat.'],missingNumber:false,sources:[],confirmedDigest:''}});batchState.phase='review';batchOpen(0)
}
async function batchRemoveReview(){if(!batchIsReview())return;if(!await modal({title:'Hiq këtë formular nga grupi?',body:'Formulari hiqet nga lista e kontrollit. Regjistrimet e ruajtura nuk preken.',confirm:'Hiq',danger:true}))return;await batchCleanupCloud(db,[batchState.items[batchState.index]]);batchState.items.splice(batchState.index,1);if(!batchState.items.length){batchReset();state.route='batch';state.draft=null;state.dirty=false;render();return}batchOpen(Math.min(batchState.index,batchState.items.length-1))}
async function batchReloadLatest(){await cloudKeepBatchAndRefresh()}
async function batchSave(){
 if(!batchIsReview()||cloud.busy||cloud.uncertain||cloud.conflict)return;const items=batchState.items,unconfirmed=items.findIndex(it=>!batchReviewed(it));if(unconfirmed>=0){batchOpen(unconfirmed);toast('Kontrollo dhe konfirmo çdo formular përpara ruajtjes.','error');return}
 const used=new Set();for(let i=0;i<items.length;i++){const r=items[i].record;if(!str(r.responsible?.name).trim()){batchOpen(i);showValidation({tab:'details',path:'responsible.name',message:'Zgjidh përgjegjësen për çdo formular.'});return}if(db.records.some(x=>x.id===r.id)){batchOpen(i);toast('Ky formular mund të jetë ruajtur tashmë. Kontrollo regjistrimet; nuk u ruajt përsëri.','error');return}const number=Number(r.nr);if(used.has(number)){batchOpen(i);showValidation({tab:'details',path:'nr',message:'Dy formularë kanë të njëjtin numër. Ndrysho njërin.'});return}used.add(number);resolveExactSources(r);const err=validateRecord(r);if(err){batchOpen(i);showValidation(err);return}}
 cloudBusy(true,'Po ruhen formularët dhe dokumentet private në cloud…');try{const next=clone(db),ids=[];for(const it of items){const r=clone(it.record);r.nr=String(Number(r.nr)).padStart(3,'0');r.attachments=[];for(const source of it.originals)r.attachments.push(await cloudUploadSource(source,r.id));ids.push(r.id);next.records.push(r);next.nextNr=Math.max(next.nextNr,Number(r.nr)+1)}if(!await commit(next,{locked:true,kind:'batch-create',ids}))return;const count=items.length;await batchResetCloud(db);state.route='records';state.draft=null;state.editorBase=null;state.dirty=false;render();toast(`U ruajtën ${count} formularë në cloud.`)}catch(e){toast(str(e?.message||'Formularët nuk u ruajtën. Provo përsëri.',400),'error')}finally{cloudBusy(false)}
}

function batchDownloadReadyFromSelect(){const records=batchState.groups.filter(g=>g.status==='ready').flatMap(g=>(g.results||[]).map(x=>{const r=clone(x.record);r.attachments=[];return {record:r,warnings:[...(x.warnings||[]),'Draft i rikuperuar; dokumentet origjinale nuk përfshihen. Kontrollo numrin.']}}));if(!records.length){toast('Nuk ka formularë të lexuar.','warn');return}download('BioBes_draftet.json',JSON.stringify({type:'BioBes-Batch-Draft',version:VERSION,records},null,2),'application/json;charset=utf-8');toast('Draftet u shkarkuan; dokumentet origjinale nuk përfshihen.','warn')}
function importReviewHTML(){const r=importState.review;if(!r)return '';const links=r.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.name)} ↗</a>`).join(' · '),warnings=r.warnings.length?`<ul>${r.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:'';return `<div class="review-panel" role="status"><strong>Kontrollo formularin e lexuar</strong><p>Krahaso të gjitha fushat dhe peshimet me dokumentin origjinal. ${links}</p>${warnings}<label class="import-consent"><input type="checkbox" id="confirm-import-review" ${r.confirmed?'checked':''}> <span>Konfirmoj se i kam kontrolluar të dhënat.</span></label></div>`}
async function clearImportReview(){const review=importState.review;if(!review)return;importState.review=null;for(const source of review.sources)URL.revokeObjectURL(source.url);try{await cloudCleanupUnsavedReview(review)}catch(e){cloudNotify('Disa dokumente të paruajtura mund të kenë mbetur në Storage privat. Kontrolloji në Supabase.')}}
async function setDeviceNotice(el){
 if(!el.checked){importState.notify=false;return}
 if(!window.isSecureContext||!('Notification' in window)){el.checked=false;importState.notify=false;toast('Njoftimet në pajisje nuk mbështeten këtu; treguesi në aplikacion vazhdon të funksionojë.','warn');return}
 try{let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();if(permission!=='granted'){el.checked=false;importState.notify=false;toast('Njoftimet në pajisje nuk u lejuan.','warn');return}importState.notify=true;if('serviceWorker' in navigator)navigator.serviceWorker.register('./notification-sw.js',{scope:'./'}).catch(()=>{});toast('Njoftimet në pajisje u aktivizuan.')}
 catch(e){el.checked=false;importState.notify=false;toast('Njoftimet në pajisje nuk janë të disponueshme.','warn')}
}
function announceReading(ok){
 const message=ok?'Leximi përfundoi. Kontrollo të dhënat para ruajtjes.':'Leximi nuk përfundoi. Kontrollo njoftimin te dokumenti.';
 const kind=ok?'':'error';toast(message,kind);
 if(document.visibilityState==='hidden'){
  importState.pendingNotice={message,kind};
  if(importState.notify&&window.isSecureContext&&'Notification' in window&&Notification.permission==='granted'){
   const options={body:message,tag:'biobes-leximi'};try{new Notification('BioBes',options)}catch(e){if('serviceWorker' in navigator)navigator.serviceWorker.register('./notification-sw.js',{scope:'./'}).then(reg=>reg.showNotification('BioBes',options)).catch(()=>{})}
  }
 }
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&importState.pendingNotice){const {message,kind}=importState.pendingNotice;importState.pendingNotice=null;toast(message,kind)}});
function fileKind(file){const name=file.name.toLowerCase(),m=file.type.toLowerCase();if(/\.(xlsx|xltx|xlsm|xltm|xls|xlt)$/.test(name)||m.includes('spreadsheet')||m.includes('excel'))return 'excel';if(/\.(docx|docm|dotx)$/.test(name)||m.includes('wordprocessingml'))return 'word';if(name.endsWith('.pdf')||m==='application/pdf')return 'application/pdf';const types=[['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.png','image/png'],['.webp','image/webp'],['.heic','image/heic'],['.heif','image/heif']];return types.find(([ext])=>name.endsWith(ext))?.[1]||(['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(m)?m:'')}
function checkImportFiles(files){if(!files.length)throw new Error('Zgjidh të paktën një skedar.');if(files.length>6)throw new Error('Zgjidh deri në 6 skedarë për një formular.');if(files.some(f=>/\.(doc|dot|rtf|odt)$/i.test(f.name)))throw new Error('Word i vjetër (.doc) nuk lexohet. Hape në Word dhe ruaje si .docx ose PDF.');if(files.some(f=>!fileKind(f)))throw new Error('Formati nuk mbështetet. Përdor foto, PDF, Excel ose Word (.docx).');if(files.reduce((n,f)=>n+f.size,0)>IMPORT_LIMIT)throw new Error('Skedarët së bashku duhet të jenë deri në 12 MB.');if(files.some(f=>f.size===0))throw new Error('Njëri prej skedarëve është bosh.')}
function validateExcelArchive(buffer){const b=new Uint8Array(buffer);if(b.length<4||b[0]!==0x50||b[1]!==0x4b)return;const d=new DataView(buffer);let end=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(d.getUint32(i,true)===0x06054b50){end=i;break}if(end<0)throw new Error('Arkiva e Excel-it është e dëmtuar.');const count=d.getUint16(end+10,true),size=d.getUint32(end+12,true),offset=d.getUint32(end+16,true);if(count===0xffff||size===0xffffffff||offset===0xffffffff||count>10000||offset+size>b.length)throw new Error('Excel-i është shumë i madh ose përdor një arkiv të pambështetur.');let cursor=offset,total=0;for(let i=0;i<count;i++){if(cursor+46>b.length||d.getUint32(cursor,true)!==0x02014b50)throw new Error('Arkiva e Excel-it është e dëmtuar.');const flags=d.getUint16(cursor+8,true),uncompressed=d.getUint32(cursor+24,true),name=d.getUint16(cursor+28,true),extra=d.getUint16(cursor+30,true),comment=d.getUint16(cursor+32,true);if(flags&1)throw new Error('Excel-i i mbrojtur me fjalëkalim nuk lexohet.');total+=uncompressed;if(uncompressed===0xffffffff||uncompressed>50*1024*1024||total>80*1024*1024)throw new Error('Excel-i i zbërthyer është shumë i madh. Ndaje në skedarë më të vegjël.');cursor+=46+name+extra+comment;if(cursor>offset+size)throw new Error('Arkiva e Excel-it është e dëmtuar.')}}
async function readExcelFile(file){let wb;const buffer=await file.arrayBuffer();validateExcelArchive(buffer);try{wb=XLSX.read(buffer,{type:'array',cellDates:false,cellText:true,cellNF:true,bookVBA:false})}catch(e){throw new Error(`Excel-i “${file.name}” nuk u hap. Kontrollo që nuk është i dëmtuar ose i mbrojtur me fjalëkalim.`)}if(!wb.SheetNames?.length)throw new Error('Excel-i nuk përmban fletë.');return wb}
function visibleSheets(wb){return wb.SheetNames.filter((name,i)=>!(wb.Workbook?.Sheets?.[i]?.Hidden>0))}
function cellRaw(sh,addr){const c=sh?.[addr];return c&&c.v!==undefined&&c.v!==null?c.v:''}
function cellText(sh,addr){const c=sh?.[addr];if(!c||c.v===undefined||c.v===null)return '';return str(c.w!==undefined?c.w:c.v).trim()}
function looksLikeApproved(sh){const c=x=>fold(cellText(sh,x)).replace(/\s+/g,' ');return c('C6').includes('produkt')&&c('Q6').includes('klient')&&c('P11').includes('koment')&&c('E1').includes('dhoma')&&String(cellRaw(sh,'A51'))==='25'&&String(cellRaw(sh,'A85'))==='25'}
function cleanPlaceholder(v){return str(v).replace(/[_\s\-–—.:/]+$/g,'').trim()}
function afterLabel(v,label){let s=str(v).trim();s=s.replace(new RegExp('^\\s*'+label+'\\s*[:.]?\\s*','i'),'');return cleanPlaceholder(s)}
function dateFromImport(value,currentYear=new Date().getFullYear()){
 if(value instanceof Date&&!Number.isNaN(value.getTime())){const out=`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;return dateValid(out)?out:''}
 if(typeof value==='number'&&Number.isFinite(value)&&value>1){const d=XLSX.SSF.parse_date_code(value),out=d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:'';return dateValid(out)?out:''}
 const s=str(value).trim();let m=s.match(/\b(\d{4})[-./](\d{1,2})[-./](\d{1,2})\b/),out='';
 if(m)out=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
 else if((m=s.match(/\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4}|\d{2})\b/))){
  // BioBes forms are written day/month. Month/day is assumed only when the
  // second number cannot be a month (e.g. 11/13/2026).
  const a=Number(m[1]),b=Number(m[2]);
  let year=Number(m[3]);if(m[3].length===2){const matches=[];for(let y=currentYear-10;y<=currentYear+10;y++)if(y%100===year)matches.push(y);if(matches.length!==1)return '';year=matches[0]}
  const day=b>12?b:a,month=b>12?a:b;out=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 }
 return dateValid(out)?out:'';
}

// True when a day/month date could also be read month/day (6.11 vs 11.6).
function dateOrderAmbiguous(value){const m=str(value).trim().match(/\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4}|\d{2})\b/);if(!m||/\b\d{4}[-./]\d{1,2}[-./]\d{1,2}\b/.test(str(value)))return false;const a=Number(m[1]),b=Number(m[2]);return a<=12&&b<=12&&a!==b}
// Handwritten clock times come back in many shapes: 7:00, 7.00, 7 00, 700,
// 7h, 7⁰⁰ or just 7. All of them mean a time on this form.
function clockText(value){let s=str(value).trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).replace(/^ora\s*/i,'').replace(/\s*(?:h|hr|ore|orë)\.?\s*/i,':').replace(/\s*[,;·]\s*|\s+(?=\d)/g,':').replace(/:+/g,':').replace(/:$/,'');if(/^\d{1,2}$/.test(s))return s+':00';if(/^\d{3,4}$/.test(s))return s.slice(0,-2)+':'+s.slice(-2);return s}
function timeFromImport(value){
 let hours,minutes,seconds=0;
 if(value instanceof Date&&!Number.isNaN(value.getTime())){hours=value.getHours();minutes=value.getMinutes();seconds=value.getSeconds()+value.getMilliseconds()/1000}
 else if(typeof value==='number'&&value>=0&&value<1){const m=Math.round(value*1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
 else{const raw=str(value).trim();if(!raw)return '';const s=/[ap]m$/i.test(raw)?raw:clockText(raw);const m=s.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(AM|PM)?$/i);if(!m)return '';hours=Number(m[1]);minutes=Number(m[2]);seconds=Number(m[3]||0);if(m[4]){if(hours<1||hours>12)return '';if(m[4].toUpperCase()==='PM'&&hours!==12)hours+=12;if(m[4].toUpperCase()==='AM'&&hours===12)hours=0}}
 if(hours<0||hours>23||minutes>59||seconds>=60)return '';const total=(hours*60+minutes+(seconds>=30?1:0))%1440;return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

// Interprets comma as the Albanian decimal separator; a well-formed dot group
// such as 1.250 is thousands. Explicit mixed separators disambiguate US format.
// Returns null rather than guessing on inconsistent groups, units or negatives.
function parseAlNumber(value){
 if(typeof value==='number')return Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER?value:null;
 if(typeof value!=='string')return null;const s=value.trim().replace(/[\u00a0\u202f]/g,' ');if(!s||!/^[0-9., ]+$/.test(s)||/[.,]$/.test(s))return null;
 const hasComma=s.includes(','),hasDot=s.includes('.');let integer='',fraction='';
 const spaceInteger=x=>/^\d+$/.test(x)?x:(/^[1-9]\d{0,2}(?: \d{3})+$/.test(x)?x.replace(/ /g,''):null);
 if(hasComma&&hasDot){
  const decimal=s.lastIndexOf(',')>s.lastIndexOf('.')?',':'.',group=decimal===','?'.':',';
  if(s.includes(' ')||s.split(decimal).length!==2)return null;const parts=s.split(decimal);fraction=parts[1];
  const escaped=group==='.'?'\\.':',';if(!new RegExp(`^[1-9]\\d{0,2}(?:${escaped}\\d{3})+$`).test(parts[0]))return null;
  integer=parts[0].split(group).join('');
 }else if(hasComma){
  if(s.split(',').length!==2)return null;const parts=s.split(',');integer=spaceInteger(parts[0]);fraction=parts[1];
 }else if(hasDot){
  if(/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(s)){integer=s.replace(/\./g,'')}
  else{if(s.split('.').length!==2)return null;const parts=s.split('.');integer=spaceInteger(parts[0]);fraction=parts[1]}
 }else integer=spaceInteger(s);
 if(integer===null||integer===''||((hasComma||hasDot)&&s.endsWith(hasComma&&!hasDot?',':hasDot?'.':',')&&!fraction))return null;
 if(fraction&&!/^\d+$/.test(fraction))return null;const canonical=integer+(fraction?'.'+fraction:'');
 const significant=canonical.replace('.','').replace(/^0+/,'');if(significant.length>15)return null;
 const n=Number(canonical);return Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER?n:null;
}
// A pen dot after a handwritten number ("300.") is noise, not a different value.
function looseNumberText(value){return typeof value==='string'?value.trim().replace(/(\d)\s*[.,;:]+$/,'$1'):value}
function importedNumber(value,label,warnings,integer=false){
 if(value===null||value===undefined||str(value).trim()==='')return '';const n=parseAlNumber(looseNumberText(value));
 if(n===null||(integer&&!Number.isInteger(n))){warnings.push(`${label}: vlera “${str(value).slice(0,40)}” është e paqartë ose e pavlefshme; duhet kontrolluar dhe futur manualisht.`);return ''}return String(n);
}

function parseOrdered(value,warnings,label){
 const s=str(value).trim();if(!s)return {planned:'',unit:''};const m=s.match(/^([\d.,\s\u00a0\u202f]+?)(?:\s+([^\d\s].*))?$/u);
 if(!m){warnings.push(`${label}: kontrollo sasinë “${s.slice(0,60)}”.`);return {planned:'',unit:''}}
 return {planned:importedNumber(m[1].trim(),label,warnings),unit:str(m[2]).trim()};
}

function titleFromExcel(value){let title=cleanPlaceholder(str(value).replace(/^\s*PESHIMI\s*\d*\s*[—–-]?\s*/i,''));const m=title.match(/\s*\((stok|tjetër|tjeter)\)\s*$/i);return {product:m?title.slice(0,m.index).trim():title,source:m?(fold(m[1])==='stok'?'stock':'other'):''}}
function approvedMetadata(wb,rawNr,warnings){const sh=wb.Sheets['TE_DHENAT_PLOTA'];if(!sh)return null;const rows=XLSX.utils.sheet_to_json(sh,{header:1,raw:true,defval:''}).slice(1).filter(row=>str(row[2]));if(!rows.length)return null;const nrs=[...new Set(rows.map(x=>str(x[0])))];if(nrs.length!==1||!rawNr||Number(nrs[0])!==Number(rawNr)){warnings.push('Të dhënat shtesë në Excel nuk përputhen me numrin vizibil; kontrolloji manualisht.');return null}try{const parts=rows.map(x=>str(x[2])).join(''),obj=JSON.parse(parts);if(!obj||!Array.isArray(obj.plan)||!Array.isArray(obj.employees)||!Array.isArray(obj.weighings))throw new Error('bad');return normalizeRecord(obj)}catch(e){warnings.push('Të dhënat shtesë të Excel-it nuk u lexuan; kontrolloji manualisht.');return null}}

function readApprovedExcel(wb){const names=visibleSheets(wb);if(names.length!==1){if(names.length>1&&names.every(name=>looksLikeApproved(wb.Sheets[name]))){const numbers=names.map(name=>afterLabel(cellRaw(wb.Sheets[name],'E2'),'Nr\\.?'));const unique=new Set(numbers.filter(nonempty).map(x=>/^\d+$/.test(x)?String(Number(x)):x));if(unique.size>1||numbers.some(x=>!x))throw new Error('Excel-i përmban disa formularë ose numra të paqartë. Ndaj një formular në çdo import.')}return null}const sh=wb.Sheets[names[0]];if(!looksLikeApproved(sh))return null;const warnings=[],rawNr=afterLabel(cellRaw(sh,'E2'),'Nr\\.?'),r=approvedMetadata(wb,rawNr,warnings)||blankRecord(nextNr());r.nr=rawNr||String(nextNr()).padStart(3,'0');if(!rawNr)warnings.push('Numri nuk ishte i plotësuar; u propozua numri i radhës.');r.date=dateFromImport(cellRaw(sh,'H2'));if(!r.date)warnings.push('Data nuk u lexua; vendose dhe kontrolloje.');r.room=afterLabel(cellRaw(sh,'E1'),'DHOMA');r.responsible={name:str(cellRaw(sh,'F3')),signature:str(cellRaw(sh,'W3'))};r.assistant={name:str(cellRaw(sh,'F4')),signature:str(cellRaw(sh,'W4'))};
 for(let i=0;i<3;i++){const row=7+i,q=parseOrdered(cellRaw(sh,`I${row}`),warnings,`Produkti ${i+1}`),p=r.plan[i],product=str(cellRaw(sh,`C${row}`)),packaging=str(cellRaw(sh,`L${row}`));if(fold(p.product)!==fold(product)){if(nonempty(p.actual)||nonempty(p.packageCount))warnings.push(`Produkti ${i+1} ndryshoi në Excel. Kontrollo sasinë e prodhuar (${p.actual||'bosh'}) dhe ambalazhet (${p.packageCount||'bosh'}) nga dokumenti origjinal.`);p.actual='';p.packageCount=''}else if(fold(p.packaging)!==fold(packaging)){if(nonempty(p.packageCount))warnings.push(`Paketimi ${i+1} ndryshoi në Excel. Kontrollo numrin e mëparshëm të ambalazheve (${p.packageCount}).`);p.packageCount=''}Object.assign(p,{product,status:str(cellRaw(sh,`G${row}`)),planned:q.planned,unit:q.unit||p.unit,packaging,client:str(cellRaw(sh,`Q${row}`)),comment:str(cellRaw(sh,`T${row}`))})}
 for(let i=0;i<EMPLOYEE_ROWS;i++){const row=EMPLOYEE_TOP_ROW+i,e=r.employees[i];e.name=str(cellRaw(sh,`C${row}`));for(const [key,col] of [['start','J'],['end','L']]){const raw=cellRaw(sh,`${col}${row}`);e[key]=timeFromImport(raw)||timeFromImport(cellText(sh,`${col}${row}`));if(raw!==''&&!e[key])warnings.push(`Punonjësi ${i+1}: kontrollo orën ${key==='start'?'e fillimit':'e mbarimit'}.`)}e.comment=str(cellRaw(sh,`P${row}`));e.signature=str(cellRaw(sh,`Y${row}`))}
 const cols=[['B','D','F','H'],['K','M','O','R'],['U','W','Z','AB']],keys=['bags','kg','packaging','sum'];for(let side=0;side<2;side++)for(let k=0;k<3;k++){const i=side*3+k,g=r.weighings[i],header=side?59:25,start=side?61:27;const parsed=titleFromExcel(cellRaw(sh,`${cols[k][0]}${header}`)),oldProduct=g.product;g.product=parsed.product;if(parsed.source){g.source=parsed.source;g.sourceLabel=parsed.source==='stock'?'Marrë nga stoku':'Tjetër / jo nga stoku'}else if(fold(oldProduct)!==fold(g.product)){if(g.source)warnings.push(`Peshimi ${i+1}: produkti ndryshoi; përcakto përsëri burimin.`);g.source='';g.sourceLabel=''}for(let j=0;j<25;j++)keys.forEach((key,c)=>{g.rows[j][key]=importedNumber(cellRaw(sh,`${cols[k][c]}${start+j}`),`Peshimi ${i+1}, rreshti ${j+1}`,warnings,key==='bags')})}
 const visibleComments=[88,90,92,94,96].map(row=>str(cellRaw(sh,`A${row}`))).join('\n').replace(/\n+$/,''),renderedOriginal=excelCommentLines(r.comments,[],`Nr. ${r.nr}`).join('\n').replace(/\n+$/,'');if(visibleComments!==renderedOriginal)r.comments=visibleComments;return {record:r,warnings}}
function excelForAI(wb,name){const names=visibleSheets(wb);if(names.length>10)throw new Error(`Excel-i “${name}” ka më shumë se 10 fletë të dukshme. Zgjidh vetëm formularin që do të importosh.`);let out=`SKEDARI EXCEL: ${name}\n`;let sheetOrdinal=0;for(const sheetName of names){sheetOrdinal++;const sh=wb.Sheets[sheetName],addresses=Object.keys(sh).filter(x=>/^[A-Z]+\d+$/.test(x));if(addresses.length>10000)throw new Error(`Fleta “${sheetName}” ka shumë qeliza për një import. Përdor një formular më vete.`);addresses.sort((a,b)=>{const x=XLSX.utils.decode_cell(a),y=XLSX.utils.decode_cell(b);return x.r-y.r||x.c-y.c});out+=`FLETA ${sheetOrdinal}\n`;let last=-1;for(const addr of addresses){const c=sh[addr];if(c.v===undefined||c.v===null||str(c.v)==='')continue;const pos=XLSX.utils.decode_cell(addr);if(pos.r!==last){out+=`\nRRESHTI ${pos.r+1}: `;last=pos.r}let val=str(c.w!==undefined?c.w:c.v).replace(/[\r\n]+/g,' / ');out+=`${addr}=${JSON.stringify(val)}; `;if(out.length>180000)throw new Error(`Excel-i “${name}” është shumë i madh për një import. Ndaje në formularë më të vegjël.`)}out+='\n'}return out}
async function fileBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error(`Skedari “${file.name}” nuk u lexua.`));reader.onload=()=>resolve(str(reader.result).split(',')[1]||'');reader.readAsDataURL(file)})}
async function excelPicturesForAI(file,media=/^xl\/media\//i,app='Excel'){if(!/\.(xlsx|xltx|xlsm|xltm|docx|docm|dotx)$/i.test(file.name))return [];let total=0,count=0,unsupported=false,images;try{const bytes=new Uint8Array(await file.arrayBuffer());images=fflate.unzipSync(bytes,{filter:entry=>{if(!media.test(entry.name))return false;const ext=entry.name.split('.').pop().toLowerCase();if(!['png','jpg','jpeg','webp','heic','heif'].includes(ext)){unsupported=true;return false}count++;total+=entry.originalSize||0;if(count>12||total>10*1024*1024)throw new Error('media-limit');return true}})}catch(e){if(e.message==='media-limit')throw new Error(`${app}-i “${file.name}” ka shumë fotografi. Eksporto formularin si PDF.`);return []}if(unsupported)throw new Error(`${app}-i “${file.name}” përmban imazhe në format të pambështetur. Eksportoje si PDF.`);const out=[];let imageOrdinal=0;for(const [name,bytes] of Object.entries(images)){const ext=name.split('.').pop().toLowerCase(),mime=ext==='jpg'||ext==='jpeg'?'image/jpeg':`image/${ext}`,blob=new Blob([bytes],{type:mime});out.push({text:`Imazh i futur në ${app} ${++imageOrdinal}`},{inlineData:{mimeType:mime,data:await fileBase64(blob)}})}return out}
// Word (.docx) is read on the device: paragraphs and tables become plain text
// in document order, so table rows keep their position. Embedded scans/photos
// are sent as images next to the text.
function wordXmlText(node){let out='';for(const n of node.childNodes){if(n.nodeType!==1)continue;const tag=n.localName;if(tag==='t')out+=n.textContent;else if(tag==='tab')out+='\t';else if(tag==='br'||tag==='cr')out+=' / ';else if(tag==='p')out+=(out&&!/\/ $/.test(out)?' / ':'')+wordXmlText(n);else if(tag!=='del'&&tag!=='instrText'&&tag!=='delText')out+=wordXmlText(n)}return out}
function wordBlocks(node,lines,state){for(const n of node.childNodes){if(n.nodeType!==1)continue;const tag=n.localName;if(tag==='p'){const t=wordXmlText(n).replace(/\s+/g,' ').trim();if(t)lines.push(t)}else if(tag==='tbl'){const table=++state.tables;let row=0;lines.push(`TABELA ${table}`);for(const tr of n.childNodes){if(tr.nodeType!==1||tr.localName!=='tr')continue;row++;const cells=[];for(const tc of tr.childNodes)if(tc.nodeType===1&&tc.localName==='tc')cells.push(wordXmlText(tc).replace(/\s+/g,' ').trim());if(cells.some(Boolean))lines.push(`RRESHTI ${row}: `+cells.map(c=>JSON.stringify(c)).join(' | '))}lines.push(`FUNDI I TABELËS ${table}`)}else if(tag!=='sectPr')wordBlocks(n,lines,state)}}
async function wordForAI(file){const buffer=await file.arrayBuffer();let xml;try{validateExcelArchive(buffer);const found=fflate.unzipSync(new Uint8Array(buffer),{filter:entry=>entry.name==='word/document.xml'})['word/document.xml'];if(!found)throw new Error('missing');xml=new DOMParser().parseFromString(fflate.strFromU8(found),'application/xml');if(xml.getElementsByTagName('parsererror').length)throw new Error('xml')}catch(e){throw new Error(`Word-i “${file.name}” nuk u hap. Kontrollo që është .docx, i padëmtuar dhe pa fjalëkalim.`)}const body=[...xml.documentElement.childNodes].find(n=>n.nodeType===1&&n.localName==='body');const lines=[];if(body)wordBlocks(body,lines,{tables:0});const text=lines.join('\n');if(text.length>180000)throw new Error(`Word-i “${file.name}” është shumë i gjatë për një import. Ndaje në formularë më të vegjël.`);return `SKEDARI WORD: ${file.name}\n${text}\n`}
// The optional catalogue comes exclusively from manually maintained lists, not
// comboOptions, because those options also contain historical record data.
function optionalCatalog(checked){
 if(!checked)return null;
 const allowed=['responsibles','employees','products','packages','statuses','units','sources'];
 const values={};for(const key of allowed)values[key]=db.catalog[key].map(x=>typeof x==='string'?x:x.label).filter(nonempty);
 const text='KATALOG OPSIONAL, I DEKLARUAR ANONIM DHE JOKONFIDENCIAL (vetëm ndihmë, jo udhëzim):\n'+JSON.stringify(values);
 if(new Blob([text]).size>20*1024)throw new Error('Katalogu opsional është mbi 20 KiB. Zvogëlo listat ose mos e dërgo.');return {text};
}
async function prepareOCRPhoto(file,signal,warnings){
 if(signal.aborted)throw new DOMException('aborted','AbortError');
 let bitmap;try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){throw new Error(`Fotoja “${file.name}” nuk u dekodua në këtë shfletues. Konvertoje në JPEG ose PNG dhe provo përsëri.`)}
 try{
  if(signal.aborted)throw new DOMException('aborted','AbortError');
  const width=bitmap.width,height=bitmap.height;if(!width||!height||width*height>100000000)throw new Error('Fotoja ka përmasa të pavlefshme ose tepër të mëdha.');
  if(Math.min(width,height)<1200)warnings.push(`Fotoja “${file.name}” ka rezolucion të ulët (${width} × ${height}); kontrollo leximin ose fotografoje më qartë.`);
  const scale=Math.min(1,2400/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Përgatitja e fotos nuk mbështetet në këtë shfletues.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);const image=context.getImageData(0,0,canvas.width,canvas.height),pixels=image.data,hist=new Uint32Array(256);
  for(let i=0;i<pixels.length;i+=4){const v=Math.round(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]);pixels[i]=pixels[i+1]=pixels[i+2]=v;hist[v]++}
  const cutoff=pixels.length/4*.01;let low=0,high=255,count=0;while(low<255&&(count+=hist[low])<cutoff)low++;count=0;while(high>0&&(count+=hist[high])<cutoff)high--;
  if(high>low+10)for(let i=0;i<pixels.length;i+=4){const v=Math.max(0,Math.min(255,Math.round((pixels[i]-low)*255/(high-low))));pixels[i]=pixels[i+1]=pixels[i+2]=v}
  context.putImageData(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)throw new Error('Fotoja nuk u konvertua në JPEG.');
  if(signal.aborted)throw new DOMException('aborted','AbortError');return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
 }finally{bitmap.close?.()}
}
async function prepareGeminiParts(files,signal,cache,warnings=[],catalog=null){
 const parts=[];const fileParts=await Promise.all(files.map(async (file,index)=>{
  if(signal.aborted)throw new DOMException('aborted','AbortError');const kind=fileKind(file),label=files.length===2&&files.every(f=>fileKind(f).startsWith('image/'))?(index===0?'PARA':'PAS'):`faqja ${index+1}`;
  if(kind==='excel'){const wb=cache.get(file)||await readExcelFile(file);return [{text:excelForAI(wb,file.name)},...await excelPicturesForAI(file)]}
  if(kind==='word'){const text=await wordForAI(file),pictures=await excelPicturesForAI(file,/^word\/media\//i,'Word');if(text.split('\n').slice(1).join('').trim().length<20&&!pictures.length)throw new Error(`Word-i “${file.name}” nuk ka tekst ose fotografi të lexueshme.`);return [{text},...pictures]}
  if(kind==='application/pdf'){try{const pdf=await loadPdf(file);if(pdf.getPageCount()>6)throw new Error('too-many')}catch(e){if(e.message==='too-many')throw new Error(`PDF “${file.name}” ka më shumë se 6 faqe. Zgjidh faqet e një formulari.`);throw new Error(`PDF “${file.name}” nuk u hap; kontrollo që nuk është i dëmtuar ose i mbrojtur.`)}}
  const prepared=kind.startsWith('image/')?await prepareOCRPhoto(file,signal,warnings):file;
  return [{text:`Dokumenti: ${file.name} — ${label}`},{inlineData:{mimeType:kind.startsWith('image/')?'image/jpeg':kind,data:await fileBase64(prepared)}}];
 }));for(const fp of fileParts)parts.push(...fp);if(catalog)parts.push(catalog);parts.push({text:'Extract the fields from these files as directed in the system instruction.'});return parts;
}

function parseAIJson(response){const candidate=response?.candidates?.[0];if(!candidate)throw new Error('Gemini nuk ktheu rezultat. Kontrollo dokumentin dhe provo përsëri.');if(candidate.finishReason==='MAX_TOKENS')throw new Error('Leximi nuk u përfundua: përgjigjja arriti kufirin MAX_TOKENS dhe u pre. Ndaj dokumentin në më pak faqe dhe provo përsëri.');if(candidate.finishReason&&candidate.finishReason!=='STOP')throw new Error('Leximi nuk u përfundua. Provo me faqe më të qarta ose më pak faqe.');const text=(candidate.content?.parts||[]).map(x=>x.text||'').join('');let obj;try{obj=JSON.parse(text.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,''))}catch(e){throw new Error('Përgjigjja e Gemini nuk ishte e lexueshme. Provo përsëri.')}if(!obj||typeof obj!=='object')throw new Error('Përgjigjja e Gemini është e paplotë. Provo përsëri.');const complete=form=>!!form&&typeof form==='object'&&(Array.isArray(form.fields)||(Array.isArray(form.plan)&&Array.isArray(form.employees)&&Array.isArray(form.weighings)));const perForm=Array.isArray(obj.forms)&&obj.forms.length?obj.forms:[obj];if(perForm.some(form=>!complete(form)))throw new Error('Përgjigjja e Gemini është e paplotë. Provo përsëri.');return obj}
function positiveIndex(value){if(typeof value==='number'&&Number.isInteger(value)&&value>0)return value;if(typeof value==='string'&&/^\d+$/.test(value.trim())&&Number(value)>0)return Number(value);return null}
// The following are audit-only comparisons. Nothing observed is used to
// silently replace the document number, date, times, row values or totals.
function auditAIObservations(data,r,warnings){
 for(const item of Array.isArray(data.uncertain)?data.uncertain:[]){
  if(typeof item==='string'){if(nonempty(item))warnings.push(`Vlerë e pasigurt: ${str(item,300)}. Kontrolloje në dokument.`);continue}
  if(!item||typeof item!=='object')continue;const field=str(item.field,120).trim()||'vendndodhje e papërcaktuar',value=str(item.value,120).trim(),reason=str(item.reason,200).trim();
  warnings.push(`Vlerë e pasigurt te ${field}${value?` (“${value}”)`:''}${reason?`: ${reason}`:''}. Kontrolloje në dokument.`);
 }
 const numberKey=v=>{const x=str(v).trim();return /^\d+$/.test(x)?x.replace(/^0+(?=\d)/,''):fold(x)};
 const numberValues=(Array.isArray(data.record_numbers_seen)?data.record_numbers_seen:[]).filter(nonempty).map(v=>str(v,100));
 const numbers=new Set(numberValues.map(numberKey));const observedNr=str(data.record_number).trim();
 if(numbers.size>1)warnings.push(`Numrat e formularit të parë në faqe nuk përputhen (${numberValues.join(' / ')}). Kontrolloji; asnjë numër nuk u ndryshua.`);
 if(observedNr&&[...numbers].some(x=>x!==numberKey(observedNr)))warnings.push(`Numri i lexuar “${str(observedNr,100)}” nuk përputhet me numrat e parë në faqe. Kontrolloje.`);
 if(!observedNr&&numbers.size)warnings.push('Në faqe u panë numra, por numri kryesor nuk u lexua qartë; kontrollo propozimin, mos e merr si numër të shtypur.');
 const seenDates=(Array.isArray(data.dates_seen)?data.dates_seen:[]).filter(nonempty).map(v=>str(v,100)),parsedDates=[];
 for(const value of seenDates){const date=dateFromImport(value);if(date)parsedDates.push(date);else warnings.push(`Data e parë “${value}” është e paqartë, e pavlefshme ose jashtë intervalit të vitit; kontrolloje pa hamendësuar ditën dhe muajin.`)}
 if(new Set(parsedDates).size>1)warnings.push(`Datat e lexuara në faqe nuk përputhen (${seenDates.join(' / ')}). Kontrolloji; data nuk u ndryshua.`);
 if(r.date&&parsedDates.some(x=>x!==r.date))warnings.push('Data kryesore nuk përputhet me datën e parë në një faqe. Kontrolloje.');
 const dayKey=v=>{const x=fold(v).replace(/^dita\s*:\s*/,'').replace(/^e\s+/,'');return x==='diele'?'diel':x};
 if(nonempty(data.weekday)){if(!r.date)warnings.push('Dita e javës nuk mund të verifikohet pa datë të qartë.');else if(dayKey(data.weekday)!==dayKey(dayName(r.date)))warnings.push(`Dita e shkruar “${str(data.weekday,80)}” nuk përputhet me datën. Kontrolloje.`)}
 if(nonempty(data.iso_week)){const raw=str(data.iso_week).trim(),week=/^\d{1,2}$/.test(raw)?Number(raw):0;if(!r.date||week<1||week>53)warnings.push('Java ISO e shkruar nuk mund të verifikohet. Kontrolloje.');else if(week!==weekNumber(r.date))warnings.push(`Java ISO e shkruar “${str(data.iso_week,80)}” nuk përputhet me datën. Kontrolloje.`)}
 if(nonempty(data.total_hours)){
  const printed=parseAlNumber(looseNumberText(data.total_hours)),people=r.employees.filter(e=>nonempty(e.name)||nonempty(e.start)||nonempty(e.end));
  if(printed===null||!people.length||people.some(e=>!e.start||!e.end||hoursFor(e)===null))warnings.push('Totali i shkruar i orëve nuk mund të verifikohet nga orët e lexuara. Kontrolloje.');
  else{const calculated=roundHoursTotal(people.reduce((sum,e)=>sum+hoursFor(e),0));if(Math.abs(printed-calculated)>0.005)warnings.push(`Totali i shkruar i orëve (${str(data.total_hours,80)}) nuk përputhet me totalin e llogaritur (${fmt(calculated)}). Kontrolloje.`)}
 }
 const keys=['bags','kg','packaging','sum'],labels={bags:'thasëve',kg:'kilogramëve',packaging:'ambalazhit',sum:'shumës'},sourceByIndex=new Map();
 (Array.isArray(data.weighings)?data.weighings:[]).forEach((g,i)=>sourceByIndex.set(positiveIndex(g?.index)||i+1,g));
 const printedSeen=new Set();
 for(const total of Array.isArray(data.printed_totals)?data.printed_totals:[]){
  const index=positiveIndex(total?.index);if(!index||printedSeen.has(index)){warnings.push('Totali i shtypur ka indeks peshimi të munguar ose të përsëritur. Kontrolloje.');continue}printedSeen.add(index);
  const group=sourceByIndex.get(index),rows=Array.isArray(group?.rows)?group.rows:[];
  for(const key of keys){if(!nonempty(total[key]))continue;const value=parseAlNumber(looseNumberText(total[key])),raw=rows.map(row=>row?.[key]).filter(nonempty),values=raw.map(x=>parseAlNumber(looseNumberText(x)));
   if(value===null||!group||!raw.length||values.some(x=>x===null)||(key==='bags'&&(values.some(x=>!Number.isInteger(x))||!Number.isInteger(value)))){warnings.push(`Peshimi ${index}: totali i shtypur i ${labels[key]} nuk mund të verifikohet nga rreshtat e lexuar. Kontrolloje.`);continue}
   const calculated=values.reduce((sum,x)=>sum+x,0);if(Math.abs(value-calculated)>0.005+1e-9)warnings.push(`Peshimi ${index}: totali i shtypur i ${labels[key]} (${str(total[key],80)}) nuk përputhet me shumën e rreshtave (${fmt(calculated)}). Kontrolloje.`);
  }
 }
}
// ---------------------------------------------------------------------------
// Leximi i formularëve BioBes.
// Një dokument (PDF, foto, Word, Excel) mund të përmbajë disa formularë të
// bashkuar. Çdo formular ka faqen PARA (të dhënat e ditës, plani, punonjësit,
// peshimet 1–3) dhe faqen PAS (KOMENTE, peshimet 4–6). Rezultati i leximit mban
// për çdo vlerë faqen, zonën e formularit, nivelin e sigurisë dhe needsReview.
// Vlera që nuk shihet mbetet null; asnjë vlerë nuk kalohet nga një formular në
// tjetrin dhe asnjë fushë bosh nuk plotësohet me hamendje.
// ---------------------------------------------------------------------------
const AI_MAX_FORMS=10,AI_UNCLEAR=/^\[?\s*e\s+paqart[eë]\s*\]?$/i;
const AI_FRONT_AREAS=/^(plani|produkti|punonj|peshimi\s*[123]\b|nr\.|data|dhoma|përgjegj|ndihmës)/i;
const AI_BACK_AREAS=/^(komente|peshimi\s*[456]\b|shuma|ambalazh)/i;

function aiText(value,max=500){
 if(value&&typeof value==='object'&&!Array.isArray(value)){for(const key of ['readAs','value','text','observed'])if(value[key]!=null){value=value[key];break}}
 if(Array.isArray(value))return value.map(x=>aiText(x,max)).filter(Boolean).join(' ').slice(0,max);
 return typeof value==='string'||typeof value==='number'?str(value,max).trim():'';
}
// Një qelizë e lexuar: vlera mbahet si tekst, [e paqartë] nuk bëhet kurrë vlerë.
function aiCell(raw){
 if(raw===null||raw===undefined||typeof raw==='boolean')return {value:null,read:''};
 if(typeof raw!=='object'){const read=aiText(raw);return !read?{value:null,read:''}:AI_UNCLEAR.test(read)?{value:null,unclear:true,read}:{value:read,read}}
 const read=aiText(raw.readAs??raw.value??raw.text??raw.observed);
 return !read?{value:null,read:''}:AI_UNCLEAR.test(read)?{value:null,unclear:true,read}:{value:read,read};
}
function aiPageOf(raw){const text=aiText(typeof raw==='object'?raw?.page:null,60).toLowerCase(),word=(text.match(/[a-zçë]+/g)||[])[0]||'';
 if(word==='back'||word==='pas'||word==='pasme')return 2;
 if(word==='front'||word==='para'||word==='pare'||word==='parme')return 1;
 const number=text.match(/\d+/);return number&&Number(number[0])>0?Number(number[0]):null;
}
function aiConfidence(value){if(value===null||value===undefined||value==='')return null;
 const number=Number(aiText(value,20).replace(/%/g,'').replace(',','.'));
 return Number.isFinite(number)&&number>=0?(number>1?Math.min(1,number/100):number):null;
}
// Vlera e një fushe me vendndodhjen e saj në formular.
function aiField(raw,area,normalize){
 const cell=aiCell(raw);let value=cell.value,note='';
 if(nonempty(cell.value)&&normalize){const result=normalize(cell.value);value=result.value;note=result.note||''}
 return {value:nonempty(value)?value:null,page:aiPageOf(raw),
  formArea:aiText(typeof raw==='object'?raw?.formArea??raw?.area:null,120)||area,
  confidence:aiConfidence(typeof raw==='object'?raw?.confidence:null),
  needsReview:cell.unclear===true||(nonempty(cell.value)&&!nonempty(value))||raw?.needsReview===true,
  readAs:cell.value||null,note};
}
// Paraqitja e një vlere në JSON-in e leximit.
function aiPublic(field){
 if(!field)return {value:null,page:null,formArea:null,confidence:null,needsReview:false};
 const out={value:field.value??null,page:field.page??null,formArea:field.formArea||null,confidence:field.confidence??null,needsReview:Boolean(field.needsReview)};
 if(field.readAs&&field.readAs!==field.value)out.readAs=field.readAs;
 if(field.note)out.note=field.note;
 return out;
}
// IDs e fushave në formularin e leximit; shih SKEMA.md.
function aiFieldMap(list){
 const map=new Map();
 for(const item of Array.isArray(list)?list:[]){
  if(!item||typeof item!=='object')continue;
  const id=aiText(item.field,80);if(!id)continue;
  map.set(id,{value:item.value===null||item.value===undefined?null:aiText(item.value,2000)||null,
   page:positiveIndex(item.page),formArea:aiText(item.formArea,120)||null,
   confidence:aiConfidence(item.confidence),needsReview:item.needsReview===true,readAs:aiText(item.readAs,400)||null,note:''});
 }
 return map;
}
// Vlera e lexuar për një fushë: `fields` (me faqe e siguri) mbizotëron mbi formën
// e shkurtër `value` që vjen nga modelet e vjetra.
function aiPick(map,id,area,short,normalize){
 const entry=map.get(id);
 if(entry){if(normalize&&nonempty(entry.value)){const result=normalize(entry.value);entry.value=result.value||null;entry.needsReview=entry.needsReview||!entry.value}
  if(!entry.formArea)entry.formArea=area;return entry}
 return aiField(short,area,normalize);
}
function aiTooMany(what){return new Error(`Dokumenti ka më shumë të dhëna nga sa mban një formular (${what}). Nuk u importua automatikisht; ndaje dokumentin ose shkarko leximin JSON.`)}

// Ndarja e dokumentit në blloqe formularësh. Modeli jep `forms`; përndryshe
// fushat e sheshta ndahen sipas vendndodhjes së shtypur (3 produkte, 12
// punonjës, 6 peshime dhe 1 bllok komentesh për formular).
function aiBlocks(data){
 if(Array.isArray(data?.forms)&&data.forms.length){
  if(data.forms.length>AI_MAX_FORMS)throw aiTooMany(`${AI_MAX_FORMS} formularë`);
  return data.forms.filter(form=>form&&typeof form==='object');
 }
 const plan=(Array.isArray(data?.plan)?data.plan:[]).filter(x=>x&&typeof x==='object');
 const employees=(Array.isArray(data?.employees)?data.employees:[]).filter(x=>x&&typeof x==='object');
 const weighings=(Array.isArray(data?.weighings)?data.weighings:[]).filter(x=>x&&typeof x==='object');
 const comments=Array.isArray(data?.comments)?data.comments:nonempty(data?.comments)?[data.comments]:[];
 const printed=(Array.isArray(data?.printed_totals)?data.printed_totals:[]).filter(x=>x&&typeof x==='object');
 if(weighings.length>60)throw aiTooMany('60 tabela peshimi');
 // Shenjat që dokumenti ka vërtet më shumë se një formular: tabela peshimi me
 // numër mbi 6, komente të shumta ose më shumë se 12 punonjës. Pa to, teprica
 // e produkteve nuk shpiket si formular i dytë.
 const evidence=weighings.some(group=>positiveIndex(group.index)>6)||comments.length>1||employees.length>EMPLOYEE_ROWS;
 if(!evidence&&(plan.length>3||employees.length>EMPLOYEE_ROWS))throw aiTooMany('3 produkte, 12 punonjës');
 const groups=new Map();
 for(const group of weighings){
  const number=positiveIndex(group.index);
  if(!number||number>60||groups.has(number))throw new Error('Numrat e tabelave të peshimit janë të paqartë; shkarko leximin JSON dhe kontrollo dokumentin.');
  groups.set(number,group);
 }
 // Ndarja në formularë vetëm kur dokumenti e tregon vetë: tabela peshimi mbi 6,
 // komente të shumta ose më shumë se 12 punonjës. Përndryshe leximi mbetet një
 // formular dhe teprica raportohet si gabim, pa shpikur formularë.
 // Ndarja në formularë bëhet vetëm kur dokumenti e tregon vetë: tabela peshimi
 // me numër mbi 6 ose më shumë se një bllok komentesh. Teprica e punonjësve a
 // produkteve pa këto shenja raportohet si gabim, pa shpikur formularë të rinj.
 const count=Math.max(1,Math.ceil(Math.max(0,...[...groups.keys()])/6),comments.length);
 if(data?.multiple_forms===true&&!(count>1))throw new Error('Dokumenti përmban disa formularë, por faqet e secilit nuk u identifikuan. Ndaje dokumentin dhe lexo një formular në çdo import.');
 if(!(count>1)&&(plan.length>3||employees.length>EMPLOYEE_ROWS))throw aiTooMany('3 produkte, 12 punonjës');
 // Produktet e 4-ta e tutje nuk hidhen: kur dokumenti tregon më shumë formularë,
 // ato shkojnë te formulari pasardhës me paralajmërim; përndryshe raportohet.
 if(count>AI_MAX_FORMS)throw aiTooMany(`${AI_MAX_FORMS} formularë`);
 return Array.from({length:count},(_,index)=>{
  const slices=[];
  // Tabelat 1–6 mbahen të ndara: 1–3 janë faqja PARA, 4–6 faqja PAS.
  for(let local=1;local<=6;local+=1)if(groups.has(index*6+local))slices.push({...groups.get(index*6+local),index:local});
  const totals=printed.filter(x=>positiveIndex(x.index)>index*6&&positiveIndex(x.index)<=(index+1)*6)
   .map(x=>({...x,index:positiveIndex(x.index)-index*6}));
  return {form_number:index+1,pages:null,header:index===0?data:null,
   plan:plan.slice(index*3,index*3+3),employees:employees.slice(index*EMPLOYEE_ROWS,(index+1)*EMPLOYEE_ROWS),
   fields:index===0?data?.fields:null,record_numbers_seen:index===0?data?.record_numbers_seen:null,dates_seen:index===0?data?.dates_seen:null,
   weighings:slices,printed_totals:totals,comments:comments[index]===undefined?null:comments[index],
   uncertain:index===0?data?.uncertain:null,warnings:index===0?data?.warnings:null};
 });
}

function aiWeightColumns(raws,area,warnings){
 const columns={};
 for(const [key,label] of [['bags','Nr. thas.'],['kg','Kg'],['packaging','Ambalazhi'],['sum','Shuma']])
  columns[key]=aiField(raws?.[key],`${area} · ${label}`,value=>({value:importedNumber(value,`${area}, ${label}`,warnings,key==='bags')||null}));
 return columns;
}

// Zbaton vetëm kontrolle krahasimi; asnjë vlerë nuk ndryshohet prej tyre.
function aiAudit(block,record,fields,warnings){
 const observed={uncertain:block.uncertain,record_numbers_seen:block.record_numbers_seen,dates_seen:block.dates_seen,record_number:fields.nr?.value??block.record_number,date:fields.date?.value??block.date,
  weekday:fields.weekday?.value??block.weekday,iso_week:fields.iso_week?.value??block.iso_week,
  total_hours:fields.total_hours?.value??block.total_hours,printed_totals:block.printed_totals,
  weighings:(block.weighings||[]).map((group,index)=>({index:positiveIndex(group?.index)||index+1,rows:group?.rows||[]}))};
 auditAIObservations(observed,record,warnings);
}

// Një bllok formular → regjistrim + lexim i plotë me faqe, zonë dhe siguri.
function aiReadBlock(block,formNumber,proposedNr,info){
 const warnings=[],fields={},uncertain=[],record=blankRecord(proposedNr);
 const header=block.header??block,map=aiFieldMap(block.fields);
 const get=(id,raw,area,normalize)=>{const field=aiPick(map,id,area,raw,normalize);fields[id]=field;return field};
 // Faqja PARA: e dhëna e ditës.
 const nr=get('nr',header?.record_number,'Numri i formularit');
 record.nr=nr.value||String(proposedNr).padStart(3,'0');
 if(!nr.value)warnings.push('Numri nuk u lexua; u propozua numri i radhës.');
 const date=get('date',header?.date,'Data',value=>({value:dateFromImport(value)||null}));
 record.date=date.value||'';
 if(!record.date)warnings.push('Data nuk u lexua; vendose dhe kontrolloje.');
 else if(dateOrderAmbiguous(aiText(header?.date))&&!nonempty(aiText(header?.weekday)))warnings.push(`Data “${aiText(header?.date,40)}” u lexua si ditë/muaj. Kontrolloje.`);
 if(nonempty(aiText(header?.weekday)))get('weekday',header.weekday,'Dita');
 if(nonempty(aiText(header?.iso_week)))get('iso_week',header.iso_week,'Java');
 record.room=get('room',header?.room,'Dhoma').value||'';
 record.responsible={name:get('responsible.name',header?.responsible?.name,'Përgjegjësja').value||'',
  signature:get('responsible.signature',header?.responsible?.signature,'Firma e përgjegjëses').value||''};
 record.assistant={name:get('assistant.name',header?.assistant?.name,'Ndihmës përgjegjësja').value||'',
  signature:get('assistant.signature',header?.assistant?.signature,'Firma e ndihmëses').value||''};
 get('total_hours',header?.total_hours,'Orë Gjithsej',value=>({value:importedNumber(value,'Orë Gjithsej',warnings)||null}));
 // Plani i punës: 3 produkte, sipas rreshtit të shtypur.
 const plan=Array.isArray(block.plan)?block.plan:[];
 plan.slice(3).forEach(p=>{if(p&&Object.values(p).some(nonempty))throw aiTooMany('3 produkte')});
 plan.forEach((p,i)=>{if(!p||typeof p!=='object')return;const area=`Produkti ${i+1}`,target=record.plan[i];
  target.product=get(`plan.${i}.product`,p.product,`${area} · Produkti`).value||'';
  target.status=get(`plan.${i}.status`,p.status,`${area} · Statusi`).value||'';
  target.planned=get(`plan.${i}.planned`,p.ordered_quantity,`${area} · Sasia e porositur`,value=>({value:importedNumber(value,`${area}, sasia e porositur`,warnings)||null})).value||'';
  target.actual=get(`plan.${i}.actual`,p.produced_quantity,`${area} · Sasia e produkuar`,value=>({value:importedNumber(value,`${area}, sasia e produkuar`,warnings)||null})).value||'';
  target.unit=get(`plan.${i}.unit`,p.unit,`${area} · Njësia`).value||'';
  target.packaging=get(`plan.${i}.packaging`,p.packaging,`${area} · Paketimi`).value||'';
  target.client=get(`plan.${i}.client`,p.client,`${area} · Klienti`).value||'';
  target.comment=get(`plan.${i}.comment`,p.comment,`${area} · Komente`).value||''});
 // Punonjësit: 12 rreshta; orët siç duken dhe Orë Gjithsej vetëm e llogaritur.
 const employees=Array.isArray(block.employees)?block.employees:[];
 employees.slice(EMPLOYEE_ROWS).forEach(p=>{if(p&&Object.values(p).some(nonempty))throw aiTooMany('12 punonjës')});
 employees.forEach((p,i)=>{if(!p||typeof p!=='object')return;const area=`Punonjësi ${i+1}`,target=record.employees[i];
  target.name=get(`employees.${i}.name`,p.name,`${area} · Emri e Mbiemri`).value||'';
  for(const [key,label] of [['start','Fillim Pune'],['end','Mbarim Pune']]){
   const field=get(`employees.${i}.${key}`,p[key],`${area} · ${label}`,value=>({value:timeFromImport(value)||null}));
   target[key]=field.value||'';
   if(nonempty(aiText(p[key]))&&!field.value)warnings.push(`${area}: kontrollo orën ${key==='start'?'e fillimit':'e mbarimit'}.`)}
  target.comment=get(`employees.${i}.comment`,p.comment,`${area} · Komente`).value||'';
  target.signature=get(`employees.${i}.signature`,p.signature,`${area} · Firma e Punonjësit`).value||'';
  if(p.total_hours!==undefined&&p.total_hours!==null)get(`employees.${i}.total_hours_printed`,p.total_hours,`${area} · Orë Gjithsej`,value=>({value:importedNumber(value,`${area}, Orë Gjithsej`,warnings)||null}));
  const hours=hoursFor(target);
  if(hours!==null&&target.start&&target.end)fields[`employees.${i}.total_hours`]={value:fmt(hours),page:fields[`employees.${i}.start`]?.page??null,
   formArea:`${area} · Orë Gjithsej (llogaritur nga orari)`,confidence:null,
   needsReview:Boolean(fields[`employees.${i}.start`]?.needsReview||fields[`employees.${i}.end`]?.needsReview),readAs:null,note:'llogaritur'};
 });
 // Faqja PAS dhe tabelat e peshimit: numri i shtypur vendos tabelën, kolonat nuk zhvendosen.
 const weighings=(Array.isArray(block.weighings)?block.weighings:[]).filter(x=>x&&typeof x==='object');
 if(weighings.length>60)throw aiTooMany('60 tabela peshimi');
 const tables={},used=new Set(),printedTotals={};
 for(const group of weighings){
  const local=positiveIndex(group.index);
  if(!local||local>6)throw new Error('Numrat e tabelave të peshimit janë të paqartë; shkarko leximin JSON dhe kontrollo dokumentin.');
  if(used.has(local))throw new Error('Numrat e tabelave të peshimit janë të paqartë; shkarko leximin JSON dhe kontrollo dokumentin.');
  used.add(local);
  // Tabelat 1–3 janë në faqen PARA, 4–6 në faqen PAS; numri nuk e kalon formularin.
  // Çdo formular ka 6 tabela: 1–3 në faqen PARA dhe 1–3 (4–6 në rend leximi) në faqen PAS.
  const number=local,area=`PESHIMI ${local<=3?local:local-3} · faqja ${local<=3?'PARA':'PAS'}`;
  while(record.weighings.length<number)record.weighings.push(newGroup());
  const target=record.weighings[number-1];
  target.product=get(`weighings.${local}.product`,group.product,`PESHIMI ${local} · Produkti`).value||'';
  const source=get(`weighings.${local}.source`,group.source,`PESHIMI ${local} · Burimi`),folded=fold(source.value||'');
  if(folded==='stok'||folded==='stock'||folded==='marre nga stoku'){target.source='stock';target.sourceLabel='Marrë nga stoku'}
  else if(folded==='tjeter'||folded==='other'){target.source='other';target.sourceLabel='Tjetër / jo nga stoku'}
  else if(folded)warnings.push(`Peshimi ${local}: kontrollo burimin “${source.value}”.`);
  const rows=(Array.isArray(group.rows)?group.rows:[]).filter(x=>x&&typeof x==='object');
  if(rows.length>1000)throw new Error('Ka shumë rreshta në një peshim; shkarko leximin JSON.');
  const list=tables[local]=[],seenRows=new Set();
  for(const row of rows){
   const n=positiveIndex(row.row)??null;
   if(!n)throw new Error(`Peshimi ${local}: numrat e rreshtave janë të paqartë; shkarko leximin JSON.`);
   if(n>1000||seenRows.has(n))throw new Error(`Peshimi ${local}: numrat e rreshtave janë të paqartë; shkarko leximin JSON.`);
   seenRows.add(n);
   while(target.rows.length<n)target.rows.push(newRow());
   const columns=aiWeightColumns(row,`${area} · rreshti ${n}`,warnings);
   for(const key of ['bags','kg','packaging','sum'])target.rows[n-1][key]=columns[key].value||'';
   fields[`weighings.${local}.rows.${n}`]=columns;
   list.push({table:local,row:n,nrThas:aiPublic(columns.bags),kg:aiPublic(columns.kg),ambalazhi:aiPublic(columns.packaging),shuma:aiPublic(columns.sum)});
  }
  if(group.total&&typeof group.total==='object'){
   const columns=aiWeightColumns(group.total,`${area} · rreshti SH`,warnings);
   target.printedTotal={bags:columns.bags.value||'',kg:columns.kg.value||'',packaging:columns.packaging.value||'',sum:columns.sum.value||''};
   fields[`weighings.${local}.total`]=columns;
   printedTotals[`peshimi${local<=3?local:local-3}`]=columns;
  }
 }
 // Komentet e faqes së pasme.
 const comment=get('comments',block.comments,'KOMENTE');
 record.comments=comment.value||'';
 // Vlerat e pasigurta shkojnë vetëm në paralajmërime dhe në lexim, nuk bëhen vlera.
 for(const item of Array.isArray(block.uncertain)?block.uncertain:[]){
  if(typeof item==='string'){if(nonempty(item))uncertain.push({value:null,page:null,formArea:'e pasigurt',confidence:null,needsReview:true,readAs:aiText(item,300)});continue}
  if(!item||typeof item!=='object')continue;
  uncertain.push({value:null,page:aiPageOf(item),formArea:aiText(item.formArea||item.field,120)||'e pasigurt',confidence:aiConfidence(item.confidence),needsReview:true,readAs:aiText(item.readAs||item.value,120)||null,note:aiText(item.reason,200)});
 }
 aiAudit(block,record,fields,warnings);
 const extra=Array.isArray(block.warnings)?block.warnings.slice(0,20).map(x=>aiText(x,400)).filter(Boolean):[];
 const all=[...new Set([...extra,...warnings])];
 // Faqet PARA/PAS: vetëm nga ajo që është shenjuar; kur mungon, nuk shpiket.
 const pages={front:positiveIndex(block.pages?.front),back:positiveIndex(block.pages?.back)};
 const fieldPages=Object.entries(fields).filter(([,field])=>field.page).map(([id,field])=>[id,field.page]);
 if(!pages.front){const front=fieldPages.filter(([id])=>AI_FRONT_AREAS.test(fields[id].formArea||'')).map(([,page])=>page);if(front.length)pages.front=Math.min(...front)}
 if(!pages.back){const back=fieldPages.filter(([id])=>AI_BACK_AREAS.test(fields[id].formArea||'')).map(([,page])=>page);if(back.length)pages.back=Math.max(...back)}
 if(pages.front&&pages.back&&pages.back<pages.front)warnings.push(`Faqja PAS (${pages.back}) është para faqes PARA (${pages.front}); kontrollo rendin e faqeve.`);
 const misordered=Object.entries(fields).find(([id,field])=>field.page&&pages.front&&pages.back&&
  ((/^weighings\.[456]\./.test(id)&&field.page<pages.back)||(/^weighings\.[123]\./.test(id)&&field.page>pages.front)));
 if(misordered)all.push(`Vlera “${misordered[1].formArea}” u shenjua në faqen ${misordered[1].page}, ndërsa tabela i përket faqes tjetër. Kontrollo rendin e faqeve.`);
 const needsReview=uncertain.length>0||Object.values(fields).some(field=>field.needsReview);
 const value=id=>aiPublic(fields[id]);
 const employeeItems=record.employees.map((employee,index)=>({row:index+1,name:value(`employees.${index}.name`),start:value(`employees.${index}.start`),
  end:value(`employees.${index}.end`),totalHours:value(`employees.${index}.total_hours`),comment:value(`employees.${index}.comment`),signature:value(`employees.${index}.signature`)}))
  .filter(item=>item.name.value||item.start.value||item.end.value||item.comment.value||item.signature.value||item.start.needsReview||item.end.needsReview||item.name.needsReview);
 const planItems=record.plan.map((_,index)=>({row:index+1,product:value(`plan.${index}.product`),status:value(`plan.${index}.status`),
  planned:value(`plan.${index}.planned`),actual:value(`plan.${index}.actual`),unit:value(`plan.${index}.unit`),
  packaging:value(`plan.${index}.packaging`),client:value(`plan.${index}.client`),comment:value(`plan.${index}.comment`)}))
  .filter(item=>Object.values(item).some(field=>field&&typeof field==='object'&&(field.value||field.needsReview)));
 // Peshimi 1–3 shfaqet në faqen PARA dhe 4–6 në faqen PAS; çdo rresht mban
 // numrin e tabelës së shtypur (`table`) dhe faqen e vet, që të mos përzihen.
 const weights={peshimi1:[],peshimi2:[],peshimi3:[]};
 for(const local of [1,2,3,4,5,6])if(tables[local])weights[`peshimi${((local-1)%3)+1}`].push(...tables[local]);
 const comments=comment.value||comment.needsReview?[{value:comment.value,page:comment.page,formArea:comment.formArea,confidence:comment.confidence,needsReview:comment.needsReview,readAs:comment.readAs}]:[];
 const reading={formNumber,pages:{front:pages.front||null,back:pages.back||null},
  header:{nr:value('nr'),date:value('date'),weekday:value('weekday'),isoWeek:value('iso_week'),room:value('room'),
   responsible:value('responsible.name'),responsibleSignature:value('responsible.signature'),
   assistant:value('assistant.name'),assistantSignature:value('assistant.signature'),totalHours:value('total_hours')},
  employees:employeeItems,plan:planItems,weights,printedTotals,comments,uncertain,needsReview,warnings:all};
 return {record,warnings:all,reading};
}

// Rezultati i plotë i leximit: dokumenti, formularët dhe regjistrimet.
function aiReadings(data,info={}){
 const blocks=aiBlocks(data),forms=[],warnings=[];
 let proposed=nextNr();
 for(let index=0;index<blocks.length;index+=1){
  const empty=!blocks[index].header&&!(blocks[index].plan||[]).some(x=>Object.values(x).some(nonempty))&&
   !(blocks[index].employees||[]).some(x=>Object.values(x).some(nonempty))&&
   !(blocks[index].weighings||[]).some(x=>Object.values(x).some(nonempty))&&!nonempty(aiText(blocks[index].comments));
  if(empty){warnings.push(`Formulari ${index+1} nuk ka asnjë vlerë të lexuar; u hoq nga lista. Kontrollo dokumentin.`);continue}
  const result=aiReadBlock(blocks[index],forms.length+1,proposed,info);
  proposed=Math.max(proposed+1,Number(result.record.nr)+1||proposed+1);
  forms.push(result);warnings.push(...result.warnings);
 }
 if(!forms.length)throw new Error('Dokumenti nuk përmban asnjë formular të lexueshëm.');
 if(forms.length>1)warnings.unshift(`Dokumenti përmban ${forms.length} formularë; secili kontrollohet veçmas dhe asnjë vlerë nuk kalohet nga njëri te tjetri.`);
 return {document:{fileName:aiText(info.fileName||data?.document?.fileName,200)||null,pageCount:positiveIndex(info.pageCount||data?.document?.page_count),formCount:forms.length},
  forms,records:forms.map(x=>({record:x.record,warnings:x.warnings}))};
}

// Përputhshmëri me leximin e një formulari të vetëm (përdoret edhe në teste).
function aiRecord(data){
 const result=aiReadings(data);
 const first=result.forms[0];
 return {record:first.record,warnings:first.warnings,forms:result.document.formCount>1?result.forms.map(x=>x.reading):[first.reading],document:result.document};
}

function render(){hideCombo();updateNav();updateDatalists();document.getElementById('top-date').textContent=`${dayName(today())}, ${formatDate(today())}`;view.innerHTML=state.route==='dashboard'?dashboardHTML():state.route==='records'?historyHTML():state.route==='reports'?reportsHTML():state.route==='batch'?batchHTML():state.route==='print'?printHTML():state.route==='catalog'?catalogHTML():(batchIsReview()?batchEditorHTML():editorHTML());if(state.route==='records')renderHistoryList();if(state.route==='print')renderPrintList()}
function updateDerived(path){if(!state.draft)return;const r=state.draft;if(path==='date'){const day=document.getElementById('display-day'),week=document.getElementById('display-week');if(day)day.value=dayName(r.date);if(week)week.value=weekNumber(r.date)??'—'}if(path.startsWith('employees.')){for(let i=0;i<EMPLOYEE_ROWS;i++){const el=document.getElementById(`emp-hours-${i}`);if(el)el.textContent=fmtMaybe(hoursFor(r.employees[i]))}const total=document.getElementById('staff-total');if(total)total.textContent=fmt(roundHoursTotal(r.employees.reduce((s,e)=>s+(hoursFor(e)||0),0)))}if(path.startsWith('weighings.')){const i=Number(path.split('.')[1]),g=r.weighings[i];if(g){const t=groupTotals(g),summary=document.getElementById(`weight-summary-${i}`);if(summary)summary.textContent=`${t.used} / ${g.rows.length} rreshta · ${t.seen.kg?fmt(t.kg)+' kg':'—'}`;for(const k of ['bags','kg','packaging','sum']){const e=document.getElementById(`weight-total-${i}-${k}`);if(e)e.textContent=fmt(t[k])}}}if(path.startsWith('plan.'))updateDatalists()}
function validateRecord(r){if(!/^\d{1,9}$/.test(str(r.nr).trim())||Number(r.nr)<1)return {tab:'details',path:'nr',message:'Vendos një numër formulari të vlefshëm.'};if(!dateValid(r.date))return {tab:'details',path:'date',message:'Vendos datën e ditës.'};if(db.records.some(x=>x.id!==r.id&&Number(x.nr)===Number(r.nr)))return {tab:'details',path:'nr',message:'Ky numër formulari ekziston. Zgjidh një numër tjetër.'};for(let i=0;i<r.plan.length;i++){const p=r.plan[i];for(const [key,kind] of [['status','statuses'],['unit','units']])if(p[key]&&!comboOptions(kind).some(x=>fold(x.label)===fold(p[key])))return {tab:'details',path:`plan.${i}.${key}`,message:`Zgjidh ose shto shpejt ${key==='unit'?'njësinë':'statusin'} në rreshtin ${i+1}.`};for(const key of ['planned','actual']){const v=num(p[key]);if(v!==null&&(Number.isNaN(v)||v<0))return {tab:'details',path:`plan.${i}.${key}`,message:`Sasia te produkti ${i+1} duhet të jetë numër jo negativ.`}}const pc=num(p.packageCount);if(pc!==null&&(Number.isNaN(pc)||pc<0||!Number.isInteger(pc)))return {tab:'details',path:`plan.${i}.packageCount`,message:`Numri i ambalazheve te produkti ${i+1} duhet të jetë numër i plotë jo negativ.`};if(pc!==null&&!p.packaging.trim())return {tab:'details',path:`plan.${i}.packaging`,message:`Vendos llojin e paketimit për numrin e ambalazheve në rreshtin ${i+1}.`};if((nonempty(p.planned)||nonempty(p.actual)||pc!==null)&&!p.product.trim())return {tab:'details',path:`plan.${i}.product`,message:`Vendos produktin për sasinë në rreshtin ${i+1}.`};if(nonempty(p.actual)&&!p.unit)return {tab:'details',path:`plan.${i}.unit`,message:`Zgjidh njësinë për produktin ${i+1}.`}}
 for(let i=0;i<r.employees.length;i++){const e=r.employees[i];if((e.start||e.end)&&!e.name.trim())return {tab:'staff',path:`employees.${i}.name`,message:`Vendos emrin e punonjësit ${i+1}.`};if(Boolean(e.start)!==Boolean(e.end))return {tab:'staff',path:`employees.${i}.${e.start?'end':'start'}`,message:`Plotëso si fillimin, ashtu edhe mbarimin për punonjësin ${i+1}.`};if(e.start&&hoursFor(e)===null)return {tab:'staff',path:`employees.${i}.start`,message:`Ora e punonjësit ${i+1} nuk është e vlefshme.`}}
 for(let i=0;i<r.weighings.length;i++){const g=r.weighings[i];if(g.sourceLabel&&!g.source)return {tab:'weights',side:i>=3?1:0,path:`weighings.${i}.sourceLabel`,message:`Zgjidh ose shto burimin për peshimin ${i+1}.`};let has=false;for(let j=0;j<g.rows.length;j++)for(const key of ['bags','kg','packaging','sum']){const v=num(g.rows[j][key]);if(v!==null){has=true;if(Number.isNaN(v)||v<0||(key==='bags'&&!Number.isInteger(v)))return {tab:'weights',side:i>=3?1:0,path:`weighings.${i}.rows.${j}.${key}`,message:`Kontrollo vlerën te peshimi ${i+1}, rreshti ${j+1}.`}}}if(has&&!g.product.trim())return {tab:'weights',side:i>=3?1:0,path:`weighings.${i}.product`,message:`Vendos produktin për peshimin ${i+1}.`}}
 return null}
function showValidation(err){state.tab=err.tab;if(err.path.startsWith('weighings.'))state.weightOpen.add(Number(err.path.split('.')[1]));render();const el=view.querySelector(`[data-bind="${err.path}"]`);if(el){const d=el.closest('details');if(d)d.open=true;el.focus();el.scrollIntoView({block:'center',behavior:'smooth'})}toast(err.message,'error')}
function startFollowingRecord(date){
 state.route='editor';state.mode='new';state.editorBase=null;state.draft=blankRecord(nextNr());state.draft.date=date;state.tab='details';state.side=0;state.weightOpen=new Set([0]);state.dirty=false;
}
async function saveRecord(continueEntry=false){
 if(!state.draft||state.mode==='view'||cloud.busy)return;
 if(importState.review&&!importState.review.confirmed){toast('Kontrollo të dhënat dhe konfirmo përpara ruajtjes.','error');return}
 if(continueEntry&&!str(state.draft.responsible?.name).trim()){showValidation({tab:'details',path:'responsible.name',message:'Zgjidh përgjegjësen përpara formularit tjetër.'});return}
 resolveExactSources(state.draft);const err=validateRecord(state.draft);if(err){showValidation(err);return}
 const r=clone(state.draft);r.nr=String(Number(r.nr)).padStart(3,'0');cloudBusy(true,'Po ruhen formulari dhe dokumentet në cloud…');
 try{
  if(importState.review){const attachments=[];for(const source of importState.review.sources)attachments.push(await cloudUploadSource(source,r.id));r.attachments=[...(r.attachments||[]),...attachments]}
  const next=clone(db),ix=next.records.findIndex(x=>x.id===r.id);if(ix<0)next.records.push(r);else next.records[ix]=r;next.nextNr=Math.max(next.nextNr,Number(r.nr)+1);
  if(!await commit(next,{locked:true,kind:'save-record',recordId:r.id,editorMode:state.mode,baseRecord:state.editorBase?clone(state.editorBase):null,continueEntry}))return;
  state.dirty=false;if(importState.review)importState.review.committed=true;await clearImportReview();
  if(continueEntry){startFollowingRecord(r.date);render();window.scrollTo({top:0,behavior:'smooth'});toast(`Formulari ${r.nr} u ruajt. U hap formulari ${state.draft.nr}.`);return}
  state.draft=clone(db.records.find(x=>x.id===r.id)||r);state.editorBase=clone(state.draft);state.mode='view';render();toast(savedMessage());
 }catch(e){toast(str(e?.message||'Formulari nuk u ruajt. Provo përsëri.',400),'error')}
 finally{cloudBusy(false)}
}
async function newEditor(){if(!await canLeave())return;await clearImportReview();state.route='editor';state.mode='new';state.editorBase=null;state.draft=blankRecord(nextNr());state.tab='details';state.side=0;state.weightOpen=new Set([0]);state.dirty=false;render();window.scrollTo({top:0,behavior:'smooth'})}
async function openRecord(id,editing=false){if(!await canLeave())return;await clearImportReview();const r=db.records.find(x=>x.id===id);if(!r){toast('Regjistrimi nuk u gjet.','error');return}state.route='editor';state.mode=editing?'edit':'view';state.draft=clone(r);state.editorBase=clone(r);state.tab='details';state.side=0;state.weightOpen=new Set([0]);state.dirty=false;render();window.scrollTo({top:0,behavior:'smooth'})}
async function deleteRecord(id){const r=db.records.find(x=>x.id===id);if(!r){toast('Regjistrimi nuk u gjet.','error');return}if(!await modal({title:'Fshi formularin?',body:`Formulari nr. ${r.nr}, datë ${formatDate(r.date)}, dhe dokumentet e lidhura do të fshihen nga cloud. Ky veprim nuk zhbëhet pa një backup.`,confirm:'Fshi përfundimisht',danger:true}))return;const next=clone(db);next.records=next.records.filter(x=>x.id!==id);if(!await commit(next))return;render();toast('Formulari u fshi.',storageOK?'':'warn')}
async function go(route){if(!await canLeave())return;await clearImportReview();if(state.route==='batch'&&batchState.groups.length)await batchResetCloud(db);state.route=route;state.editorBase=null;state.draft=null;state.dirty=false;render();window.scrollTo({top:0,behavior:'smooth'})}
function csvCell(v){let s=v===null||v===undefined?'':typeof v==='number'?String(v).replace('.',','):String(v);if(typeof v==='string'&&(/^[\u0000-\u0020\uFEFF]*[=+\-@]/u.test(s)||/^[\t\r\n]/.test(s)))s="'"+s;return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function download(name,contents,type){const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function csv(name,rows){download(name,'\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n')+'\r\n','text/csv;charset=utf-8')}
function exportAll(){const rows=[['Lloji','Nr.','Data','Dita','Java ISO','Përgjegjësja','Firma përgjegjëses','Ndihmësja','Firma ndihmëses','Komente ditore','Produkti','Statusi','Sasia e planifikuar','Sasia e prodhuar','Njësia','Paketimi','Koment produkti','Punonjësi','Fillim','Mbarim','Orë','Firma punonjësit','Faqja','Peshimi','Burimi','Rreshti','Nr. thasëve','KG','Ambalazhi','Shuma','Nr. ambalazheve të përdorura','Shembull','Dhoma','Klienti','Komente punonjësi']];for(const r of sortedRecords()){const base=[r.nr,r.date,dayName(r.date),weekNumber(r.date)??'',r.responsible.name,r.responsible.signature,r.assistant.name,r.assistant.signature,r.comments];const add=(kind,fields={})=>{const x=Array(35).fill('');x[0]=kind;x[31]=r.isDemo?'Po':'Jo';x[32]=r.room;base.forEach((v,i)=>x[i+1]=v);for(const [idx,value] of Object.entries(fields))x[Number(idx)]=value;rows.push(x)};add('DITA');for(const p of r.plan)if([p.product,p.status,p.planned,p.actual,p.unit,p.packaging,p.client,p.comment,p.packageCount].some(nonempty))add('PLAN',{10:p.product,11:p.status,12:num(p.planned)??'',13:num(p.actual)??'',14:p.unit,15:p.packaging,16:p.comment,30:num(p.packageCount)??'',33:p.client});for(const e of r.employees)if([e.name,e.start,e.end,e.comment,e.signature].some(nonempty))add('PUNONJES',{17:e.name,18:e.start,19:e.end,20:hoursFor(e)??'',21:e.signature,34:e.comment});const layouts=planPrintPages([{nr:r.nr,record:r}]),pageFor=(i,row=null)=>{const matches=layouts.filter(l=>l.stages.some(stage=>stage?.groups.some(part=>part&&part.index===i&&(row===null||(row>=stage.offset&&row<stage.offset+part.rows.length))))).map(l=>l.recordPage);return row===null?matches.join(', '):matches[0]??''};r.weighings.forEach((g,i)=>{if(!g.product&&!g.source&&!g.sourceLabel&&!g.rows.some(x=>Object.values(x).some(nonempty)))return;const baseg={10:g.product,22:pageFor(i),23:i+1,24:g.sourceLabel?`${g.sourceLabel} (${g.source==='stock'?'stok':g.source==='other'?'tjetër':'i papërcaktuar'})`:g.source==='stock'?'Marrë nga stoku':g.source==='other'?'Tjetër':'I papërcaktuar'};add('PESHIM_META',baseg);g.rows.forEach((x,j)=>{if(Object.values(x).some(nonempty))add('PESHIM',{...baseg,22:pageFor(i,j),25:j+1,26:num(x.bags)??'',27:num(x.kg)??'',28:num(x.packaging)??'',29:num(x.sum)??''})})})}csv('BioBes_te_dhenat.csv',rows);toast('U përgatit CSV-ja. Për kopje të plotë përdor backup-in JSON.')}
function exportReport(type='products'){const m=metrics(reportRecords(),state.report.product);let rows,name;
 if(type==='products'){rows=[['Produkti','Paketimi','Sasia e prodhuar','Njësia','Formularë'],...m.products.map(x=>[x.product,x.packaging,x.qty,x.unit,x.records.size])];name='BioBes_raport_prodhimi.csv'}
 else if(type==='packages'){rows=[['Paketimi','Nr. ambalazheve të përdorura','Formularë'],...m.packageCounts.map(x=>[x.packaging,x.count,x.records.size])];name='BioBes_raport_paketimi.csv'}
 else if(type==='hours'){rows=[['Punonjësi','Orë pune (rrumb.)','Formularë'],...m.employees.map(x=>[x.name,roundHoursTotal(x.hours),x.records.size])];name='BioBes_raport_ore.csv'}
 else if(type==='weights'){rows=[['Data','Nr.','Peshimi','Produkti','Burimi','Σ thasë','Σ KG','Σ ambalazhi','Σ shuma'],...m.tables.map(x=>[x.date,x.nr,x.group,x.product,x.source,...['bags','kg','packaging','sum'].map(k=>x.totals.seen[k]?x.totals[k]:'')])];name='BioBes_raport_peshime.csv'}
 else{rows=[['Produkti','KG nga stoku','Nr. thasëve','Rreshta'],...m.stock.map(x=>[x.product,x.kg,x.bags,x.rows])];name='BioBes_raport_stoku.csv'}
 const hasDemo=reportRecords().some(r=>r.isDemo);rows=rows.map((r,i)=>[...r,i===0?'Ka shembuj në periudhë':hasDemo?'Po':'Jo']);csv(name,rows);toast('Raporti CSV u përgatit.')
}
function exportBackup(){
 const data=clone(db);for(const r of data.records)r.attachments=[];
 const payload={type:'BioBes-BllokuDitor',version:VERSION,exportedAt:new Date().toISOString(),data,cloud:{originalDocumentsIncluded:false}};
 download('BioBes_backup.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');toast('Backup-i përmban të dhënat, por jo dokumentet origjinale.','warn');
}
async function importBackup(file){
 if(!file||!await canLeave())return;let parsed;
 try{if(file.size>16000000)throw new Error('large');parsed=JSON.parse(await file.text());
  if(parsed?.type==='BioBes-Batch-Draft'&&parsed?.version===VERSION){
   if(!Array.isArray(parsed.records)||!parsed.records.length||parsed.records.length>BATCH_MAX||parsed.records.some(x=>!x?.record||typeof x.record!=='object'||Array.isArray(x.record)))throw new Error('invalid');
   if(!await modal({title:'Hap draftet?',body:'Formularët hapen për kontroll pa u ruajtur automatikisht. Dokumentet origjinale nuk përfshihen.',confirm:'Hap draftet'}))return;await clearImportReview();batchRestore(parsed);toast('Draftet u hapën për kontroll.','warn');return;
  }
  if(parsed?.type==='BioBes-Draft'&&parsed?.version===VERSION&&parsed.record&&typeof parsed.record==='object'&&!Array.isArray(parsed.record)){
   const r=normalizeRecord(parsed.record);r.id=uid();r.nr=String(nextNr()).padStart(3,'0');r.attachments=[];
   if(!await modal({title:'Hap draftin?',body:`Drafti do të hapet si formular i ri nr. ${r.nr}. Dokumentet origjinale nuk përfshihen; kontrollo të gjitha të dhënat para ruajtjes.`,confirm:'Hap draftin'}))return;
   await clearImportReview();state.route='editor';state.mode='new';state.draft=r;state.tab='details';state.side=0;state.weightOpen=new Set([0]);state.dirty=true;render();toast('Drafti u hap; kontrolloje para ruajtjes.','warn');return;
  }
  if(parsed?.type!=='BioBes-BllokuDitor'||parsed?.version!==VERSION||!parsed.data||!Array.isArray(parsed.data.records)||!parsed.data.catalog)throw new Error('invalid');
  const ids=parsed.data.records.map(x=>x?.id);if(ids.some(x=>typeof x!=='string'||!/^[A-Za-z0-9._-]{1,120}$/.test(x))||new Set(ids).size!==ids.length)throw new Error('ids');
 }catch(e){toast('Skedari nuk është një backup ose draft i vlefshëm BioBes.','error');return}
 const incoming=normalizeDB(parsed.data),next=clone(db);if(!cloudValidNumbers(incoming.records)){toast('Backup-i ka numra formularësh të pavlefshëm ose të përsëritur.','error');return}
 let added=0,skipped=0;const byId=new Map(next.records.map(r=>[r.id,r])),byNr=new Map(next.records.map(r=>[Number(r.nr),r]));
 for(const r of incoming.records){
  const old=byId.get(r.id);if(old){const a=clone(old),b=clone(r);a.attachments=[];b.attachments=[];if(!cloudSame(a,b)){toast(`Formulari ${r.nr} ka të njëjtin identifikues por të dhëna të ndryshme. Nuk u importua asgjë.`,'error');return}skipped++;continue}
  if(byNr.has(Number(r.nr))){toast(`Numri ${r.nr} ekziston tashmë në cloud. Nuk u importua asgjë.`,'error');return}
  // JSON backups do not contain the file bytes; do not create broken Storage links.
  r.attachments=[];next.records.push(r);byId.set(r.id,r);byNr.set(Number(r.nr),r);added++;
 }
 for(const kind of ['responsibles','products','employees','packages','statuses','units','sources'])for(const item of incoming.catalog[kind]){
  const label=typeof item==='string'?item:item.label;if(!next.catalog[kind].some(x=>fold(typeof x==='string'?x:x.label)===fold(label)))next.catalog[kind].push(clone(item));
 }
 next.nextNr=Math.max(next.nextNr,incoming.nextNr,...next.records.map(r=>(Number(r.nr)||0)+1));
 if(!await modal({title:'Importo backup-in?',body:`Do të shtohen ${added} formularë; ${skipped} ekzistues do të lihen të pandryshuar. Të dhënat në cloud nuk zëvendësohen. Backup-i JSON nuk përfshin dokumentet origjinale.`,confirm:'Importo'}))return;
 if(!await commit(next))return;await clearImportReview();state.route='dashboard';state.draft=null;state.dirty=false;render();toast('Backup-i u importua në cloud.');
}
async function sample(){if(db.records.length)return;const next=clone(db),r=blankRecord(nextNr());r.isDemo=true;r.responsible.name='Përgjegjëse shembull';r.plan[0]={product:'Mollë (shembull)',status:'Përfunduar',planned:'120',actual:'110',unit:'kg',packaging:'Thasë',client:'',packageCount:'6',comment:'Të dhëna ilustruese'};r.employees[0]={name:'Punonjës shembull',start:'08:00',end:'16:00',comment:'',signature:''};r.weighings[0].product='Mollë (shembull)';r.weighings[0].source='stock';r.weighings[0].sourceLabel='Marrë nga stoku';r.weighings[0].rows[0]={bags:'4',kg:'100',packaging:'2',sum:'100'};r.comments='Ky është një shembull për të provuar prototipin.';next.records.push(r);next.nextNr=Math.max(next.nextNr,Number(r.nr)+1);if(!await commit(next))return;render();toast('U shtuan të dhëna shembull.',storageOK?'':'warn')}
async function clearDemo(){if(!db.records.some(r=>r.isDemo))return;if(!await modal({title:'Fshi të dhënat shembull?',body:'Do të fshihen vetëm regjistrimet e shënuara si shembull. Të dhënat e tjera nuk preken.',confirm:'Fshi shembullin',danger:true}))return;const n=clone(db);n.records=n.records.filter(r=>!r.isDemo);if(!n.records.length)n.nextNr=1;if(!await commit(n))return;render();toast('Shembulli u fshi.')}
async function addCatalog(kind){
 if(!['responsibles','products','employees','packages','statuses','units','sources'].includes(kind))return;const el=document.getElementById('add-'+kind),name=el?.value.trim();if(!name){toast('Shkruaj një emër për ta shtuar.','error');el?.focus();return}
 const defaults=kind==='statuses'?BASE_STATUSES:kind==='units'?BASE_UNITS:kind==='sources'?BASE_SOURCES.map(x=>x.label):[],present=[...defaults,...db.catalog[kind].map(x=>typeof x==='string'?x:x.label)];if(present.some(x=>fold(x)===fold(name))){toast('Ky emër ekziston tashmë.','error');return}let choice=null;if(kind==='sources'){choice=await chooseSourceKind(name);if(!choice)return}
 const next=clone(db);next.catalog[kind].push(kind==='sources'?{label:name,kind:choice}:name);next.catalog[kind].sort((a,b)=>String(typeof a==='string'?a:a.label).localeCompare(String(typeof b==='string'?b:b.label),'sq'));if(!await commit(next))return;render();document.getElementById('add-'+kind)?.focus();toast(savedMessage(),storageOK?'':'warn')
}
function editCatalogDialog(kind,entry){return new Promise(resolve=>{
 const root=document.getElementById('dialog-root'),name=typeof entry==='string'?entry:entry.label;
 root.innerHTML=`<div class="modal-layer" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="catalog-dialog-title"><h2 id="catalog-dialog-title">Modifiko të dhënën bazë</h2><p>Ndryshimi vlen vetëm për listën bazë; formularët e ruajtur më parë nuk ndryshojnë.</p><label for="catalog-edit-name">Emri</label><input class="input" id="catalog-edit-name" maxlength="160" value="${esc(name)}">${kind==='sources'?`<label for="catalog-edit-source">Lloji i burimit</label><select class="input" id="catalog-edit-source"><option value="stock" ${entry.kind==='stock'?'selected':''}>Stok</option><option value="other" ${entry.kind==='other'?'selected':''}>Tjetër</option></select>`:''}<p id="catalog-edit-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn" data-edit-cancel>Anulo</button><button type="button" class="btn btn-primary" data-edit-save>Ruaj</button></div></div></div>`;
 const input=root.querySelector('#catalog-edit-name'),done=value=>{root.innerHTML='';document.removeEventListener('keydown',onkey);resolve(value)},onkey=e=>{if(e.key==='Escape')done(null);else if(e.key==='Enter'&&e.target===input){e.preventDefault();root.querySelector('[data-edit-save]').click()}};
 root.querySelector('[data-edit-cancel]').onclick=()=>done(null);root.querySelector('.modal-layer').onclick=e=>{if(e.target.classList.contains('modal-layer'))done(null)};root.querySelector('[data-edit-save]').onclick=()=>{const value=input.value.trim();if(!value){root.querySelector('#catalog-edit-error').textContent='Shkruaj një emër.';input.focus();return}done({name:value,sourceKind:root.querySelector('#catalog-edit-source')?.value})};document.addEventListener('keydown',onkey);input.focus();input.select();
})}
async function editCatalog(kind,index){
 if(!['responsibles','products','employees','packages','statuses','units','sources'].includes(kind))return;
 const entry=db.catalog[kind][index];if(entry===undefined)return;
 const result=await editCatalogDialog(kind,entry);if(!result)return;
 const defaults=kind==='statuses'?BASE_STATUSES:kind==='units'?BASE_UNITS:kind==='sources'?BASE_SOURCES.map(x=>x.label):[];
 if([...defaults,...db.catalog[kind].filter((_,i)=>i!==index).map(x=>typeof x==='string'?x:x.label)].some(x=>fold(x)===fold(result.name))){toast('Ky emër ekziston tashmë.','error');return}
 // Do not overwrite a different item if the list changed while the dialog was open.
 if(JSON.stringify(db.catalog[kind][index])!==JSON.stringify(entry)){toast('Lista ndryshoi. Provo përsëri.','warn');return}
 const next=clone(db);next.catalog[kind][index]=kind==='sources'?{label:result.name,kind:result.sourceKind}:result.name;next.catalog[kind].sort((a,b)=>String(typeof a==='string'?a:a.label).localeCompare(String(typeof b==='string'?b:b.label),'sq'));
 if(!await commit(next))return;render();toast('Ndryshimi u ruajt në listën bazë.');
}
async function deleteCatalog(kind,index){
 if(!['responsibles','products','employees','packages','statuses','units','sources'].includes(kind))return;const entry=db.catalog[kind][index],name=typeof entry==='string'?entry:entry?.label;if(name===undefined)return;if(!await modal({title:'Hiq nga lista?',body:`“${name}” do të hiqet vetëm nga lista bazë. Regjistrimet e vjetra nuk ndryshojnë.`,confirm:'Hiq',danger:true}))return;const next=clone(db);next.catalog[kind].splice(index,1);if(!await commit(next))return;render();toast('Emri u hoq nga lista.')
}


for(const type of ['click','keydown','beforeinput','input','change','paste','drop'])document.addEventListener(type,e=>{if((cloud.busy||cloud.uncertain||cloud.conflict)&&e.target instanceof Element&&e.target.closest('#app,#combo-popover')){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('click',async e=>{const suggestion=e.target.closest('[data-combo-option]');if(suggestion){chooseComboOption(Number(suggestion.dataset.comboOption));return}const add=e.target.closest('[data-combo-add]');if(add){await quickAddCombo();return}if(!e.target.closest('[data-combo]')&&!e.target.closest('#combo-popover')&&activeCombo)finishCombo(activeCombo);const nav=e.target.closest('[data-nav]');if(nav){await go(nav.dataset.nav);return}const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const a=btn.dataset.action;if(a==='new')await newEditor();else if(a==='open-record')await openRecord(btn.dataset.id,false);else if(a==='edit-record')await openRecord(btn.dataset.id,true);else if(a==='delete-record')await deleteRecord(btn.dataset.id);else if(a==='print-record')await openPrintRecord(btn.dataset.id);else if(a==='print-mode'){state.print.mode=btn.dataset.mode;render()}else if(a==='print-select-all')selectVisiblePrint(true);else if(a==='print-select-none')selectVisiblePrint(false);else if(a==='print-pdf')await createPrintPDF();else if(a==='print-xlsx')await createPrintWorkbook();else if(a==='enable-edit'){state.mode='edit';render()}else if(a==='save')await saveRecord();else if(a==='save-next')await saveRecord(true);else if(a==='editor-tab'){state.tab=btn.dataset.tab;render()}else if(a==='add-weighing')addWeighing();else if(a==='add-weight-rows')addWeightRows(Number(btn.dataset.index),Number(btn.dataset.count));else if(a==='delete-weighing')await deleteWeighing(Number(btn.dataset.index));else if(a==='delete-weight-row')await deleteWeightRow(Number(btn.dataset.index),Number(btn.dataset.row));else if(a==='clear-filters'){state.report={from:'',to:'',product:'',employee:'',exportType:'products'};render()}else if(a==='export-report')exportReport(btn.dataset.type||'products');else if(a==='attendance-pdf')await exportAttendancePDF();else if(a==='attendance-xlsx')await exportAttendanceXlsx();else if(a==='timecard-select'){const name=timecardNames()[Number(btn.dataset.index)];if(name){state.report.employee=name;render()}}else if(a==='export-timecard')exportTimecard();else if(a==='timecard-xlsx')await exportTimecardXlsx();else if(a==='timecard-pdf')await exportTimecardPDF();else if(a==='export-all')exportAll();else if(a==='backup-export')exportBackup();else if(a==='backup-import')document.getElementById('import-file').click();else if(a==='batch-read')await batchRead();else if(a==='batch-cancel')batchCancel();else if(a==='batch-review-ready')await batchReviewCompleted();else if(a==='batch-reset')await batchStartOver();else if(a==='batch-raw')batchRawDownload();else if(a==='batch-up')batchMove(Number(btn.dataset.index),-1);else if(a==='batch-down')batchMove(Number(btn.dataset.index),1);else if(a==='batch-swap')batchSwap(Number(btn.dataset.index));else if(a==='batch-split')batchSplit(Number(btn.dataset.index));else if(a==='batch-join')batchJoin(Number(btn.dataset.index));else if(a==='batch-remove')await batchRemove(Number(btn.dataset.index));else if(a==='batch-original-reset')batchPrivateReset(btn.dataset.id);else if(a==='batch-open')batchOpen(Number(btn.dataset.index));else if(a==='batch-remove-review')await batchRemoveReview();else if(a==='batch-draft')batchDraftDownload();else if(a==='batch-save')await batchSave();else if(a==='cloud-open-original')await cloudOpenOriginal(Number(btn.dataset.index));else if(a==='sample')await sample();else if(a==='clear-demo')await clearDemo();else if(a==='catalog-add')await addCatalog(btn.dataset.kind);else if(a==='catalog-edit')await editCatalog(btn.dataset.kind,Number(btn.dataset.index));else if(a==='catalog-delete')await deleteCatalog(btn.dataset.kind,Number(btn.dataset.index))});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset.combo==='sources'&&state.route==='editor'){setPath(state.draft,el.dataset.bind.replace(/sourceLabel$/,'source'),'')}if(el.dataset.combo)showCombo(el);if(el.id==='history-search'){state.search=el.value;renderHistoryList();return}if(el.id==='print-search'){state.print.search=el.value;renderPrintList();return}if(el.dataset.printSetting){state.print[el.dataset.printSetting]=el.value;return}if(el.dataset.bind&&state.route==='editor'&&state.mode!=='view'){setPath(state.draft,el.dataset.bind,el.value);state.dirty=true;batchMarkChanged();updateDerived(el.dataset.bind)}});
document.addEventListener('change',e=>{const el=e.target;if(el.id==='batch-files'){batchAddFiles(el);return}if(el.dataset.batchOriginal){batchPrivateChanged(el);return}if(el.id==='batch-review-original'){batchReviewPrivateChanged(el);return}if(el.id==='batch-device-notice'){setDeviceNotice(el);return}if(el.id==='batch-reviewed'&&batchIsReview()){const it=batchState.items[batchState.index];it.confirmedDigest=el.checked?JSON.stringify(it.record):'';batchUpdateSummary();return}if(el.id==='confirm-import-review'&&importState.review){importState.review.confirmed=el.checked;return}if(el.dataset.printId){if(el.checked)state.print.selected.add(el.dataset.printId);else state.print.selected.delete(el.dataset.printId);updatePrintCount();return}if(el.dataset.attendance){state.attendance[el.dataset.attendance]=el.value;render();return}if(el.dataset.report){state.report[el.dataset.report]=el.value;render()}if(el.id==='import-file'){const file=el.files&&el.files[0];el.value='';importBackup(file)}});
document.addEventListener('toggle',e=>{const el=e.target;if(el.isConnected&&el.matches('.weight-card')&&state.route==='editor'){const i=Number(el.dataset.weightIndex);if(el.open)state.weightOpen.add(i);else state.weightOpen.delete(i)}},true);document.addEventListener('focusin',e=>{if(e.target.dataset.combo&&!suppressComboFocus)showCombo(e.target)});document.addEventListener('focusout',e=>{if(e.target.dataset.combo)setTimeout(()=>{if(activeCombo===e.target&&!document.activeElement?.closest('#combo-popover'))finishCombo(e.target)},160)});window.addEventListener('scroll',()=>{if(activeCombo)positionCombo(activeCombo)},true);window.addEventListener('resize',()=>{if(activeCombo)positionCombo(activeCombo)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.closest('#combo-popover')){e.preventDefault();const el=activeCombo;hideCombo();if(el&&el.isConnected){suppressComboFocus=true;el.focus();suppressComboFocus=false}return}if(e.target.dataset.combo&&handleComboKey(e))return;if(e.key==='Enter'&&e.target.id?.startsWith('add-')){e.preventDefault();addCatalog(e.target.id.slice(4))}});
window.addEventListener('beforeunload',e=>{if((state.route==='editor'&&state.dirty&&state.mode!=='view')||cloud.busy||cloud.uncertain||batchState.busy||batchIsReview()||(state.route==='batch'&&batchState.groups.some(g=>g.results?.length))){e.preventDefault();e.returnValue=''}});

document.addEventListener('input',e=>{if(e.target.id!=='timecard-search')return;const choices=document.getElementById('timecard-choices');if(choices)choices.innerHTML=timecardChoices(e.target.value)});
