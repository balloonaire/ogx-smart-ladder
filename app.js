'use strict';
// OGX Smart Ladder v12 — court 0 is the highest-ranked court, regardless of its physical label.
const KEY='ogx-smart-ladder-v2', OLD='ogx-smart-ladder-v1';
const $=id=>document.getElementById(id), now=()=>Date.now();
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const fresh=()=>({players:[],courts:Array(4).fill(null),courtNames:['1','2','3','4'],pendingPairs:[],history:[],topCompleted:0,settings:{target:11,winBy:2,cap:0,autoFill:true,topCourt:true,quickWin:false,liveReplacement:true,socialBalance:false,socialBalanceMethod:'balanced',socialFriendlyRules:false,socialAccessibility:false,singles:false,singlesCourts:[],scoringMethod:'rally'},lastPairs:[]});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||JSON.parse(localStorage.getItem(OLD))||fresh();if(!Array.isArray(state.players)||!Array.isArray(state.courts)||!Array.isArray(state.history))throw Error('Invalid');}catch{state=fresh();}
state.pendingPairs=Array.isArray(state.pendingPairs)?state.pendingPairs:[];state.topCompleted=Number(state.topCompleted)||0;
state.courtNames=Array.isArray(state.courtNames)?state.courtNames:state.courts.map((_,i)=>String(i+1));
state.settings={...fresh().settings,...state.settings};
state.settings.singlesCourts=Array.isArray(state.settings.singlesCourts)?state.settings.singlesCourts:[];
state.lastPairs=Array.isArray(state.lastPairs)?state.lastPairs:[];
if(!state.settings.topCourt){state.pendingPairs=[];for(const p of state.players){if(p.status==='waiting'){p.targetCourt=null;p.substitute=false;}p.topStreak=0;}}
for(const p of state.players){p.attendance=['show','no-show','pending'].includes(p.attendance)?p.attendance:'show';p.gender=typeof p.gender==='string'?p.gender:'';p.fixedPartnerId=typeof p.fixedPartnerId==='string'?p.fixedPartnerId:null;p.topStreak=p.topStreak||0;p.targetCourt=Number.isInteger(p.targetCourt)?p.targetCourt:null;p.substitute=Boolean(p.substitute);p.playedMs=Number.isFinite(Number(p.playedMs))?Math.max(0,Number(p.playedMs)):0;p.fixedPartnerId=typeof p.fixedPartnerId==='string'?p.fixedPartnerId:null;}
const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));if(typeof cloudScheduleSave==='function')cloudScheduleSave();};
// Separate persistent registry; independent from match/session resets.
const REGISTRY_KEY='ogx-smart-ladder-regular-players-v1';
function readRegistry(){
 try{
  const data=JSON.parse(localStorage.getItem(REGISTRY_KEY)||'[]');
  if(!Array.isArray(data))return [];
  return data.filter(x=>x&&typeof x.name==='string'&&x.name.trim()&&x.name.length<=40)
   .map(x=>({name:x.name.trim(),gender:typeof x.gender==='string'?x.gender:''}))
   .filter((x,i,a)=>a.findIndex(y=>y.name.toLocaleLowerCase()===x.name.toLocaleLowerCase())===i);
 }catch{return [];}
}
function writeRegistry(list){localStorage.setItem(REGISTRY_KEY,JSON.stringify(list));renderRegistry();}
function downloadJSON(name,data){
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function renderRegistry(){
 const el=$('registrySummary');
 if(el)el.textContent=`${readRegistry().length} regular player${readRegistry().length===1?'':'s'} saved on this browser`;
}
function addRegistryToSession(){
 const registry=readRegistry(),known=new Set(state.players.map(p=>p.name.trim().toLocaleLowerCase()));
 let added=0;
 for(const item of registry){
  if(known.has(item.name.toLocaleLowerCase()))continue;
  state.players.push({id:uid(),name:item.name,gender:item.gender,attendance:'pending',status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,playedMs:0});
  known.add(item.name.toLocaleLowerCase());added++;
 }
 save();render();alert(`${added} regular player${added===1?'':'s'} loaded as Pending. ${registry.length-added} already registered.`);
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=ms=>{let n=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const fmtPlayed=ms=>{let n=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const player=id=>state.players.find(p=>p.id===id);
const genderLabel=p=>p?.gender||'Not specified';
const genderShort=p=>p?.gender==='Male'?'M':p?.gender==='Female'?'F':'';
const playedTime=p=>Math.max(0,Number(p?.playedMs)||0);
const displayName=id=>{const p=player(id);return p?`${p.name}${p.gender&&p.gender!=='Prefer not to say'?` (${p.gender})`:''}`:'Unknown';};
const names=ids=>ids.map(displayName).join(' / ');
const courtNames=ids=>ids.map(id=>player(id)?.name||'Unknown').join(' / ');
function fixedMate(p){const mate=player(p?.fixedPartnerId);return mate?.fixedPartnerId===p?.id?mate:null;}
function unlinkFixed(p){if(!p)return;const mate=fixedMate(p);if(mate)mate.fixedPartnerId=null;p.fixedPartnerId=null;}
function setFixedPair(a,b){
 if(!a||!b||a.id===b.id||a.status==='playing'||b.status==='playing'){alert('Choose two different players who are not currently playing.');return;}
 unlinkFixed(a);unlinkFixed(b);a.fixedPartnerId=b.id;b.fixedPartnerId=a.id;
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(a.id)&&!q.ids.includes(b.id));
 save();render();
}

const courtName=i=>state.courtNames[i]||String(i+1);
const rankName=i=>`Court ${courtName(i)}${i===0&&state.settings.topCourt?' · TOP':''}`;
const socialPlay=()=>!state.settings.topCourt;
const singlesCourt=i=>Boolean(state.settings.singles)&&state.settings.singlesCourts.includes(state.courtNames[i]);
const singlesPlay=()=>Boolean(state.settings.singles);
function startSinglesMatch(i){
 if(state.courts[i])return false;
 const pool=waitingPlayers();
 let eligible=socialPlay()?pool:pool.filter(p=>p.targetCourt===i||p.targetCourt===null||(i===state.courts.length-1&&p.targetCourt>0));
 if(eligible.length<2)return false;
 eligible=shuffle(eligible).sort((a,b)=>socialPlay()?a.games-b.games||playedTime(a)-playedTime(b):(a.targetCourt===i?0:1)-(b.targetCourt===i?0:1)||a.games-b.games||playedTime(a)-playedTime(b));
 const chosen=eligible.slice(0,2),teams=[[chosen[0].id],[chosen[1].id]];
 chosen.forEach(p=>{p.status='playing';p.substitute=false;});
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>chosen.some(p=>p.id===id)));
 state.courts[i]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0],servingTeam:0,serverNumber:2,social:socialPlay(),singles:true};
 save();return true;
}

const shuffle=items=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function queuePlayer(p,target=null){p.status='waiting';p.queuedAt=now();p.targetCourt=target;p.substitute=false;}
function waitingPlayers(){return state.players.filter(p=>p.status==='waiting'&&p.attendance==='show');}
function restPlayer(p){if(!p||p.status==='playing')return;p.status='resting';p.substitute=false;state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(p.id));}
function resumePlayer(p){if(!p||p.status!=='resting')return;queuePlayer(p,p.targetCourt);p.substitute=false;}
function requestSubstitute(p){if(!p||p.status!=='waiting'||p.attendance!=='show'||state.courts.length<2)return;state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(p.id));p.targetCourt=state.courts.length-1;p.substitute=true;p.queuedAt=now();}

