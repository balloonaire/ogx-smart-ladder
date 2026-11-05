// Optional Firebase Realtime Database session sharing. No dependencies.
// One host writes; viewers poll. Viewer restriction is UI-only, not a security guarantee.
(function(){
'use strict';
const fields=['cloudDatabase','cloudApiKey','cloudSession','cloudRole'];
const configKey='ogx-cloud-v17';
let connection=null, poll=null, pushTimer=null, lastPublished='', lastRemote='';
const el=id=>document.getElementById(id);
const status=msg=>{el('cloudStatus').textContent=msg;};
try{const saved=JSON.parse(localStorage.getItem(configKey)||'{}');fields.forEach(id=>{if(saved[id])el(id).value=saved[id];});}catch{}
function settings(){return Object.fromEntries(fields.map(id=>[id,el(id).value.trim()]));}
function persist(){localStorage.setItem(configKey,JSON.stringify(settings()));}
function endpoint(c){return c.database.replace(/\/+$/,'')+'/ogxSessions/'+encodeURIComponent(c.session)+'/state.json?auth='+encodeURIComponent(c.token);}
async function request(c,method,body){const response=await fetch(endpoint(c),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});if(!response.ok)throw Error('Database '+response.status+': check URL and rules');return response.json();}
async function anonymousLogin(db,apiKey){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Anonymous authentication failed');return v.idToken;}
function disconnect(){clearInterval(poll);clearTimeout(pushTimer);poll=null;pushTimer=null;connection=null;document.body.classList.remove('cloud-viewer');status('Disconnected · Local browser mode');}
async function connect(){disconnect();const v=settings();if(!/^https:\/\/[a-zA-Z0-9.-]+\/$/.test(v.cloudDatabase.replace(/\/*$/,'/'))||!v.cloudApiKey||!/^[-_a-zA-Z0-9]{12,120}$/.test(v.cloudSession)){status('Enter a valid HTTPS database URL, API key and 12–120 character session code.');return;}
 status('Connecting to Firebase…');try{const token=await anonymousLogin(v.cloudDatabase,v.cloudApiKey);const c={database:v.cloudDatabase,token,session:v.cloudSession,role:v.cloudRole};const remote=await request(c,'GET');if(c.role==='viewer'&&!remote){status('Session not found. Connect the host first.');return;}
 if(c.role==='host'&&remote&&!confirm('A cloud session already exists. Use its existing state rather than overwriting it?')){status('Connection cancelled');return;}
 connection=c;persist();if(remote){state=remote;localStorage.setItem(KEY,JSON.stringify(state));render();}else if(c.role==='host'){await request(c,'PUT',state);lastPublished=JSON.stringify(state);}
 document.body.classList.toggle('cloud-viewer',c.role==='viewer');status('Connected · '+(c.role==='host'?'Host / editor':'Live viewer')+' · Session '+c.session.slice(0,8)+'… · syncing every 3s');
 poll=setInterval(async()=>{if(connection!==c)return;try{const remote=await request(c,'GET');if(c.role==='viewer'&&remote){const next=JSON.stringify(remote);if(next!==lastRemote){lastRemote=next;state=remote;localStorage.setItem(KEY,next);render();}}}catch(e){status('Sync error: '+e.message);}},3000);
 }catch(e){connection=null;status('Connection failed: '+e.message);}
}
// Host saves are batched to avoid repeated writes during a single UI action.
window.cloudScheduleSave=function(){const c=connection;if(!c||c.role!=='host')return;clearTimeout(pushTimer);pushTimer=setTimeout(async()=>{if(connection!==c)return;const payload=JSON.stringify(state);if(payload===lastPublished)return;try{await request(c,'PUT',state);lastPublished=payload;}catch(e){status('Cloud save failed: '+e.message);}},300);};
el('cloudGenerate').addEventListener('click',()=>{const a=new Uint8Array(24);crypto.getRandomValues(a);el('cloudSession').value=Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');persist();});
el('cloudConnect').addEventListener('click',connect);
el('cloudDisconnect').addEventListener('click',disconnect);
fields.forEach(id=>el(id).addEventListener('change',persist));
// Capture events before the existing application handlers; viewers cannot mutate state.
document.addEventListener('click',e=>{if(connection?.role!=='viewer')return;const target=e.target.closest('button, label.button');if(target&&!target.closest('.cloud-settings')&&!target.closest('.view-tabs')){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('change',e=>{if(connection?.role!=='viewer')return;if(e.target.closest('.cloud-settings'))return;e.preventDefault();e.stopImmediatePropagation();render();},true);
document.addEventListener('submit',e=>{if(connection?.role==='viewer'){e.preventDefault();e.stopImmediatePropagation();}},true);
})();
