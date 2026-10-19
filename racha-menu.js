/* Racha: menu lateral (botao de 3 barras no topo, abre so por toque) no lugar da barra de baixo. Opcao D2 aprovada pelo Witsson em 19/10/2026. */
(function(){
var V='d';
function boot(){
var css=document.createElement('style');
css.textContent=`
nav.fixed.bottom-0{display:none!important}
header h1{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;font-size:17px!important}
header h1+p{display:none!important}
header .flex.items-center.gap-3.min-w-0>div:first-child{display:none!important}
header .shrink-0:last-child{margin-right:0!important}
[id$=overlay]{padding-top:70px!important}
#rm-dot{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid #fff;z-index:99999;pointer-events:none;transform:scale(.4);opacity:0;transition:all .18s}
#rm-dot.on{transform:scale(1);opacity:1}
#rm-burger{position:fixed;left:20px;top:38px;width:44px;height:44px;border-radius:12px;background:#1a2433;border:1px solid rgba(255,255,255,.12);z-index:60;display:flex;align-items:center;justify-content:center;color:#fff}
#rm-back{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:70;opacity:0;pointer-events:none;transition:opacity .25s}
#rm-back.on{opacity:1;pointer-events:auto}
#rm-drawer{position:fixed;top:0;bottom:0;left:0;width:76%;max-width:320px;background:#0f1a2e;z-index:80;transform:translateX(-102%);transition:transform .28s cubic-bezier(.3,.8,.3,1);padding-top:44px;font-family:Inter,system-ui,sans-serif;box-shadow:6px 0 24px rgba(0,0,0,.5)}
#rm-drawer.on{transform:none}
#rm-drawer .h{padding:8px 22px 18px;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;font-weight:800;font-size:19px}
#rm-drawer .h small{display:block;color:#34d399;font-weight:600;font-size:12px;margin-top:3px}
#rm-drawer .it{display:flex;align-items:center;gap:14px;padding:15px 22px;color:#cbd5e1;font-size:16px;font-weight:600}
#rm-drawer .it.act{color:#34d399;background:rgba(52,211,153,.1);border-left:4px solid #34d399;padding-left:18px}
#rm-bar{position:fixed;left:0;right:0;bottom:0;height:92px;background:#0b1220;border-top:1px solid rgba(255,255,255,.1);z-index:50;display:flex;padding:0 6px 24px;box-sizing:border-box}
#rm-bar .b{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;font:700 11px Inter,system-ui,sans-serif;gap:4px}
#rm-bar .b.act{color:#60a5fa}
#rm-bar .b.act i{background:rgba(59,130,246,.15)}
#rm-bar i{padding:6px;border-radius:12px;display:flex}
#rm-sheet{position:fixed;left:0;right:0;bottom:0;background:#0f1a2e;z-index:80;border-radius:22px 22px 0 0;padding:14px 18px 40px;transform:translateY(105%);transition:transform .28s cubic-bezier(.3,.8,.3,1);font-family:Inter,system-ui,sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.5)}
#rm-sheet.on{transform:none}
#rm-sheet .g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px}
#rm-sheet .c{background:#16233b;border-radius:16px;padding:16px 4px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#e2e8f0;font-size:13px;font-weight:700}
#rm-sheet .grip{width:40px;height:4px;border-radius:2px;background:#334155;margin:0 auto 6px}
`;document.head.appendChild(css);
var items=[],cur='Cobranças';
function collect(){var bs=document.querySelectorAll('nav.fixed.bottom-0 button');items=[...bs].map(function(b){var s=b.querySelector('span');return {label:s?s.textContent.trim():'',svg:(b.querySelector('svg')||{outerHTML:''}).outerHTML,btn:b}}).filter(function(x){return x.label})}
function dot(el,cb){var r=el.getBoundingClientRect();var d=document.getElementById('rm-dot');d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+r.height/2)+'px';d.classList.add('on');setTimeout(function(){cb&&cb();setTimeout(function(){d.classList.remove('on')},150)},260)}
function go(label){var it=items.find(function(x){return x.label==label});if(it){cur=label;it.btn.click()}}
var el=function(h){var d=document.createElement('div');d.innerHTML=h;return d.firstChild};
function init(){
 collect(); if(items.length<5){setTimeout(init,500);return}
 
 if(V=='d'){
  var bg=el('<div id="rm-back"></div>'),dr=el('<div id="rm-drawer"></div>');
  var bu=el('<button type="button" aria-label="Abrir menu" id="rm-burger"><svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>');
  document.body.append(bg,dr);
  function placeBurger(){var actions=document.querySelector('header .shrink-0:last-child');if(actions && bu.parentNode!==actions)actions.appendChild(bu)}
  placeBurger();new MutationObserver(placeBurger).observe(document.querySelector('#root'),{childList:true,subtree:true});
  function render(){dr.innerHTML='<div class="h">Racha Combustível<small>abasteceu, rachou, rodou</small></div>'+items.map(function(x){return '<div class="it'+(x.label==cur?' act':'')+'" data-l="'+x.label+'"><span style="display:flex;transform:scale(.9)">'+x.svg+'</span>'+x.label+'</div>'}).join('')}
  bu.style.cssText='position:static;flex-shrink:0;width:38px;align-self:stretch;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);color:#cbd5e1;display:flex;align-items:center;justify-content:center';dr.style.left='auto';dr.style.right='0';dr.style.transform='translateX(102%)';dr.style.boxShadow='-6px 0 24px rgba(0,0,0,.5)';var st=document.createElement('style');st.textContent='#rm-drawer.on{transform:none!important}';document.head.appendChild(st);
  window.openM=function(){render();bg.classList.add('on');dr.classList.add('on')};
  window.closeM=function(){bg.classList.remove('on');dr.classList.remove('on')};
  bg.onclick=closeM;bu.onclick=openM;
  dr.onclick=function(e){var t=e.target.closest('.it');if(t){go(t.dataset.l);closeM()}};
 }
 
}
if(document.readyState!='loading')setTimeout(init,300);else addEventListener('DOMContentLoaded',function(){setTimeout(init,300)});
}
if(document.head)boot();else document.addEventListener('DOMContentLoaded',boot);
})();
