(function(){
  const root=document.getElementById('notificationWorkspace');if(!root||!window.RelayDB?.enabled)return;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const time=v=>{const d=new Date(v);return isNaN(d)?'':d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})};
  const boot=async()=>{
    const s=await RelayDB.session().catch(()=>null);if(!s?.user){location.href='login.html?next='+encodeURIComponent(location.href);return}
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);if(!p?.onboarding_complete){location.href='onboarding.html';return}
    let rows=await RelayDB.listNotifications(s.user.id).catch(()=>[]);
    const render=()=>{root.innerHTML='<aside class="sidebar"><a class="side-link" href="dashboard.html">Overview</a><a class="side-link" href="applications.html">Applications</a><a class="side-link" href="messages.html">Messages</a><a class="side-link" href="saved.html">Saved jobs</a><a class="side-link active" href="notifications.html">Activity</a><a class="side-link" href="profile.html">Profile</a><a class="side-link" href="settings.html">Settings</a><a class="side-link" href="help.html">Help</a></aside><section class="workspace-panel"><div class="section-head"><div><div class="eyebrow"><span class="dot"></span>Activity</div><h2 class="section-title" style="font-size:1.7rem;margin-top:5px">What changed.</h2><p class="section-copy">Application updates, messages, and important Relay notices.</p></div><button class="btn btn-small" id="readAll">Mark all read</button></div><div class="activity-list">'+(rows.length?rows.map(n=>'<a class="activity-row '+(!n.read_at?'unread':'')+'" href="'+esc(n.link||'#')+'"><div><strong>'+esc(n.title)+'</strong><p>'+esc(n.body)+'</p></div><small>'+esc(time(n.created_at))+'</small></a>').join(''):'<div class="empty"><strong>No activity yet.</strong><br>Your real Relay actions will appear here.</div>')+'</div></section>';
      root.querySelectorAll('.activity-row.unread').forEach((el,i)=>el.addEventListener('click',async()=>{if(rows[i]&&!rows[i].read_at)await RelayDB.markNotificationRead(rows[i].id).catch(()=>{})}));
      root.querySelector('#readAll')?.addEventListener('click',async()=>{await RelayDB.markAllNotificationsRead(s.user.id).catch(()=>{});rows=await RelayDB.listNotifications(s.user.id).catch(()=>[]);render()});
    };
    render();
  };
  boot();
})();