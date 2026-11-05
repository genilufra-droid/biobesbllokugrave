/* BioBes single-owner cloud adapter. Business records live only in Supabase.
   Only the authentication session may be stored in this tab's sessionStorage. */
const CLOUD_BUCKET='biobes-daily-documents-private';
let cloudLastAiStart=0;
const cloud={client:null,user:null,revision:0,busy:false,uncertain:null,conflict:null,config:null};
const cloudApp=document.getElementById('app'),cloudAuth=document.getElementById('cloud-auth'),cloudError=document.getElementById('cloud-auth-error'),cloudRecovery=document.getElementById('cloud-recovery'),cloudOverlay=document.getElementById('cloud-busy');
function cloudStatus(text){const e=document.getElementById('storage-status');if(e)e.textContent=text}
function cloudVisibleAuth(message=''){
 cloudApp.hidden=true;cloudAuth.hidden=false;cloudRecovery.hidden=true;cloudApp.inert=false;
 cloudError.textContent=message;cloudError.hidden=!message;document.getElementById('cloud-auth-draft').hidden=!(state.draft&&state.dirty)&&!batchState.groups.some(g=>g.results?.length);cloudStatus('Nuk je lidhur');
}
function cloudBusy(on,message='Po lidhet me cloud…'){
 cloud.busy=on;cloudOverlay.hidden=!on;
 cloudOverlay.querySelector('p').textContent=message;
 cloudApp.inert=on||!!cloud.uncertain||!!cloud.conflict;
}
function cloudNotify(message){const banner=document.getElementById('cloud-notice');banner.querySelector('span').textContent=message;banner.hidden=false}
function cloudHideNotice(){document.getElementById('cloud-notice').hidden=true}
function cloudRecoveryShow(message){cloudRecovery.querySelector('p').textContent=message;cloudRecovery.querySelector('[data-cloud-action=resolve]').hidden=!cloud.uncertain;cloudRecovery.querySelector('[data-cloud-action=draft]').hidden=!state.draft&&!batchState.groups.some(g=>g.results?.length);cloudRecovery.querySelector('[data-cloud-action=batch-reload]').hidden=!(cloud.conflict&&!cloud.uncertain&&batchIsReview());cloudRecovery.hidden=false;cloudApp.inert=true}
function cloudRecoveryHide(){cloudRecovery.hidden=true;cloudApp.inert=cloud.busy}
function cloudConfig(){
 const c=window.BIOBES_CLOUD_CONFIG||{},url=String(c.supabaseUrl||'').trim().replace(/\/$/,''),key=String(c.supabasePublishableKey||'').trim();
 if(!url||!key)return null;
 let parsed;try{parsed=new URL(url)}catch{return null}
 const local=['localhost','127.0.0.1','::1'].includes(parsed.hostname);
 if((parsed.protocol!=='https:'&&!(local&&parsed.protocol==='http:')) || parsed.username || parsed.password || parsed.pathname!=='/' || parsed.search || parsed.hash)return null;
 // Service keys must never be embedded in a website. JWT-based legacy service_role keys are rejected too.
 if(key.startsWith('sb_secret_'))return null;
 if(key.startsWith('eyJ'))try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role==='service_role')return null}catch{return null}
 return {url,key};
}
function cloudTimeoutSignal(ms){if(typeof AbortSignal.timeout==='function')return AbortSignal.timeout(ms);const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal}
function cloudTimedFetch(input,options={}){
 const controller=new AbortController(),original=options.signal||(input instanceof Request?input.signal:null),relay=()=>controller.abort();
 if(original?.aborted)controller.abort();else original?.addEventListener('abort',relay,{once:true});
 const timeout=setTimeout(()=>controller.abort(),90000);
 return fetch(input,{...options,signal:controller.signal}).finally(()=>{clearTimeout(timeout);original?.removeEventListener('abort',relay)});
}
async function cloudSnapshot(){
 const result=await cloud.client.rpc('biobes_daily_snapshot').abortSignal(cloudTimeoutSignal(25000));
 if(result.error)throw result.error;
 const value=result.data;
 if(!value||!Number.isSafeInteger(Number(value.revision))||Number(value.revision)<0||!value.data||!Array.isArray(value.data.records)||!value.data.catalog)throw new Error('Përgjigje cloud e pavlefshme.');
 return {revision:Number(value.revision),data:normalizeDB(value.data)};
}
async function cloudEnter(session){
 if(!session?.user?.id)throw new Error('Sesioni nuk është i vlefshëm.');
 cloud.user=session.user;cloudBusy(true,'Po hapen regjistrimet nga cloud…');
 try {
  const snap=await cloudSnapshot();
  // If a session ended during an uncertain deletion, clean only files no longer referenced by the snapshot.
  if(cloud.uncertain)await cloudRemovePaths(cloudDeletedPaths(cloud.uncertain.base,snap.data));
  // After an expired session, do not delete any uploaded source which the cloud snapshot references.
  if(importState.review){const paths=new Set(snap.data.records.flatMap(r=>(r.attachments||[]).map(a=>a.path)));if(importState.review.sources.some(s=>s.uploaded?.path&&paths.has(s.uploaded.path)))importState.review.committed=true;await clearImportReview()}
  if(batchState.groups.length||batchState.items.length)await batchResetCloud(snap.data);db=snap.data;cloud.revision=snap.revision;storageOK=true;state.editorBase=null;
  state.route='dashboard';state.draft=null;state.dirty=false;cloud.uncertain=null;cloud.conflict=null;
  cloudAuth.hidden=true;cloudApp.hidden=false;cloudRecoveryHide();cloudHideNotice();
  document.getElementById('cloud-email').textContent=cloud.user.email||'';cloudStatus('Ruajtur në cloud');render();
 } finally {cloudBusy(false)}
}
async function cloudStart(){
 cloud.config=cloudConfig();
 if(!cloud.config||!window.supabase?.createClient){
  cloudVisibleAuth('Aplikacioni nuk është konfiguruar ende. Vendos URL-në dhe çelësin publik Supabase te cloud-config.js.');
  document.getElementById('cloud-login-submit').disabled=true;return;
 }
 let authStorage;try{const k='__biobes_auth_test__';sessionStorage.setItem(k,'1');sessionStorage.removeItem(k);authStorage=sessionStorage}catch{authStorage=undefined}
 cloud.client=window.supabase.createClient(cloud.config.url,cloud.config.key,{auth:{
  persistSession:!!authStorage,storage:authStorage,storageKey:'biobes-daily-cloud-auth-v1',autoRefreshToken:true,detectSessionInUrl:false
 },global:{fetch:cloudTimedFetch}});
 cloud.subscription=cloud.client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'&&cloud.user){cloud.user=null;db=emptyDB();cloudVisibleAuth('Sesioni ka përfunduar. Hyr përsëri.')}}).data.subscription;
 try {
  const {data,error}=await cloud.client.auth.getSession();if(error)throw error;
  if(data.session)await cloudEnter(data.session);else cloudVisibleAuth();
 }catch(e){cloud.user=null;cloudVisibleAuth('Nuk u hap lidhja me cloud. Kontrollo internetin dhe konfigurimin.');}
}
async function cloudLogin(e){
 e.preventDefault();if(!cloud.client||cloud.busy)return;
 if(((state.dirty&&state.draft)||batchState.groups.some(g=>g.results?.length)||batchState.busy)&&!await modal({title:'Draft i paruajtur',body:'Hyrja do të mbyllë draftin e hapur. Shkarkoje më parë nëse dëshiron ta ruash dhe ta rihapësh.',confirm:'Hyr dhe mbyll draftin',danger:true}))return;
 const email=document.getElementById('cloud-login-email').value.trim(),password=document.getElementById('cloud-login-password').value;
 cloudError.hidden=true;cloudBusy(true,'Po kontrollohet hyrja…');
 try {
  const {data,error}=await cloud.client.auth.signInWithPassword({email,password});
  if(error||!data.session)throw new Error('LOGIN');
  document.getElementById('cloud-login-password').value='';
  try{await cloudEnter(data.session)}catch(err){await cloud.client.auth.signOut({scope:'local'}).catch(()=>{});cloud.user=null;throw new Error(err?.message==='BIOBES_FORBIDDEN'?'FORBIDDEN':'SETUP')}
 }catch(err){
  const msg=err?.message==='LOGIN'?'Emaili ose fjalëkalimi nuk janë të sakta, ose lidhja nuk është e disponueshme.':err?.message==='FORBIDDEN'?'Kjo llogari nuk ka akses te BioBes.':'Nuk u hapën të dhënat. Kontrollo konfigurimin, lejet dhe lidhjen.';
  cloudVisibleAuth(msg);
 }finally{cloudBusy(false)}
}
document.getElementById('cloud-login').addEventListener('submit',cloudLogin);
async function cloudLogout(){
 if(cloud.busy||cloud.uncertain||cloud.conflict)return;
 if(!await canLeave())return;
 await clearImportReview();cancelRead();state.draft=null;state.dirty=false;
 cloudBusy(true,'Po mbyllet sesioni…');const old=cloud.client;let failed=false;
 cloud.subscription?.unsubscribe();cloud.user=null;
 try{const {error}=await old.auth.signOut({scope:'local'});failed=!!error}catch(_){failed=true}
 finally{
  try{old.auth.stopAutoRefresh();sessionStorage.removeItem('biobes-daily-cloud-auth-v1')}catch(_){}
  cloud.client=null;db=emptyDB();document.getElementById('cloud-login-password').value='';cloudVisibleAuth();cloudBusy(false);
  await cloudStart();
  if(failed)cloudVisibleAuth('Sesioni u hoq nga kjo skedë, por nuk u konfirmua mbyllja në server. Kontrollo lidhjen.');
 }
}
async function cloudRefresh(){
 if(cloud.busy||cloud.uncertain||cloud.conflict)return;
 if(!await canLeave())return;
 cloudBusy(true,'Po rifreskohen regjistrimet…');
 try{const snap=await cloudSnapshot();db=snap.data;cloud.revision=snap.revision;await clearImportReview();state.route='dashboard';state.draft=null;state.dirty=false;render();cloudHideNotice();toast('Të dhënat u rifreskuan nga cloud.')}
 catch(e){toast('Nuk u rifreskuan të dhënat. Kontrollo lidhjen.','error')}
 finally{cloudBusy(false)}
}
function cloudSame(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function cloudDelta(base,next){
 const old=new Map(base.records.map(r=>[r.id,r])),fresh=new Map(next.records.map(r=>[r.id,r]));
 return {upserts:next.records.filter(r=>!old.has(r.id)||!cloudSame(old.get(r.id),r)),deletes:base.records.filter(r=>!fresh.has(r.id)).map(r=>r.id),catalogChanged:!cloudSame(base.catalog,next.catalog)};
}
function cloudValidNumbers(records){const seen=new Set(),ids=new Set();for(const r of records){const id=String(r.id||''),num=String(r.nr||'');if(!/^[A-Za-z0-9._-]{1,120}$/.test(id)||ids.has(id)||!/^\d{1,9}$/.test(num)||Number(num)<1||seen.has(Number(num)))return false;ids.add(id);seen.add(Number(num))}return true}
function cloudRebase(base,next,remote){
 const delta=cloudDelta(base,next),old=new Map(base.records.map(r=>[r.id,r])),current=new Map(remote.records.map(r=>[r.id,r]));
 for(const id of [...delta.upserts.map(r=>r.id),...delta.deletes])if(!cloudSame(old.get(id),current.get(id)))return null;
 if(delta.catalogChanged&&!cloudSame(base.catalog,remote.catalog))return null;
 const merged=clone(remote),deleted=new Set(delta.deletes),updates=new Map(delta.upserts.map(r=>[r.id,r]));
 merged.records=merged.records.filter(r=>!deleted.has(r.id)).map(r=>updates.has(r.id)?clone(updates.get(r.id)):r);
 for(const r of delta.upserts)if(!current.has(r.id))merged.records.push(clone(r));
 if(delta.catalogChanged)merged.catalog=clone(next.catalog);
 merged.nextNr=Math.max(remote.nextNr,next.nextNr);
 return cloudValidNumbers(merged.records)?merged:null;
}
function cloudParams(base,next,revision,id){const delta=cloudDelta(base,next);return {
 p_expected_revision:revision,p_operation_id:id,p_next_nr:next.nextNr,p_catalog:next.catalog,p_upserts:delta.upserts,p_deletes:delta.deletes
}}
function cloudNetworkUnknown(result){return !result||(!result.status&&!!result.error)||result.status===408||result.status>=500}
function cloudIsConflict(result){return result?.error&&(result.error.code==='40001'||String(result.error.message||'').includes('BIOBES_CONFLICT'))}
async function cloudSend(params){
 let res;try{res=await cloud.client.rpc('biobes_daily_write',params).abortSignal(cloudTimeoutSignal(30000))}catch(e){res={error:e,status:0}}
 if(cloudNetworkUnknown(res)){try{res=await cloud.client.rpc('biobes_daily_write',params).abortSignal(cloudTimeoutSignal(30000))}catch(e){res={error:e,status:0}}}
 return res;
}
function cloudErrorMessage(res){
 const m=String(res?.error?.message||'');
 if(m.includes('BIOBES_FORBIDDEN')||res?.status===401||res?.status===403)return 'Llogaria nuk ka më akses. Hyr përsëri.';
 if(m.includes('BIOBES_INPUT_TOO_LARGE'))return 'Ndryshimi është shumë i madh për t’u ruajtur njëherësh.';
 if(res?.error?.code==='23505')return 'Numri i formularit ekziston tashmë në cloud.';
 return 'Ndryshimet nuk u ruajtën. Kontrollo lidhjen dhe provo përsëri.';
}
async function cloudRemovePaths(paths){
 const unique=[...new Set(paths.filter(x=>typeof x==='string'&&x.startsWith(`${cloud.user?.id}/`)))];if(!unique.length)return true;
 const {error}=await cloud.client.storage.from(CLOUD_BUCKET).remove(unique);
 if(error){cloudNotify('Disa dokumente mund të kenë mbetur në Storage privat. Kontrolloji në Supabase.');return false}return true;
}
function cloudDeletedPaths(base,next){
 const remaining=new Set(next.records.flatMap(r=>(r.attachments||[]).map(a=>a.path)));
 const ids=new Set(next.records.map(r=>r.id));
 return base.records.filter(r=>!ids.has(r.id)).flatMap(r=>(r.attachments||[]).map(a=>a.path)).filter(p=>!remaining.has(p));
}
async function cloudApplySuccess(result,target,base){
 if(result.data?.replayed){const snap=await cloudSnapshot();db=snap.data;cloud.revision=snap.revision}
 else{if(!Number.isSafeInteger(Number(result.data?.revision)))throw new Error('BAD_ACK');db=normalizeDB(target);cloud.revision=Number(result.data.revision)}
 updateNav();updateDatalists();cloudStatus('Ruajtur në cloud');
 await cloudRemovePaths(cloudDeletedPaths(base,db));
}
async function cloudCommit(next,options={}){
 if(!cloud.user||!cloud.client||cloud.uncertain||cloud.conflict)return false;
 if(!cloudValidNumbers(next.records)){toast('Ka numra ose identifikues formularësh të pavlefshëm apo të përsëritur.','error');return false}
 if(options.kind==='save-record'){const current=db.records.find(r=>r.id===options.recordId);if((options.editorMode==='edit'&&(!options.baseRecord||!cloudSame(options.baseRecord,current)))||(options.editorMode==='new'&&current)){cloud.conflict={base:clone(db),target:clone(next),options};cloudRecoveryShow('Formulari është ndryshuar ose ekziston tashmë. Drafti yt nuk u mbishkrua.');return false}}
 const ownLock=!options.locked;if(ownLock){if(cloud.busy)return false;cloudBusy(true,'Po ruhen ndryshimet në cloud…')}
 let base=clone(db),target=clone(next),revision=cloud.revision;const operationId=crypto.randomUUID();
 try{
  for(let attempt=0;attempt<3;attempt++){
   const params=cloudParams(base,target,revision,operationId);const res=await cloudSend(params);
   if(cloudNetworkUnknown(res)){
    cloud.uncertain={params,base,target,options};cloudRecoveryShow('Lidhja u ndërpre gjatë ruajtjes. Nuk dihet ende nëse cloud e mori ndryshimin. Kontrollo ruajtjen pa e përsëritur nga fillimi.');return false;
   }
   if(cloudIsConflict(res)){
    let snapshot;try{snapshot=await cloudSnapshot()}catch(e){cloud.conflict={base,target,options};cloudRecoveryShow('Të dhënat ndryshuan në një pajisje tjetër. Lidhja nuk lejon ende kontrollin; provo rifreskimin.');return false}
    const merged=cloudRebase(base,target,snapshot.data);
    if(!merged){cloud.conflict={base,target,options};cloudRecoveryShow('I njëjti formular, numër ose listë është ndryshuar në një pajisje tjetër. Ndryshimet e tua nuk u ruajtën; shkarko draftin ose rifresko.');return false}
    base=snapshot.data;target=merged;revision=snapshot.revision;continue;
   }
   if(res.error){toast(cloudErrorMessage(res),'error');return false}
   try{await cloudApplySuccess(res,target,base)}catch(e){cloud.uncertain={params,base,target,options,alreadySaved:true};cloudRecoveryShow('Ruajtja u pranua, por gjendja nuk u rifreskua. Kontrollo lidhjen dhe shtyp “Kontrollo ruajtjen”.');return false}
   return true;
  }
  cloud.conflict={base,target,options};cloudRecoveryShow('Të dhënat po ndryshojnë njëkohësisht. Shkarko draftin ose rifresko para se të vazhdosh.');return false;
 }finally{if(ownLock)cloudBusy(false)}
}
async function cloudResolve(){
 if(cloud.busy||!cloud.uncertain)return;const pending=cloud.uncertain;cloudBusy(true,'Po kontrollohet ruajtja…');
 try{
  const res=await cloudSend(pending.params);
  if(cloudNetworkUnknown(res)){cloudRecoveryShow('Ende nuk lidhemi me cloud. Provo përsëri.');return}
  if(cloudIsConflict(res)){cloud.uncertain=null;cloud.conflict=pending;cloudRecoveryShow('Ndryshimi nuk u ruajt dhe të dhënat në cloud kanë ndryshuar. Shkarko draftin ose rifresko.');return}
  if(res.error){cloud.uncertain=null;cloudRecoveryHide();toast(cloudErrorMessage(res),'error');return}
  try{const snap=await cloudSnapshot();db=snap.data;cloud.revision=snap.revision;await cloudRemovePaths(cloudDeletedPaths(pending.base,db))}
  catch(e){cloudRecoveryShow('Ruajtja u pranua, por cloud nuk mund të rifreskohet ende. Provo përsëri.');return}
  cloud.uncertain=null;
  if(pending.options?.kind==='batch-create'&&batchState.phase==='review'){await batchResetCloud(db);state.route='records';state.draft=null;state.editorBase=null;state.dirty=false}
  if(pending.options?.kind==='save-record'&&state.draft?.id===pending.options.recordId){
   const saved=db.records.find(r=>r.id===pending.options.recordId);
   if(saved){state.dirty=false;state.editorBase=clone(saved);if(importState.review)importState.review.committed=true;await clearImportReview();
    if(pending.options.continueEntry)startFollowingRecord(saved.date);else{state.draft=clone(saved);state.mode='view'}
   }
  }
  cloudRecoveryHide();render();if(pending.options?.continueEntry&&state.mode==='new')window.scrollTo({top:0,behavior:'smooth'});toast('Ruajtja u konfirmua në cloud.');
 }finally{cloudBusy(false)}
}
async function cloudDiscardAndRefresh(){
 if(cloud.busy)return;
 const ok=await modal({title:'Rifresko nga cloud?',body:'Ndryshimet e paruajtura në formular do të humbasin. Nëse duhen, shkarko më parë draftin.',confirm:'Rifresko',danger:true});
 if(!ok)return;
 cloudBusy(true,'Po hapen të dhënat nga cloud…');
 try{
  const snap=await cloudSnapshot();
  // If a previously uncertain write made it to the database, keep its files.
  if(cloud.uncertain&&importState.review){const id=cloud.uncertain.options?.recordId;const r=snap.data.records.find(x=>x.id===id);const paths=new Set((r?.attachments||[]).map(x=>x.path));if(importState.review.sources.some(s=>s.uploaded?.path&&paths.has(s.uploaded.path)))importState.review.committed=true}
  cloud.uncertain=null;cloud.conflict=null;await batchResetCloud(snap.data);db=snap.data;cloud.revision=snap.revision;await clearImportReview();state.route='dashboard';state.editorBase=null;state.draft=null;state.dirty=false;cloudRecoveryHide();render();toast('Të dhënat u rifreskuan.');
 }catch(e){cloudRecoveryShow('Nuk u lidh me cloud. Provo përsëri.')}
 finally{cloudBusy(false)}
}
async function cloudKeepBatchAndRefresh(){
 if(cloud.busy||cloud.uncertain||!cloud.conflict||!batchIsReview())return;cloudBusy(true,'Po rifreskohen të dhënat; draftet mbeten të hapura…');
 try{const snap=await cloudSnapshot();db=snap.data;cloud.revision=snap.revision;cloud.conflict=null;cloudRecoveryHide();render();toast('Draftet u ruajtën në këtë sesion. Kontrollo numrat ndaj cloud-it.','warn')}
 catch(e){cloudRecoveryShow('Nuk u lidh me cloud. Draftet mbeten të hapura; provo përsëri.')}
 finally{cloudBusy(false)}
}
function cloudDownloadDraft(){if(batchIsReview()){batchDraftDownload();return}if(batchState.groups.some(g=>g.results?.length)){batchDownloadReadyFromSelect();return}if(!state.draft){toast('Nuk ka draft të hapur.','warn');return}const record=clone(state.draft);record.attachments=[];download('BioBes_draft_i_paruajtur.json',JSON.stringify({type:'BioBes-Draft',version:1,record},null,2),'application/json');toast('Drafti u shkarkua. Dokumentet origjinale nuk përfshihen.','warn')}
document.querySelectorAll('[data-cloud-action]').forEach(el=>el.addEventListener('click',()=>{
 const a=el.dataset.cloudAction;if(a==='logout')cloudLogout();if(a==='refresh')cloudRefresh();if(a==='resolve')cloudResolve();if(a==='discard')cloudDiscardAndRefresh();if(a==='draft')cloudDownloadDraft();if(a==='batch-reload')cloudKeepBatchAndRefresh();
}));
async function cloudUploadSource(source,recordId){
 if(source.uploaded)return source.uploaded;
 if(!cloud.user||!source.file)throw new Error('Skedari nuk është më i disponueshëm.');
 if(!/^[A-Za-z0-9._-]{1,120}$/.test(recordId))throw new Error('Identifikuesi i formularit është i pavlefshëm.');
 const file=source.file,ext=(file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif|pdf|xlsx|xltx|xlsm|xltm|xls|xlt)$/)||['','.bin'])[0];
 if(!source.pendingPath)source.pendingPath=`${cloud.user.id}/${recordId}/${crypto.randomUUID()}${ext}`;
 const bucket=cloud.client.storage.from(CLOUD_BUCKET);
 let uploaded=await bucket.upload(source.pendingPath,file,{contentType:file.type||'application/octet-stream',upsert:false,cacheControl:'0'});
 if(uploaded.error){
  const msg=String(uploaded.error.message||'').toLowerCase();
  if(uploaded.error.statusCode==='409'||uploaded.error.status===409||msg.includes('already exists')||msg.includes('duplicate')){
   const existing=await bucket.download(source.pendingPath,{}, {cache:'no-store'});
   if(existing.error||!existing.data||existing.data.size!==file.size)throw new Error('Skedari ekzistues nuk mund të verifikohet.');
   const a=await crypto.subtle.digest('SHA-256',await file.arrayBuffer()),b=await crypto.subtle.digest('SHA-256',await existing.data.arrayBuffer());
   if(!cloudSame([...new Uint8Array(a)],[...new Uint8Array(b)]))throw new Error('Skedari ekzistues nuk përputhet.');
  }else throw new Error('Dokumenti nuk u ngarkua në cloud. Provo përsëri.');
 }
 source.uploaded={name:str(file.name,300),path:source.pendingPath,type:str(file.type||'application/octet-stream',100),size:file.size};
 return source.uploaded;
}
async function cloudCleanupUnsavedReview(review){
 const paths=review.sources.map(s=>s.pendingPath||s.uploaded?.path).filter(Boolean);
 if(paths.length&&!review.committed)await cloudRemovePaths(paths);
}
async function cloudOpenOriginal(index){
 const a=state.draft?.attachments?.[index];if(!a||!a.path.startsWith(`${cloud.user?.id}/`)){toast('Dokumenti nuk është i disponueshëm në këtë projekt.','error');return}
 cloudBusy(true,'Po shkarkohet dokumenti privat…');
 try{const {data,error}=await cloud.client.storage.from(CLOUD_BUCKET).download(a.path,{}, {cache:'no-store'});if(error||!data)throw error||new Error('missing');download(a.name||'dokument',data,a.type||'application/octet-stream');toast('Dokumenti u shkarkua.')}
 catch(e){toast('Dokumenti nuk u gjet ose nuk mund të shkarkohet.','error')}
 finally{cloudBusy(false)}
}
async function cloudGemini(parts,signal){
 const {data,error}=await cloud.client.auth.getSession();if(error||!data.session?.access_token)throw new Error('Sesioni ka përfunduar. Hyr përsëri.');
 const body=JSON.stringify({parts,consent:true,anonymous:true,freeTier:true});if(new Blob([body]).size>19000000)throw new Error('Dokumentet janë shumë të mëdha për lexim në cloud. Ndaji në skedarë më të vegjël.');
 const pause=cloudLastAiStart?Math.max(0,BATCH_AI_GAP_MS-(Date.now()-cloudLastAiStart)):0;if(pause){if(batchState.busy)batchSetBusy(true,'Pauzë për kufirin falas; leximet vazhdojnë së shpejti…');else if(importState.busy)setImportBusy(true,'Pauzë për kufirin falas; leximi vazhdon së shpejti…');await batchWait(pause,signal)}if(signal.aborted)throw new DOMException('aborted','AbortError');cloudLastAiStart=Date.now();
 const response=await fetch(`${cloud.config.url}/functions/v1/biobes-read-form`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cloud.config.key,Authorization:`Bearer ${data.session.access_token}`},body,signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok){let result={};try{result=await response.json()}catch(_){}throw new Error(str(result.error||'Shërbimi Gemini nuk u përgjigj.',300))}
 return await response.json();
}
cloudStart();
