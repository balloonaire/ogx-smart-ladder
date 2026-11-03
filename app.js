'use strict';
// OGX Smart Ladder v2 — court 0 is the highest-ranked court, regardless of its physical label.
const KEY='ogx-smart-ladder-v2', OLD='ogx-smart-ladder-v1';
const $=id=>document.getElementById(id), now=()=>Date.now();
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const fresh=()=>({players:[],courts:Array(4).fill(null),courtNames:['1','2','3','4'],pendingPairs:[],history:[],topCompleted:0,settings:{target:11,winBy:2,cap:0,autoFill:true},lastPairs:[]});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||JSON.parse(localStorage.getItem(OLD))||fresh();if(!Array.isArray(state.players)||!Array.isArray(state.courts)||!Array.isArray(state.history))throw Error('Invalid');}catch{state=fresh();}
state.pendingPairs=Array.isArray(state.pendingPairs)?state.pendingPairs:[];state.topCompleted=Number(state.topCompleted)||0;
state.courtNames=Array.isArray(state.courtNames)?state.courtNames:state.courts.map((_,i)=>String(i+1));
state.settings={...fresh().settings,...state.settings};
state.lastPairs=Array.isArray(state.lastPairs)?state.lastPairs:[];
for(const p of state.players){p.topStreak=p.topStreak||0;p.targetCourt=Number.isInteger(p.targetCourt)?p.targetCourt:null;}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=ms=>{let n=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const player=id=>state.players.find(p=>p.id===id);
const names=ids=>ids.map(id=>player(id)?.name||'Unknown').join(' / ');
const courtName=i=>state.courtNames[i]||String(i+1);
const rankName=i=>`Court ${courtName(i)}${i===0?' · TOP':''}`;
function queuePlayer(p,target=null){p.status='waiting';p.queuedAt=now();p.targetCourt=target;}
function waitingPlayers(){return state.players.filter(p=>p.status==='waiting');}
function cleanPairs(){state.pendingPairs=state.pendingPairs.filter(q=>q.ids.length===2&&q.ids.every(id=>player(id)?.status==='waiting'));}
function queuePair(ids,target,priority=0){const valid=ids.map(player).filter(Boolean);if(valid.length!==2)return;const stamp=now();valid.forEach(p=>{queuePlayer(p,target);p.queuedAt=stamp;});state.pendingPairs.push({ids:[...ids],target,priority,at:stamp,id:uid()});}
function takePairsForCourt(i){cleanPairs();const picked=[];
  // The top-court defending pair has first claim on one of the two slots.
  const candidates=state.pendingPairs.filter(q=>q.target===i&&(q.blockedUntil===undefined||q.blockedUntil<=state.topCompleted)).sort((a,b)=>b.priority-a.priority||a.at-b.at);
  for(const q of candidates){if(picked.length>=2)break;if(q.ids.some(id=>picked.flat().includes(id)))continue;picked.push(q.ids);state.pendingPairs=state.pendingPairs.filter(x=>x.id!==q.id);}
  // Fill from unassigned waiting pairs, then eligible individual players.
  const freePairs=state.pendingPairs.filter(q=>q.target===null).sort((a,b)=>a.at-b.at);
  for(const q of freePairs){if(picked.length>=2)break;picked.push(q.ids);state.pendingPairs=state.pendingPairs.filter(x=>x.id!==q.id);}
  const reserved=new Set(state.pendingPairs.flatMap(q=>q.ids));
  const singles=waitingPlayers().filter(p=>!reserved.has(p.id)&&!picked.flat().includes(p.id)&&p.targetCourt===null).sort((a,b)=>a.games-b.games||a.queuedAt-b.queuedAt);
  while(picked.length<2&&singles.length>=2)picked.push([singles.shift().id,singles.shift().id]);
  if(picked.length<2){ // Put selected pairs back rather than losing queue positions.
    for(const ids of picked)if(!state.pendingPairs.some(q=>q.ids.join('|')===ids.join('|')))state.pendingPairs.push({ids,target:i,priority:0,at:now(),id:uid()});
    return null;
  }
  return picked;
}
function startMatch(i){if(state.courts[i])return false;const teams=takePairsForCourt(i);if(!teams)return false;teams.flat().forEach(id=>{player(id).status='playing';});
  state.courts[i]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0]};
  state.lastPairs.push(...teams.map(t=>[...t].sort().join('|')));state.lastPairs=state.lastPairs.slice(-16);save();return true;
}
function autoFill(){if(!state.settings.autoFill)return;for(let i=0;i<state.courts.length;i++)if(!state.courts[i])startMatch(i);}
function winningTeam(m){const [a,b]=m.scores,{target,winBy,cap}=state.settings;return (a>=target&&a-b>=winBy)||(cap>0&&a>=cap&&a>b)?0:(b>=target&&b-a>=winBy)||(cap>0&&b>=cap&&b>a)?1:null;}
function finish(i){const m=state.courts[i];if(!m)return;const qualified=winningTeam(m);if(qualified===null&&!confirm('Winning condition not reached. Confirm the leading team as winner?'))return;
 const w=qualified===null?(m.scores[0]>m.scores[1]?0:m.scores[1]>m.scores[0]?1:null):qualified;if(w===null){alert('Cannot finish a tied match.');return;}
 const winIds=m.teams[w],loseIds=m.teams[1-w];
 for(let t=0;t<2;t++)for(const id of m.teams[t]){const p=player(id);if(!p)continue;p.games++;p.wins+=Number(t===w);p.losses+=Number(t!==w);p.pointsFor+=m.scores[t];p.pointsAgainst+=m.scores[1-t];}
 let note='';
 if(i===0){state.topCompleted++;const newStreak=Math.max(...winIds.map(id=>player(id)?.topStreak||0))+1;
   if(newStreak>=2){winIds.forEach(id=>{player(id).topStreak=0;});queuePair(winIds,0,-1);state.pendingPairs[state.pendingPairs.length-1].blockedUntil=state.topCompleted+1;note='Top winners completed 2 rounds and join the waiting queue';}
   else{winIds.forEach(id=>{player(id).topStreak=newStreak;});queuePair(winIds,0,10);note=`Top winners defend: ${newStreak}/2`;}
 }else{winIds.forEach(id=>{player(id).topStreak=0;});queuePair(winIds,i-1,2);note=`Winners ascend to ${rankName(i-1)}`;}
 loseIds.forEach(id=>{player(id).topStreak=0;});queuePair(loseIds,Math.min(i+1,state.courts.length-1),0);
 state.history.unshift({id:m.id,court:courtName(i),teams:m.teams.map(t=>t.map(id=>player(id)?.name||'Unknown')),scores:[...m.scores],winner:w,note,endedAt:now()});
 state.courts[i]=null;autoFill();save();render();
}
function cancel(i){const m=state.courts[i];if(!m||!confirm('Cancel this match without recording a result?'))return;for(const ids of m.teams)queuePair(ids,i,0);state.courts[i]=null;autoFill();save();render();}
function updateScore(i,t,d){const m=state.courts[i];if(!m||m.pausedAt)return;m.scores[t]=Math.max(0,m.scores[t]+d);save();render();}
function pause(i){const m=state.courts[i];if(!m)return;if(m.pausedAt){m.pausedMs+=now()-m.pausedAt;m.pausedAt=null;}else m.pausedAt=now();save();render();}
function timeout(i,t){const m=state.courts[i];if(!m)return;m.timeouts[t]++;save();render();}
function render(){const s=state.settings;$('courtCount').value=String(state.courts.length);$('target').value=String(s.target);$('winBy').value=String(s.winBy);$('cap').value=String(s.cap);$('autoFill').checked=s.autoFill;
 $('courtLabels').value=state.courtNames.join(', ');
 const queued=waitingPlayers().length;$('playerSummary').textContent=`${state.players.length} players · ${queued} waiting · ${state.players.length-queued} playing`;
 $('playersBody').innerHTML=state.players.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.status==='playing'?'On court':'Waiting'}</td><td data-wait="${p.id}">${p.status==='waiting'?fmt(now()-p.queuedAt):'—'}</td><td>${p.games}</td><td>${p.wins}–${p.losses}</td><td><button class="small danger" data-action="remove" data-id="${p.id}" ${p.status==='playing'?'disabled':''}>Remove</button></td></tr>`).join('')||'<tr><td colspan="6" class="muted">Add players to begin.</td></tr>';
 const sorted=[...state.pendingPairs].filter(q=>q.ids.every(id=>player(id)?.status==='waiting')).sort((a,b)=>(a.target??999)-(b.target??999)||b.priority-a.priority||a.at-b.at);
 const reserved=new Set(sorted.flatMap(q=>q.ids));const singles=waitingPlayers().filter(p=>!reserved.has(p.id)).sort((a,b)=>a.queuedAt-b.queuedAt);
 $('nextQueue').innerHTML=sorted.map((q,k)=>`<tr><td>${k+1}</td><td>${esc(names(q.ids))}</td><td>${q.target===null?'Any available court':esc(rankName(q.target))}</td><td>${q.target===0&&q.priority===10?'Top defender':q.target===0&&q.priority<0?'2-round limit · rotate':'Waiting'}</td></tr>`).join('')+singles.map((p,k)=>`<tr><td>${sorted.length+k+1}</td><td>${esc(p.name)}</td><td>Unassigned</td><td>Awaiting partner</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No players waiting.</td></tr>';
 $('courts').innerHTML=state.courts.map((m,i)=>{if(!m)return `<article class="court"><div class="court-head"><b>${esc(rankName(i))}</b><span class="pill">Available</span></div><div class="empty">Next pairs are shown in the queue</div><button class="secondary" data-action="start" data-court="${i}">Start next match</button></article>`;
 return `<article class="court"><div class="court-head"><b>${esc(rankName(i))}</b><span class="pill live">${m.pausedAt?'Paused':'Live'}</span></div>${m.teams.map((team,t)=>`<div class="team"><div class="team-name">Team ${t?'B':'A'}<br><b>${esc(names(team))}</b>${i===0?`<br><span class="muted">Top-court streak: ${Math.max(...team.map(id=>player(id)?.topStreak||0))+1}/2</span>`:''}<br><span class="muted">Timeouts: ${m.timeouts[t]}</span></div><strong>${m.scores[t]}</strong><div><button class="small" data-action="score" data-court="${i}" data-team="${t}" data-delta="1" ${m.pausedAt?'disabled':''}>+1</button><br><button class="small secondary" data-action="score" data-court="${i}" data-team="${t}" data-delta="-1" ${m.pausedAt?'disabled':''}>−1</button></div></div><button class="small secondary" data-action="timeout" data-court="${i}" data-team="${t}">Record Team ${t?'B':'A'} Timeout</button>`).join('')}<p class="clock" data-clock="${i}">Match ${fmt((m.pausedAt||now())-m.startedAt-m.pausedMs)}</p><p class="hint">${winningTeam(m)!==null?'Winning score reached — confirm result.':'Match in progress'}</p><div class="actions"><button class="secondary" data-action="pause" data-court="${i}">${m.pausedAt?'Resume':'Pause'}</button><button data-action="finish" data-court="${i}">Finish</button><button class="danger" data-action="cancel" data-court="${i}">Cancel</button></div></article>`}).join('');
 const ranked=[...state.players].sort((a,b)=>b.wins-a.wins||(b.pointsFor-b.pointsAgainst)-(a.pointsFor-a.pointsAgainst)||a.name.localeCompare(b.name));$('leaderboard').innerHTML=ranked.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.pointsFor-p.pointsAgainst>0?'+':''}${p.pointsFor-p.pointsAgainst}</td></tr>`).join('')||'<tr><td colspan="5">No results yet.</td></tr>';
 $('history').innerHTML=state.history.slice(0,50).map(h=>`<div class="history-item"><b>${esc(h.teams[0].join(' / '))}</b> ${h.scores[0]}–${h.scores[1]} <b>${esc(h.teams[1].join(' / '))}</b><br><time>${new Date(h.endedAt).toLocaleString()} · ${esc(h.court||'Court')} · Winner: Team ${h.winner?'B':'A'}</time>${h.note?`<p class="hint">${esc(h.note)}</p>`:''}</div>`).join('')||'<p class="muted">Completed matches will appear here.</p>';
}
$('addForm').addEventListener('submit',e=>{e.preventDefault();const name=$('playerName').value.trim();if(!name)return;if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){alert('Name already registered.');return;}state.players.push({id:uid(),name,status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0});$('playerName').value='';autoFill();save();render();});
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const {action,court,team,delta,id}=b.dataset,i=Number(court),t=Number(team);if(action==='remove'){state.players=state.players.filter(p=>p.id!==id);cleanPairs();autoFill();save();render();}if(action==='start'){startMatch(i);render();}if(action==='score')updateScore(i,t,Number(delta));if(action==='finish')finish(i);if(action==='cancel')cancel(i);if(action==='pause')pause(i);if(action==='timeout')timeout(i,t);});
$('courtCount').addEventListener('change',e=>{const n=Number(e.target.value);if(n<state.courts.length&&(state.courts.slice(n).some(Boolean)||state.pendingPairs.some(q=>q.target!==null&&q.target>=n))){alert('Finish affected matches and clear their waiting assignments before reducing courts.');render();return;}state.courts.length=n;for(let i=0;i<n;i++)if(state.courts[i]===undefined)state.courts[i]=null;state.courtNames=Array.from({length:n},(_,i)=>state.courtNames[i]||String(i+1));autoFill();save();render();});
$('saveCourtLabels').addEventListener('click',()=>{const v=$('courtLabels').value.split(',').map(x=>x.trim());if(v.length!==state.courts.length||v.some(x=>!x)||new Set(v.map(x=>x.toLowerCase())).size!==v.length){alert(`Enter ${state.courts.length} unique court numbers separated by commas, highest court first.`);return;}state.courtNames=v;save();render();});
for(const k of ['target','winBy','cap'])$(k).addEventListener('change',e=>{state.settings[k]=Number(e.target.value);save();render();});
$('autoFill').addEventListener('change',e=>{state.settings.autoFill=e.target.checked;autoFill();save();render();});
$('demoBtn').addEventListener('click',()=>{for(const name of ['Kevin','Alicia','Peter','Jamie','Daniel','Cheryl','Adam','Ern','Hao Yi','Matthew','Lee','John'])if(!state.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))state.players.push({id:uid(),name,status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0});autoFill();save();render();});
$('resetBtn').addEventListener('click',()=>{if(confirm('Delete all local session data?')){state=fresh();save();render();}});
$('exportBtn').addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.href=url;a.download='ogx-ladder-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const d=JSON.parse(await file.text());if(!Array.isArray(d.players)||!Array.isArray(d.courts)||!Array.isArray(d.history)||!d.settings)throw Error('Invalid backup');if(!confirm('Replace the current browser session?'))return;state={...fresh(),...d};state.courtNames=Array.isArray(d.courtNames)&&d.courtNames.length===d.courts.length?d.courtNames:d.courts.map((_,i)=>String(i+1));state.pendingPairs=Array.isArray(d.pendingPairs)?d.pendingPairs:[];state.players.forEach(p=>{p.topStreak=p.topStreak||0;p.targetCourt=Number.isInteger(p.targetCourt)?p.targetCourt:null;});save();render();}catch(err){alert('Import failed: '+err.message);}finally{e.target.value='';}});
setInterval(()=>{for(const p of state.players){const el=document.querySelector(`[data-wait="${p.id}"]`);if(el&&p.status==='waiting')el.textContent=fmt(now()-p.queuedAt);}state.courts.forEach((m,i)=>{const el=document.querySelector(`[data-clock="${i}"]`);if(m&&el)el.textContent='Match '+fmt((m.pausedAt||now())-m.startedAt-m.pausedMs);});},1000);
// Do not auto-fill imported sessions until the user has inspected them.
save();render();