function cleanPairs(){state.pendingPairs=state.pendingPairs.filter(q=>q.ids.length===2&&q.ids.every(id=>player(id)?.status==='waiting'&&player(id)?.attendance==='show'));}
function queuePair(ids,target,priority=0){const valid=ids.map(player).filter(Boolean);if(valid.length!==2)return;const stamp=now();valid.forEach(p=>{queuePlayer(p,target);p.queuedAt=stamp;});state.pendingPairs.push({ids:[...ids],target,priority,at:stamp,id:uid()});}
// Reserve promoted TOP contenders as pairs; mix individuals on lower courts.
function takePairsForCourt(i){
 cleanPairs();
 const eligible=q=>q.target===i&&(q.blockedUntil===undefined||q.blockedUntil<=state.topCompleted);
 const ranked=state.pendingPairs.filter(eligible).sort((a,b)=>b.priority-a.priority||a.at-b.at);
 const locked=i===0&&state.settings.topCourt?ranked.slice(0,2):[];
 const selected=locked.map(q=>[...q.ids]);
 const used=new Set(selected.flat());
 const reserved=new Set(state.pendingPairs.filter(q=>!locked.includes(q)).flatMap(q=>q.ids));
 // For lower courts, even old pair reservations are dissolved and remixed.
 const localPairs=i===0&&state.settings.topCourt?[]:ranked;
 const localIds=localPairs.flatMap(q=>q.ids);
 localIds.forEach(id=>reserved.delete(id));
 const available=waitingPlayers().filter(p=>!used.has(p.id)&&!reserved.has(p.id)&&(p.targetCourt===i||p.targetCourt===null||(i===state.courts.length-1&&p.targetCourt>0)));
 available.sort((a,b)=>Number(b.substitute)-Number(a.substitute)||(a.targetCourt===i?0:1)-(b.targetCourt===i?0:1)||a.games-b.games||playedTime(a)-playedTime(b)||a.queuedAt-b.queuedAt);
 const need=4-selected.length*2;
 const poolIds=new Set(available.map(p=>p.id));
 // Fixed partners are inseparable: both must be eligible for this court.
 const eligiblePlayers=available.filter(p=>!fixedMate(p)||poolIds.has(p.fixedPartnerId));
 const fixedTeams=[],consumed=new Set();
 for(const p of eligiblePlayers){
  const mate=fixedMate(p);
  if(mate&&!consumed.has(p.id)&&!consumed.has(mate.id)&&fixedTeams.length*2<need){
   fixedTeams.push([p.id,mate.id]);consumed.add(p.id);consumed.add(mate.id);
  }
 }
 const chosenFixed=fixedTeams.slice(0,Math.floor(need/2));
 const taken=new Set(chosenFixed.flat());
 const remaining=eligiblePlayers.filter(p=>!taken.has(p.id)&&!fixedMate(p)).map(p=>p.id);
 const remainingNeed=need-taken.size;
 if(remaining.length<remainingNeed)return null;
 const picked=remaining.slice(0,remainingNeed);
 if(i===0){
  selected.push(...chosenFixed);
  for(let k=0;k<picked.length;k+=2)selected.push(picked.slice(k,k+2));
 }else if(chosenFixed.length===2){
  selected.push(...chosenFixed);
 }else if(chosenFixed.length===1){
  selected.push(chosenFixed[0],[picked[0],picked[1]]);
 }else{
  selected.push([picked[0],picked[2]],[picked[1],picked[3]]);
  const pairKey=ids=>[...ids].sort().join('|');
  if(state.lastPairs.includes(pairKey(selected[0]))||state.lastPairs.includes(pairKey(selected[1])))
   [selected[0][1],selected[1][1]]=[selected[1][1],selected[0][1]];
 }
 const assigned=new Set(selected.flat());
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>assigned.has(id)));
 return selected;
}
// Dynamic Court Allocation: normal ladder placement always runs first.
// Borrow waiting players only when their assigned court is occupied, protecting TOP reservations.
function takeDynamicOverflow(i){
 if(state.courts[i]||state.courts.length<2)return null;
 cleanPairs();
 // Never use an idle TOP court while a defender or promoted contender is reserved.
 if(i===0&&state.settings.topCourt&&(state.pendingPairs.some(q=>q.target===0)||waitingPlayers().some(p=>p.targetCourt===0)))return null;
 const reservedTop=new Set(state.pendingPairs.filter(q=>q.target===0).flatMap(q=>q.ids));
 const eligible=waitingPlayers().filter(p=>!fixedMate(p)&&!reservedTop.has(p.id)&&Number.isInteger(p.targetCourt)&&p.targetCourt!==i&&p.targetCourt>=0&&p.targetCourt<state.courts.length&&Boolean(state.courts[p.targetCourt]));
 // Borrow from ONE blocked destination queue, never combine unrelated ladder levels.
 const groups=new Map();
 for(const p of eligible){if(!groups.has(p.targetCourt))groups.set(p.targetCourt,[]);groups.get(p.targetCourt).push(p);}
 const candidates=[...groups.entries()].filter(([,players])=>players.length>=4);
 if(!candidates.length)return null;
 // Adjacent ranked courts first; then prioritize the longest-waiting eligible group.
 candidates.sort((a,b)=>Math.abs(a[0]-i)-Math.abs(b[0]-i)||Math.min(...a[1].map(p=>p.queuedAt))-Math.min(...b[1].map(p=>p.queuedAt)));
 const [sourceCourt,pool]=candidates[0];
 pool.sort((a,b)=>a.games-b.games||playedTime(a)-playedTime(b)||a.queuedAt-b.queuedAt);
 const chosen=pool.slice(0,4),ids=new Set(chosen.map(p=>p.id));
 const originalTargets=Object.fromEntries(chosen.map(p=>[p.id,p.targetCourt]));
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>ids.has(id)));
 const teams=[[chosen[0].id,chosen[2].id],[chosen[1].id,chosen[3].id]];
 chosen.forEach(p=>{p.status='playing';p.substitute=false;});
 return {teams,originalTargets,sourceCourt};
}
function startDynamicOverflow(i){
 const selected=takeDynamicOverflow(i);if(!selected)return false;
 const teams=selected.teams;
 state.courts[i]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0],servingTeam:0,serverNumber:2,overflow:true,originalTargets:selected.originalTargets,overflowSource:selected.sourceCourt};
 state.lastPairs.push(...teams.map(t=>[...t].sort().join('|')));state.lastPairs=state.lastPairs.slice(-16);
 save();return true;
}
// V26 trial: opt-in social doubles only. No changes to singles or ladder matchmaking.
const socialBalanceActive=()=>socialPlay()&&Boolean(state.settings.socialBalance);
const experienceValue=id=>({new:1,developing:2,experienced:3})[player(id)?.socialExperience]??2;
function balanceSocialTeams(units){
 // Preserve fixed pairs; only rearrange four selected players. Never delay a player to optimize skill.
 const fixed=units.filter(u=>u.length===2),free=shuffle(units.filter(u=>u.length===1).flat());
 if(fixed.length===2)return [fixed[0],fixed[1]];
 if(fixed.length===1)return [fixed[0],free.slice(0,2)];
 const candidates=[[[free[0],free[1]],[free[2],free[3]]],[[free[0],free[2]],[free[1],free[3]]],[[free[0],free[3]],[free[1],free[2]]]];
 // Prefer comparable team totals and mix experience within partnerships, breaking ties randomly.
 return shuffle(candidates).sort((a,b)=>Math.abs(a[0].reduce((n,id)=>n+experienceValue(id),0)-a[1].reduce((n,id)=>n+experienceValue(id),0))-Math.abs(b[0].reduce((n,id)=>n+experienceValue(id),0)-b[1].reduce((n,id)=>n+experienceValue(id),0)))[0];
}
// SOCIAL PLAY: no court ranking, promotion, relegation, defender pairs or overflow.
// Select any four eligible waiting players; reciprocal fixed partners stay together.
function startSocialMatch(i){
 if(state.courts[i])return false;
 const waiting=waitingPlayers();
 const eligible=new Map(waiting.map(p=>[p.id,p]));
 const units=[],seen=new Set();
 for(const p of waiting){
  if(seen.has(p.id))continue;
  const mate=fixedMate(p);
  if(mate){if(!eligible.has(mate.id))continue;units.push([p.id,mate.id]);seen.add(p.id);seen.add(mate.id);}
  else{units.push([p.id]);seen.add(p.id);}
 }
 // Prefer players who have played fewer games, with random tie-breaking.
 const randomized=shuffle(units).sort((a,b)=>Math.max(...a.map(id=>player(id).games))-Math.max(...b.map(id=>player(id).games)));
 let selected=null;
 function choose(pos,chosen,total){
  if(total===4){selected=[...chosen];return true;}
  if(total>4||pos>=randomized.length)return false;
  for(let j=pos;j<randomized.length;j++)if(choose(j+1,[...chosen,randomized[j]],total+randomized[j].length))return true;
  return false;
 }
 if(!choose(0,[],0))return false;
 const fixed=selected.filter(u=>u.length===2),singles=shuffle(selected.filter(u=>u.length===1).flat());
 const teams=socialBalanceActive()&&state.settings.socialBalanceMethod==='balanced'?balanceSocialTeams(selected):fixed.length===2?[fixed[0],fixed[1]]:fixed.length===1?[fixed[0],singles.slice(0,2)]:[singles.slice(0,2),singles.slice(2,4)];
 if(Math.random()<.5)teams.reverse();
 teams.flat().forEach(id=>{const pl=player(id);pl.status='playing';pl.substitute=false;pl.targetCourt=null;});
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>teams.flat().includes(id)));
 state.courts[i]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0],servingTeam:0,serverNumber:2,social:true,socialBalance:socialBalanceActive(),friendlyRule:null};
 save();return true;
}
function startMatch(i,allowOverflow=true){if(singlesCourt(i))return startSinglesMatch(i);if(socialPlay())return startSocialMatch(i);if(state.courts[i])return false;const teams=takePairsForCourt(i);if(!teams)return allowOverflow?startDynamicOverflow(i):false;teams.flat().forEach(id=>{player(id).status='playing';player(id).substitute=false;});
 state.courts[i]={id:uid(),teams,scores:[0,0],startedAt:now(),pausedAt:null,pausedMs:0,timeouts:[0,0],servingTeam:0,serverNumber:2};
 state.lastPairs.push(...teams.map(t=>[...t].sort().join('|')));state.lastPairs=state.lastPairs.slice(-16);save();return true;
}
function autoFill(){if(!state.settings.autoFill)return;
 // Fill reserved singles courts first, without interrupting live doubles.
 for(let i=0;i<state.courts.length;i++)if(!state.courts[i]&&singlesCourt(i))startSinglesMatch(i);
 if(socialPlay()){for(let i=0;i<state.courts.length;i++)if(!state.courts[i]&&!singlesCourt(i))startSocialMatch(i);return;}
 // Normal placements take priority on ALL courts before any overflow borrowing.
 for(let i=0;i<state.courts.length;i++)if(!state.courts[i]&&!singlesCourt(i))startMatch(i,false);
 for(let i=0;i<state.courts.length;i++)if(!state.courts[i]&&!singlesCourt(i))startDynamicOverflow(i);
}
function winningTeam(m){const [a,b]=m.scores,{target,winBy,cap}=state.settings;return (a>=target&&a-b>=winBy)||(cap>0&&a>=cap&&a>b)?0:(b>=target&&b-a>=winBy)||(cap>0&&b>=cap&&b>a)?1:null;}
function finish(i,forcedWinner=null){const m=state.courts[i];if(!m)return;const qualified=forcedWinner===null?winningTeam(m):forcedWinner;if(forcedWinner===null&&qualified===null&&!confirm('Winning condition not reached. Confirm the leading team as winner?'))return;
 const w=forcedWinner!==null?forcedWinner:qualified===null?(m.scores[0]>m.scores[1]?0:m.scores[1]>m.scores[0]?1:null):qualified;if(w===null){alert('Cannot finish a tied match.');return;}
 const winIds=m.teams[w],loseIds=m.teams[1-w];
 const elapsedMs=Math.max(0,(m.pausedAt||now())-m.startedAt-(m.pausedMs||0));
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.some(id=>m.teams.flat().includes(id))); 
 for(let t=0;t<2;t++)for(const id of m.teams[t]){const p=player(id);if(!p)continue;p.playedMs=playedTime(p)+Math.max(0,elapsedMs-(m.participationStart?.[id]||0));p.games++;p.wins+=Number(t===w);p.losses+=Number(t!==w);if(!m.resultOnly){p.pointsFor+=m.scores[t];p.pointsAgainst+=m.scores[1-t];}}
 let note='';
 if(m.social||socialPlay()){
   m.teams.flat().forEach(id=>{const p=player(id);if(p){p.topStreak=0;queuePlayer(p,null);}});
   note='SOCIAL PLAY · no promotion or relegation'+(m.socialBalance?' · OGX Social Balance trial':'')+(m.friendlyRule?' · Friendly rule: '+(m.friendlyRule==='controlled'?'controlled opening return':'limited overhead attacks'):'');
 }else if(m.singles){
   if(i===0){state.topCompleted++;const winner=player(winIds[0]);const streak=(winner.topStreak||0)+1;winner.topStreak=streak>=2?0:streak;queuePlayer(winner,streak>=2?state.courts.length-1:0);note=streak>=2?'Singles TOP champion completed 2 defenses':'Singles TOP champion defends';}
   else{winIds.forEach(id=>{const p=player(id);p.topStreak=0;queuePlayer(p,i-1);});note='Singles winner ascends one court';}
 }else if(m.overflow){
   m.teams.flat().forEach(id=>{const p=player(id);p.topStreak=0;queuePlayer(p,m.originalTargets?.[id]??1);});
   note=`Dynamic overflow on ${rankName(i)} (from ${rankName(m.overflowSource??1)}): results recorded; original ladder eligibility retained`;
 }else if(i===0&&state.settings.topCourt){state.topCompleted++;const newStreak=Math.max(...winIds.map(id=>player(id)?.topStreak||0))+1;
   if(newStreak>=2){winIds.forEach(id=>{player(id).topStreak=0;queuePlayer(player(id),state.courts.length-1);});note=`Top champions won 2 consecutive rounds and descend directly to ${rankName(state.courts.length-1)} for new partners`;}
   else{winIds.forEach(id=>{player(id).topStreak=newStreak;});queuePair(winIds,0,10);note=`Top winners defend: ${newStreak}/2`;}
 }else{winIds.forEach(id=>{player(id).topStreak=0;});if(i===0){winIds.forEach(id=>queuePlayer(player(id),0));note='Court 1 result recorded; TOP defense disabled';}else{queuePair(winIds,i-1,2);note=`Winners ascend to ${rankName(i-1)}`;}}
 if(!m.overflow&&!m.social&&!socialPlay())loseIds.forEach(id=>{const p=player(id);p.topStreak=0;queuePlayer(p,Math.min(i+1,state.courts.length-1));});
 if(m.replacements?.length)note+=(note?' · ':'')+`Live replacements: ${m.replacements.map(r=>`${r.outName} → ${r.inName} (Team ${r.team?'B':'A'})`).join('; ')}`;
 state.history.unshift({id:m.id,court:courtName(i),teams:m.teams.map(t=>t.map(displayName)),scores:[...m.scores],winner:w,resultOnly:Boolean(m.resultOnly),note,endedAt:now()});
 state.courts[i]=null;autoFill();save();render();
}
// V27: replace one participant in an active match without restarting it.
function replaceLivePlayer(i,t,slot){
 if(!state.settings.liveReplacement)return;
 const m=state.courts[i];if(!m||![0,1].includes(t)||!Number.isInteger(slot)||slot<0||slot>=m.teams[t].length)return;
 const outgoing=player(m.teams[t][slot]);if(!outgoing)return;
 const available=state.players.filter(p=>p.status==='waiting'&&p.attendance==='show'&&!m.teams.flat().includes(p.id));
 if(!available.length){alert('No checked-in waiting players available. Add or check in a replacement first.');return;}
 const answer=prompt(`Replace ${outgoing.name} on Court ${courtName(i)} · Team ${t?'B':'A'}?\nSelect a waiting player by number:\n${available.map((p,k)=>`${k+1}. ${p.name}`).join('\n')}`);
 if(answer===null)return;
 if(!/^[1-9]\d*$/.test(answer.trim())||Number(answer)>available.length){alert('Choose a valid player number.');return;}
 const incoming=available[Number(answer)-1];
 if(!confirm(`Replace ${outgoing.name} with ${incoming.name}?\nCurrent score, clock, timeouts and team position will stay unchanged.`))return;
 // Count only the outgoing player's elapsed participation; no win/loss awarded.
 const timestamp=now();const activeMs=Math.max(0,(m.pausedAt||timestamp)-m.startedAt-(m.pausedMs||0));
 const previousMs=(m.participationStart?.[outgoing.id]??0);
 outgoing.playedMs=playedTime(outgoing)+Math.max(0,activeMs-previousMs);
 m.participationStart=m.participationStart||{};
 delete m.participationStart[outgoing.id];m.participationStart[incoming.id]=activeMs;
 m.replacements=Array.isArray(m.replacements)?m.replacements:[];
 m.replacements.push({team:t,slot,outId:outgoing.id,inId:incoming.id,outName:outgoing.name,inName:incoming.name,at:timestamp});
 // Preserve match state; remove incoming player from any waiting pair.
 state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(incoming.id));
 m.teams[t][slot]=incoming.id;incoming.status='playing';incoming.substitute=false;incoming.targetCourt=null;
 queuePlayer(outgoing,null); // Outgoing player may rest via the normal Players controls.
 save();render();
}
function declareWinner(i,t){
 if(!state.settings.quickWin)return;
 const m=state.courts[i];if(!m||![0,1].includes(t))return;
 const team=m.teams[t].map(displayName).join(' / ');
 if(!confirm(`Declare ${team} (Team ${t===0?'A':'B'}) the WINNER of Court ${courtName(i)} without entering points? This will finish the match and update player records.`))return;
 m.resultOnly=true;
 finish(i,t);
}
function cancel(i){const m=state.courts[i];if(!m||!confirm('Cancel this match without recording a result?'))return;if(m.social||socialPlay()){for(const id of m.teams.flat()){const p=player(id);if(p)queuePlayer(p,null);}}else if(m.overflow){for(const id of m.teams.flat()){const p=player(id);if(p)queuePlayer(p,m.originalTargets?.[id]??1);}}else if(m.singles){for(const id of m.teams.flat()){const p=player(id);if(p)queuePlayer(p,i);}}else for(const ids of m.teams)queuePair(ids,i,0);state.courts[i]=null;autoFill();save();render();}
function updateScore(i,t,d){const m=state.courts[i];if(!m||m.pausedAt)return;if(state.settings.scoringMethod==='sideout'&&d>0&&m.servingTeam!==t){alert('Side-out scoring: only the serving team can earn a point. Switch server first.');return;}m.scores[t]=Math.max(0,m.scores[t]+d);save();render();}
function switchServe(i){const m=state.courts[i];if(!m)return;if(m.serverNumber===1)m.serverNumber=2;else{m.servingTeam=1-(m.servingTeam||0);m.serverNumber=1;}save();render();}
function setManualScore(i,t,raw){
 const m=state.courts[i];if(!m)return;
 const value=String(raw).trim();
 if(!/^(0|[1-9]\d*)$/.test(value)||Number(value)>999){alert('Enter a whole-number score from 0 to 999.');render();return;}
 m.scores[t]=Number(value);save();render();
}
function pause(i){const m=state.courts[i];if(!m)return;if(m.pausedAt){m.pausedMs+=now()-m.pausedAt;m.pausedAt=null;}else m.pausedAt=now();save();render();}
function timeout(i,t){const m=state.courts[i];if(!m)return;m.timeouts=Array.isArray(m.timeouts)?m.timeouts:[0,0];m.timeouts[t]=Math.min(3,Math.max(0,Number(m.timeouts[t])||0)+1);save();render();}
const attendanceSelection=new Set();
function tickMarkup(p){
 return `<label class="bulk-tick"><input type="checkbox" data-attendance-check="${p.id}" aria-label="Select ${esc(p.name)}" ${attendanceSelection.has(p.id)?'checked':''} ${p.status==='playing'?'disabled title="Player is currently playing"':''}></label>`;
}
function syncAllAttendanceChecks(){
 document.querySelectorAll('input[data-attendance-check]').forEach(c=>{c.checked=attendanceSelection.has(c.dataset.attendanceCheck);});
}
function updateQuickAttendanceUI(){
 for(const bar of document.querySelectorAll('.quick-attendance-toolbar')){
  const scope=bar.querySelector('[data-select-all-scope]').dataset.selectAllScope;
  const body=$(scope==='players'?'playersBody':'nextQueue');
  const eligible=[...body.querySelectorAll('tr:not([hidden]) input[data-attendance-check]:not(:disabled)')];
  const checked=eligible.filter(c=>attendanceSelection.has(c.dataset.attendanceCheck)).length;
  const all=bar.querySelector('[data-select-all-scope]');
  all.checked=eligible.length>0&&checked===eligible.length;
  all.indeterminate=checked>0&&checked<eligible.length;
  bar.querySelector('[data-selected-count]').textContent=`${attendanceSelection.size} selected`;
 }
}

