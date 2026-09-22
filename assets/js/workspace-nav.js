(function(){
  const workspace=document.getElementById('workspace');if(!workspace)return;
  const apply=()=>{
    const side=workspace.querySelector('.sidebar');if(!side)return;
    const existing=[...side.querySelectorAll('a')].map(a=>a.getAttribute('href'));
    const extra=[['saved.html','Saved jobs'],['settings.html','Settings'],['help.html','Help']];
    const current=location.pathname.split('/').pop();
    extra.forEach(([href,label])=>{if(!existing.includes(href)){const a=document.createElement('a');a.className='side-link'+(current===href?' active':'');a.href=href;a.textContent=label;side.appendChild(a)}});
    if(current==='dashboard.html'&&window.RelayDB?.enabled){
      RelayDB.session().then(s=>s?.user?RelayDB.getProfile(s.user.id):null).then(p=>{
        if(p?.role==='employer'&&!existing.includes('talent.html')){
          const a=document.createElement('a');a.className='side-link';a.href='talent.html';a.textContent='Find talent';side.insertBefore(a,side.lastElementChild);
        }
      }).catch(()=>{});
    }
  };
  const observer=new MutationObserver(apply);observer.observe(workspace,{childList:true,subtree:true});setTimeout(apply,200);
})();