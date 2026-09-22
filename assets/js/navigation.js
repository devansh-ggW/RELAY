(function(){
  function enhance(){
    const header=document.querySelector('.nav');
    const nav=header?.querySelector('.nav-links');
    if(nav){
      const logged=!!document.querySelector('#logoutBtn');
      const links=new Map([...nav.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a]));
      const profile=document.querySelector('.avatar');
      if(logged&&!links.has('saved.html')){
        const a=document.createElement('a');a.href='saved.html';a.textContent='Saved';nav.insertBefore(a,nav.lastElementChild||null);
      }
      if(logged&&!links.has('profile.html')){
        const a=document.createElement('a');a.href='profile.html';a.textContent='Profile';nav.appendChild(a);
      }
    }
    document.querySelectorAll('.sidebar').forEach(side=>{
      const hrefs=[...side.querySelectorAll('a')].map(a=>a.getAttribute('href'));
      [['saved.html','Saved jobs'],['settings.html','Settings'],['help.html','Help']].forEach(([href,label])=>{
        if(!hrefs.includes(href)){const a=document.createElement('a');a.className='side-link';a.href=href;a.textContent=label;side.appendChild(a)}
      });
    });
  }
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
  setTimeout(enhance,100);
})();