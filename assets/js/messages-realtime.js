(function(){
  if(location.pathname.split('/').pop()!=='messages.html'||!window.RelayDB?.enabled)return;
  let channel=null,activeId=null;
  const renderMessages=async(id)=>{
    const panel=document.getElementById('relayThreadPanel');if(!panel)return;
    const messages=await RelayDB.getMessages(id).catch(()=>[]);
    const session=await RelayDB.session().catch(()=>null);
    const list=panel.querySelector('.thread-messages');if(!list)return;
    list.innerHTML=messages.length?messages.map(m=>'<div class="message-bubble '+(m.sender_id===session?.user?.id?'mine':'')+'">'+String(m.body??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))+'<small>'+new Date(m.created_at).toLocaleString()+'</small></div>').join(''):'<div class="empty">No messages yet.</div>';
    list.scrollTop=list.scrollHeight;
  };
  const attach=()=>{
    const current=document.querySelector('.conversation-item.active')?.dataset.conversation||null;
    if(!current||current===activeId||!window.RelayDB.client)return;
    activeId=current;
    if(channel)RelayDB.client.removeChannel(channel).catch(()=>{});
    channel=RelayDB.client.channel('relay-messages-'+current)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+current},()=>renderMessages(current))
      .subscribe();
  };
  new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
  setInterval(attach,1000);
})();