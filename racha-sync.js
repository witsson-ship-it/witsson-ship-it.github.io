(function(root){
'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),idOK=x=>typeof x==='string'&&/^[-a-zA-Z0-9_]{8,100}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function day(s){const d=new Date(s);if(!Number.isFinite(+d))return null;return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function fingerprint(c){return c.action==='delete'?JSON.stringify(['delete',c.target,c.date,c.type]):JSON.stringify([c.date,c.type])}
function apply(db,c){
 if(!c||!idOK(c.id)||!validDate(c.date)||!['Ida','Volta','Diária'].includes(c.type)||c.action&&!['create','delete'].includes(c.action)||c.action==='delete'&&(!idOK(c.target)||c.target===c.id))return {status:'inválido'};
 db._sync=db._sync||{};db._sync.commands=db._sync.commands||{};
 const fp=fingerprint(c),p=own(db._sync.commands,c.id)?db._sync.commands[c.id]:null;
 if(p)return p.fingerprint===fp?p:{status:'revisar',reason:'ID repetido com conteúdo diferente'};
 const save=r=>(db._sync.commands[c.id]={...r,fingerprint:fp});
 const rides=db.Ride||[];
 if(c.action==='delete'){
  const original=own(db._sync.commands,c.target)?db._sync.commands[c.target]:null;
  if(!original||original.status!=='aplicado'||original.rideId!=='cmd_'+c.target||!original.createdRide||original.fingerprint!==JSON.stringify([c.date,c.type]))return save({status:'revisar',reason:'Não há prova local de criação pelo assistente'});
  const matches=rides.filter(r=>r.id===original.rideId),r=matches[0];
  if(matches.length!==1||r.type!=={Ida:'Apenas Ida',Volta:'Apenas Retorno','Diária':'Diária Completa'}[c.type]||r.date!==c.date+'T12:00:00-03:00'||r.amount!==(c.type==='Diária'?30:15)||r.paid!==false||r.category!=='fuel'||r.isAuto!==false||original.createdRide&&JSON.stringify(r)!==original.createdRide)return save({status:'revisar',reason:'Carona ausente ou alterada no celular. Nada foi apagado.'});
  db._sync.deleted=db._sync.deleted||{};if(own(db._sync.deleted,c.target))return save({status:'revisar',reason:'Exclusão já registrada'});
  db._sync.deleted[c.target]={ride:JSON.parse(JSON.stringify(r)),commandId:c.id,at:new Date().toISOString()};db.Ride=rides.filter(x=>x.id!==r.id);
  return save({status:'aplicado',rideId:r.id,target:c.target,action:'delete',at:new Date().toISOString()});
 }
 if(rides.some(r=>!day(r.date)))return save({status:'revisar',reason:'Há data local inválida; conferir os dados'});
 if(rides.some(r=>day(r.date)===c.date))return save({status:'revisar',reason:'Já existe carona nessa data. Nada foi alterado.'});
 const now=new Date().toISOString(),r={id:'cmd_'+c.id,type:{Ida:'Apenas Ida',Volta:'Apenas Retorno','Diária':'Diária Completa'}[c.type],amount:c.type==='Diária'?30:15,date:c.date+'T12:00:00-03:00',paid:false,status:'pending',category:'fuel',isAuto:false,is_sample:false,created_date:now,updated_date:now};
 if(c.test===true){r.assistant_test=true;r.notes='TESTE DO ASSISTENTE - apagar após conferir'}
 db.Ride=rides.concat([r]);return save({status:'aplicado',rideId:r.id,at:now,createdRide:JSON.stringify(r)});
}
function publicRides(db){return (db.Ride||[]).filter(r=>{if(r?.category==='loan'&&r.type==='Empréstimo'){if(typeof r.id!=='string'||!day(r.date)||!Number.isFinite(r.amount)||r.amount<0||typeof r.paid!=='boolean')throw Error('Empréstimo local precisa de revisão');return false}return true}).map(r=>{
 if(!r||typeof r.id!=='string'||!day(r.date)||!['Apenas Ida','Apenas Retorno','Diária Completa'].includes(r.type)||r.amount!==(r.type==='Diária Completa'?30:15)||typeof r.paid!=='boolean')throw Error('Dados locais precisam de revisão');
 return {id:r.id,date:r.date,type:r.type,amount:r.amount,paid:r.paid};
})}
root.RachaCommandCore={apply,day,validDate,publicRides};if(typeof module!=='undefined')module.exports=root.RachaCommandCore;
})(typeof window==='undefined'?globalThis:window);

