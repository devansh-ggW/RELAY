(function(){
  const root=document.getElementById('jobRoot');if(!root||!window.RelayDB?.enabled)return;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function boot(){
    const s=await RelayDB.session().catch(()=>null);
    const id=new URLSearchParams(location.search).get('id'); if(!id)return;
    const job=await RelayDB.getJob(id).catch(()=>null);if(!job)return;
    const apply=document.getElementById('apply');
    if(apply){
      const link=document.createElement('a');link.className=apply.className;link.id='apply';link.href='apply.html?id='+encodeURIComponent(id);link.innerHTML='Apply for this role →';link.style.width='100%';apply.replaceWith(link);
    }
    if(!s?.user)return;
    const aside=root.querySelector('.apply-sticky');if(!aside)return;
    if(document.getElementById('saveJob'))return;
    const tools=document.createElement('div');tools.className='job-actions';
    tools.innerHTML='<button class="btn" id="saveJob" type="button">Save opening</button><a class="btn" href="report.html?type=job&id='+encodeURIComponent(id)+'">Report</a>';
    aside.appendChild(tools);
    document.getElementById('saveJob').addEventListener('click',async e=>{
      e.preventDefault();
      try{await RelayDB.saveJob(s.user.id,id);e.currentTarget.textContent='Saved';e.currentTarget.disabled=true}
      catch(err){if(err.message?.toLowerCase().includes('duplicate')){e.currentTarget.textContent='Saved';e.currentTarget.disabled=true}else alert(err.message||'Could not save opening.')}
    });
  }
  const observer=new MutationObserver(()=>{if(document.getElementById('apply'))boot()});
  if(root)observer.observe(root,{childList:true,subtree:true});
  setTimeout(boot,250);
})();