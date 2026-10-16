/* Racha: aviso de preco do posto + custo/km com preco real (ANP semanal). Ideias 2 e 3 aprovadas pelo Witsson em 16/10/2026. */
(function(){
var POSTOS_URL="https://raw.githubusercontent.com/witsson-ship-it/precos-anp-apucarana/main/postos.json";
var SEEN_KEY="racha_posto_aviso_v1";
var APP_ID="6a752f1eb41dba10c59dbb33";
var STATION=/brasil sul ii/i;
function brl(n){return (n==null?0:n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
async function run(){
  var r;
  try{r=await fetch(POSTOS_URL,{cache:"no-store"})}catch(e){return}
  if(!r||!r.ok)return;
  var data;try{data=await r.json()}catch(e){return}
  var posto=(data.postos||[]).find(function(p){return STATION.test(p.nome||"")||STATION.test(p.razao||"")});
  if(!posto||!posto.preco)return;

  /* Ideia 3: custo por km e estimativas do GPS passam a usar o preco real do posto (atualiza sozinho toda semana). Nao mexe em prices_single/prices_full (R$15/R$30). */
  try{
    var cfgRes=await fetch("/api/apps/"+APP_ID+"/entities/UserConfig");
    var cfgs=await cfgRes.json();
    var cfg=Array.isArray(cfgs)?cfgs[0]:null;
    if(cfg&&cfg.id&&cfg.fuelPrice!==posto.preco){
      await fetch("/api/apps/"+APP_ID+"/entities/UserConfig/"+cfg.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({fuelPrice:posto.preco})});
    }
  }catch(e){}

  /* Ideia 2: aviso quando o preco do posto mudar (no maximo 1 aviso por semana, quando a ANP publicar) */
  var seen=null;try{seen=JSON.parse(localStorage.getItem(SEEN_KEY)||"null")}catch(e){}
  if(seen&&seen.preco===posto.preco&&seen.coleta===posto.coleta)return;
  if(seen&&seen.preco!==posto.preco){showBanner(seen.preco,posto.preco,posto.coleta,posto.desatualizado)}
  if(!seen){try{localStorage.setItem(SEEN_KEY,JSON.stringify({preco:posto.preco,coleta:posto.coleta}))}catch(e){}}
}
function showBanner(oldP,newP,coleta,stale){
  if(document.getElementById("racha-posto-aviso"))return;
  var up=newP>oldP;
  var el=document.createElement("div");
  el.id="racha-posto-aviso";
  el.style.cssText="position:fixed;left:12px;right:12px;top:12px;z-index:99999;background:#1e293b;border:2px solid #10b981;border-radius:16px;padding:14px 44px 14px 16px;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)";
  var coletaTxt=coleta?String(coleta).split("-").reverse().join("/"):"";
  el.innerHTML='<div style="font-weight:800;font-size:15px;margin-bottom:4px">Preco do seu posto '+(up?"subiu":"caiu")+'</div>'
    +'<div style="font-size:14px;color:#cbd5e1">Posto Brasil Sul II: <b style="color:#f8fafc">'+brl(oldP)+' -> '+brl(newP)+'</b>'+(coletaTxt?' <span style="color:#94a3b8">(pesquisa ANP de '+coletaTxt+(stale?', semana anterior':'')+')</span>':'')+'</div>'
    +'<div style="font-size:12px;color:#94a3b8;margin-top:4px">Custo por km atualizado com o novo preco. Os R$ 15 e R$ 30 nao mudam.</div>';
  var x=document.createElement("button");
  x.textContent="Fechar";
  x.style.cssText="position:absolute;top:8px;right:10px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#cbd5e1;font-size:12px;padding:4px 10px;cursor:pointer";
  x.onclick=function(){el.remove();try{localStorage.setItem(SEEN_KEY,JSON.stringify({preco:newP,coleta:coleta}))}catch(e){}};
  el.appendChild(x);
  document.body.appendChild(el);
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){run()})}else{run()}
})();
