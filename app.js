'use strict';
// OGX Smart Ladder v11 — court 0 is the highest-ranked court, regardless of its physical label.
const KEY='ogx-smart-ladder-v2', OLD='ogx-smart-ladder-v1';
const $=id=>document.getElementById(id), now=()=>Date.now();
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const fresh=()=>({players:[],courts:Array(4).fill(null),courtNames:['1','2','3','4'],pendingPairs:[],history:[],topCompleted:0,settings:{target:11,winBy:2,cap:0,autoFill:true},lastPairs:[]});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||JSON.parse(localStorage.getItem(OLD))||fresh();if(!Array.isArray(state.players)||!Array.isArray(state.courts)||!Array.isArray(state.history))throw Error('Invalid');}catch{state=fresh();}
state.pendingPairs=Array.isArray(state.pendingPairs)?state.pendingPairs:[];state.topCompleted=Number(state.topCompleted)||0;
state.courtNames=Array.isArray(state.courtNames)?state.courtNames:state.courts.map((_,i)=>String(i+1));
state.settings={...fresh().settings,...state.settings};
state.lastPairs=Array.isArray(state.lastPairs)?state.lastPairs:[];
for(const p of state.players){p.gender=typeof p.gender==='string'?p.gender:'';p.topStreak=p.topStreak||0;p.targetCourt=Number.isInteger(p.targetCourt)?p.targetCourt:null;p.substitute=Boolean(p.substitute);p.playedMs=Number.isFinite(Number(p.playedMs))?Math.max(0,Number(p.playedMs)):0;}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=ms=>{let n=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const fmtPlayed=ms=>{let n=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const player=id=>state.players.find(p=>p.id===id);
const genderLabel=p=>p?.gender||'Not specified';
const genderShort=p=>p?.gender==='Male'?'M':p?.gender==='Female'?'F':'';
const playedTime=p=>Math.max(0,Number(p?.playedMs)||0);
const displayName=id=>{const p=player(id);return p?`${p.name}${p.gender&&p.gender!=='Prefer not to say'?` (${p.gender})`:''}`:'Unknown';};
const names=ids=>ids.map(displayName).join(' / ');
const courtName=i=>state.courtNames[i]||String(i+1);
const rankName=i=>`Court ${courtName(i)}${i===0?' · TOP':''}`;
function queuePlayer(p,target=null){p.status='waiting';p.queuedAt=now();p.targetCourt=target;p.substitute=false;}
function waitingPlayers(){return state.players.filter(p=>p.status==='waiting');}
function restPlayer(p){if(!p||p.status==='playing')return;p.status='resting';p.substitute=false;state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(p.id));}
function resumePlayer(p){if(!p||p.status!=='resting')return;queuePlayer(p,p.targetCourt);p.substitute=false;}
function requestSubstitute(p){if(!p||p.status!=='waiting'||state.courts.length<2)return;state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(p.id));p.targetCourt=state.courts.length-1;p.substitute=true;p.queuedAt=now();}

