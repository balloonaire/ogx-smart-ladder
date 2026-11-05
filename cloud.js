'use strict';
// Firebase REST synchronization. Host writes, viewers read. Firebase rules must enforce access.
(()=>{
 const el=id=>document.getElementById(id), cfgKey='ogx-cloud-config-v1';
 let cfg=null,token=null,connected=false,revision=null,pollTimer=null,writeTimer=null,busy=false,loading=false;
 try{const saved=JSON.parse(localStorage.getItem(cfgKey)||'null');if(saved){for(const k of ['ApiKey','DbUrl','Session','Role'])el('cloud'+k).value=saved[k.toLowerCase()]||'';}}catch{}
 const status=t=>{el('cloudStatus').textContent=t;};
 function getConfig(){const apiKey=el('cloudApiKey').value.trim(),dbUrl=el('cloudDbUrl').value.trim().replace(/\/+$/,''),session=el('cloudSession').value.trim(),role=el('cloudRole').value;
  if(!/^https:\/\/[a-z0-9.-]+\.(?:firebasedatabase\.app|firebaseio\.com)$/i.test(dbUrl))throw Error('Enter a valid HTTPS Firebase Realtime Database URL.');
  if(!apiKey||!/^[A-Za-z0-9_-]{20,}$/.test(session))throw Error('Enter your Firebase API key and a session code of at least 20 letters/numbers.');
  return {apiKey,dbUrl,session,role};}
 async function auth(){const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(cfg.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});const data=await response.json();if(!response.ok)throw Error(data.error?.message||'Anonymous authentication failed');token=data.idToken;}
 function url(){return cfg.dbUrl+'/ogxSessions/'+encodeURIComponent(cfg.session)+'/ladder.json?auth='+encodeURIComponent(token);}
 async function read(){const r=await fetch(url(),{cache:'no-store'});if(!r.ok)throw Error('Cloud read failed ('+r.status+')');return r.json();}
 function valid(s){return s&&Array.isArray(s.players)&&Array.isArray(s.courts)&&Array.isArray(s.history)&&s.settings&&Array.isArray(s.pendingPairs);}
 function apply(remote){if(!valid(remote))throw Error('Invalid shared ladder data');loading=true;try{state=remote;state.settings={...fresh().settings,...state.settings};state.courtNames=Array.isArray(state.courtNames)?state.courtNames:state.courts.map((_,i)=>String(i+1));localStorage.setItem(KEY,JSON.stringify(state));render();}finally{loading=false;}}
 async function poll(){if(!connected||busy)return;try{const data=await read();if(cfg.role==='viewer'){if(data&&JSON.stringify(data)!==revision){revision=JSON.stringify(data);apply(data);}}status(cfg.role==='viewer'?'Live viewer · synchronized':'Host connected · sharing live');}catch(e){status('Sync error: '+e.message);}}
 async function push(){if(!connected||cfg.role!=='host'||loading)return;busy=true;try{const body=JSON.stringify(state);const r=await fetch(url(),{method:'PUT',headers:{'Content-Type':'application/json'},body});if(!r.ok)throw Error('Cloud write failed ('+r.status+')');revision=body;status('Host connected · changes saved');}catch(e){status('Save failed: '+e.message);}finally{busy=false;}}
 window.ogxCloudPush=()=>{if(!connected||cfg?.role!=='host'||loading)return;clearTimeout(writeTimer);writeTimer=setTimeout(push,350);};
 function disconnect(){connected=false;clearInterval(pollTimer);clearTimeout(writeTimer);pollTimer=null;token=null;cfg=null;status('Disconnected · local mode');document.body.classList.remove('cloud-viewer');}
 el('cloudGenerate').addEventListener('click',()=>{const b=new Uint8Array(24);crypto.getRandomValues(b);el('cloudSession').value=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');});
 el('cloudDisconnect').addEventListener('click',disconnect);
 el('cloudConnect').addEventListener('click',async()=>{disconnect();try{cfg=getConfig();status('Connecting…');await auth();const data=await read();if(cfg.role==='viewer'){if(!data)throw Error('No host session found. Connect the host first.');apply(data);document.body.classList.add('cloud-viewer');revision=JSON.stringify(data);}else{if(data&&valid(data)&&!confirm('This shared session already exists. Replace it with the current laptop ladder? Cancel to keep the remote session.')){apply(data);}connected=true;await push();}connected=true;localStorage.setItem(cfgKey,JSON.stringify({apikey:cfg.apiKey,dburl:cfg.dbUrl,session:cfg.session,role:cfg.role}));status(cfg.role==='host'?'Host connected · sharing live':'Live viewer · synchronized');pollTimer=setInterval(poll,3000);}catch(e){disconnect();status('Connection failed: '+e.message);}});
 // Read-only viewers: navigation and Disconnect are permitted, ladder mutations are not.
 function block(e){if(!connected||cfg?.role!=='viewer')return;const target=e.target;if(target.closest('[data-view],#cloudDisconnect'))return;if(target.closest('main,header')){e.preventDefault();e.stopImmediatePropagation();status('Viewer mode: edits are disabled. Use the host device.');}}
 document.addEventListener('click',block,true);document.addEventListener('change',block,true);document.addEventListener('submit',block,true);
})();
