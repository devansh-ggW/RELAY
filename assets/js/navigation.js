(function(){
  async function enhance(){
    const nav=document.querySelector('.nav-links');
    const logged=!!document.querySelector('#logoutBtn');
    if(nav&&logged&&window.RelayDB?.enabled){
      const session=await RelayDB.session().catch(()=>null);
      const profile=session?.user?await RelayDB.getProfile(session.user.id).catch(()=>null):null;
      const first=nav.querySelector('a');
      if(first){
        if(profile?.role==='employer'){first.href='talent.html';first.textContent='Find talent';}
        else{first.href='jobs.html';first.textContent='Find work';}
      }
    }
    document.querySelectorAll('.nav-links').forEach(n=>{
      if(logged){
        const hrefs=[...n.querySelectorAll('a')].map(a=>a.getAttribute('href'));
        [['saved.html','Saved'],['notifications.html','Activity'],['profile.html','Profile']].forEach(([href,label])=>{
          if(!hrefs.includes(href)){const a=document.createElement('a');a.href=href;a.textContent=label;n.appendChild(a)}
        });
      }
    });
    document.querySelectorAll('.sidebar').forEach(side=>{
      const hrefs=[...side.querySelectorAll('a')].map(a=>a.getAttribute('href'));
      if(logged&&hrefs.includes('dashboard.html')&&!hrefs.includes('talent.html')){
        RelayDB.session().then(s=>s?.user?RelayDB.getProfile(s.user.id):null).then(p=>{
          if(p?.role==='employer'){const a=document.createElement('a');a.className='side-link';a.href='talent.html';a.textContent='Find talent';side.insertBefore(a,side.querySelector('a[href="profile.html"]')||null)}
        }).catch(()=>{});
      }
      [['saved.html','Saved jobs'],['notifications.html','Activity'],['settings.html','Settings'],['help.html','Help']].forEach(([href,label])=>{
        if(!hrefs.includes(href)){const a=document.createElement('a');a.className='side-link';a.href=href;a.textContent=label;side.appendChild(a)}
      });
    });
  }
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(enhance,120);
})();