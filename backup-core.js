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
