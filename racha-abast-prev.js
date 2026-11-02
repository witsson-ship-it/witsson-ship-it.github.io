/* Racha - aba Abast. OPCAO C (preview). Verde/amarelo, agrupado por mes,
   consumo por trecho sob cada tanque Cheio e aviso quando o trecho sai estranho.
   Nao toca nos dados: so le racha_db_v1 e redesenha a aba. */
(function(){
/* versao de producao: sem harness de teste */

var CSS=`
[data-rab-off]{display:none!important}
#rab-panel{font-family:Inter,system-ui,sans-serif;color:#f1f5f9;padding-bottom:24px}
#rab-panel .rab-top{background:linear-gradient(160deg,#065f46,#064e3b 60%,#052e22);padding:22px 18px 64px;border-radius:0 0 28px 28px;position:relative;overflow:hidden;margin:-16px -16px 0}
#rab-panel .rab-top:after{content:"R$";position:absolute;right:-24px;top:-36px;font-size:170px;font-weight:800;color:rgba(255,255,255,.06)}
#rab-panel .rab-t{font-size:19px;font-weight:800;position:relative;z-index:2}
#rab-panel .rab-s{font-size:12.5px;color:#a7d8c2;margin-top:3px;position:relative;z-index:2}
#rab-panel .rab-card{margin:-52px 2px 0;background:#101d33;border:1px solid rgba(250,204,21,.30);border-radius:20px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:3;box-shadow:0 12px 30px rgba(0,0,0,.5)}
#rab-panel .rab-lbl{font-size:11px;letter-spacing:2px;color:#facc15;font-weight:700}
#rab-panel .rab-big{font-size:36px;font-weight:800;margin-top:3px}
#rab-panel .rab-cap{font-size:11px;color:#8a99ad;margin-top:3px}
#rab-panel .rab-tot{font-size:16px;font-weight:800;color:#fde68a;text-align:right}
#rab-panel .rab-tot2{font-size:11px;color:#8a99ad;margin-top:3px;text-align:right}
#rab-panel .rab-new{margin-top:14px;width:100%;border:0;border-radius:16px;padding:15px;font-size:16px;font-weight:800;color:#052e16;background:linear-gradient(135deg,#4ade80,#22c55e);box-shadow:0 8px 22px rgba(34,197,94,.30)}
#rab-panel .rab-mo{display:flex;justify-content:space-between;align-items:baseline;margin:18px 4px 8px}
#rab-panel .rab-m{font-size:12px;letter-spacing:1.8px;color:#facc15;font-weight:700}
#rab-panel .rab-mt{font-size:12.5px;color:#8a99ad;font-weight:600}
#rab-panel .rab-row{background:rgba(148,163,184,.06);border:1px solid rgba(148,163,184,.10);border-radius:14px;padding:11px 14px;margin-bottom:8px}
#rab-panel .rab-in{display:flex;justify-content:space-between;gap:8px}
#rab-panel .rab-full{border-left:3px solid #facc15}
#rab-panel .rab-l1{display:flex;align-items:center;gap:8px}
#rab-panel .rab-lt{font-size:16px;font-weight:800}
#rab-panel .rab-chip{font-size:10px;font-weight:700;color:#052e16;background:#facc15;padding:2px 8px;border-radius:999px}
#rab-panel .rab-l2{font-size:11.5px;color:#8a99ad;margin-top:4px}
#rab-panel .rab-kml{font-size:11.5px;color:#a7f3d0;margin-top:6px;border-top:1px dashed rgba(148,163,184,.18);padding-top:6px}
#rab-panel .rab-kml.warn{color:#fcd34d}
#rab-panel .rab-rt{text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between}
#rab-panel .rab-vl{font-size:15.5px;font-weight:800;color:#4ade80;white-space:nowrap}
#rab-panel .rab-tr{background:none;border:0;font-size:13px;color:#5b6b80;padding:2px;cursor:pointer}
`;
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);

function db(){try{return JSON.parse(localStorage.getItem('racha_db_v1')||'null')}catch(e){return null}}
function brl(v){return 'R$ '+v.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function km(v){return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function kml(v){return v.toFixed(1).replace('.',',')+' km/L'}
var MESES=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

function compute(){
  var d=db(),F=((d&&d.FuelRefuel)||[]).slice().sort(function(a,b){return (a.odometer||0)-(b.odometer||0)});
  var fulls=F.map(function(r,i){return r.isFullTank?i:-1}).filter(function(i){return i>=0});
  var intervals=[];
  for(var k=0;k<fulls.length-1;k++){
    var a=F[fulls[k]],b=F[fulls[k+1]],E=b.odometer-a.odometer;if(E<=0)continue;
    var L=0;for(var j=fulls[k]+1;j<=fulls[k+1];j++)L+=F[j].liters||0;
    if(L>0)intervals.push({endId:b.id,km:E,liters:L,cons:E/L});
  }
  var tKm=0,tL=0;intervals.forEach(function(iv){tKm+=iv.km;tL+=iv.liters});
  var media=tL>0?tKm/tL:0;
  return {F:F,intervals:intervals,media:media,count:F.length,
    total:F.reduce(function(s,r){return s+(r.totalCost||0)},0)};
}

function build(origBtn){
  var c=compute(),F=c.F.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')|| (b.odometer||0)-(a.odometer||0)});
  var consByEnd={};c.intervals.forEach(function(iv){consByEnd[iv.endId]=iv.cons});
  var h='<div class="rab-top"><div class="rab-t">Abastecimentos</div><div class="rab-s">Histórico e consumo do carro</div></div>';
  h+='<div class="rab-card"><div><div class="rab-lbl">MÉDIA GERAL</div><div class="rab-big">'+kml(c.media)+'</div><div class="rab-cap">tanque cheio a tanque cheio</div></div><div><div class="rab-tot">'+brl(c.total)+'</div><div class="rab-tot2">'+c.count+' abastecimentos</div></div></div>';
  h+='<button type="button" class="rab-new" id="rab-new">＋ Registrar Abastecimento</button>';
  var curMo=null,moSum={};
  F.forEach(function(r){var m=(r.date||'').slice(0,7);moSum[m]=(moSum[m]||0)+(r.totalCost||0)});
  F.forEach(function(r){
    var m=(r.date||'').slice(0,7),mi=+m.slice(5,7)-1,y=m.slice(0,4);
    if(m!==curMo){curMo=m;h+='<div class="rab-mo"><span class="rab-m">'+MESES[mi]+(y&&y!==String(new Date().getFullYear())?' '+y:'')+'</span><span class="rab-mt">'+brl(moSum[m])+'</span></div>'}
    var dd=(r.date||'').slice(8,10)+'/'+(r.date||'').slice(5,7);
    var cons=r.isFullTank?consByEnd[r.id]:null;
    h+='<div class="rab-row'+(r.isFullTank?' rab-full':'')+'"><div class="rab-in"><div><div class="rab-l1"><span class="rab-lt">'+(r.liters||0).toFixed(2).replace('.',',')+' L</span>'+(r.isFullTank?'<span class="rab-chip">Cheio</span>':'')+'</div><div class="rab-l2">'+dd+(r.station?' · '+r.station:'')+' · '+km(r.odometer||0)+' km · '+brl(r.pricePerLiter||0)+'/L</div></div><div class="rab-rt"><span class="rab-vl">'+brl(r.totalCost||0)+'</span><button type="button" class="rab-tr" data-fid="'+r.id+'">🗑</button></div></div>';
    if(cons!=null){
      var warn=cons>16;
      h+='<div class="rab-kml'+(warn?' warn':'')+'">'+(warn?'⚠ ':'↳ ')+kml(cons)+' desde o último tanque cheio'+(warn?' - estranho: parece que falta um abastecimento nesse período':'')+'</div>';
    }
    h+='</div>';
  });
  var p=document.createElement('div');p.id='rab-panel';p.innerHTML=h;
  p.querySelector('#rab-new').onclick=function(){if(origBtn)origBtn.click()};
  Array.prototype.forEach.call(p.querySelectorAll('.rab-tr'),function(b){
    b.onclick=function(){
      var rows=document.querySelectorAll('[data-rabast-hidden] .rab-orig-row');
      /* delega para o botao lixeira original do mesmo abastecimento (mesma ordem) */
      var idx=+b.getAttribute('data-idx');
      var orig=document.querySelectorAll('[data-rabast] .rab-src-trash')[idx];
      if(orig)orig.click();
    };
  });
  return p;
}

function findAbast(main){
  var hs=main.querySelectorAll('h3');
  for(var i=0;i<hs.length;i++){
    if(/Histórico/.test(hs[i].textContent)&&/trending-up/.test(hs[i].innerHTML)){
      var c=hs[i].closest('div.animate-in')||hs[i].closest('main > div');return c;
    }
  }
  return null;
}

var panel=null,obsT=null;
function sync(){try{
  var main=document.querySelector('main');if(!main)return;
  var cont=findAbast(main);
  if(!cont){if(panel){panel.remove();panel=null}return}
  var hasForm=!!cont.querySelector('input');
  if(hasForm){cont.style.display='';cont.removeAttribute('data-rab-off');if(panel)panel.style.display='none';return}
  cont.style.display='none';cont.setAttribute('data-rab-off','1');
  /* botao registrar original para delegar */
  var origBtn=null;var btns=cont.querySelectorAll('button');
  for(var i=0;i<btns.length;i++){if(/Registrar Abastecimento/.test(btns[i].textContent)){origBtn=btns[i];break}}
  /* marca as lixeiras originais na mesma ordem da lista (data desc) */
  var histH=null;cont.querySelectorAll('h3').forEach(function(h){if(/Histórico/.test(h.textContent))histH=h});
  var listWrap=histH?histH.parentElement:null;
  var trashes=listWrap?listWrap.querySelectorAll('button'):[];
  var trashArr=[];trashes.forEach(function(b){if(/trash/.test(b.innerHTML))trashArr.push(b)});
  trashArr.forEach(function(b){b.classList.add('rab-src-trash')});
  var sig=localStorage.getItem('racha_db_v1').length+'|'+trashArr.length;
  if(panel&&panel.getAttribute('data-sig')===sig&&panel.parentNode){panel.style.display='';return}
  if(panel)panel.remove();
  panel=build(origBtn);
  panel.setAttribute('data-sig',sig);
  /* liga as lixeiras do painel as originais pela ordem */
  Array.prototype.forEach.call(panel.querySelectorAll('.rab-tr'),function(b,idx){
    b.setAttribute('data-idx',idx);
  });
  cont.parentNode.insertBefore(panel,cont.nextSibling);
}catch(err){}
}
var mo=new MutationObserver(function(){clearTimeout(obsT);obsT=setTimeout(sync,250)});
function boot(){var root=document.getElementById('root')||document.body;mo.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});sync();setInterval(sync,1200)}
window.addEventListener('racha:db-saved',function(){clearTimeout(obsT);obsT=setTimeout(sync,250)});
if(document.readyState!='loading')boot();else document.addEventListener('DOMContentLoaded',boot);
})();
