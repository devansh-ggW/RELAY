(function(){
  const root=document.getElementById('accountWorkspace');
  if(!root||!window.RelayDB?.enabled)return;
  const page=location.pathname.split('/').pop();
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const initials=n=>(n||'You').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'Y';
  const side='<aside class="sidebar"><a class="side-link" href="dashboard.html">Overview</a><a class="side-link" href="applications.html">Applications</a><a class="side-link" href="messages.html">Messages</a><a class="side-link" href="saved.html">Saved jobs</a><a class="side-link" href="profile.html">Profile</a><a class="side-link" href="settings.html">Settings</a><a class="side-link" href="help.html">Help</a></aside>';
  const toast=m=>{let t=document.querySelector('.toast');t.textContent=m;t.classList.add('show');clearTimeout(window.__relayAccountToast);window.__relayAccountToast=setTimeout(()=>t.classList.remove('show'),2300)};
  async function boot(){
    const s=await RelayDB.session().catch(()=>null);
    if(!s?.user){location.href='login.html?next='+encodeURIComponent(location.href);return}
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);
    if(!p?.onboarding_complete){location.href='onboarding.html';return}
    if(page==='saved.html')return saved(s,p);
    return settings(s,p);
  }
  async function saved(s,p){
    let data=[];
    try{data=await RelayDB.listSavedJobs(s.user.id)}catch(e){toast(e.message||'Could not load saved jobs.')}
    const cards=data.filter(x=>x.jobs).map(x=>'<a class="job-card" href="job.html?id='+encodeURIComponent(x.jobs.id)+'"><div class="company-chip">'+esc(initials(x.jobs.company).slice(0,1))+'</div><div><strong>'+esc(x.jobs.title)+'</strong><div class="small-muted">'+esc(x.jobs.company)+' · '+esc(x.jobs.location)+'</div><div class="job-meta"><span class="tag">'+esc(x.jobs.type)+'</span><span class="tag">'+esc(x.jobs.mode)+'</span></div></div><div class="salary">'+esc(x.jobs.salary)+'</div></a>').join('');
    root.innerHTML=side+'<section class="workspace-panel"><div class="eyebrow"><span class="dot"></span>Saved jobs</div><h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Your saved openings.</h2><p class="section-copy">Only jobs you saved from your real Relay account appear here.</p><div style="height:18px"></div><div class="job-list">'+(cards||'<div class="empty">You have no saved openings yet.</div>')+'</div></section>';
  }
  async function settings(s,p){
    root.innerHTML=side+'<section class="workspace-panel"><div class="eyebrow"><span class="dot"></span>Settings</div><h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Account settings.</h2><p class="section-copy">Control what you share and how visible your profile is.</p><div style="height:18px"></div><form id="settingsForm" class="stack"><label class="setting-row"><div><strong>Public profile</strong><div class="small-muted">Allow eligible employers to discover your profile.</div></div><input type="checkbox" name="profile_public" '+(p.profile_public?'checked':'')+'></label><label class="setting-row"><div><strong>Available for work</strong><div class="small-muted">Show your profile as available in the talent directory.</div></div><input type="checkbox" name="available_for_work" '+(p.available_for_work?'checked':'')+'></label><div class="divider"></div><button class="btn btn-primary" type="submit">Save settings</button></form><div class="divider"></div><h3>Account security</h3><p class="small-muted">Change your password through the recovery flow.</p><a class="btn" href="forgot-password.html">Reset password</a><div class="divider"></div><div class="notice">Relay will never ask for your password or one-time code in a message.</div></section>';
    document.getElementById('settingsForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await RelayDB.updateProfile({profile_public:f.get('profile_public')==='on',available_for_work:f.get('available_for_work')==='on'});toast('Settings saved.')}catch(err){toast(err.message||'Could not save settings.')}})
  }
  boot();
})();