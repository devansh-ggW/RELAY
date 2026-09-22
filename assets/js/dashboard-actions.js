(function(){
  const workspace=document.getElementById('workspace');if(!workspace)return;
  const enhance=()=>{
    workspace.querySelectorAll('.job-card').forEach(card=>{
      if(card.querySelector('.edit-job-link'))return;
      const url=new URL(card.href,location.href),id=url.searchParams.get('id');if(!id)return;
      const actions=document.createElement('span');actions.className='job-inline-actions';
      const edit=document.createElement('a');edit.className='btn btn-small edit-job-link';edit.href='edit-job.html?id='+encodeURIComponent(id);edit.textContent='Edit';edit.addEventListener('click',e=>e.stopPropagation());
      actions.appendChild(edit);card.appendChild(actions);
    });
  };
  const observer=new MutationObserver(enhance);observer.observe(workspace,{childList:true,subtree:true});setTimeout(enhance,300);
})();