(function(root){'use strict';
function inspect(raw){
 if(typeof raw!=='string'||raw.length>10000000)throw Error('backup-size');
 const x=JSON.parse(raw);if(!x||typeof x!=='object'||Array.isArray(x)||!Array.isArray(x.Ride||[])||!Array.isArray(x.UserConfig||[]))throw Error('backup-format');
 if((x.Ride||[]).some(r=>!r||typeof r.id!=='string'))throw Error('backup-rides');
 return {rides:(x.Ride||[]).length,configs:(x.UserConfig||[]).length,bytes:new TextEncoder().encode(raw).length};
}
async function digest(raw){inspect(raw);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
root.RachaBackupCore={inspect,digest};if(typeof module!=='undefined')module.exports=root.RachaBackupCore;
})(typeof window==='undefined'?globalThis:window);

(function(){'use strict';
// Preview starts disconnected. No remote endpoint or credential is embedded.
const META='racha_sync_meta_v2';let busy=false,timer,lastAttempt=0,staleTab=false;
const read=()=>JSON.parse(localStorage.getItem(META)||'null');
function meta(){let m=read();if(!m){m={device:crypto.randomUUID().replaceAll('-',''),rev:1,mode:'disconnected'};localStorage.setItem(META,JSON.stringify(m))}return m}
const status=t=>{const e=document.getElementById('racha-status');if(e)e.textContent=t;const notice=document.getElementById('racha-sync-error');if(notice){notice.hidden=!/não confirmada|ainda não confirmada|Outra aba/i.test(t);notice.textContent=notice.hidden?'':t.startsWith('Outra aba')?t:'Cópia não confirmada. Seus dados estão no celular.'}};
function dirty(){const m=meta();m.rev++;localStorage.setItem(META,JSON.stringify(m));status('Salvo no celular.');clearTimeout(timer);timer=setTimeout(sync,2500)}
async function sync(){if(staleTab){status('Outra aba alterou os dados. Reabra esta aba antes de continuar.');return}if(!navigator.locks){status('Cópia não confirmada. Reabra em um navegador atualizado.');return}return navigator.locks.request('racha-db-exclusive-v2',{ifAvailable:true},lock=>{if(lock)return syncLocked();clearTimeout(timer);timer=setTimeout(sync,1500)})}
async function syncLocked(){
 const m=meta();if(m.mode!=='paired'){status('PRÉVIA: conexão desligada. Dados ficam no celular.');return}
 if(busy||document.visibilityState==='hidden'||!navigator.onLine)return;
 if(Date.now()-lastAttempt<5000){clearTimeout(timer);timer=setTimeout(sync,5000-(Date.now()-lastAttempt));return;}lastAttempt=Date.now();busy=true;
 try{
  // transport is supplied only after explicit device pairing. No production URL in preview.
  if(!window.RachaSignedTransport)throw Error('not-paired');
  const db=RachaLocalBridge.snapshot(),payload={protocol:3,device:m.device,rev:m.rev,rides:RachaCommandCore.publicRides(db),acks:db._sync?.commands||{}};
  const result=await RachaSignedTransport.send('/sync',payload);
  if(!result.ok||result.rev!==m.rev)throw Error('not-confirmed');
  const fresh=meta();fresh.last=Date.now();fresh.sheetConfirmed=result.sheetConfirmed===true;localStorage.setItem(META,JSON.stringify(fresh));
  status(result.sheetConfirmed?'Cópia confirmada na planilha.':'Salvo no servidor. Planilha ainda não confirmada.');
  if(result.commands?.length){RachaLocalBridge.applyCommands(result.commands);status('Comandos conferidos. Atualize o painel para ver os resultados.');location.reload()}
  }catch{const fresh=meta();fresh.sheetConfirmed=false;localStorage.setItem(META,JSON.stringify(fresh));status('Cópia não confirmada. Seus dados continuam no celular.')}finally{
  busy=false;
  const fresh=meta();if(fresh.mode==='paired'&&navigator.onLine&&document.visibilityState==='visible'&&(!fresh.sheetConfirmed||fresh.rev!==m.rev)){clearTimeout(timer);timer=setTimeout(sync,30000)}
 }

}
function backup(){
 const raw=localStorage.getItem('racha_db_v1');if(!raw)throw Error('no-db');const data=JSON.parse(raw);if(!data||!Array.isArray(data.Ride||[]))throw Error('invalid-db');
 const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='racha-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Backup solicitado. Confira o arquivo em Downloads. Ele contém seus dados privados; não o compartilhe.');
 // A click is not proof of a completed download. Never mark backup verified here.
}
function ui(){meta();
 const p=document.createElement('details');p.id='racha-integration';p.open=false;p.innerHTML='<summary>☁ Planilha privada</summary><p id="racha-status">Conexão desligada. Dados ficam no celular.</p><p>O app continua funcionando sem internet. Caronas do assistente só chegam ao abrir o app com internet.</p><div><button id="racha-backup">Salvar backup do celular</button><button id="racha-sync">Tentar sincronizar</button></div><small>Exclusão segura: só carona criada pelo assistente nesta versão, sem alteração ou pagamento. A cópia anterior fica guardada no celular.</small><small>Ida R$15 · Volta R$15 · Diária R$30.</small>';
 const holder=document.createElement('div');holder.id='racha-sync-storage';holder.hidden=true;holder.appendChild(p);document.body.appendChild(holder);
 const notice=document.createElement('div');notice.id='racha-sync-error';notice.hidden=true;notice.setAttribute('role','status');document.body.appendChild(notice);
 const mount=()=>{let slot=document.getElementById('racha-settings-slot');if(!slot){const h=Array.from(document.querySelectorAll('h3')).find(h=>h.textContent.includes('Ajustes do Sistema'));const form=h?.parentElement?.parentElement?.querySelector('form');if(form){slot=document.createElement('div');slot.id='racha-settings-slot';form.prepend(slot)}}if(slot&&p.parentElement!==slot)slot.appendChild(p);else if(!slot&&!holder.contains(p))holder.appendChild(p)};
 new MutationObserver(mount).observe(document.getElementById('root'),{subtree:true,childList:true});mount();
 const style=document.createElement('style');style.textContent='#racha-sync-error{position:fixed;bottom:90px;left:12px;right:12px;z-index:55;padding:8px 10px;border-radius:9px;background:#fff4d6;color:#6a4600;font:12px/1.4 system-ui}#racha-sync-error[hidden]{display:none}#racha-integration{margin:0 0 16px;padding:14px;border-radius:14px;border:1px solid #29594c;background:#102a23;color:#d1fae5;font:13px/1.45 system-ui}#racha-integration summary{font-weight:700}#racha-integration p{margin:10px 0}#racha-integration div{display:flex;gap:8px;flex-wrap:wrap}#racha-integration button{padding:11px;border:0;border-radius:9px;background:#34d399;color:#073626;font-weight:700}#racha-integration small{display:block;margin-top:10px;color:#a7c8bc}';document.head.appendChild(style);
 p.querySelectorAll('button').forEach(b=>b.type='button');
 document.getElementById('racha-backup').onclick=()=>{try{backup()}catch{status('Não consegui preparar o backup. Nada foi apagado.')}};document.getElementById('racha-sync').onclick=sync;sync();
}
window.addEventListener('storage',e=>{if(e.key==='racha_db_v1'){staleTab=true;clearTimeout(timer);status('Outra aba alterou os dados. Reabra esta aba antes de continuar.')}});window.addEventListener('racha:db-saved',dirty);window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});window.addEventListener('load',async()=>{if(window.RachaOwnerPairing){try{await RachaOwnerPairing.restore()}catch{}}ui()});
})();

