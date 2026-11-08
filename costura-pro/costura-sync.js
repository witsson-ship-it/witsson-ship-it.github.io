(function(){
'use strict';
/* Costura Pro — cópia completa na nuvem (2026-11-06), mesmo desenho do Racha.
   Reusa o pareamento do Racha (esta página é da mesma origem): se o Racha está
   conectado, o Costura guarda uma cópia completa (trabalhos + fotos) no servidor
   e a baixa sozinho ao abrir, caso o Chrome tenha limpo os dados.
   - Nunca sobrescreve dados existentes; nunca envia cópia sem trabalhos por cima
     de uma cópia com trabalhos (o servidor também bloqueia).
   - Sem pareamento do Racha, o app funciona normal e nada é enviado. */
var REC='costura-pro:records:v1', META='costura_cloud_meta_v1', NOTICE='costura_restored_notice_v1';
var WORKER='https://racha-sync-test.witsson.workers.dev';
var HAD_RECORDS_AT_BOOT;
try{HAD_RECORDS_AT_BOOT=!!localStorage.getItem(REC)}catch(e){HAD_RECORDS_AT_BOOT=true}
var enc=new TextEncoder();
function b64(bytes){bytes=new Uint8Array(bytes);var s='';for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function sha256hex(str){return crypto.subtle.digest('SHA-256',enc.encode(str)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')})}
function meta(){var m=null;try{m=JSON.parse(localStorage.getItem(META)||'null')}catch(e){}if(!m||typeof m.rev!=='number')m={rev:1,lastHash:'',lastPushAt:0};return m}
function saveMeta(m){try{localStorage.setItem(META,JSON.stringify(m))}catch(e){}}
function rachaMeta(){try{return JSON.parse(localStorage.getItem('racha_sync_meta_v2')||'null')}catch(e){return null}}
function pairedDevice(){var m=rachaMeta();return m&&m.mode==='paired'&&typeof m.device==='string'?m.device:null}

/* --- transporte assinado (mesmas chaves do Racha) --- */
function openKeys(){return new Promise(function(res,rej){var r=indexedDB.open('racha_device_keys_v2',1);r.onupgradeneeded=function(){r.result.createObjectStore('keys')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function getKeys(){return openKeys().then(function(db){return new Promise(function(res,rej){
 var q=db.transaction('keys').objectStore('keys').get('device');
 q.onsuccess=function(){var done=function(v){db.close();res(v)};
  if(q.result){done(q.result);return}
  crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']).then(function(pair){
   var tx=db.transaction('keys','readwrite');tx.objectStore('keys').add(pair,'device');tx.oncomplete=function(){done(pair)};tx.onerror=function(){done(pair)};
  }).catch(function(){done(null)});
 };
 q.onerror=function(){db.close();rej(q.error)};
})})}
function send(path,payload){
 if(['/costura/backup','/costura/backup/read'].indexOf(path)<0)throw Error('wrong-path');
 return getKeys().then(function(pair){
  if(!pair)throw Error('no-keys');
  var body=JSON.stringify(payload),ts=String(Date.now()),nonce=b64(crypto.getRandomValues(new Uint8Array(24)));
  return crypto.subtle.digest('SHA-256',enc.encode(body)).then(function(h){
   return crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,enc.encode(['POST',path,ts,nonce,b64(h)].join('\n')));
  }).then(function(sig){
   return fetch(WORKER+path,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','x-racha-time':ts,'x-racha-nonce':nonce,'x-racha-signature':b64(sig)},body:body,signal:AbortSignal.timeout(25000)});
  }).then(function(r){return r.json().then(function(v){if(!r.ok)throw Error(v.error||'falhou');return v})});
 });
}

/* --- fotos (IndexedDB do app) --- */
function openPhotos(){return new Promise(function(res,rej){var r=indexedDB.open('costura-pro',1);r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains('photos'))r.result.createObjectStore('photos')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function collectPhotos(){return openPhotos().then(function(db){return new Promise(function(res,rej){
 var out=[],q=db.transaction('photos','readonly').objectStore('photos').openCursor();
 q.onsuccess=function(){var c=q.result;if(!c){db.close();res(out);return}
  var v=c.value;if(typeof v==='string'&&v.indexOf('data:image/')===0&&v.length<3000000)out.push({id:String(c.key),data:v});
  c.continue()};
 q.onerror=function(){db.close();rej(q.error)};
})})}
function photosFingerprint(ps){var n=0;for(var i=0;i<ps.length;i++)n+=ps[i].data.length;return ps.length+':'+n}

/* --- interface discreta --- */
var chipEl=null;
function chip(txt){try{
 if(!chipEl){chipEl=document.createElement('div');chipEl.style.cssText='position:fixed;bottom:64px;right:6px;z-index:2147483000;font:11px/1.4 system-ui,sans-serif;color:#666;background:rgba(255,255,255,.88);border:1px solid #e3d5cb;border-radius:8px;padding:2px 8px;pointer-events:none';document.body.appendChild(chipEl)}
 chipEl.textContent=txt;
}catch(e){}}
function banner(txt,ok){try{
 var b=document.createElement('div');b.style.cssText='position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:2147483001;font:13px/1.5 system-ui,sans-serif;color:#fff;background:'+(ok?'#2e7d32':'#b3540e')+';border-radius:10px;padding:8px 14px;box-shadow:0 2px 8px rgba(0,0,0,.25);max-width:92vw;text-align:center';
 b.textContent=txt;b.onclick=function(){b.remove()};document.body.appendChild(b);setTimeout(function(){try{b.remove()}catch(e){}},ok?9000:15000);
}catch(e){}}

/* --- envio da cópia --- */
var busy=false,timer=null,lastFp='';
function currentRaw(){try{return localStorage.getItem(REC)}catch(e){return null}}
function fingerprint(raw,ps){return (raw||'').length+':'+photosFingerprint(ps)}
function validateRecordsRaw(raw){
 if(typeof raw!=='string'||!raw||raw.length>9000000)return null;
 var x;try{x=JSON.parse(raw)}catch(e){return null}
 if(!Array.isArray(x))return null;
 /* mesma conferência do app: cada trabalho tem id, cliente, cor e pago */
 if(!x.every(function(t){return t&&typeof t.id==='string'&&typeof t.client==='string'&&typeof t.bicoColor==='string'&&typeof t.paid==='boolean'&&[t.abas,t.costAba,t.price,t.createdAt].every(function(n){return typeof n==='number'&&isFinite(n)})}))return null;
 return x;
}
function schedulePush(){clearTimeout(timer);timer=setTimeout(push,5000)}
function tick(){
 var device=pairedDevice();if(!device)return;
 var raw=currentRaw();if(!validateRecordsRaw(raw))return; /* sem trabalhos locais: nunca empurra por cima da nuvem */
 collectPhotos().then(function(ps){
  var fp=fingerprint(raw,ps);
  if(fp!==lastFp){lastFp=fp;var m=meta();m.rev++;saveMeta(m);schedulePush()}
 }).catch(function(){});
}
function push(){
 if(busy||document.visibilityState==='hidden'||!navigator.onLine)return;
 var device=pairedDevice();if(!device)return;
 var raw=currentRaw();var parsed=validateRecordsRaw(raw);if(!parsed)return;
 collectPhotos().then(function(ps){
  var payload={format:'costura-pro-cloud-backup',version:1,savedAt:new Date().toISOString(),recordsRaw:raw,photos:ps};
  var data=JSON.stringify(payload),skippedPhotos=false;
  if(data.length>9000000){data=JSON.stringify({format:payload.format,version:1,savedAt:payload.savedAt,recordsRaw:raw,photos:[],photosSkipped:true});skippedPhotos=true}
  return sha256hex(data).then(function(hash){
   var m=meta();
   if(m.lastHash===hash){chip('☁ Cópia na nuvem em dia');return null}
   busy=true;
   return send('/costura/backup',{protocol:1,device:device,rev:m.rev,hash:hash,data:data,at:new Date().toISOString()}).then(function(r){
    if(!r||r.ok!==true)throw Error('not-confirmed');
    var m2=meta();m2.lastHash=hash;m2.lastPushAt=Date.now();saveMeta(m2);
    chip('☁ Cópia na nuvem '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+(skippedPhotos?' (sem fotos)':''));
   }).catch(function(){chip('☁ Cópia não confirmada. Dados seguem no aparelho.')}).finally(function(){busy=false});
  });
 }).catch(function(){});
}

/* --- restauração automática --- */
function restorePhotos(photos){return openPhotos().then(function(db){return new Promise(function(res,rej){
 var tx=db.transaction('photos','readwrite'),st=tx.objectStore('photos');
 st.clear();
 photos.forEach(function(p){st.put(p.data,p.id)});
 tx.oncomplete=function(){db.close();res(true)};
 tx.onerror=function(){db.close();rej(tx.error)};
 tx.onabort=function(){db.close();rej(tx.error||Error('abort'))};
})})}
function maybeAutoRestore(){
 if(HAD_RECORDS_AT_BOOT)return;
 var device=pairedDevice();if(!device)return;
 chip('☁ Verificando cópia na nuvem...');
 send('/costura/backup/read',{device:device}).then(function(r){
  if(!r||r.ok!==true||typeof r.data!=='string'||!r.data){chip('☁ Sem cópia na nuvem ainda');return}
  return sha256hex(r.data).then(function(h){
   if(r.hash&&h!==r.hash)throw Error('hash');
   var x=JSON.parse(r.data);
   if(!x||x.format!=='costura-pro-cloud-backup'||x.version!==1||typeof x.recordsRaw!=='string'||!validateRecordsRaw(x.recordsRaw)||!Array.isArray(x.photos))throw Error('formato');
   if(x.photos.some(function(p){return !p||typeof p.id!=='string'||typeof p.data!=='string'||p.data.indexOf('data:image/')!==0}))throw Error('fotos');
   if(currentRaw())return; /* alguém gravou enquanto baixava: não sobrescreve */
   localStorage.setItem(REC,x.recordsRaw);
   return restorePhotos(x.photos).then(function(){
    try{sessionStorage.setItem(NOTICE,'1')}catch(e){}
    location.reload();
   });
  }).catch(function(){chip('☁ Cópia da nuvem não conferiu. Nada foi alterado.')});
 }).catch(function(){chip('☁ Não consegui verificar a nuvem. Abra de novo com internet.')});
}

/* --- boot --- */
function boot(){
 try{if(sessionStorage.getItem(NOTICE)){sessionStorage.removeItem(NOTICE);banner('Trabalhos e fotos recuperados da nuvem ✅',true)}}catch(e){}
 if(!pairedDevice())return; /* sem Racha conectado, o app segue normal, só local */
 maybeAutoRestore();
 chip('☁ Nuvem ativa');
 setInterval(tick,4000);
 window.addEventListener('online',function(){tick();push()});
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){tick()}});
 tick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
