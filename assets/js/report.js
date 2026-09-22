(function(){
  const root=document.getElementById('reportRoot');
  if(!root||!window.RelayDB?.enabled)return;
  const toast=m=>{let t=document.querySelector('.toast');t.textContent=m;t.classList.add('show');clearTimeout(window.__relayReportToast);window.__relayReportToast=setTimeout(()=>t.classList.remove('show'),2400)};
  async function boot(){
    const s=await RelayDB.session().catch(()=>null);
    if(!s?.user){location.href='login.html';return}
    const p=await RelayDB.getProfile(s.user.id).catch(()=>null);
    if(!p?.onboarding_complete){location.href='onboarding.html';return}
    const q=new URLSearchParams(location.search),type=q.get('type')||'job',id=q.get('id')||'';
    root.innerHTML='<div class="detail-card" style="max-width:760px;margin:0 auto"><div class="eyebrow"><span class="dot"></span>Report</div><h1 style="font-size:2.25rem;margin:8px 0">Tell us what is wrong.</h1><p class="hero-copy" style="font-size:.95rem">Do not include passwords, OTPs, bank credentials, or other unnecessary sensitive information.</p><form id="reportForm" class="stack"><div class="field"><label class="label">What are you reporting?</label><select class="select" name="type"><option value="job">Job opening</option><option value="profile">Profile</option><option value="message">Message</option><option value="application">Application</option></select></div><div class="field"><label class="label">Reason</label><select class="select" name="reason"><option>Scam or fraud</option><option>False or misleading information</option><option>Harassment or abuse</option><option>Unsafe or unlawful request</option><option>Impersonation</option><option>Other</option></select></div><div class="field"><label class="label">Details</label><textarea class="textarea" name="details" maxlength="4000" placeholder="Tell us what happened and where."></textarea></div><button class="btn btn-primary" type="submit">Submit report</button></form></div>';
    const form=document.getElementById('reportForm');
    if(['job','profile','message','application'].includes(type))form.elements.type.value=type;
    form.addEventListener('submit',async e=>{e.preventDefault();try{const f=new FormData(form);if(!id||!/^[0-9a-f-]{36}$/i.test(id)){toast('A valid item id is required for a report.');return}await RelayDB.report({reporter_id:s.user.id,target_type:f.get('type').toString(),target_id:id,reason:f.get('reason').toString(),details:f.get('details').toString().trim()});root.innerHTML='<div class="detail-card" style="max-width:760px;margin:0 auto"><div class="eyebrow"><span class="dot"></span>Received</div><h1 style="font-size:2.25rem;margin:8px 0">Thanks for flagging it.</h1><p class="hero-copy" style="font-size:.95rem">Your report was recorded. Please do not send passwords, OTPs, or financial credentials.</p><a class="btn btn-primary" href="dashboard.html">Back to dashboard</a></div>'}catch(err){toast(err.message||'Could not submit report.')}})
  }
  boot();
})();