(function(root){'use strict';
const enc=new TextEncoder(),b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('racha_device_keys_v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function keys(){const db=await open();try{let saved=await new Promise((r,j)=>{const q=db.transaction('keys').objectStore('keys').get('device');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});if(saved)return saved;const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);await new Promise((r,j)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').add(pair,'device');tx.oncomplete=r;tx.onerror=()=>j(tx.error)});return pair}finally{db.close()}}
function make(pair){return{async send(path,x){
 if(!['/pair/start','/pair/status','/sync','/snapshot'].includes(path))throw Error('wrong-path');
 const body=JSON.stringify(x),ts=String(Date.now()),nonce=b64(crypto.getRandomValues(new Uint8Array(24))),hash=b64(await crypto.subtle.digest('SHA-256',enc.encode(body))),sig=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,enc.encode(['POST',path,ts,nonce,hash].join('\n'))));
 const r=await fetch('https://racha-sync-test.witsson.workers.dev'+path,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','x-racha-time':ts,'x-racha-nonce':nonce,'x-racha-signature':sig},body,signal:AbortSignal.timeout(20000)});
 const v=await r.json();if(!r.ok)throw Error(v.error||'pairing-failed');return v;
}}}
function local(){const m=JSON.parse(localStorage.getItem('racha_sync_meta_v2')||'null');if(!m)throw Error('missing-device');return m}
async function finish(t,r){if(r.state==='denied')localStorage.removeItem('racha_pairing_pending_v2');if(r.state==='paired'){const m=local();m.mode='paired';localStorage.setItem('racha_sync_meta_v2',JSON.stringify(m));root.RachaSignedTransport=t;localStorage.removeItem('racha_pairing_pending_v2')}return r}
root.RachaOwnerPairing={
 async start(){const k=await keys(),m=local(),t=make(k),publicKey=await crypto.subtle.exportKey('jwk',k.publicKey),r=await t.send('/pair/start',{device:m.device,publicKey});if(r.state==='waiting')localStorage.setItem('racha_pairing_pending_v2',JSON.stringify({requestId:r.requestId,fingerprint:r.fingerprint,expires:r.expires}));return finish(t,r)},
 async check(){const p=JSON.parse(localStorage.getItem('racha_pairing_pending_v2')||'null');if(!p)throw Error('no-pending');if(p.expires<Date.now()){localStorage.removeItem('racha_pairing_pending_v2');throw Error('pairing-expired')}const t=make(await keys());return finish(t,await t.send('/pair/status',{device:local().device,requestId:p.requestId}))},
 async restore(){if(local().mode!=='paired')return false;root.RachaSignedTransport=make(await keys());return true}
};
})(window);

