/* Racha: aba "Custo" - Meu custo por dia (aprovado pelo Witsson em 19/10/2026, com ajustes: sem nome do passageiro, preco do posto automatico).
   So mostra o custo real dele (gasolina + pneus), com e sem passageiro.
   NAO mexe em prices_single/prices_full (R$15/R$30). Oleo fora da conta (pedido dele).
   Numeros aprovados: 11,4 km/l medido, pneu R$1.039,60 / 25 mil km (estimativa, pneu Itaro),
   79,3 km/dia com passageiro, ~76 km sem. Preco da gasolina vem do UserConfig
   (atualizado sozinho toda semana pelo preco ANP do posto); fallback R$6,79. */
(function(){
var APP_ID="6a752f1eb41dba10c59dbb33";
var CONSUMO=11.4, KM_COM=79.3, KM_SEM=76, PNEU_JOGO=1039.60, PNEU_KM=25000, DIARIA=30;
var FUEL_FALLBACK=6.79, fuelPrice=FUEL_FALLBACK;
var ACTIVE_CLS="text-blue-400",INACTIVE_CLS="text-slate-400 hover:text-slate-200",PILL="bg-blue-500/15";
var overlay=null,myBtn=null,observer=null;
var ICON='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/><path d="M8 19h8"/></svg>';
function brl(n){return (n==null?0:n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function r2(n){return Math.round(n*100)/100}
function custoKm(){return r2(fuelPrice/CONSUMO)}

function injectStyle(){
  if(document.getElementById("rc-style"))return;
  var st=document.createElement("style");st.id="rc-style";
  st.textContent=[
 "#rc-overlay{position:fixed;inset:0;z-index:40;background:#0b1220;overflow-y:auto;padding:70px 14px 150px;font-family:Inter,system-ui,sans-serif;overscroll-behavior:contain}",
 "#rc-overlay .rc-mask{position:fixed;top:0;left:0;right:0;height:70px;background:#0b1220;z-index:2}",
 "#rc-overlay .rc-card{background:#101b30;border:1px solid #1e293b;border-radius:18px;padding:16px;margin:0 auto 14px;max-width:560px}",
 "#rc-overlay h2{color:#f1f5f9;font-size:19px;font-weight:800;margin:0;letter-spacing:-.02em}",
 "#rc-overlay .rc-sub{color:#8496ac;font-size:12px;margin:3px auto 14px;max-width:560px}",
 "#rc-overlay .rc-h{color:#8496ac;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}",
 "#rc-overlay .rc-row{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;font-size:15px}",
 "#rc-overlay .rc-lbl{color:#c6d3e0}",
 "#rc-overlay .rc-det{font-size:11px;color:#667f8f;margin-top:1px}",
 "#rc-overlay .rc-val{color:#f1f5f9;font-weight:700;white-space:nowrap;padding-left:12px}",
 "#rc-overlay .rc-neg .rc-val{color:#34d399}",
 "#rc-overlay .rc-sep{border-top:1px dashed #2a3d55;margin-top:6px;padding-top:11px}",
 "#rc-overlay .rc-pocket .rc-lbl{color:#f1f5f9;font-weight:800}",
 "#rc-overlay .rc-pocket .rc-val{color:#34d399;font-size:19px;font-weight:800}",
 "#rc-overlay .rc-hero{background:rgba(52,211,153,.10);border:1px solid #34d399;border-radius:16px;padding:16px;text-align:center;margin:0 auto 14px;max-width:560px}",
 "#rc-overlay .rc-hero .rc-lbl{font-size:12px;color:#c6d3e0}",
 "#rc-overlay .rc-hero .rc-big{font-size:26px;font-weight:800;color:#34d399;letter-spacing:-.02em}",
 "#rc-overlay .rc-hero .rc-det{font-size:11px;color:#8496ac;margin-top:3px}",
 "#rc-overlay .rc-note{color:#667f8f;font-size:11px;text-align:center;margin-top:8px;max-width:560px;margin-left:auto;margin-right:auto;line-height:1.5}"
  ].join("\n");
  document.head.appendChild(st);
}

function render(){
  var ck=custoKm();
  var gasC=r2(KM_COM*ck), pnC=r2(KM_COM*PNEU_JOGO/PNEU_KM), totC=r2(gasC+pnC), bolC=r2(totC-DIARIA);
  var gasS=r2(KM_SEM*ck), pnS=r2(KM_SEM*PNEU_JOGO/PNEU_KM), totS=r2(gasS+pnS);
  var fp=fuelPrice.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  var cks=ck.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  return '<div class="rc-mask"></div><div style="max-width:560px;margin:0 auto"><h2 style="margin-bottom:14px">Meu custo por dia</h2></div>'
  +'<div class="rc-card"><div class="rc-h">Dia COM passageiro ('+String(KM_COM).replace(".",",")+' km)</div>'
  +'<div class="rc-row"><div><div class="rc-lbl">Gasolina</div><div class="rc-det">'+String(KM_COM).replace(".",",")+' km × '+cks+'/km · 11,4 km/l · '+fp+' no posto (ANP)</div></div><div class="rc-val">'+brl(gasC)+'</div></div>'
  +'<div class="rc-row"><div><div class="rc-lbl">Pneus</div><div class="rc-det">jogo R$ 1.039,60 · 25 mil km estimados*</div></div><div class="rc-val">'+brl(pnC)+'</div></div>'
  +'<div class="rc-row rc-sep"><div class="rc-lbl">Custo do dia</div><div class="rc-val">'+brl(totC)+'</div></div>'
  +'<div class="rc-row rc-neg"><div><div class="rc-lbl">Diária que o passageiro paga</div></div><div class="rc-val">− '+brl(DIARIA)+'</div></div>'
  +'<div class="rc-row rc-sep rc-pocket"><div class="rc-lbl">Sai do seu bolso</div><div class="rc-val">'+brl(bolC)+'</div></div></div>'
  +'<div class="rc-card"><div class="rc-h">Dia SEM passageiro (~'+KM_SEM+' km, rota direta)</div>'
  +'<div class="rc-row"><div><div class="rc-lbl">Gasolina</div><div class="rc-det">~'+KM_SEM+' km × '+cks+'/km</div></div><div class="rc-val">'+brl(gasS)+'</div></div>'
  +'<div class="rc-row"><div><div class="rc-lbl">Pneus</div></div><div class="rc-val">'+brl(pnS)+'</div></div>'
  +'<div class="rc-row rc-sep rc-pocket"><div class="rc-lbl">Sai do seu bolso</div><div class="rc-val">'+brl(totS)+'</div></div></div>'
  +'<div class="rc-hero"><div class="rc-lbl">Cada dia com passageiro cobre</div><div class="rc-big">'+brl(DIARIA)+'</div><div class="rc-det">do seu custo de gasolina e pneu</div></div>'
  +'<p class="rc-note">*Pneu Itaro: sem km oficial; donos relatam de 25 a 50 mil km — usei 25 mil (cautela). O preço da gasolina atualiza sozinho toda semana (ANP).</p>';
}

async function loadConfig(){
  try{
    var r=await fetch("/api/apps/"+APP_ID+"/entities/UserConfig");
    var cfgs=await r.json();
    var cfg=Array.isArray(cfgs)?cfgs[0]:null;
    if(cfg&&cfg.fuelPrice>3&&cfg.fuelPrice<15){
      fuelPrice=cfg.fuelPrice;
      if(overlay&&overlay.style.display==="block")overlay.innerHTML=render();
    }
  }catch(e){}
}

function showOverlay(){
  injectStyle();
  if(!overlay){
    overlay=document.createElement("div");overlay.id="rc-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML=render();
  overlay.scrollTop=0;
  overlay.style.display="block";
  document.documentElement.style.overflow="hidden";document.body.style.overflow="hidden";
  loadConfig();
}
function hideOverlay(){if(overlay)overlay.style.display="none";if(!window.__rachaUnlock)window.__rachaUnlock=function(){if(document.getElementById("rb-overlay")&&document.getElementById("rb-overlay").style.display==="block")return;if(document.getElementById("rc-overlay")&&document.getElementById("rc-overlay").style.display==="block")return;if(document.querySelector("#rm-drawer.on"))return;document.documentElement.style.overflow="";document.body.style.overflow=""};window.__rachaUnlock()}

function setActive(on){
  if(!myBtn)return;
  var pill=myBtn.firstElementChild;
  if(on){
    myBtn.className=myBtn.className.replace(INACTIVE_CLS,ACTIVE_CLS);
    if(pill&&pill.className.indexOf(PILL)<0)pill.className+=" "+PILL;
    var nav=myBtn.closest("nav");
    if(nav){Array.prototype.forEach.call(nav.querySelectorAll("button"),function(b){
      if(b!==myBtn&&b.className.indexOf(ACTIVE_CLS)>=0){
        b.className=b.className.replace(ACTIVE_CLS,INACTIVE_CLS);
        var p=b.firstElementChild;
        if(p)p.className=p.className.replace(" "+PILL,"").replace(PILL,"");
      }
    })}
  }else{
    myBtn.className=myBtn.className.replace(ACTIVE_CLS,INACTIVE_CLS);
    if(pill)pill.className=pill.className.replace(" "+PILL,"").replace(PILL,"");
  }
}

function ensureButton(){
  var nav=document.querySelector("#root nav");
  if(!nav)return;
  var holder=nav.querySelector("div");
  if(!holder)return;
  if(document.getElementById("rc-tab"))return;
  var ref=holder.querySelector("button");
  if(!ref)return;
  var b=ref.cloneNode(true);
  b.id="rc-tab";
  b.className=b.className.replace(ACTIVE_CLS,INACTIVE_CLS);
  var pill=b.firstElementChild;
  if(pill){pill.className=pill.className.replace(" "+PILL,"").replace(PILL,"");pill.innerHTML=ICON}
  var lbl=b.querySelector("span:last-of-type")||b.lastElementChild;
  if(lbl&&lbl.tagName==="SPAN")lbl.textContent="Custo";else b.appendChild(document.createTextNode("Custo"));
  b.addEventListener("click",function(ev){
    ev.preventDefault();ev.stopPropagation();
    if(overlay&&overlay.style.display==="block"){hideOverlay();setActive(false)}
    else{showOverlay();setActive(true)}
  },true);
  var btns=Array.prototype.slice.call(holder.querySelectorAll("button"));
  var postos=btns.find(function(x){return /postos/i.test(x.textContent)});
  if(postos)holder.insertBefore(b,postos);else holder.appendChild(b);
  myBtn=b;
  nav.addEventListener("click",function(ev){
    var t=ev.target.closest?ev.target.closest("button"):null;
    if(t&&t!==myBtn){hideOverlay();setActive(false)}
  },true);
}

function start(){
  ensureButton();
  if(observer)return;
  observer=new MutationObserver(function(){ensureButton()});
  var root=document.getElementById("root");
  if(root)observer.observe(root,{subtree:true,childList:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
