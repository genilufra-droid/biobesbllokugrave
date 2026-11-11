'use strict';
// Separate in-memory auth client: do not overwrite a normal BioBes session.
(async function(){
 const status=document.getElementById('status'),form=document.getElementById('reset-form'),button=document.getElementById('submit');
 const password=document.getElementById('password'),confirm=document.getElementById('confirm');
 function message(text){status.textContent=text;status.hidden=false}
 // Remove tokens/errors from the address before any asynchronous work or navigation.
 const params=new URLSearchParams(window.location.hash.slice(1));
 history.replaceState(null,'',window.location.pathname);
 const access=params.get('access_token'),refresh=params.get('refresh_token');
 if(params.get('type')!=='recovery'||!access||!refresh){message('Lidhja është e pavlefshme, ka skaduar ose është përdorur. Kërko një lidhje të re te faqja e hyrjes.');return}
 const c=window.BIOBES_CLOUD_CONFIG||{};
 try{
  const u=new URL(String(c.supabaseUrl||''));if(u.protocol!=='https:'||u.hostname!=='abbgynbwfnrtemunyfzc.supabase.co'||u.port||u.username||u.password||(u.pathname!=='/'&&u.pathname!=='')||u.search||u.hash||!c.supabasePublishableKey||String(c.supabasePublishableKey).startsWith('sb_secret_'))throw new Error('config');
  const client=window.supabase.createClient(u.origin,String(c.supabasePublishableKey),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}});
  const result=await client.auth.setSession({access_token:access,refresh_token:refresh});
  if(result.error||!result.data?.session)throw new Error('session');
  form.hidden=false;message('Lidhja u verifikua. Vendos një fjalëkalim të ri.');password.focus();
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(button.disabled)return;
   if(password.value.length<12){message('Fjalëkalimi duhet të ketë të paktën 12 karaktere.');return}
   if(password.value!==confirm.value){message('Fjalëkalimet nuk përputhen.');return}
   button.disabled=true;
   try{
    const {error}=await client.auth.updateUser({password:password.value});if(error)throw error;
    password.value='';confirm.value='';form.hidden=true;message('Fjalëkalimi u ndryshua. Tani mund të hysh në BioBes.');
    try{await client.auth.signOut({scope:'local'})}catch(_){}
   }catch(_){message('Fjalëkalimi nuk u ndryshua. Lidhja mund të ketë skaduar ose lidhja me internetin mund të ketë dështuar. Kërko një lidhje të re nëse problemi vazhdon.')}
   finally{button.disabled=false}
  });
 }catch(_){message('Lidhja nuk u verifikua. Mund të ketë skaduar ose të jetë përdorur. Kërko një lidhje të re te faqja e hyrjes.')}
})();