(function(){'use strict';
let expected=null,verified=null;
function show(){
 const panel=document.getElementById('racha-integration');if(!panel)return;
 panel.innerHTML='<summary>☁ Planilha privada</summary><p class="setup-note">Seus dados continuam neste celular até você conectar.</p><section><h3>1. Guardar seus dados</h3><p>Salve uma cópia antes de conectar. Nada é apagado ou substituído.</p><button id="setup-download">Salvar backup</button><p id="setup-backup-result" role="status">Backup ainda não conferido.</p><p id="setup-backup-age" class="setup-note"></p><label class="setup-file">Conferir arquivo salvo<span id="setup-filename">Nenhum arquivo escolhido</span><input id="setup-file" type="file" accept=".json,application/json"></label><small>O arquivo é conferido neste aparelho. Não é enviado para a planilha.</small></section><section><h3>2. Conectar este celular</h3><p>Depois do backup, este aparelho poderá enviar caronas e receber comandos ao abrir o app com internet.</p><button id="setup-pair" disabled>Conectar celular</button><p id="setup-pair-result" role="status">Primeiro salve e confira o backup.</p></section><small>Ida R$15 · Volta R$15 · Diária R$30.<br>Sem internet, seus registros continuam no celular.</small>';
 panel.querySelectorAll('button').forEach(b=>b.type='button');
 /* P5: estado conectado + idade do backup + restaurar da planilha */
 try{
  const meta=JSON.parse(localStorage.getItem('racha_sync_meta_v2')||'null');
  const st=Number(localStorage.getItem('racha_backup_ok_at')||0),age=document.getElementById('setup-backup-age');
  if(age)age.textContent=(!st||Date.now()-st>604800000)?'⚠ Backup antigo ou ainda não conferido neste aparelho. Salve e confira um novo backup.':'Último backup conferido neste aparelho: '+new Date(st).toLocaleDateString('pt-BR')+'.';
  if(meta&&meta.mode==='paired'){
   const pb=document.getElementById('setup-pair');pb.disabled=false;pb.textContent='Sincronizar';pb.onclick=()=>location.reload();
   document.getElementById('setup-pair-result').textContent='Este aparelho está conectado.';
   const localRides=(JSON.parse(localStorage.getItem('racha_db_v1')||'{}').Ride||[]).filter(r=>r&&r.category==='fuel');
   if(localRides.length===0&&window.RachaSheetRestore){
    const sec=document.createElement('section');sec.innerHTML='<h3>Recuperar caronas da planilha</h3><p>Suas caronas de combustível têm uma cópia na planilha privada.</p><button id="sheet-restore-check" type="button">Verificar cópia na planilha</button><p id="sheet-restore-result" role="status"></p>';panel.appendChild(sec);
    document.getElementById('sheet-restore-check').onclick=()=>RachaSheetRestore.checkAndOffer();
   }
  }
 }catch(e){console.error('setup-extras',e)}
 const style=document.createElement('style');style.textContent='#racha-integration section{padding:12px 0;border-top:1px solid #29594c}#racha-integration h3{font-size:15px;margin:0 0 8px}#racha-integration .setup-note{font-size:12px;color:#a7c8bc}#racha-integration button:disabled{background:#24463c;color:#97b5aa}#racha-integration .setup-file{display:block;padding:12px;border:1px dashed #5c8c7c;border-radius:9px;cursor:pointer}#setup-file{position:absolute;width:1px;height:1px;opacity:0}#setup-filename{display:block;font-size:12px;margin-top:6px;color:#a7c8bc;overflow-wrap:anywhere}#racha-integration small{line-height:1.5}';document.head.appendChild(style);
 const result=t=>document.getElementById('setup-backup-result').textContent=t;
 document.getElementById('setup-download').onclick=async()=>{
  try{
   const raw=localStorage.getItem('racha_db_v1');expected={hash:await RachaBackupCore.digest(raw),...RachaBackupCore.inspect(raw)};verified=null;
   const u=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='racha-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
   result('Download solicitado. Escolha abaixo o arquivo salvo para conferir.');
  }catch{result('Não consegui preparar o backup. Seus dados não foram apagados.')}
 };
 document.getElementById('setup-pair').onclick=async()=>{
  const out=document.getElementById('setup-pair-result');
  try{
   if(!verified||await RachaBackupCore.digest(localStorage.getItem('racha_db_v1'))!==verified.hash)throw Error('backup-changed');
   const pending=localStorage.getItem('racha_pairing_pending_v2');
   const r=pending?await RachaOwnerPairing.check():await RachaOwnerPairing.start();
   if(r.state==='paired'){out.textContent='Este aparelho foi conectado. Use Sincronizar para confirmar a cópia.';document.getElementById('setup-pair').textContent='Sincronizar';document.getElementById('setup-pair').onclick=()=>location.reload();}
   else if(r.state==='denied'){out.textContent='Solicitação recusada. Nada foi enviado.';document.getElementById('setup-pair').textContent='Solicitar nova conexão';}
   else{out.textContent='Aguardando sua aprovação com o assistente. Solicitação: '+r.requestId+' · Identificação do aparelho: '+r.fingerprint;document.getElementById('setup-pair').textContent='Verificar aprovação';}
  }catch(e){console.error('pairing',e);out.textContent=e.message==='backup-changed'?'Os dados mudaram. Salve e confira um novo backup.':e.message==='pairing-expired'?'A solicitação expirou. Toque novamente para solicitar a conexão.':'Não foi possível conectar agora. Seus dados continuam no celular.'}
 };
 document.getElementById('setup-file').onchange=async e=>{
  try{
   const f=e.target.files[0];document.getElementById('setup-filename').textContent=f?.name||'Nenhum arquivo escolhido';if(!f||!expected)throw Error('save-first');if(f.size>10000000)throw Error('size');
   const raw=await f.text(),hash=await RachaBackupCore.digest(raw),current=await RachaBackupCore.digest(localStorage.getItem('racha_db_v1'));
   if(hash!==expected.hash||hash!==current)throw Error('mismatch');verified={hash,...RachaBackupCore.inspect(raw)};
   result('Backup conferido neste aparelho: '+verified.rides+' registro(s). Nenhum dado enviado.');try{localStorage.setItem('racha_backup_ok_at',String(Date.now()))}catch(e){}
   document.getElementById('setup-pair-result').textContent='Backup conferido. A conexão de teste está desligada; aguarde a revisão antes de ativar.';
   // This preview cannot pair. Final enablement requires a provisioned secure pairing flow.
   document.getElementById('setup-pair').disabled=!window.RachaOwnerPairing;
   document.getElementById('setup-pair-result').textContent=window.RachaOwnerPairing?'Backup conferido. Você pode solicitar a conexão deste aparelho.':'Backup conferido. A conexão de teste está desligada; aguarde a revisão antes de ativar.';
  }catch{verified=null;document.getElementById('setup-pair').disabled=true;result('Esse arquivo não corresponde aos dados atuais. Salve um novo backup.');document.getElementById('setup-pair-result').textContent='Conexão bloqueada até conferir o backup.'}
 };
}
window.addEventListener('load',()=>{const wait=()=>{if(!document.getElementById('racha-integration'))return setTimeout(wait,30);show()};wait()});
})();