function updateAttendanceSelectionUI(){
 const checks=[...document.querySelectorAll('#attendanceBody input[data-attendance-check]:not(:disabled)')];
 const selected=checks.filter(c=>c.checked).length;
 $('selectedAttendanceCount').textContent=`${attendanceSelection.size} selected`;
 $('selectAllAttendance').checked=checks.length>0&&selected===checks.length;
 $('selectAllAttendance').indeterminate=selected>0&&selected<checks.length;
 updateQuickAttendanceUI();
}
function filterRows(){
 const norm=v=>v.trim().toLocaleLowerCase();
 const playerTerm=norm($('playersSearch').value),queueTerm=norm($('queueSearch').value),attendanceTerm=norm($('attendanceSearch').value);
 for(const row of $('playersBody').querySelectorAll('tr[data-player-row]'))row.hidden=!row.dataset.searchName.includes(playerTerm);
 for(const row of $('nextQueue').querySelectorAll('tr[data-queue-row]'))row.hidden=!row.dataset.searchName.includes(queueTerm);
 for(const row of $('attendanceBody').querySelectorAll('tr[data-attendance-row]'))row.hidden=!row.dataset.searchName.includes(attendanceTerm);
 updateAttendanceSelectionUI();
}
function render(){const s=state.settings;$('courtCount').value=String(state.courts.length);$('target').value=String(s.target);$('winBy').value=String(s.winBy);$('cap').value=String(s.cap);$('autoFill').checked=s.autoFill;$('topCourtEnabled').checked=s.topCourt;$('singlesEnabled').checked=Boolean(s.singles);$('quickWinEnabled').checked=Boolean(s.quickWin);$('liveReplacementEnabled').checked=s.liveReplacement!==false;$('socialBalanceEnabled').checked=Boolean(s.socialBalance);$('socialBalanceMethod').value=s.socialBalanceMethod||'balanced';$('socialFriendlyRules').checked=Boolean(s.socialFriendlyRules);$('socialAccessibility').checked=Boolean(s.socialAccessibility);$('socialBalanceControls').hidden=!socialPlay();$('socialBalanceOptions').hidden=!socialPlay()||!s.socialBalance;
 const singleChoices=$('singlesCourtChoices');
 if(singleChoices)singleChoices.innerHTML=state.courtNames.map((name,i)=>`<label class="single-court-choice"><input type="checkbox" data-single-court="${esc(name)}" ${s.singlesCourts.includes(name)&&s.singles?'checked':''} ${state.courts[i]?'disabled title="Court has a live match"':''} ${!s.singles?'disabled':''}> Court ${esc(name)} ${state.courts[i]?'· Live':''}</label>`).join('');$('scoringMethod').value=s.scoringMethod;
 $('courtLabels').value=state.courtNames.join(', ');
 $('courtOrderEditor').innerHTML=state.courtNames.map((name,i)=>`<div class="court-order-row"><span class="court-order-rank">${s.topCourt?(i===0?'TOP':`Rank ${i+1}`):'SOCIAL'}</span><strong>Court ${esc(name)}</strong><div class="court-order-buttons"><button class="small secondary" data-action="move-court" data-index="${i}" data-direction="-1" aria-label="Move Court ${esc(name)} higher" ${i===0||state.courts.some(Boolean)?'disabled':''}>↑</button><button class="small secondary" data-action="move-court" data-index="${i}" data-direction="1" aria-label="Move Court ${esc(name)} lower" ${i===state.courtNames.length-1||state.courts.some(Boolean)?'disabled':''}>↓</button></div></div>`).join('');
 const queued=waitingPlayers().length,resting=state.players.filter(p=>p.status==='resting').length;$('playerSummary').textContent=`${state.players.length} registered · ${state.players.filter(p=>p.attendance==='show').length} SHOW · ${state.players.filter(p=>p.attendance==='pending').length} Pending · ${state.players.filter(p=>p.attendance==='no-show').length} NO SHOW · ${queued} waiting · ${resting} resting`;
 $('playersBody').innerHTML=state.players.map(p=>`<tr data-player-row data-search-name="${esc(p.name.toLocaleLowerCase())}"><td>${tickMarkup(p)}</td><td>${esc(p.name)}<div class="experience-picker" ${socialBalanceActive()?'':'hidden'}><label>Social experience <select data-social-experience="${p.id}" aria-label="Social experience preference for ${esc(p.name)}"><option value="open" ${p.socialExperience==='open'||!p.socialExperience?'selected':''}>Open to all</option><option value="new" ${p.socialExperience==='new'?'selected':''}>New</option><option value="developing" ${p.socialExperience==='developing'?'selected':''}>Developing</option><option value="experienced" ${p.socialExperience==='experienced'?'selected':''}>Experienced</option></select></label></div></td><td>${esc(genderLabel(p))}</td><td><select class="attendance-select" data-attendance-id="${p.id}" aria-label="Attendance for ${esc(p.name)}" ${p.status==='playing'?'disabled title="Finish match before changing attendance"':''}><option value="pending" ${p.attendance==='pending'?'selected':''}>Pending</option><option value="show" ${p.attendance==='show'?'selected':''}>SHOW</option><option value="no-show" ${p.attendance==='no-show'?'selected':''}>NO SHOW</option></select></td><td>${p.status==='playing'?'On court':p.status==='resting'?'Resting':p.substitute?'Waiting · substitute':'Waiting'}</td><td data-wait="${p.id}">${p.status==='waiting'&&p.attendance==='show'?fmt(now()-p.queuedAt):'—'}</td><td><label class="fixed-pair-label"><input type="checkbox" data-fixed-toggle="${p.id}" ${fixedMate(p)?'checked':''} ${p.status==='playing'?'disabled':''} aria-label="Fixed partner for ${esc(p.name)}"> Fixed</label><select class="fixed-partner-select" data-fixed-select="${p.id}" aria-label="Choose fixed partner for ${esc(p.name)}" ${p.status==='playing'?'disabled':''}><option value="">${fixedMate(p)?'Change partner':'Choose partner'}</option>${state.players.filter(other=>other.id!==p.id&&other.status!=='playing').map(other=>`<option value="${other.id}" ${p.fixedPartnerId===other.id?'selected':''}>${esc(other.name)}</option>`).join('')}</select></td><td>${p.games}</td><td>${p.wins}–${p.losses}</td><td><button class="small secondary" data-action="${p.status==='resting'?'resume-player':'rest-player'}" data-id="${p.id}" ${p.status==='playing'?'disabled':''}>${p.status==='resting'?'Resume':'Rest'}</button> ${p.status==='waiting'&&state.courts.length>1?`<button class="small secondary" data-action="substitute" data-id="${p.id}" ${p.substitute?'disabled':''}>${p.substitute?'Sub queued':'Sub lower'}</button>`:''} <button class="small secondary" data-action="edit-name" data-id="${p.id}" ${p.status!=='waiting' ? 'disabled' : ''}>Edit name</button> <button class="small danger" data-action="remove" data-id="${p.id}" ${p.status==='playing'?'disabled':''}>Remove</button></td></tr>`).join('')||'<tr><td colspan="9" class="muted">Add players to begin.</td></tr>';
 const sorted=[...state.pendingPairs].filter(q=>q.ids.every(id=>player(id)?.status==='waiting'&&player(id)?.attendance==='show')).sort((a,b)=>(a.target??999)-(b.target??999)||b.priority-a.priority||a.at-b.at);
 const reserved=new Set(sorted.flatMap(q=>q.ids));const singles=waitingPlayers().filter(p=>!reserved.has(p.id)).sort((a,b)=>a.queuedAt-b.queuedAt);
 $('nextQueue').innerHTML=sorted.map((q,k)=>`<tr data-queue-row data-search-name="${esc(q.ids.map(pid=>displayName(pid)).join(" ").toLocaleLowerCase())}"><td>${k+1}</td><td>${q.ids.map(pid=>`<span>${esc(displayName(pid))} <button class="small secondary" data-action="edit-name" data-id="${pid}">Edit</button> <button class="small secondary" data-action="rest-player" data-id="${pid}">Rest</button></span>`).join(' / ')}</td><td>${!s.topCourt||q.target===null?'Any available court':esc(rankName(q.target))}</td><td>${s.topCourt&&q.target===0&&q.priority===10?'Top defender':'Waiting'}</td></tr>`).join('')+singles.map((p,k)=>`<tr data-queue-row data-search-name="${esc(p.name.toLocaleLowerCase())}"><td>${sorted.length+k+1}</td><td>${esc(displayName(p.id))} <button class="small secondary" data-action="edit-name" data-id="${p.id}">Edit</button> <button class="small secondary" data-action="rest-player" data-id="${p.id}">Rest</button></td><td>${!s.topCourt||p.targetCourt===null?'Any available court':esc(rankName(p.targetCourt))}</td><td>${!s.topCourt?'Social rotation':p.substitute?'Priority substitute':'Mix with incoming players'}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No players waiting.</td></tr>';
 for(const id of [...attendanceSelection])if(!state.players.some(p=>p.id===id&&p.status!=='playing'))attendanceSelection.delete(id);
 $('attendanceBody').innerHTML=state.players.map(p=>`<tr data-attendance-row data-search-name="${esc(p.name.toLocaleLowerCase())}"><td><input type="checkbox" data-attendance-check="${p.id}" aria-label="Select ${esc(p.name)}" ${attendanceSelection.has(p.id)?'checked':''} ${p.status==='playing'?'disabled title="Player is on court"':''}></td><td>${esc(p.name)}</td><td>${esc(genderLabel(p))}</td><td><select data-attendance-id="${p.id}" aria-label="Attendance for ${esc(p.name)}" ${p.status==='playing'?'disabled':''}><option value="pending" ${p.attendance==='pending'?'selected':''}>Pending</option><option value="show" ${p.attendance==='show'?'selected':''}>SHOW</option><option value="no-show" ${p.attendance==='no-show'?'selected':''}>NO SHOW</option></select></td><td>${p.status==='playing'?'On court':p.status==='resting'?'Resting':'Waiting'}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No registered players.</td></tr>';
 filterRows();
 $('courts').innerHTML=state.courts.map((m,i)=>{if(!m)return `<article class="court ${i===0&&s.topCourt?'top-court':'standard-court'}"><div class="court-head"><b><span class="court-fruit" aria-hidden="true">${i===0&&s.topCourt?'◆':'◈'}</span>${esc(s.topCourt?rankName(i):`Court ${courtName(i)}`)}</b><span class="pill">Available</span></div><div class="empty">${singlesCourt(i)?'Singles · 1 vs 1':'Doubles · 2 vs 2'} · Next players are shown in the queue</div><button class="secondary" data-action="start" data-court="${i}">Start next match</button></article>`;
 return `<article class="court ${i===0&&s.topCourt?'top-court':'standard-court'}"><div class="court-head"><b><span class="court-fruit" aria-hidden="true">${i===0&&s.topCourt?'◆':'◈'}</span>${esc(s.topCourt?rankName(i):`Court ${courtName(i)}`)}</b><span class="pill live">${m.singles?'SINGLES · ':''}${m.overflow?'Overflow · ':''}${m.pausedAt?'Paused':'Live'}</span></div>${m.teams.map((team,t)=>`<div class="team team-${t===0?'a':'b'}"><div class="team-name">Team ${t?'B':'A'}<br><b>${esc(courtNames(team))}</b>${s.liveReplacement!==false?`<div class="live-player-slots">${team.map((id,slot)=>`<button class="small secondary live-replace" data-action="replace-live" data-court="${i}" data-team="${t}" data-slot="${slot}" aria-label="Replace ${esc(displayName(id))} during live match">↔ Replace ${esc(displayName(id))}</button>`).join('')}</div>`:''}${i===0&&s.topCourt&&!m.overflow?`<br><span class="muted">Top-court streak: ${Math.max(...team.map(id=>player(id)?.topStreak||0))+1}/2</span>`:''}<br><span class="muted">Timeouts: ${Math.min(3,Number(m.timeouts?.[t])||0)}</span></div><label class="score-entry"><span>Score</span><input class="score-input" type="number" inputmode="numeric" min="0" max="999" step="1" aria-label="Team ${t?'B':'A'} score on ${esc(rankName(i))}" data-manual-score data-court="${i}" data-team="${t}" value="${m.scores[t]}"></label><div><button class="small" data-action="score" data-court="${i}" data-team="${t}" data-delta="1" ${m.pausedAt?'disabled':''}>+1</button><br><button class="small secondary" data-action="score" data-court="${i}" data-team="${t}" data-delta="-1" ${m.pausedAt?'disabled':''}>−1</button></div></div><button class="small secondary" data-action="timeout" data-court="${i}" data-team="${t}" ${Number(m.timeouts?.[t])>=3?'disabled title="Maximum three timeouts recorded"':''}>Record Team ${t?'B':'A'} Timeout</button><span class="timeout-stars" aria-label="${Math.min(3,Number(m.timeouts?.[t])||0)} of 3 timeouts recorded">${'★'.repeat(Math.min(3,Math.max(0,Number(m.timeouts?.[t])||0)))}</span>${s.quickWin?`<button class="quick-win" data-action="declare-win" data-court="${i}" data-team="${t}" aria-label="Declare Team ${t?'B':'A'} winner without scores">🏆 WIN · Team ${t?'B':'A'}</button>`:''}`).join('')}${m.social&&!m.singles&&m.socialBalance&&s.socialFriendlyRules?`<div class="friendly-rule"><label>Friendly rally rule (all four players agree) <select data-friendly-rule="${i}" aria-label="Friendly rule for Court ${esc(courtName(i))}"><option value="" ${!m.friendlyRule?'selected':''}>Standard rules</option><option value="controlled" ${m.friendlyRule==='controlled'?'selected':''}>Controlled opening return</option><option value="overhead" ${m.friendlyRule==='overhead'?'selected':''}>Limit overhead attacks</option></select></label><small>House rule · optional · confirm with all players</small></div>`:''}${s.scoringMethod==='sideout'?`<div class="serve-controls">Serving: Team ${(m.servingTeam||0)===0?'A':'B'} · Server ${m.serverNumber||2} <button class="small secondary" data-action="switch-serve" data-court="${i}">Switch server / side-out</button></div>`:''}<p class="clock" data-clock="${i}">Match ${fmt((m.pausedAt||now())-m.startedAt-m.pausedMs)}</p><p class="hint">${winningTeam(m)!==null?'Winning score reached — confirm result.':'Match in progress'}</p><div class="actions"><button class="secondary" data-action="pause" data-court="${i}">${m.pausedAt?'Resume':'Pause'}</button><button data-action="finish" data-court="${i}">Finish</button><button class="danger" data-action="cancel" data-court="${i}">Cancel</button></div></article>`}).join('');
 const ranked=[...state.players].sort((a,b)=>b.wins-a.wins||(b.pointsFor-b.pointsAgainst)-(a.pointsFor-a.pointsAgainst)||a.name.localeCompare(b.name));$('leaderboard').innerHTML=ranked.map((p,i)=>`<tr><td>${i+1}</td><td>${esc(p.name)}${genderShort(p)?` <span class="gender-tag">${genderShort(p)}</span>`:''}</td><td>${p.wins}</td><td>${p.losses}</td><td data-played="${p.id}">${fmtPlayed(playedTime(p))}</td><td>${p.pointsFor-p.pointsAgainst>0?'+':''}${p.pointsFor-p.pointsAgainst}</td></tr>`).join('')||'<tr><td colspan="6">No results yet.</td></tr>';
 $('history').innerHTML=state.history.slice(0,50).map(h=>`<div class="history-item"><b>${esc(h.teams[0].join(' / '))}</b> ${h.resultOnly?'WIN ONLY':`${h.scores[0]}–${h.scores[1]}`} <b>${esc(h.teams[1].join(' / '))}</b><br><time>${new Date(h.endedAt).toLocaleString()} · ${esc(h.court||'Court')} · Winner: Team ${h.winner?'B':'A'}</time>${h.note?`<p class="hint">${esc(h.note)}</p>`:''}</div>`).join('')||'<p class="muted">Completed matches will appear here.</p>';
}
$('addForm').addEventListener('submit',e=>{e.preventDefault();const name=$('playerName').value.trim(),gender=$('playerGender').value;if(!name)return;if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){alert('Name already registered.');return;}state.players.push({id:uid(),name,gender,attendance:'pending',status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,playedMs:0});$('playerName').value='';$('playerGender').value='';autoFill();save();render();});
for(const id of ['playersSearch','queueSearch','attendanceSearch'])$(id).addEventListener('input',filterRows);
document.addEventListener('change',e=>{
 const checkbox=e.target.closest('input[data-attendance-check]');if(!checkbox)return;
 if(checkbox.checked)attendanceSelection.add(checkbox.dataset.attendanceCheck);
 else attendanceSelection.delete(checkbox.dataset.attendanceCheck);
 syncAllAttendanceChecks();updateAttendanceSelectionUI();
});
document.querySelectorAll('.quick-attendance-toolbar').forEach(bar=>{
 bar.querySelector('[data-select-all-scope]').addEventListener('change',e=>{
  const scope=e.target.dataset.selectAllScope,body=$(scope==='players'?'playersBody':'nextQueue');
  for(const checkbox of body.querySelectorAll('tr:not([hidden]) input[data-attendance-check]:not(:disabled)')){
   if(e.target.checked)attendanceSelection.add(checkbox.dataset.attendanceCheck);
   else attendanceSelection.delete(checkbox.dataset.attendanceCheck);
  }
  syncAllAttendanceChecks();updateAttendanceSelectionUI();
 });
 bar.querySelector('[data-apply-quick-attendance]').addEventListener('click',()=>{
  $('bulkAttendanceValue').value=bar.querySelector('[data-quick-attendance-value]').value;
  $('applyBulkAttendance').click();
 });
 bar.querySelector('[data-clear-quick-attendance]').addEventListener('click',()=>{
  attendanceSelection.clear();syncAllAttendanceChecks();updateAttendanceSelectionUI();
 });
});
$('selectAllAttendance').addEventListener('change',e=>{
 for(const checkbox of $('attendanceBody').querySelectorAll('input[data-attendance-check]:not(:disabled)')){
  if(checkbox.closest('tr').hidden)continue;
  checkbox.checked=e.target.checked;
  if(e.target.checked)attendanceSelection.add(checkbox.dataset.attendanceCheck);
  else attendanceSelection.delete(checkbox.dataset.attendanceCheck);
 }
 updateAttendanceSelectionUI();
});
$('clearAttendanceSelection').addEventListener('click',()=>{attendanceSelection.clear();syncAllAttendanceChecks();updateAttendanceSelectionUI();});
$('applyBulkAttendance').addEventListener('click',()=>{
 const value=$('bulkAttendanceValue').value;
 if(!['show','no-show','pending'].includes(value))return;
 const selected=state.players.filter(p=>attendanceSelection.has(p.id)&&p.status!=='playing');
 if(!selected.length){alert('Tick at least one eligible player.');return;}
 if(!confirm(`Set ${selected.length} selected player${selected.length===1?'':'s'} to ${value==='no-show'?'NO SHOW':value.toUpperCase()}?`))return;
 for(const p of selected){
  p.attendance=value;
  if(value!=='show'){state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(p.id));p.substitute=false;}
  else if(p.status==='waiting')p.queuedAt=now();
 }
 attendanceSelection.clear();save();render();
});
document.addEventListener('change',e=>{
 const select=e.target.closest('select[data-attendance-id]');
 if(!select)return;
 const p=player(select.dataset.attendanceId);
 if(!p||p.status==='playing'){render();return;}
 const value=select.value;
 if(!['pending','show','no-show'].includes(value)){render();return;}
 p.attendance=value;
 if(value!=='show'){state.pendingPairs=state.pendingPairs.filter(q=>!q.ids.includes(p.id));p.substitute=false;}
 else if(p.status==='waiting')p.queuedAt=now();
 // Do not auto-fill here: the organizer controls when a newly arrived player joins.
 save();render();
});
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const {action,court,team,delta,id}=b.dataset,i=Number(court),t=Number(team);if(action==='clear-fixed'){unlinkFixed(player(id));save();render();return;}
if(action==='edit-name'){const p=player(id);if(!p||p.status!=='waiting'){alert('Only waiting players can be renamed.');return;}const entered=prompt('Edit waiting player name:',p.name);if(entered===null)return;const name=entered.trim();if(!name||name.length>40){alert('Enter a name of 1 to 40 characters.');return;}if(state.players.some(other=>other.id!==p.id&&other.name.toLowerCase()===name.toLowerCase())){alert('This name is already registered.');return;}p.name=name;save();render();return;}if(action==='rest-player'){restPlayer(player(id));autoFill();save();render();}if(action==='resume-player'){resumePlayer(player(id));autoFill();save();render();}if(action==='substitute'){requestSubstitute(player(id));autoFill();save();render();}if(action==='remove'){unlinkFixed(player(id));state.players=state.players.filter(p=>p.id!==id);cleanPairs();autoFill();save();render();}if(action==='start'){startMatch(i);render();}if(action==='score')updateScore(i,t,Number(delta));if(action==='switch-serve')switchServe(i);if(action==='finish')finish(i);if(action==='replace-live')replaceLivePlayer(i,t,Number(b.dataset.slot));if(action==='declare-win')declareWinner(i,t);if(action==='cancel')cancel(i);if(action==='pause')pause(i);if(action==='timeout')timeout(i,t);if(action==='move-court'){const from=Number(b.dataset.index),to=from+Number(b.dataset.direction);if(state.courts.some(Boolean)){alert('Finish or cancel live matches before reordering court numbers.');return;}if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=state.courtNames.length||to>=state.courtNames.length)return;[state.courtNames[from],state.courtNames[to]]=[state.courtNames[to],state.courtNames[from]];save();render();}});
document.addEventListener('change',e=>{
 const pick=e.target.closest('select[data-fixed-select]');
 if(pick){const p=player(pick.dataset.fixedSelect),mate=player(pick.value);if(mate)setFixedPair(p,mate);else render();return;}
 const check=e.target.closest('input[data-fixed-toggle]');
 if(check){const p=player(check.dataset.fixedToggle);if(!check.checked){unlinkFixed(p);save();render();}else{const sel=document.querySelector(`select[data-fixed-select="${p.id}"]`);sel?.focus();alert('Choose the partner from the dropdown next to Fixed.');}return;}
});
document.addEventListener('change',e=>{const input=e.target.closest('input[data-manual-score]');if(!input)return;setManualScore(Number(input.dataset.court),Number(input.dataset.team),input.value);});
$('courtCount').addEventListener('change',e=>{const n=Number(e.target.value);if(n<state.courts.length&&(state.courts.slice(n).some(Boolean)||state.pendingPairs.some(q=>q.target!==null&&q.target>=n))){alert('Finish affected matches and clear their waiting assignments before reducing courts.');render();return;}state.courts.length=n;for(let i=0;i<n;i++)if(state.courts[i]===undefined)state.courts[i]=null;state.courtNames=Array.from({length:n},(_,i)=>state.courtNames[i]||String(i+1));autoFill();save();render();});
$('saveCourtLabels').addEventListener('click',()=>{const v=$('courtLabels').value.split(',').map(x=>x.trim());if(v.length!==state.courts.length||v.some(x=>!/^\d+$/.test(x))||new Set(v.map(x=>x.toLowerCase())).size!==v.length){alert(`Enter ${state.courts.length} unique court numbers separated by commas, highest court first.`);return;}if(state.courts.some(Boolean)){alert('Finish or cancel live matches before changing court numbers.');render();return;}state.courtNames=v;save();render();});
for(const k of ['target','winBy','cap'])$(k).addEventListener('change',e=>{state.settings[k]=Number(e.target.value);save();render();});
$('singlesEnabled').addEventListener('change',e=>{
 if(!e.target.checked&&state.courts.some(m=>m?.singles)){alert('Finish or cancel live singles matches before disabling singles courts.');render();return;}
 state.settings.singles=e.target.checked;
 if(e.target.checked&&!state.settings.singlesCourts.length){
  const idle=state.courtNames.find((_,i)=>!state.courts[i]);
  if(idle)state.settings.singlesCourts=[idle];
 }
 autoFill();save();render();
});
document.addEventListener('change',e=>{
 const cb=e.target.closest('[data-single-court]');if(!cb)return;
 const name=cb.dataset.singleCourt,i=state.courtNames.indexOf(name);
 if(i<0||state.courts[i]){render();return;}
 const selected=new Set(state.settings.singlesCourts);
 if(cb.checked)selected.add(name);else selected.delete(name);
 state.settings.singlesCourts=[...selected];
 autoFill();save();render();
});
$('quickWinEnabled').addEventListener('change',e=>{state.settings.quickWin=e.target.checked;save();render();});
$('liveReplacementEnabled').addEventListener('change',e=>{state.settings.liveReplacement=e.target.checked;save();render();});
$('socialBalanceEnabled').addEventListener('change',e=>{state.settings.socialBalance=e.target.checked;save();render();});
$('socialBalanceMethod').addEventListener('change',e=>{state.settings.socialBalanceMethod=e.target.value;save();render();});
$('socialFriendlyRules').addEventListener('change',e=>{state.settings.socialFriendlyRules=e.target.checked;save();render();});
$('socialAccessibility').addEventListener('change',e=>{state.settings.socialAccessibility=e.target.checked;save();render();});
document.addEventListener('change',e=>{
 const exp=e.target.closest('[data-social-experience]');if(exp){const pl=player(exp.dataset.socialExperience);if(pl&&['open','new','developing','experienced'].includes(exp.value)){pl.socialExperience=exp.value;save();render();}return;}
 const rule=e.target.closest('[data-friendly-rule]');if(rule){const m=state.courts[Number(rule.dataset.friendlyRule)];if(!m||!m.social||m.singles)return;const value=rule.value;if(value&&!confirm('Have all four players agreed to this friendly house rule?')){render();return;}m.friendlyRule=['controlled','overhead'].includes(value)?value:null;save();render();}
});

