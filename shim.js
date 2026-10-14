(function(){
var APP="6a752f1eb41dba10c59dbb33",KEY="racha_db_v1",SEED="racha_seeded_v1";
var db=null,lastRaw=null;try{if(!localStorage.getItem("base44_access_token"))localStorage.setItem("base44_access_token","local-copy")}catch(e){}
function load(){if(db)return db;try{lastRaw=localStorage.getItem(KEY);db=JSON.parse(lastRaw||"null")}catch(e){}return db}
function guard(){if(localStorage.getItem(KEY)!==lastRaw)throw Error("Outra aba alterou os dados. Reabra esta aba antes de salvar.")}
function save(){guard();const raw=JSON.stringify(db);localStorage.setItem(KEY,raw);lastRaw=raw;window.dispatchEvent(new Event("racha:db-saved"))}
/* URL database import intentionally disabled in this candidate. */
window.RachaLocalBridge={
 snapshot:function(){return JSON.parse(JSON.stringify(load()))},
 applyCommands:function(commands){
  if(!Array.isArray(commands)||commands.length>100)throw Error('Lista inválida');
  load();guard();const before=JSON.stringify(load()),next=JSON.parse(before),results={};
  for(const c of commands)results[c.id]=RachaCommandCore.apply(next,c);
  // Persist backup first. If either write fails, do not change the live closure.
  localStorage.setItem('racha_backup_before_command_v2',before);
  const raw=JSON.stringify(next);localStorage.setItem(KEY,raw);lastRaw=raw;db=next;
  window.dispatchEvent(new Event('racha:db-saved'));return results;
 }
};
var ready=(async function(){
  if(load())return;
  db={UserConfig:[{id:rid(),prices_single:15,prices_full:30,defaultDistance:60.9,carConsumption:13,fuelPrice:6.59,autoPilot:false,autoPilotMode:"full",loanPin:"123",lastAutoRun:null,currentMileage:0,maintenanceRatePerKm:0,useRealConsumption:true,created_date:now(),updated_date:now()}]};save();
})();
function rid(){return Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function(b){return b.toString(16).padStart(2,"0")}).join("")}
function now(){return new Date().toISOString().replace("Z","000")}
function match(rec,q){for(var k in q){if(rec[k]!==q[k])return false}return true}
async function handle(method,url,body){if(!navigator.locks)throw Error("Atualize o navegador antes de alterar os dados");return navigator.locks.request("racha-db-exclusive-v2",()=>handleInternal(method,url,body))}
async function handleInternal(method,url,body){
  await ready;guard();
  var u=new URL(url,location.origin),p=u.pathname;
  var m=p.match(/\/api\/apps\/[^/]+\/entities\/([^/]+)(?:\/([^/]+))?$/);
  if(m){
    var ent=m[1],id=m[2];
    if(ent==="User")return [200,{id:"local-user",email:"witsson@local",full_name:"Witsson",role:"admin"}];
    db[ent]=db[ent]||[];var arr=db[ent];
    if(method==="GET"&&!id){
      var out=arr.slice(),q=u.searchParams.get("q");
      if(q){try{var qq=JSON.parse(q);out=out.filter(function(r){return match(r,qq)})}catch(e){}}
      var s=u.searchParams.get("sort");
      if(s){var dir=s[0]==="-"?-1:1,f=s.replace(/^[-+]/,"");out.sort(function(a,b){return a[f]>b[f]?dir:a[f]<b[f]?-dir:0})}
      var sk=+u.searchParams.get("skip")||0,lm=+u.searchParams.get("limit")||0;
      out=out.slice(sk,lm?sk+lm:undefined);return [200,out];
    }
    if(method==="GET"&&id==="count")return [200,{count:arr.length}];
    if(method==="GET"){var r=arr.find(function(x){return x.id===id});return r?[200,r]:[404,{message:"Not found"}]}
    if(method==="POST"&&id==="bulk"){var res=(body||[]).map(function(b){var r=Object.assign({},b,{id:rid(),created_date:now(),updated_date:now(),is_sample:false});arr.push(r);return r});save();return [200,res]}
    if(method==="POST"){var r=Object.assign({},body,{id:rid(),created_date:now(),updated_date:now(),is_sample:false});arr.push(r);save();return [200,r]}
    if(method==="PUT"){var i=arr.findIndex(function(x){return x.id===id});if(i<0)return [404,{message:"Not found"}];arr[i]=Object.assign({},arr[i],body,{updated_date:now()});save();return [200,arr[i]]}
    if(method==="DELETE"&&id){var n=arr.length;db[ent]=arr.filter(function(x){return x.id!==id});save();return [200,{success:db[ent].length<n}]}
    return [200,{}];
  }
  if(/public-settings/.test(p))return [200,{id:APP,public_settings:"public_without_login"}];
  if(/\/api\/(app-logs|apps\/[^/]+\/analytics)/.test(p))return [200,{}];
  return null;
}
var OX=window.XMLHttpRequest;
function FakeX(){this._real=null;this.readyState=0;this.status=0;this.responseText="";this.response="";this._h={};this._l={};this.upload={addEventListener:function(){}};}
var origOpen=OX.prototype.open;
function isApi(u){try{return /\/api\//.test(new URL(u,location.origin).pathname)&&new URL(u,location.origin).origin===location.origin}catch(e){return false}}
window.XMLHttpRequest=function(){
  var real=new OX(),fake=null,self=this;
  var o={open:function(m,u){this._m=m;this._u=u;if(isApi(u)){fake=this}else{real.open.apply(real,arguments)}},
  };
  var x={readyState:0,status:0,statusText:"",responseText:"",response:"",responseURL:"",timeout:0,withCredentials:false,responseType:"",_hd:{},_ls:{},
   open:function(m,u){this._m=m;this._u=u;this._api=isApi(u);if(!this._api){this._real=new OX();this._real.open.apply(this._real,arguments);this._sync()}},
   _sync:function(){var r=this._real,t=this;["readystatechange","load","loadend","error","abort","timeout","progress"].forEach(function(ev){r.addEventListener(ev,function(e){["readyState","status","statusText","responseText","response","responseURL"].forEach(function(k){try{t[k]=r[k]}catch(e2){}});t._fire(ev,e)})});},
   _fire:function(ev,e){var t=this;var h=t["on"+ev];if(h)try{h.call(t,e||{type:ev})}catch(err){console.error(err)}(t._ls[ev]||[]).forEach(function(f){try{f.call(t,e||{type:ev})}catch(err){console.error(err)}})},
   addEventListener:function(ev,f){(this._ls[ev]=this._ls[ev]||[]).push(f)},
   removeEventListener:function(ev,f){this._ls[ev]=(this._ls[ev]||[]).filter(function(g){return g!==f})},
   setRequestHeader:function(k,v){if(this._real)this._real.setRequestHeader(k,v);else this._hd[k]=v},
   getAllResponseHeaders:function(){return this._real?this._real.getAllResponseHeaders():"content-type: application/json\r\n"},
   getResponseHeader:function(k){return this._real?this._real.getResponseHeader(k):(/content-type/i.test(k)?"application/json":null)},
   overrideMimeType:function(){},
   abort:function(){if(this._real)this._real.abort()},
   send:function(b){
     var t=this;
     if(this._real){this._real.withCredentials=this.withCredentials;this._real.responseType=this.responseType;this._real.timeout=this.timeout;return this._real.send(b)}
     var body=null;try{body=b?JSON.parse(b):null}catch(e){}
     handle(t._m.toUpperCase(),t._u,body).then(function(r){
       r=r||[404,{message:"Not available"}];
       t.status=r[0];t.statusText=r[0]===200?"OK":"Error";t.readyState=4;
       t.responseText=JSON.stringify(r[1]);t.response=(t.responseType==="json")?r[1]:t.responseText;t.responseURL=new URL(t._u,location.origin).href;
       t._fire("readystatechange");t._fire("load");t._fire("loadend");
     });
   }
  };
  return x;
};
var of=window.fetch;
window.fetch=function(u,opts){
  var url=typeof u==="string"?u:u.url;
  if(isApi(url)){
    var m=((opts&&opts.method)||(typeof u!=="string"&&u.method)||"GET").toUpperCase(),b=null;
    try{b=opts&&opts.body?JSON.parse(opts.body):null}catch(e){}
    return handle(m,url,b).then(function(r){r=r||[404,{}];return new Response(JSON.stringify(r[1]),{status:r[0],headers:{"content-type":"application/json"}})});
  }
  return of.apply(this,arguments);
};
window.WebSocket=function(){throw new Error("offline")};
})();
