(function(){
  const root=document.getElementById('jobRoot');if(!root||!window.RelayDB?.enabled)return;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function boot(){
    const s=await RelayDB.session().catch(()=>null);if(!s?.user)return;
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);
    const id=new URLSearchParams(location.search).get('id');
    if(!id)return;
    let job=await RelayDB.getJob(id).catch(()=>null);if(!job)return;
    const aside=root.querySelector('.apply-sticky');if(!aside)return;
    const tools=document.createElement('div');tools.className='job-actions';
    tools.innerHTML='<button class="btn" id="saveJob" type="button">Save opening</button><a class="btn" href="report.html?type=job&id='+encodeURIComponent(id)+'">Report</a>';
    aside.appendChild(tools);
    document.getElementById('saveJob').addEventListener('click',async e=>{e.preventDefault();try{await RelayDB.saveJob(s.user.id,id);e.currentTarget.textContent='Saved';}catch(err){alert(err.message||'Could not save opening.')}})
  }
  const observer=new MutationObserver(()=>{if(document.getElementById('apply')&& !document.getElementById('saveJob'))boot()});
  observer.observe(root,{childList:true,subtree:true});setTimeout(boot,250);
})();