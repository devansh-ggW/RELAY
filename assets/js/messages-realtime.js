(function(){
  if(location.pathname.split('/').pop()!=='messages.html'||!window.RelayDB?.enabled)return;
  let active=null,channel=null;
  const findActive=()=>document.querySelector('.conversation-item.active')?.dataset.conversation||null;
  const refresh=async(id)=>{
    if(!id||!window.RelayDB?.getMessages)return;
    const panel=document.getElementById('threadPanel');if(!panel)return;
    const messages=await RelayDB.getMessages(id).catch(()=>[]);
    const session=await RelayDB.session().catch(()=>null);
    panel.querySelector('.thread-messages')?.replaceChildren(...messages.map(m=>{
      const wrap=document.createElement('div');wrap.className='message-bubble '+(m.sender_id===session?.user?.id?'mine':'');wrap.textContent=m.body;
      const small=document.createElement('small');small.textContent=new Date(m.created_at).toLocaleString();wrap.appendChild(small);return wrap;
    }));
  };
  const boot=async()=>{
    const s=await RelayDB.session().catch(()=>null);if(!s?.user)return;
    const attach=()=>{
      const id=findActive();if(id===active)return;active=id;
      if(channel){RelayDB.client.removeChannel(channel).catch(()=>{})}
      if(!id)return;
      channel=RelayDB.client.channel('relay-message-'+id)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+id},()=>refresh(id))
        .subscribe();
    };
    const observer=new MutationObserver(attach);observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(attach,400);
  };
  boot();
})();