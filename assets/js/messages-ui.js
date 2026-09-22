(function(){
  if(location.pathname.split('/').pop()!=='messages.html'||!window.RelayDB?.enabled)return;
  const root=document.getElementById('workspace');
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const initials=n=>(n||'You').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'Y';
  async function boot(){
    const s=await RelayDB.session().catch(()=>null);if(!s?.user)return;
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);if(!p?.onboarding_complete)return;
    const conversations=await RelayDB.listConversations(s.user.id).catch(()=>[]);
    const mineIsSeeker=p.role==='seeker';
    root.querySelector('.message-layout')?.remove();
    const panel=document.createElement('div');
    panel.className='message-layout';
    panel.innerHTML='<div class="conversation-list" id="relayConversationList">'+(conversations.length?conversations.map((c,i)=>{
      const other=mineIsSeeker?(c.employer_name||'Employer'):(c.seeker_name||'Job seeker');
      return '<button class="conversation-item '+(i===0?'active':'')+'" data-conversation="'+esc(c.id)+'" type="button"><strong>'+esc(other)+'</strong><span>'+(c.job_id?'Job conversation':'Direct conversation')+'</span></button>';
    }).join(''):'<div class="empty">No conversations yet.</div>')+'</div><div class="thread-panel" id="relayThreadPanel"><div class="empty">'+(conversations.length?'Select a conversation.':'Start a conversation from an application or talent profile.')+'</div></div>';
    root.querySelector('.workspace-panel')?.appendChild(panel);
    const open=async id=>{
      const thread=document.getElementById('relayThreadPanel');if(!thread)return;
      const c=conversations.find(x=>x.id===id),other=mineIsSeeker?(c?.employer_name||'Employer'):(c?.seeker_name||'Job seeker');
      const msgs=await RelayDB.getMessages(id).catch(()=>[]);
      thread.innerHTML='<div class="thread-head"><div><strong>'+esc(other)+'</strong><div class="small-muted">'+(c?.job_id?'Job conversation':'Direct conversation')+'</div></div><a class="small-muted" href="report.html?type=message&id='+encodeURIComponent(msgs[0]?.id||'00000000-0000-0000-0000-000000000000')+'">Report</a></div><div class="thread-messages">'+(msgs.length?msgs.map(m=>'<div class="message-bubble '+(m.sender_id===s.user.id?'mine':'')+'">'+esc(m.body)+'<small>'+esc(new Date(m.created_at).toLocaleString())+'</small></div>').join(''):'<div class="empty">No messages yet.</div>')+'</div><form class="thread-compose" id="relayCompose"><input class="input" name="body" maxlength="2000" placeholder="Write a message" required><button class="btn btn-primary">Send</button></form>';
      thread.querySelector('#relayCompose').addEventListener('submit',async e=>{e.preventDefault();const body=new FormData(e.currentTarget).get('body').toString().trim();if(!body)return;try{await RelayDB.sendMessage({conversation_id:id,sender_id:s.user.id,body});await open(id)}catch(err){alert(err.message||'Could not send message.')}})
    };
    panel.querySelectorAll('.conversation-item').forEach(b=>b.addEventListener('click',()=>{panel.querySelectorAll('.conversation-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');open(b.dataset.conversation)}));
    if(conversations[0])open(conversations[0].id);
  }
  setTimeout(boot,700);
})();