$('topCourtEnabled').addEventListener('change',e=>{if(state.courts.some(Boolean)){alert('Finish or cancel live matches before changing LADDER / SOCIAL PLAY mode.');render();return;}state.settings.topCourt=e.target.checked;state.pendingPairs=[];state.players.filter(p=>p.status==='waiting').forEach(p=>{p.targetCourt=null;p.topStreak=0;p.substitute=false;});autoFill();save();render();});
$('scoringMethod').addEventListener('change',e=>{if(state.courts.some(Boolean)){alert('Finish current matches before switching scoring methods.');render();return;}state.settings.scoringMethod=e.target.value;save();render();});
$('autoFill').addEventListener('change',e=>{state.settings.autoFill=e.target.checked;autoFill();save();render();});
$('demoBtn').addEventListener('click',()=>{for(const name of ['Kevin','Alicia','Peter','Jamie','Daniel','Cheryl','Adam','Ern','Hao Yi','Matthew','Lee','John'])if(!state.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))state.players.push({id:uid(),name,gender:'',attendance:'show',status:'waiting',queuedAt:now(),targetCourt:null,topStreak:0,games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0,playedMs:0});autoFill();save();render();});
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
$('resetBtn').addEventListener('click',()=>{if(confirm('Reset this session and delete all current session players, matches and statistics?\\n\\nYour separately saved Regular Player Registry will be kept.')){state=fresh();save();render();renderRegistry();}});
$('exportBtn').addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.href=url;a.download='ogx-ladder-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const d=JSON.parse(await file.text());if(!Array.isArray(d.players)||!Array.isArray(d.courts)||!Array.isArray(d.history)||!d.settings)throw Error('Invalid backup');if(!confirm('Replace the current browser session?'))return;state={...fresh(),...d};state.settings={...fresh().settings,...d.settings};state.courtNames=Array.isArray(d.courtNames)&&d.courtNames.length===d.courts.length?d.courtNames:d.courts.map((_,i)=>String(i+1));state.pendingPairs=Array.isArray(d.pendingPairs)?d.pendingPairs:[];state.players.forEach(p=>{p.attendance=['show','no-show','pending'].includes(p.attendance)?p.attendance:'show';p.gender=typeof p.gender==='string'?p.gender:'';p.fixedPartnerId=typeof p.fixedPartnerId==='string'?p.fixedPartnerId:null;p.topStreak=p.topStreak||0;p.targetCourt=Number.isInteger(p.targetCourt)?p.targetCourt:null;p.substitute=Boolean(p.substitute);p.playedMs=Number.isFinite(Number(p.playedMs))?Math.max(0,Number(p.playedMs)):0;p.fixedPartnerId=typeof p.fixedPartnerId==='string'?p.fixedPartnerId:null;});save();render();}catch(err){alert('Import failed: '+err.message);}finally{e.target.value='';}});
$('saveRegistryBtn').addEventListener('click',()=>{
 const current=readRegistry(),byName=new Map(current.map(x=>[x.name.toLocaleLowerCase(),x]));
 for(const p of state.players)byName.set(p.name.trim().toLocaleLowerCase(),{name:p.name.trim(),gender:p.gender||''});
 writeRegistry([...byName.values()]);alert(`${byName.size} regular players saved. Export the registry for a portable backup.`);
});
$('loadRegistryBtn').addEventListener('click',()=>{if(!readRegistry().length){alert('Your regular player registry is empty. Save players or import a registry first.');return;}addRegistryToSession();});
$('exportRegistryBtn').addEventListener('click',()=>downloadJSON('ogx-regular-players.json',{format:'ogx-regular-players-v1',players:readRegistry()}));
$('importRegistryFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(data.format!=='ogx-regular-players-v1'||!Array.isArray(data.players)||data.players.length>1000)throw Error('Invalid registry file');
  const clean=data.players.map(p=>({name:String(p.name||'').trim(),gender:String(p.gender||'')}))
   .filter(p=>p.name.length>0&&p.name.length<=40&&p.gender.length<=40);
  if(clean.length!==data.players.length)throw Error('Invalid player name or gender');
  const merged=new Map(readRegistry().map(p=>[p.name.toLocaleLowerCase(),p]));
  for(const item of clean)merged.set(item.name.toLocaleLowerCase(),item);
  if(!confirm(`Import ${clean.length} regular players? Existing registry names will be merged, not deleted.`))return;
  writeRegistry([...merged.values()]);alert('Registry imported. Select Load regular players to add them to this session.');
 }catch(err){alert('Registry import failed: '+err.message);}
 finally{e.target.value='';}
});
$('clearRegistryBtn').addEventListener('click',()=>{
 if(!confirm('Delete the saved Regular Player Registry from this browser?\\n\\nCurrent session players will not be deleted. Export a backup first if needed.'))return;
 localStorage.removeItem(REGISTRY_KEY);renderRegistry();
});
renderRegistry();
setInterval(()=>{for(const p of state.players){const el=document.querySelector(`[data-wait="${p.id}"]`);if(el&&p.status==='waiting'&&p.attendance==='show')el.textContent=fmt(now()-p.queuedAt);}state.courts.forEach((m,i)=>{const el=document.querySelector(`[data-clock="${i}"]`);if(m&&el)el.textContent='Match '+fmt((m.pausedAt||now())-m.startedAt-m.pausedMs);});},1000);
// Do not auto-fill imported sessions until the user has inspected them.
save();render();