function cleanPairs(){state.pendingPairs=state.pendingPairs.filter(q=>q.ids.length===2&&q.ids.every(id=>player(id)?.status==='waiting'));}
function queuePair(ids,target,priority=0){const valid=ids.map(player).filter(Boolean);if(valid.length!==2)return;const stamp=now();valid.forEach(p=>{queuePlayer(p,target);p.queuedAt=stamp;});state.pendingPairs.push({ids:[...ids],target,priority,at:stamp,id:uid()});}
// Reserve promoted TOP contenders as pairs; mix individuals on lower courts.
function takePairsForCourt(i){
 cleanPairs();
 const eligible=q=>q.target===i&&(q.blockedUntil===undefined||q.blockedUntil<=state.topCompleted);
 const ranked=state.pendingPairs.filter(eligible).sort((a,b)=>b.priority-a.priority||a.at-b.at);
 const locked=i===0?ranked.slice(0,2):[];
 const selected=locked.map(q=>[...q.ids]);
 const used=new Set(selected.flat());
 const reserved=new Set(state.pendingPairs.filter(q=>!locked.includes(q)).flatMap(q=>q.ids));
 // For lower courts, even old pair reservations are dissolved and remixed.
 const localPairs=i===0?[]:ranked;
 const localIds=localPairs.flatMap(q=>q.ids);
 localIds.forEach(id=>reserved.delete(id));
 const available=waitingPlayers().filter(p=>!used.has(p.id)&&!reserved.has(p.id)&&(p.targetCourt===i||p.targetCourt===null||(i===state.courts.length-1&&p.targetCourt>0)));
 available.sort((a,b)=>Number(b.substitute)-Number(a.substitute)||(a.targetCourt===i?0:1)-(b.targetCourt===i?0:1)||a.games-b.games||playedTime(a)-playedTime(b)||a.queuedAt-b.queuedAt);
 const need=4-selected.length*2;
 if(available.length<need)return null; // No queue mutation on failed allocation.
 const picked=available.slice(0,need).map(p=>p.id);
 if(i===0){for(let k=0;k<picked.length;k+=2)selected.push(picked.slice(k,k+2));}
 else{
   // Spread incoming players across teams instead of reusing losing pairs.
   selected.push([picked[0],picked[2]],[picked[1],picked[3]]);
   // If a previous pair still appears, switch one player when possible.
   const pairKey=ids=>[...ids].sort().join('|');
   if(state.lastPairs.includes(pairKey(selected[0]))||state.lastPairs.includes(pairKey(selected[1])))
     [selected[0][1],selected[1][1]]=[selected[1][1],selected[0][1]];
 }
 const assigned=new Set(selected.flat());
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>assigned.has(id)));
 return selected;
}
// Court 1 overflow: temporarily borrow four waiting Court 2 players without awarding TOP promotion.
// A queued TOP contender or defender always takes priority over an overflow match.
function takeTopOverflow(){
 if(state.courts[0]||state.courts.length<2)return null;
 cleanPairs();
 if(state.pendingPairs.some(q=>q.target===0))return null;
 if(waitingPlayers().some(p=>p.targetCourt===0))return null;
 const pool=waitingPlayers().filter(p=>p.targetCourt===1);
 if(pool.length<4)return null;
 pool.sort((a,b)=>a.games-b.games||playedTime(a)-playedTime(b)||a.queuedAt-b.queuedAt);
 const chosen=pool.slice(0,4),ids=new Set(chosen.map(p=>p.id));
 const originalTargets=Object.fromEntries(chosen.map(p=>[p.id,p.targetCourt]));
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>ids.has(id)));
 const teams=[[chosen[0].id,chosen[2].id],[chosen[1].id,chosen[3].id]];
 chosen.forEach(p=>{p.status='playing';p.substitute=false;});
 return {teams,originalTargets};
}
function startTopOverflow(){
 const selected=takeTopOverflow();if(!selected)return false;
 const teams=selected.teams;
 state.courts[0]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0],overflow:true,originalTargets:selected.originalTargets};
 state.lastPairs.push(...teams.map(t=>[...t].sort().join('|')));state.lastPairs=state.lastPairs.slice(-16);
 save();return true;
}
function startMatch(i,allowOverflow=true){if(state.courts[i])return false;const teams=takePairsForCourt(i);if(!teams)return i===0&&allowOverflow?startTopOverflow():false;teams.flat().forEach(id=>{player(id).status='playing';player(id).substitute=false;});
  state.courts[i]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0]};
  state.lastPairs.push(...teams.map(t=>[...t].sort().join('|')));state.lastPairs=state.lastPairs.slice(-16);save();return true;
}
function autoFill(){if(!state.settings.autoFill)return;for(let i=0;i<state.courts.length;i++)if(!state.courts[i])startMatch(i,false);if(!state.courts[0])startTopOverflow();}
function winningTeam(m){const [a,b]=m.scores,{target,winBy,cap}=state.settings;return (a>=target&&a-b>=winBy)||(cap>0&&a>=cap&&a>b)?0:(b>=target&&b-a>=winBy)||(cap>0&&b>=cap&&b>a)?1:null;}
function finish(i){const m=state.courts[i];if(!m)return;const qualified=winningTeam(m);if(qualified===null&&!confirm('Winning condition not reached. Confirm the leading team as winner?'))return;
 const w=qualified===null?(m.scores[0]>m.scores[1]?0:m.scores[1]>m.scores[0]?1:null):qualified;if(w===null){alert('Cannot finish a tied match.');return;}
 const winIds=m.teams[w],loseIds=m.teams[1-w];
 const elapsedMs=Math.max(0,(m.pausedAt||now())-m.startedAt-(m.pausedMs||0));
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>m.teams.flat().includes(id))); 
 for(let t=0;t<2;t++)for(const id of m.teams[t]){const p=player(id);if(!p)continue;p.playedMs=playedTime(p)+elapsedMs;p.games++;p.wins+=Number(t===w);p.losses+=Number(t!==w);p.pointsFor+=m.scores[t];p.pointsAgainst+=m.scores[1-t];}
 let note='';
 if(m.overflow){
   m.teams.flat().forEach(id=>{const p=player(id);p.topStreak=0;queuePlayer(p,m.originalTargets?.[id]??1);});
   note='Court 1 overflow (provisional): results and playing time recorded; original Court 2 eligibility retained';
 }else if(i===0){state.topCompleted++;const newStreak=Math.max(...winIds.map(id=>player(id)?.topStreak||0))+1;
   if(newStreak>=2){winIds.forEach(id=>{player(id).topStreak=0;queuePlayer(player(id),state.courts.length-1);});note=`Top champions won 2 consecutive rounds and descend directly to ${rankName(state.courts.length-1)} for new partners`;}
   else{winIds.forEach(id=>{player(id).topStreak=newStreak;});queuePair(winIds,0,10);note=`Top winners defend: ${newStreak}/2`;}
 }else{winIds.forEach(id=>{player(id).topStreak=0;});queuePair(winIds,i-1,2);note=`Winners ascend to ${rankName(i-1)}`;}
 if(!m.overflow)loseIds.forEach(id=>{const p=player(id);p.topStreak=0;queuePlayer(p,Math.min(i+1,state.courts.length-1));});
 state.history.unshift({id:m.id,court:courtName(i),teams:m.teams.map(t=>t.map(displayName)),scores:[...m.scores],winner:w,note,endedAt:now()});
 state.courts[i]=null;autoFill();save();render();
}
function cancel(i){const m=state.courts[i];if(!m||!confirm('Cancel this match without recording a result?'))return;if(m.overflow){for(const id of m.teams.flat()){const p=player(id);if(p)queuePlayer(p,m.originalTargets?.[id]??1);}}else for(const ids of m.teams)queuePair(ids,i,0);state.courts[i]=null;autoFill();save();render();}
function updateScore(i,t,d){const m=state.courts[i];if(!m||m.pausedAt)return;m.scores[t]=Math.max(0,m.scores[t]+d);save();render();}
function setManualScore(i,t,raw){
 const m=state.courts[i];if(!m)return;
 const value=String(raw).trim();
 if(!/^(0|[1-9]\d*)$/.test(value)||Number(value)>999){alert('Enter a whole-number score from 0 to 999.');render();return;}
 m.scores[t]=Number(value);save();render();
}
function pause(i){const m=state.courts[i];if(!m)return;if(m.pausedAt){m.pausedMs+=now()-m.pausedAt;m.pausedAt=null;}else m.pausedAt=now();save();render();}
function timeout(i,t){const m=state.courts[i];if(!m)return;m.timeouts[t]++;save();render();}
function render(){const s=state.settings;$('courtCount').value=String(state.courts.length);$('target').value=String(s.target);$('winBy').value=String(s.winBy);$('cap').value=String(s.cap);$('autoFill').checked=s.autoFill;
 $('courtLabels').value=state.courtNames.join(', ');
 $('courtOrderEditor').innerHTML=state.courtNames.map((name,i)=>`<div class="court-order-row"><span class="court-order-rank">${i===0?'TOP':`Rank ${i+1}`}</span><strong>Court ${esc(name)}</strong><div class="court-order-buttons"><button class="small secondary" data-action="move-court" data-index="${i}" data-direction="-1" aria-label="Move Court ${esc(name)} higher" ${i===0||state.courts.some(Boolean)?'disabled':''}>↑</button><button class="small secondary" data-action="move-court" data-index="${i}" data-direction="1" aria-label="Move Court ${esc(name)} lower" ${i===state.courtNames.length-1||state.courts.some(Boolean)?'disabled':''}>↓</button></div></div>`).join('');
 const queued=waitingPlayers().length,resting=state.players.filter(p=>p.status==='resting').length;$('playerSummary').textContent=`${state.players.length} players · ${queued} waiting · ${resting} resting · ${state.players.length-queued-resting} playing`;
 $('playersBody').innerHTML=state.players.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(genderLabel(p))}</td><td>${p.status==='playing'?'On court':p.status==='resting'?'Resting':p.substitute?'Waiting · substitute':'Waiting'}</td><td data-wait="${p.id}">${p.status==='waiting'?fmt(now()-p.queuedAt):'—'}</td><td>${p.games}</td><td>${p.wins}–${p.losses}</td><td><button class="small secondary" data-action="${p.status==='resting'?'resume-player':'rest-player'}" data-id="${p.id}" ${p.status==='playing'?'disabled':''}>${p.status==='resting'?'Resume':'Rest'}</button> ${p.status==='waiting'&&state.courts.length>1?`<button class="small secondary" data-action="substitute" data-id="${p.id}" ${p.substitute?'disabled':''}>${p.substitute?'Sub queued':'Sub lower'}</button>`:''} <button class="small secondary" data-action="edit-name" data-id="${p.id}" ${p.status!=='waiting' ? 'disabled' : ''}>Edit name</button> <button class="small danger" data-action="remove" data-id="${p.id}" ${p.status==='playing'?'disabled':''}>Remove</button></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Add players to begin.</td></tr>';
 const sorted=[...state.pendingPairs].filter(q=>q.ids.every(id=>player(id)?.status==='waiting')).sort((a,b)=>(a.target??999)-(b.target??999)||b.priority-a.priority||a.at-b.at);
 const reserved=new Set(sorted.flatMap(q=>q.ids));const singles=waitingPlayers().filter(p=>!reserved.has(p.id)).sort((a,b)=>a.queuedAt-b.queuedAt);
 $('nextQueue').innerHTML=sorted.map((q,k)=>`<tr><td>${k+1}</td><td>${q.ids.map(pid=>`<span>${esc(displayName(pid))} <button class="small secondary" data-action="edit-name" data-id="${pid}">Edit</button> <button class="small secondary" data-action="rest-player" data-id="${pid}">Rest</button></span>`).join(' / ')}</td><td>${q.target===null?'Any available court':esc(rankName(q.target))}</td><td>${q.target===0&&q.priority===10?'Top defender':'Waiting'}</td></tr>`).join('')+singles.map((p,k)=>`<tr><td>${sorted.length+k+1}</td><td>${esc(displayName(p.id))} <button class="small secondary" data-action="edit-name" data-id="${p.id}">Edit</button> <button class="small secondary" data-action="rest-player" data-id="${p.id}">Rest</button></td><td>${p.targetCourt===null?'Any available court':esc(rankName(p.targetCourt))}</td><td>${p.substitute?'Priority substitute':'Mix with incoming players'}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No players waiting.</td></tr>';
 $('courts').innerHTML=state.courts.map((m,i)=>{if(!m)return `<article class="court ${i===0?'top-court':(String(state.courtNames[i]).trim()==='4'?'court-four':'')}"><div class="court-head"><b>${esc(rankName(i))}</b><span class="pill">Available</span></div><div class="empty">Next pairs are shown in the queue</div><button class="secondary" data-action="start" data-court="${i}">Start next match</button></article>`;
 return `<article class="court ${i===0?'top-court':(String(state.courtNames[i]).trim()==='4'?'court-four':'')}"><div class="court-head"><b>${esc(rankName(i))}</b><span class="pill live">${m.overflow?'Overflow · ':''}${m.pausedAt?'Paused':'Live'}</span></div>${m.teams.map((team,t)=>`<div class="team"><div class="team-name">Team ${t?'B':'A'}<br><b>${esc(names(team))}</b>${i===0&&!m.overflow?`<br><span class="muted">Top-court streak: ${Math.max(...team.map(id=>player(id)?.topStreak||0))+1}/2</span>`:''}<br><span class="muted">Timeouts: ${m.timeouts[t]}</span></div><label class="score-entry"><span>Score</span><input class="score-input" type="number" inputmode="numeric" min="0" max="999" step="1" aria-label="Team ${t?'B':'A'} score on ${esc(rankName(i))}" data-manual-score data-court="${i}" data-team="${t}" value="${m.scores[t]}"></label><div><button class="small" data-action="score" data-court="${i}" data-team="${t}" data-delta="1" ${m.pausedAt?'disabled':''}>+1</button><br><button class="small secondary" data-action="score" data-court="${i}" data-team="${t}" data-delta="-1" ${m.pausedAt?'disabled':''}>−1</button></div></div><button class="small secondary" data-action="timeout" data-court="${i}" data-team="${t}">Record Team ${t?'B':'A'} Timeout</button>`).join('')}<p class="clock" data-clock="${i}">Match ${fmt((m.pausedAt||now())-m.startedAt-m.pausedMs)}</p><p class="hint">${winningTeam(m)!==null?'Winning score reached — confirm result.':'Match in progress'}</p><div class="actions"><button class="secondary" data-action="pause" data-court="${i}">${m.pausedAt?'Resume':'Pause'}</button><button data-action="finish" data-court="${i}">Finish</button><button class="danger" data-action="cancel" data-court="${i}">Cancel</button></div></article>`}).join('');
 const ranked=[...state.players].sort((a,b)=>b.wins-a.wins||(b.pointsFor-b.pointsAgainst)-(a.pointsFor-a.pointsAgainst)||a.name.localeCompare(b.name));$('leaderboard').innerHTML=ranked.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}${genderShort(p)?` <span class="gender-tag">${genderShort(p)}</span>`:''}</td><td>${p.wins}</td><td>${p.losses}</td><td data-played="${p.id}">${fmtPlayed(playedTime(p))}</td><td>${p.pointsFor-p.pointsAgainst>0?'+':''}${p.pointsFor-p.pointsAgainst}</td></tr>`).join('')||'<tr><td colspan="6">No results yet.</td></tr>';
 $('history').innerHTML=state.history.slice(0,50).map(h=>`<div class="history-item"><b>${esc(h.teams[0].join(' / '))}</b> ${h.scores[0]}–${h.scores[1]} <b>${esc(h.teams[1].join(' / '))}</b><br><time>${new Date(h.endedAt).toLocaleString()} · ${esc(h.court||'Court')} · Winner: Team ${h.winner?'B':'A'}</time>${h.note?`<p class="hint">${esc(h.note)}</p>`:''}</div>`).join('')||'<p class="muted">Completed matches will appear here.</p>';
}
$('addForm').addEventListener('submit',e=>{e.preventDefault();const name=$('playerName').value.trim(),gender=$('playerGender').value;if(!name)return;if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){alert('Name already registered.');return;}state.players.push({id:uid(),name,gender,status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,playedMs:0});$('playerName').value='';$('playerGender').value='';autoFill();save();render();});
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const {action,court,team,delta,id}=b.dataset,i=Number(court),t=Number(team);if(action==='edit-name'){const p=player(id);if(!p||p.status!=='waiting'){alert('Only waiting players can be renamed.');return;}const entered=prompt('Edit waiting player name:',p.name);if(entered===null)return;const name=entered.trim();if(!name||name.length>40){alert('Enter a name of 1 to 40 characters.');return;}if(state.players.some(other=>other.id!==p.id&&other.name.toLowerCase()===name.toLowerCase())){alert('This name is already registered.');return;}p.name=name;save();render();return;}if(action==='rest-player'){restPlayer(player(id));autoFill();save();render();}if(action==='resume-player'){resumePlayer(player(id));autoFill();save();render();}if(action==='substitute'){requestSubstitute(player(id));autoFill();save();render();}if(action==='remove'){state.players=state.players.filter(p=>p.id!==id);cleanPairs();autoFill();save();render();}if(action==='start'){startMatch(i);render();}if(action==='score')updateScore(i,t,Number(delta));if(action==='finish')finish(i);if(action==='cancel')cancel(i);if(action==='pause')pause(i);if(action==='timeout')timeout(i,t);if(action==='move-court'){const from=Number(b.dataset.index),to=from+Number(b.dataset.direction);if(state.courts.some(Boolean)){alert('Finish or cancel live matches before reordering court numbers.');return;}if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=state.courtNames.length||to>=state.courtNames.length)return;[state.courtNames[from],state.courtNames[to]]=[state.courtNames[to],state.courtNames[from]];save();render();}});
document.addEventListener('change',e=>{const input=e.target.closest('input[data-manual-score]');if(!input)return;setManualScore(Number(input.dataset.court),Number(input.dataset.team),input.value);});
$('courtCount').addEventListener('change',e=>{const n=Number(e.target.value);if(n<state.courts.length&&(state.courts.slice(n).some(Boolean)||state.pendingPairs.some(q=>q.target!==null&&q.target>=n))){alert('Finish affected matches and clear their waiting assignments before reducing courts.');render();return;}state.courts.length=n;for(let i=0;i<n;i++)if(state.courts[i]===undefined)state.courts[i]=null;state.courtNames=Array.from({length:n},(_,i)=>state.courtNames[i]||String(i+1));autoFill();save();render();});
$('saveCourtLabels').addEventListener('click',()=>{const v=$('courtLabels').value.split(',').map(x=>x.trim());if(v.length!==state.courts.length||v.some(x=>!/^\d+$/.test(x))||new Set(v.map(x=>x.toLowerCase())).size!==v.length){alert(`Enter ${state.courts.length} unique court numbers separated by commas, highest court first.`);return;}if(state.courts.some(Boolean)){alert('Finish or cancel live matches before changing court numbers.');render();return;}state.courtNames=v;save();render();});
for(const k of ['target','winBy','cap'])$(k).addEventListener('change',e=>{state.settings[k]=Number(e.target.value);save();render();});
$('autoFill').addEventListener('change',e=>{state.settings.autoFill=e.target.checked;autoFill();save();render();});
$('demoBtn').addEventListener('click',()=>{for(const name of ['Kevin','Alicia','Peter','Jamie','Daniel','Cheryl','Adam','Ern','Hao Yi','Matthew','Lee','John'])if(!state.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))state.players.push({id:uid(),name,gender:'',status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,playedMs:0});autoFill();save();render();});
$('resetStatsBtn').addEventListener('click',()=>{
 const active=state.courts.some(Boolean);
 const message='Reset ALL match statistics and game history?\n\nThis will clear completed games, wins, losses, points, playing time, current scores, live matches, queue pairings and top-court streaks.\n\nAll registered player names, gender information, player IDs, resting choices, court labels and session settings will be kept.'+(active?'\n\nWARNING: Matches currently in progress will also be cleared.':'');
 if(!confirm(message))return;
 const timestamp=now();
 for(const p of state.players){
   p.games=0;p.wins=0;p.losses=0;p.pointsFor=0;p.pointsAgainst=0;p.playedMs=0;p.topStreak=0;
   p.substitute=false;p.targetCourt=null;p.queuedAt=timestamp;
   p.status=p.status==='resting'?'resting':'waiting';
 }
 state.courts=Array(state.courts.length).fill(null);
 state.history=[];state.pendingPairs=[];state.lastPairs=[];state.topCompleted=0;
 // Deliberately do not auto-fill: organizer can start fresh games after resetting.
 save();render();
});
$('resetBtn').addEventListener('click',()=>{if(confirm('Delete all local session data?')){state=fresh();save();render();}});
$('exportBtn').addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.href=url;a.download='ogx-ladder-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const d=JSON.parse(await file.text());if(!Array.isArray(d.players)||!Array.isArray(d.courts)||!Array.isArray(d.history)||!d.settings)throw Error('Invalid backup');if(!confirm('Replace the current browser session?'))return;state={...fresh(),...d};state.courtNames=Array.isArray(d.courtNames)&&d.courtNames.length===d.courts.length?d.courtNames:d.courts.map((_,i)=>String(i+1));state.pendingPairs=Array.isArray(d.pendingPairs)?d.pendingPairs:[];state.players.forEach(p=>{p.gender=typeof p.gender==='string'?p.gender:'';p.topStreak=p.topStreak||0;p.targetCourt=Number.isInteger(p.targetCourt)?p.targetCourt:null;p.substitute=Boolean(p.substitute);p.playedMs=Number.isFinite(Number(p.playedMs))?Math.max(0,Number(p.playedMs)):0;});save();render();}catch(err){alert('Import failed: '+err.message);}finally{e.target.value='';}});
setInterval(()=>{for(const p of state.players){const el=document.querySelector(`[data-wait="${p.id}"]`);if(el&&p.status==='waiting')el.textContent=fmt(now()-p.queuedAt);}state.courts.forEach((m,i)=>{const el=document.querySelector(`[data-clock="${i}"]`);if(m&&el)el.textContent='Match '+fmt((m.pausedAt||now())-m.startedAt-m.pausedMs);});},1000);
// Do not auto-fill imported sessions until the user has inspected them.
save();render();