(function(root){'use strict';
function validate(raw){const summary=RachaBackupCore.inspect(raw),data=JSON.parse(raw);RachaCommandCore.publicRides(data);const ids=new Set();for(const r of data.Ride||[]){if(ids.has(r.id))throw Error('duplicate-ride');ids.add(r.id)}return {summary,data}}
async function prepare(raw,current){const incoming=validate(raw),prior=validate(current);return {incomingHash:await RachaBackupCore.digest(raw),currentHash:await RachaBackupCore.digest(current),incoming:incoming.summary,current:prior.summary}}
async function apply(raw,currentBackup,reviewed){const current=localStorage.getItem('racha_db_v1');if(!reviewed||reviewed.incomingHash!==await RachaBackupCore.digest(raw)||reviewed.currentHash!==await RachaBackupCore.digest(current)||reviewed.currentHash!==await RachaBackupCore.digest(currentBackup))throw Error('restore-changed');validate(raw);if(!navigator.locks)throw Error('locks-required');return navigator.locks.request('racha-db-exclusive-v2',()=>{
 if(localStorage.getItem('racha_db_v1')!==current)throw Error('restore-changed');
 // Do not reconnect automatically after a restore. Confirm the recovered state first.
 const m=JSON.parse(localStorage.getItem('racha_sync_meta_v2')||'null');if(m){m.rev++;m.mode='disconnected';m.sheetConfirmed=false;localStorage.setItem('racha_sync_meta_v2',JSON.stringify(m))}
 localStorage.setItem('racha_backup_before_restore_v2',current);localStorage.setItem('racha_db_v1',raw);return {ok:true,reloadRequired:true,disconnected:true};
})}
root.RachaRestoreCore={validate,prepare,apply};
})(window);

