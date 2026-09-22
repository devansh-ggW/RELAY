(function(){
  if(location.pathname.split('/').pop()!=='applications.html'||!window.RelayDB?.enabled)return;
  const root=document.getElementById('workspace');
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const initials=n=>(n||'Applicant').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'A';
  const toast=m=>{let t=document.querySelector('.toast');t.textContent=m;t.classList.add('show');clearTimeout(window.__appToast);window.__appToast=setTimeout(()=>t.classList.remove('show'),2300)};
  const render=async()=>{
    const s=await RelayDB.session().catch(()=>null);if(!s?.user)return;
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);if(!p?.onboarding_complete)return;
    if(p.role!=='employer')return;
    const apps=await RelayDB.listApplicationsForEmployer(s.user.id).catch(()=>[]);
    const rows=apps.map(a=>{
      const skills=a.applicant_skills||[];
      return '<div class="applicant-card"><div class="profile-head"><div class="big-avatar">'+esc(initials(a.applicant_name))+'</div><div><strong>'+esc(a.applicant_name||'Applicant')+'</strong><div class="small-muted">'+esc(a.applicant_headline||'Relay job seeker')+' · '+esc([a.applicant_city,a.applicant_state].filter(Boolean).join(', ')||'India')+'</div><div class="job-meta">'+skills.slice(0,6).map(s=>'<span class="tag">'+esc(s)+'</span>').join('')+'</div></div></div><div class="small-muted applicant-role">Applied for <strong>'+esc(a.jobs?.title||'Opening')+'</strong> · '+esc(a.jobs?.company||'')+'</div><div class="small-muted">'+esc(a.applicant_about||'No additional profile summary.')+'</div>+(a.cover_note?'<div class="application-note"><strong>Application note</strong><p>'+esc(a.cover_note)+'</p></div>':'')+(a.applicant_portfolio_url?'<div style="margin-top:10px"><a class="btn btn-small" target="_blank" rel="noopener noreferrer" href="'+esc(a.applicant_portfolio_url)+'">View portfolio →</a></div>':'')+<div class="applicant-actions"><select class="select status-select"><option '+(a.status==='Applied'?'selected':'')+'>Applied</option><option '+(a.status==='Reviewing'?'selected':'')+'>Reviewing</option><option '+(a.status==='Interview'?'selected':'')+'>Interview</option><option '+(a.status==='Offer'?'selected':'')+'>Offer</option><option '+(a.status==='Rejected'?'selected':'')+'>Rejected</option></select><button class="btn" data-app="'+a.id+'" data-seeker="'+a.applicant_id+'">Message</button><a class="btn" href="report.html?type=application&id='+encodeURIComponent(a.id)+'">Report</a></div></div>';
    }).join('');
    root.innerHTML='<aside class="sidebar"><a class="side-link" href="dashboard.html">Overview</a><a class="side-link active" href="applications.html">Applications</a><a class="side-link" href="messages.html">Messages</a><a class="side-link" href="saved.html">Saved jobs</a><a class="side-link" href="talent.html">Find talent</a><a class="side-link" href="profile.html">Profile</a><a class="side-link" href="settings.html">Settings</a><a class="side-link" href="help.html">Help</a></aside><section class="workspace-panel"><div class="eyebrow"><span class="dot"></span>Applicants</div><h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Applications to your openings</h2><p class="section-copy">Review people who actually applied to roles you published.</p><div style="height:18px"></div><div class="applicant-list">'+(rows||'<div class="empty">No one has applied to your openings yet.</div>')+'</div></section>';
    root.querySelectorAll('.applicant-card').forEach((card,i)=>{
      const a=apps[i];
      card.querySelector('.status-select')?.addEventListener('change',async e=>{try{await RelayDB.updateApplication(a.id,e.target.value);toast('Status updated.')}catch(err){toast(err.message||'Could not update status.')}});
      card.querySelector('button[data-app]')?.addEventListener('click',async()=>{try{await RelayDB.createConversation({seeker_id:a.applicant_id,employer_id:s.user.id,job_id:a.job_id});location.href='messages.html'}catch(err){if(err.message?.includes('duplicate'))location.href='messages.html';else toast(err.message||'Could not start conversation.')}})
    });
  };
  setTimeout(render,650);
})();