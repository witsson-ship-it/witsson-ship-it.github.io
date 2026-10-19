/* Racha: aba "Buscar" - postos por cidade (ANP semanal + cadastro oficial + precos informados pelo usuario).
   Nao mexe em prices_single/prices_full (R$15/R$30). So leitura de precos. */
(function(){
var DATA_URL="https://raw.githubusercontent.com/witsson-ship-it/precos-anp-apucarana/main/cidades.json";
var LS_PRECOS="racha_buscar_precos_v1";
var LS_CACHE="racha_buscar_cache_v1";
var ACTIVE_CLS="text-blue-400",INACTIVE_CLS="text-slate-400 hover:text-slate-200",PILL="bg-blue-500/15";
var data=null,overlay=null,myBtn=null,observer=null;

function norm(s){return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim()}
function brl(n){return (n==null?0:n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function myPrices(){try{return JSON.parse(localStorage.getItem(LS_PRECOS)||"{}")}catch(e){return{}}}
function savePrice(k,v){var m=myPrices();m[k]={preco:v,quando:new Date().toLocaleDateString("pt-BR")};try{localStorage.setItem(LS_PRECOS,JSON.stringify(m))}catch(e){}}
function fmtColeta(c){return (c||"").split("-").reverse().join("/")}

function injectStyle(){
  if(document.getElementById("rb-style"))return;
  var st=document.createElement("style");st.id="rb-style";
  st.textContent=[
 "#rb-overlay{position:fixed;inset:0;z-index:40;background:#0b1220;overflow-y:auto;padding:16px 14px 150px;font-family:Inter,system-ui,sans-serif}",
 "#rb-overlay .rb-card{background:#101b30;border:1px solid #1e293b;border-radius:18px;padding:16px;margin-bottom:14px;max-width:560px;margin-left:auto;margin-right:auto}",
 "#rb-overlay h2{color:#fff;font-size:16.5px;margin:0}",
 "#rb-overlay .rb-sub{color:#64748b;font-size:11.5px;margin:3px 0 12px}",
 "#rb-overlay .rb-sb{display:flex;gap:8px}",
 "#rb-overlay .rb-sb input{flex:1;background:#0b1220;border:1px solid #334155;border-radius:12px;color:#e2e8f0;padding:11px 13px;font-size:15px;outline:none}",
 "#rb-overlay .rb-sb button{background:#16a34a;color:#fff;border:none;border-radius:12px;padding:0 16px;font-size:14.5px;font-weight:700}",
 "#rb-overlay .rb-chips{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}",
 "#rb-overlay .rb-chip{font-size:11px;border-radius:999px;padding:5px 11px}",
 "#rb-overlay .rb-green{background:rgba(22,163,74,.15);color:#4ade80;border:1px solid rgba(74,222,128,.35)}",
 "#rb-overlay .rb-gray{background:rgba(148,163,184,.12);color:#94a3b8;border:1px solid rgba(148,163,184,.3)}",
 "#rb-overlay .rb-sec{color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:4px auto 10px;max-width:560px}",
 "#rb-overlay .rb-posto{background:#fff;border-radius:18px;padding:15px 15px 13px;margin:0 auto 11px;max-width:560px}",
 "#rb-overlay .rb-badges{display:flex;gap:6px;margin-bottom:5px}",
 "#rb-overlay .rb-min{background:#dcfce7;color:#15803d;font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 9px}",
 "#rb-overlay .rb-rank{color:#94a3b8;font-size:11px;padding-top:2px}",
 "#rb-overlay .rb-posto h3{color:#0f172a;font-size:15px;margin:0}",
 "#rb-overlay .rb-addr{color:#64748b;font-size:12px;margin-top:3px}",
 "#rb-overlay .rb-pr{display:flex;justify-content:space-between;align-items:center;margin-top:11px;border-top:1px solid #f1f5f9;padding-top:10px;gap:8px}",
 "#rb-overlay .rb-price{color:#0f172a;font-size:24px;font-weight:800}",
 "#rb-overlay .rb-price small{font-size:12px;font-weight:400;color:#64748b}",
 "#rb-overlay .rb-var{font-size:10.5px;border-radius:999px;padding:4px 9px;background:#f1f5f9;color:#64748b;white-space:nowrap}",
 "#rb-overlay .rb-up{background:#fee2e2!important;color:#b91c1c!important}",
 "#rb-overlay .rb-down{background:#dcfce7!important;color:#15803d!important}",
 "#rb-overlay .rb-coleta{color:#94a3b8;font-size:11px;margin-top:6px}",
 "#rb-overlay .rb-warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);border-radius:14px;padding:12px 14px;color:#fbbf24;font-size:12px;line-height:1.5;margin:0 auto 14px;max-width:560px}",
 "#rb-overlay .rb-info{background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.35);border-radius:14px;padding:12px 14px;color:#93c5fd;font-size:12px;line-height:1.5;margin:0 auto 14px;max-width:560px}",
 "#rb-overlay .rb-mp{display:block;width:100%;max-width:560px;margin:0 auto 14px;background:#16a34a;color:#fff;border:none;border-radius:14px;padding:13px;font-size:14px;font-weight:700;text-align:center;text-decoration:none;box-sizing:border-box}",
 "#rb-overlay .rb-pbtn{background:#0ea5e9;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:700;white-space:nowrap}",
 "#rb-overlay .rb-pform{display:flex;gap:6px;margin-top:10px}",
 "#rb-overlay .rb-pform input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;font-size:14px;color:#0f172a;min-width:0}",
 "#rb-overlay .rb-pform button{background:#16a34a;color:#fff;border:none;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700}",
 "#rb-overlay .rb-own{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;margin-top:10px;font-size:11.5px;color:#15803d}",
 "#rb-overlay .rb-sug{display:flex;flex-direction:column;gap:7px;margin-top:12px}",
 "#rb-overlay .rb-sug button{background:#101b30;border:1px solid #334155;color:#e2e8f0;border-radius:12px;padding:10px 12px;font-size:13px;text-align:left}",
 "#rb-overlay .rb-sug button b{color:#4ade80}",
 "#rb-overlay .rb-empty{color:#e2e8f0;font-size:14px;line-height:1.6}"
  ].join("\n");
  document.head.appendChild(st);
}

function varChip(v){
  if(!v)return "";
  if(v.indexOf("subiu")===0)return '<span class="rb-var rb-up">▲ subiu</span>';
  if(v.indexOf("baixou")===0||v.indexOf("caiu")===0)return '<span class="rb-var rb-down">▼ baixou</span>';
  if(v==="novo")return '<span class="rb-var">🆕 1ª vez na pesquisa</span>';
  return '<span class="rb-var">— Sem alteração</span>';
}
function cardAnp(p,i){
  return '<div class="rb-posto"><div class="rb-badges">'+(i===0?'<span class="rb-min">MENOR PREÇO</span>':"")+'<span class="rb-rank">#'+(i+1)+"</span></div>"
   +"<h3>"+esc(p.nome)+"</h3>"+'<p class="rb-addr">📍 '+esc(p.endereco)+(p.bairro?" - "+esc(p.bairro):"")+"</p>"
   +'<div class="rb-pr"><span class="rb-price">'+brl(p.preco)+" <small>/litro</small></span>"+varChip(p.variacao)+"</div>"
   +'<p class="rb-coleta">Coleta ANP: '+esc(fmtColeta(p.coleta))+" · "+esc(p.bandeira)+(p.desatualizado?" · preço de semana anterior":"")+"</p></div>";
}
function cardCad(key,p,i){
  var m=myPrices()[key+"|"+p.cnpj];
  var pr;
  if(m){
    pr='<div class="rb-pr"><span class="rb-price">'+brl(m.preco)+' <small>/litro</small></span><span class="rb-var rb-down">✍️ você</span></div>'
     +'<div class="rb-own">Preço informado por você em '+esc(m.quando)+'. Toque em Informar preço para atualizar.</div>'
     +'<div class="rb-pform" id="rb-f'+i+'" style="display:none"><input id="rb-v'+i+'" inputmode="decimal" placeholder="Ex.: 6,29"><button data-rb-save="'+i+'" data-rb-key="'+esc(key)+'" data-rb-cnpj="'+esc(p.cnpj)+'">Salvar</button></div>'
     +'<div style="margin-top:8px"><button class="rb-pbtn" data-rb-form="'+i+'">Informar preço</button></div>';
  }else{
    pr='<div class="rb-pr"><span style="color:#94a3b8;font-size:13px">Sem preço ainda</span><button class="rb-pbtn" data-rb-form="'+i+'">Informar preço</button></div>'
     +'<div class="rb-pform" id="rb-f'+i+'" style="display:none"><input id="rb-v'+i+'" inputmode="decimal" placeholder="Ex.: 6,29"><button data-rb-save="'+i+'" data-rb-key="'+esc(key)+'" data-rb-cnpj="'+esc(p.cnpj)+'">Salvar</button></div>';
  }
  return '<div class="rb-posto"><div class="rb-badges"><span class="rb-rank">#'+(i+1)+"</span></div><h3>"+esc(p.nome)+"</h3>"
   +'<p class="rb-addr">📍 '+esc(p.endereco)+(p.bairro?" - "+esc(p.bairro):"")+"</p>"+pr
   +'<p class="rb-coleta">'+esc(p.bandeira)+" · cadastro oficial ANP</p></div>";
}

function cityButton(key,c){
  var extra=c.postos.length+" postos";
  if(c.fonte){extra=c.postos.length+" postos oficiais · preços por você"}
  else{var min=Math.min.apply(null,c.postos.map(function(p){return p.preco}));extra=c.postos.length+" postos · a partir de "+brl(min)}
  return '<button data-rb-go="'+esc(key)+'">🏪 <b>'+esc(c.label)+"</b> · "+extra+"</button>";
}
function renderAnp(key){
  var c=data.cidades[key];
  document.getElementById("rb-meta").innerHTML='<span class="rb-chip rb-green">📅 Atualizado em '+esc(data.atualizado_label||"")+'</span><span class="rb-chip rb-gray">Semana '+esc(data.semana_label||"")+"</span>";
  document.getElementById("rb-out").innerHTML=
    '<p class="rb-sec">Postos em '+esc(c.label)+"-"+esc(c.uf)+" · pesquisa semanal da ANP</p>"
    +c.postos.map(cardAnp).join("")
    +'<div class="rb-warn">⚠️ Preços da pesquisa semanal da ANP; podem estar alguns dias atrasados. Confirme no posto antes de abastecer.</div>';
}
function renderCad(key){
  var c=data.cadastro[key];
  document.getElementById("rb-meta").innerHTML='<span class="rb-chip rb-gray">'+esc(c.fonte||"Cadastro oficial de postos da ANP")+"</span>";
  document.getElementById("rb-out").innerHTML=
    '<div class="rb-info">ℹ️ A pesquisa semanal da ANP não cobre <b>'+esc(c.label)+'</b>. Abaixo, os postos oficiais da cidade (cadastro ANP). O preço você informa quando passar no posto - ou veja no app Menor Preço do Nota Paraná.</div>'
    +'<a class="rb-mp" href="https://menorpreco.notaparana.pr.gov.br/" target="_blank" rel="noopener">💲 Ver preços no Menor Preço (Nota Paraná)</a>'
    +'<p class="rb-sec">Postos em '+esc(c.label)+"-"+esc(c.uf)+"</p>"
    +c.postos.map(function(p,i){return cardCad(key,p,i)}).join("")
    +'<div class="rb-warn">⚠️ Preços marcados como "você" foram informados por você e não vêm de fonte oficial.</div>';
}
function buscar(){
  var q=norm(document.getElementById("rb-q").value);
  if(!q||!data)return;
  function match(k,label){var a=norm(k),b=norm(label);return a===q||b===q||a.indexOf(q)===0||b.indexOf(q)===0}
  var ka=Object.keys(data.cidades||{}).find(function(k){return match(k,data.cidades[k].label)});
  if(ka)return renderAnp(ka);
  var kc=Object.keys(data.cadastro||{}).find(function(k){return match(k,data.cadastro[k].label)});
  if(kc)return renderCad(kc);
  /* nao achou: sugestoes */
  function score(k,label){var a=norm(k),b=norm(label);if(a.indexOf(q)>=0||b.indexOf(q)>=0)return 0;if(a[0]===q[0])return 1;return 2}
  var all=Object.keys(data.cidades||{}).map(function(k){return[k,data.cidades[k]]})
    .concat(Object.keys(data.cadastro||{}).map(function(k){return[k,data.cadastro[k]]}));
  all.sort(function(x,y){return score(x[0],x[1].label)-score(y[0],y[1].label)});
  var sugs=all.slice(0,8).map(function(e){return cityButton(e[0],e[1])}).join("");
  document.getElementById("rb-meta").innerHTML="";
  document.getElementById("rb-out").innerHTML='<div class="rb-card"><p class="rb-empty">😕 Cidade não encontrada na pesquisa da ANP. Tente outra grafia ou escolha uma cidade:</p><div class="rb-sug">'+sugs+"</div></div>";
}

function ensureData(){
  if(data)return Promise.resolve(true);
  var url=(window.RACHA_BUSCAR_URL||DATA_URL);
  return fetch(url,{cache:"no-store"}).then(function(r){
    if(!r.ok)throw new Error("http "+r.status);
    return r.json();
  }).then(function(j){
    data=j;try{localStorage.setItem(LS_CACHE,JSON.stringify(j))}catch(e){}return true;
  }).catch(function(e){
    try{var c=JSON.parse(localStorage.getItem(LS_CACHE)||"null");if(c){data=c;return true}}catch(e2){}
    return false;
  });
}

function showOverlay(){
  injectStyle();
  if(!overlay){
    overlay=document.createElement("div");overlay.id="rb-overlay";
    overlay.innerHTML='<div class="rb-card"><h2>🔍 Buscar postos por cidade</h2><p class="rb-sub">Gasolina comum · R$/litro</p>'
     +'<div class="rb-sb"><input id="rb-q" placeholder="Digite a cidade (ex.: Apucarana)"><button id="rb-go">Buscar</button></div>'
     +'<div class="rb-chips" id="rb-meta"></div></div>'
     +'<div id="rb-out"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click",function(ev){
      var t=ev.target;
      if(t.id==="rb-go")buscar();
      else if(t.dataset&&t.dataset.rbForm!==undefined){var f=document.getElementById("rb-f"+t.dataset.rbForm);if(f)f.style.display=f.style.display==="none"?"flex":"none"}
      else if(t.dataset&&t.dataset.rbSave!==undefined){
        var i=t.dataset.rbSave,raw=(document.getElementById("rb-v"+i).value||"").replace(",","."),v=parseFloat(raw);
        if(!(v>3&&v<15)){alert("Confere o valor? Ex.: 6,29");return}
        savePrice(t.dataset.rbKey+"|"+t.dataset.rbCnpj,v);renderCad(t.dataset.rbKey);
      }
      else if(t.dataset&&t.dataset.rbGo){
        var k=t.dataset.rbGo;
        document.getElementById("rb-q").value=(data.cidades&&data.cidades[k]?data.cidades[k].label:data.cadastro[k].label);
        if(data.cidades&&data.cidades[k])renderAnp(k);else renderCad(k);
      }
    });
    overlay.addEventListener("keydown",function(ev){if(ev.key==="Enter"&&ev.target.id==="rb-q")buscar()});
  }
  overlay.style.display="block";
  document.getElementById("rb-out").innerHTML='<div class="rb-card"><p class="rb-empty">Carregando preços…</p></div>';
  ensureData().then(function(ok){
    if(!ok){document.getElementById("rb-out").innerHTML='<div class="rb-card"><p class="rb-empty">Não consegui carregar os preços agora. Confira a internet e toque em Buscar de novo.</p></div>';return}
    document.getElementById("rb-out").innerHTML="";
    var q=document.getElementById("rb-q");
    if(q.value){buscar();return}
    /* Bug 19/10: a aba abria em branco depois de "Carregando precos..." (so mostrava algo depois de digitar a cidade).
       Agora abre ja mostrando Apucarana; se nao houver na pesquisa, mostra sugestoes de cidades. Nao mexe em prices_single/prices_full. */
    var ka=Object.keys(data.cidades||{}).find(function(k){return norm(k)==="apucarana|pr"||norm(data.cidades[k].label)==="apucarana"});
    if(ka){q.value=data.cidades[ka].label;renderAnp(ka);return}
    var all=Object.keys(data.cidades||{}).map(function(k){return[k,data.cidades[k]]})
      .concat(Object.keys(data.cadastro||{}).map(function(k){return[k,data.cadastro[k]]}));
    var sugs=all.slice(0,8).map(function(e){return cityButton(e[0],e[1])}).join("");
    document.getElementById("rb-out").innerHTML='<div class="rb-card"><p class="rb-empty">Digite uma cidade acima ou escolha:</p><div class="rb-sug">'+sugs+"</div></div>";
  });
}
function hideOverlay(){if(overlay)overlay.style.display="none"}

function setActive(on){
  if(!myBtn)return;
  var pill=myBtn.firstElementChild;
  if(on){
    myBtn.className=myBtn.className.replace(INACTIVE_CLS,ACTIVE_CLS);
    if(pill&&pill.className.indexOf(PILL)<0)pill.className+=" "+PILL;
    /* tira o destaque do botao do React que estava ativo */
    var nav=myBtn.closest("nav");
    if(nav){Array.prototype.forEach.call(nav.querySelectorAll("button"),function(b){
      if(b!==myBtn&&b.className.indexOf(ACTIVE_CLS)>=0){
        b.className=b.className.replace(ACTIVE_CLS,INACTIVE_CLS);
        var p=b.firstElementChild;if(p)p.className=p.className.replace(" "+PILL,"").replace(PILL,"");
      }
    })}
  }else{
    myBtn.className=myBtn.className.replace(ACTIVE_CLS,INACTIVE_CLS);
    if(pill)pill.className=pill.className.replace(" "+PILL,"").replace(PILL,"");
  }
}

var ICON='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
function ensureButton(){
  var nav=document.querySelector("#root nav");
  if(!nav)return;
  var holder=nav.querySelector("div");
  if(!holder)return;
  if(document.getElementById("rb-tab"))return;
  var ref=holder.querySelector("button");
  if(!ref)return;
  var b=ref.cloneNode(true);
  b.id="rb-tab";
  b.className=b.className.replace(ACTIVE_CLS,INACTIVE_CLS);
  var pill=b.firstElementChild;
  if(pill){pill.className=pill.className.replace(" "+PILL,"").replace(PILL,"");pill.innerHTML=ICON}
  var lbl=b.querySelector("span:last-of-type")||b.lastElementChild;
  if(lbl&&lbl.tagName==="SPAN")lbl.textContent="Buscar";else b.appendChild(document.createTextNode("Buscar"));
  b.addEventListener("click",function(ev){
    ev.preventDefault();ev.stopPropagation();
    if(overlay&&overlay.style.display==="block"){hideOverlay();setActive(false)}
    else{showOverlay();setActive(true)}
  },true);
  /* posicao: logo depois de "Carro", antes de "Postos" */
  var btns=Array.prototype.slice.call(holder.querySelectorAll("button"));
  var postos=btns.find(function(x){return /postos/i.test(x.textContent)});
  if(postos)holder.insertBefore(b,postos);else holder.appendChild(b);
  myBtn=b;
  /* clicar em outra aba fecha a minha */
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
