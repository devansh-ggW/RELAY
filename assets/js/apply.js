(function(){
  const root=document.getElementById('applyRoot');
  if(!root||!window.RelayDB?.enabled)return;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function boot(){
    const s=await RelayDB.session().catch(()=>null);
    if(!s?.user){location.href='login.html?next='+encodeURIComponent(location.href);return}
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);
    if(!p?.onboarding_complete){location.href='onboarding.html';return}
    if(p.role!=='seeker'){root.innerHTML='<div class="empty"><strong>Only job seekers can apply.</strong><br>Switch your account role in Profile if that is how you want to use Relay.</div>';return}
    const id=new URLSearchParams(location.search).get('id');
    const job=await RelayDB.getJob(id).catch(()=>null);
    if(!job){root.innerHTML='<div class="empty"><strong>Opening not found.</strong><br>This job may have been closed or removed.</div>';return}
    root.innerHTML='<div class="apply-layout"><article class="detail-card"><a class="small-muted" href="job.html?id='+encodeURIComponent(job.id)+'">← Back to opening</a><div class="eyebrow" style="margin-top:22px"><span class="dot"></span>Your application</div><h1 style="font-size:2.55rem;margin:8px 0 10px">Apply to '+esc(job.title)+'.</h1><p class="section-copy">'+esc(job.company)+' · '+esc(job.location)+' · '+esc(job.type)+'</p><div class="divider"></div><form id="applyForm" class="stack"><div class="field"><label class="label">Short note <span class="small-muted">(optional)</span></label><textarea class="textarea" name="cover_note" maxlength="1500" placeholder="A few lines about why you are a fit, relevant experience, or anything the employer should know."></textarea><small class="small-muted"><span id="noteCount">0</span>/1500</small></div><div class="field"><label class="label">Portfolio or work link <span class="small-muted">(optional)</span></label><input class="input" name="portfolio_url" type="url" placeholder="https://..."></div><div class="notice">Only send information that is relevant to the role. Never include passwords, OTPs, bank credentials, or unnecessary identity documents.</div><button class="btn btn-primary btn-large" type="submit">Submit application →</button></form></article><aside class="detail-card apply-sticky"><div class="eyebrow"><span class="dot"></span>Opening</div><h2 style="margin-top:8px">'+esc(job.title)+'</h2><div class="small-muted">'+esc(job.company)+'</div><div class="divider"></div><div class="kpi"><span>Pay</span><strong>'+esc(job.salary)+'</strong></div><div class="kpi"><span>Work style</span><strong>'+esc(job.mode)+'</strong></div><div class="kpi"><span>Location</span><strong>'+esc(job.location)+'</strong></div><div class="kpi"><span>Skills</span><strong>'+esc((job.skills||[]).slice(0,3).join(', '))+'</strong></div></aside></div>';
    const note=root.querySelector('textarea[name="cover_note"]');
    note?.addEventListener('input',()=>{root.querySelector('#noteCount').textContent=note.value.length});
    root.querySelector('#applyForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget);
      try{
        await RelayDB.apply({job_id:job.id,applicant_id:s.user.id,cover_note:f.get('cover_note').toString().trim()||null,portfolio_url:f.get('portfolio_url').toString().trim()||null});
        root.innerHTML='<div class="detail-card" style="max-width:760px;margin:0 auto;text-align:left"><div class="eyebrow"><span class="dot"></span>Application sent</div><h1 style="font-size:2.5rem;margin:8px 0">You are in.</h1><p class="hero-copy" style="font-size:.95rem">Your application was submitted to '+esc(job.company)+'. You can track it from Applications.</p><div class="hero-actions"><a class="btn btn-primary" href="applications.html">View applications</a><a class="btn" href="jobs.html">Find another role</a></div></div>';
      }catch(error){
        if(error.message?.toLowerCase().includes('duplicate')) alert('You already applied to this opening.');
        else alert(error.message||'Could not submit your application.');
      }
    });
  }
  boot();
})();