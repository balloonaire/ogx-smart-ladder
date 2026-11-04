// V12 presentation only: no game logic or stored state changes.
(function(){
 const buttons=[...document.querySelectorAll('[data-view]')];
 const panels=[...document.querySelectorAll('[data-panel]')];
 function show(view){
   buttons.forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false')});
   panels.forEach(p=>p.hidden=p.dataset.panel!==view);
   try{sessionStorage.setItem('ogx-v12-view',view)}catch(e){}
 }
 buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
 let initial='courts';try{initial=sessionStorage.getItem('ogx-v12-view')||initial}catch(e){}
 if(initial==='queue')initial='courts';
 if(initial==='leaderboard')initial='players';
 show(buttons.some(b=>b.dataset.view===initial)?initial:'courts');
 function stats(){
   // Derive counters from rendered rows and match cards, without modifying app state.
   const players=document.querySelectorAll('#playersBody tr[data-player-id]').length;
   const fallback=[...document.querySelectorAll('#playersBody tr')].filter(r=>r.querySelector('button[data-action="rest-player"],button[data-action="resume-player"]')).length;
   const courts=document.querySelectorAll('#courts .court').length;
   const live=document.querySelectorAll('#courts .court .pill.live').length;
   const waiting=[...document.querySelectorAll('#playersBody tr')].filter(r=>{const cells=r.querySelectorAll('td');return cells.length>2&&cells[2].textContent.includes('Waiting')}).length;
   document.getElementById('statPlayers').textContent=players||fallback;
   document.getElementById('statCourts').textContent=courts;
   document.getElementById('statWaiting').textContent=waiting;
   document.getElementById('statLive').textContent=live;
 }
 const targets=['playersBody','courts'];
 const obs=new MutationObserver(stats);
 targets.forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true})});
 stats();
 const statusEl=document.getElementById('courtLiveSummary');
 if(statusEl){
  const refreshStatus=()=>{
   const courtEls=[...document.querySelectorAll('#courts .court')];
   const active=courtEls.filter(c=>c.querySelector('.pill.live')).length;
   statusEl.textContent=`${active} live match${active===1?'':'es'} · ${Math.max(0,courtEls.length-active)} court${courtEls.length-active===1?'':'s'} available`;
  };
  const courtEl=document.getElementById('courts');
  if(courtEl)new MutationObserver(refreshStatus).observe(courtEl,{childList:true,subtree:true});
  refreshStatus();
 }
})();