(function(){'use strict';let incoming=null,currentBackup=null,reviewed=null;
function install(){const panel=document.getElementById('racha-integration');if(!panel)return setTimeout(install,40);const p=document.createElement('details');p.id='racha-restore';p.innerHTML='<summary>Recuperar um backup</summary><p>Use só se precisar recuperar seus dados. A recuperação troca os dados deste aparelho e deixa a conexão desligada até você conferir.</p><label class="restore-file">1. Escolher backup para recuperar<span id="restore-incoming-name">Nenhum arquivo escolhido</span><input id="restore-incoming" type="file" accept=".json,application/json"></label><p>Antes de trocar, salve uma cópia dos dados atuais.</p><button id="restore-download" type="button">Salvar dados atuais</button><label class="restore-file">2. Conferir arquivo atual salvo<span id="restore-current-name">Nenhum arquivo escolhido</span><input id="restore-current" type="file" accept=".json,application/json"></label><p id="restore-review" role="status">Nenhum arquivo conferido.</p><label><input id="restore-consent" type="checkbox"> Quero trocar os dados deste aparelho pelo backup conferido.</label><button id="restore-apply" type="button" disabled>Recuperar e reabrir</button><p id="restore-result" role="status"></p>';panel.appendChild(p);
const style=document.createElement('style');style.textContent='#racha-restore{border-top:1px solid #29594c;padding-top:12px;margin-top:16px}#racha-restore summary{font-size:14px}#racha-restore input[type=file]{position:absolute;width:1px;height:1px;opacity:0}#racha-restore .restore-file span{display:block;font-size:12px;color:#a7c8bc;margin-top:8px;overflow-wrap:anywhere}#racha-restore .restore-file{display:block;padding:10px;border:1px dashed #5c8c7c;border-radius:9px;margin:10px 0}#restore-apply{margin-top:12px}#restore-review{overflow-wrap:anywhere}';document.head.appendChild(style);
const out=t=>document.getElementById('restore-result').textContent=t,enable=()=>document.getElementById('restore-apply').disabled=!reviewed||!document.getElementById('restore-consent').checked;
async function preview(){reviewed=null;enable();if(!incoming||!currentBackup)return;try{reviewed=await RachaRestoreCore.prepare(incoming,currentBackup);if(await RachaBackupCore.digest(localStorage.getItem('racha_db_v1'))!==reviewed.currentHash)throw Error('current-changed');document.getElementById('restore-review').textContent='Dados atuais: '+reviewed.current.rides+' registro(s). Backup escolhido: '+reviewed.incoming.rides+' registro(s). A conexão ficará desligada.';out('Arquivos conferidos. Nada foi trocado.');enable()}catch{out('Não consegui conferir esses arquivos. Seus dados continuam iguais.')}}
for(const [id,which] of [['restore-incoming','incoming'],['restore-current','current']])document.getElementById(id).onchange=async e=>{reviewed=null;enable();try{const f=e.target.files[0];document.getElementById(id+'-name').textContent=f?.name||'Nenhum arquivo escolhido';if(!f||f.size>10000000)throw Error('size');const raw=await f.text();RachaRestoreCore.validate(raw);if(which==='incoming')incoming=raw;else currentBackup=raw;await preview()}catch{if(which==='incoming')incoming=null;else currentBackup=null;out('Arquivo inválido. Nada foi trocado.')}};
document.getElementById('restore-consent').onchange=enable;
document.getElementById('restore-download').onclick=()=>{try{const raw=localStorage.getItem('racha_db_v1');RachaRestoreCore.validate(raw);const u=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='racha-antes-da-recuperacao-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);out('Salve o arquivo e escolha essa cópia em "Conferir arquivo atual salvo".')}catch{out('Não consegui preparar a cópia. Nada foi trocado.')}};
document.getElementById('restore-apply').onclick=async()=>{try{if(!document.getElementById('restore-consent').checked)throw Error('consent');await RachaRestoreCore.apply(incoming,currentBackup,reviewed);location.reload()}catch{reviewed=null;enable();out('A recuperação foi bloqueada. Confira os arquivos novamente. Nenhum dado foi enviado.')}};
}
window.addEventListener('load',install);
})();
/* Restauração das caronas de combustível a partir da cópia no servidor (espelho da planilha).
   Só é oferecida quando o aparelho está conectado E sem caronas de combustível locais.
   Empréstimos e configurações NÃO estão no espelho: esses só voltam pelo backup em arquivo. */
(function(root){'use strict';
function toRide(x){
 const now=new Date().toISOString();
 return {id:x.id,type:x.type,amount:x.amount,date:x.date,paid:x.paid===true,status:'pending',category:'fuel',isAuto:false,is_sample:false,created_date:now,updated_date:now};
}
function buildDb(rawCurrent,rides){
 const db=JSON.parse(rawCurrent);
 const loans=(db.Ride||[]).filter(r=>r&&r.category==='loan');
 db.Ride=loans.concat(rides.map(toRide));
 return JSON.stringify(db);
}
async function checkAndOffer(){
 const out=document.getElementById('sheet-restore-result');
 try{
  if(!root.RachaSignedTransport&&!(await root.RachaOwnerPairing.restore()))throw Error('not-paired');
  const meta=JSON.parse(localStorage.getItem('racha_sync_meta_v2'));
  out.textContent='Consultando a planilha...';
  const r=await root.RachaSignedTransport.send('/snapshot',{device:meta.device});
  const rides=Array.isArray(r.rides)?r.rides:[];
  if(rides.length===0){out.textContent='A planilha não tem caronas guardadas. Se você tinha registros, use "Recuperar um backup" com o arquivo salvo.';return}
  const pend=rides.filter(x=>x.paid!==true).reduce((a,x)=>a+x.amount,0);
  out.innerHTML='Encontrei '+rides.length+' carona(s) na planilha'+(pend>0?' (R$ '+pend.toFixed(2).replace('.',',')+' a receber)':'')+'. ';
  const b=document.createElement('button');b.type='button';b.id='sheet-restore-apply';b.textContent='Restaurar no celular';
  out.appendChild(b);
  b.onclick=async()=>{
   try{
    b.disabled=true;
    const raw=localStorage.getItem('racha_db_v1'),next=buildDb(raw,rides);
    if(!navigator.locks)throw Error('locks');
    await navigator.locks.request('racha-db-exclusive-v2',()=>{
     if(localStorage.getItem('racha_db_v1')!==raw)throw Error('changed');
     localStorage.setItem('racha_backup_before_restore_v2',raw);
     localStorage.setItem('racha_db_v1',next);
     const m=JSON.parse(localStorage.getItem('racha_sync_meta_v2'));m.rev++;m.sheetConfirmed=false;localStorage.setItem('racha_sync_meta_v2',JSON.stringify(m));
    });
    out.textContent='Restaurado. Reabrindo...';setTimeout(()=>location.reload(),400);
   }catch(e){b.disabled=false;out.textContent=e.message==='changed'?'Os dados mudaram durante a restauração. Nada foi trocado.':'Não consegui restaurar agora. Seus dados continuam iguais.'}
  };
 }catch(e){console.error('sheet-restore',e);out.textContent='Não consegui consultar a planilha agora. Tente de novo com internet.'}
}
root.RachaSheetRestore={checkAndOffer,buildDb,toRide};if(typeof module!=='undefined')module.exports={buildDb,toRide};
})(typeof window==='undefined'?globalThis:window);
