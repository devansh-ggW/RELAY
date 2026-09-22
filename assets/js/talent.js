(function () {
  const list = document.getElementById('talentList');
  const profileRoot = document.getElementById('talentRoot');
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const initials = (name='You') => name.split(/\s+/).filter(Boolean).map(x => x[0]).join('').slice(0,2).toUpperCase() || 'Y';
  const toast = (message) => { let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);} t.textContent=message; t.classList.add('show'); clearTimeout(window.__talentToast); window.__talentToast=setTimeout(()=>t.classList.remove('show'),2400); };

  async function boot() {
    if (!window.RelayDB?.enabled) return;
    const session = await RelayDB.session().catch(() => null);
    if (!session?.user) { location.href='login.html?next='+encodeURIComponent(location.href); return; }
    const me = await RelayDB.getProfile(session.user.id).catch(() => null);
    if (!me?.onboarding_complete || me.role !== 'employer') { location.href='dashboard.html'; return; }

    if (list) {
      let people = await RelayDB.listTalent().catch(() => []);
      const input = $('#talentQuery');
      const count = $('#talentCount');
      const render = () => {
        const q = (input.value || '').trim().toLowerCase();
        const filtered = people.filter(p => [p.name,p.headline,p.city,p.state,...(p.skills||[])].join(' ').toLowerCase().includes(q));
        count.textContent = filtered.length + ' ' + (filtered.length === 1 ? 'person' : 'people');
        list.innerHTML = filtered.length ? filtered.map(p =>
          '<a class="talent-card" href="talent-profile.html?id='+encodeURIComponent(p.id)+'">' +
          '<div class="big-avatar">'+esc(initials(p.name))+'</div>' +
          '<div><strong>'+esc(p.name)+'</strong><div class="small-muted">'+esc(p.headline || 'Job seeker')+'</div>' +
          '<div class="small-muted">'+esc([p.city,p.state].filter(Boolean).join(', ') || 'India')+'</div>' +
          '<div class="job-meta">'+(p.skills||[]).slice(0,6).map(s=>'<span class="tag">'+esc(s)+'</span>').join('')+'</div></div>' +
          '<span class="small-muted">View →</span></a>'
        ).join('') : '<div class="empty"><strong>No matching profiles yet.</strong><br>People will appear here after they create and complete a Relay profile.</div>';
      };
      input.addEventListener('input', render);
      $('#clearTalent')?.addEventListener('click',()=>{input.value='';render();});
      render();
      return;
    }

    if (profileRoot) {
      const id = new URLSearchParams(location.search).get('id');
      const person = await RelayDB.getTalent(id).catch(()=>null);
      if (!person) { profileRoot.innerHTML='<div class="empty"><strong>Profile not found.</strong><br>This profile may have been removed or hidden.</div>'; return; }
      profileRoot.innerHTML =
        '<div class="job-detail"><article class="detail-card"><div class="profile-head"><div class="big-avatar">'+esc(initials(person.name))+'</div>' +
        '<div><div class="eyebrow"><span class="dot"></span>Relay talent</div><h2>'+esc(person.name)+'</h2>' +
        '<div class="small-muted">'+esc(person.headline || 'Job seeker')+' · '+esc([person.city,person.state].filter(Boolean).join(', ') || 'India')+'</div></div></div>' +
        '<div class="divider"></div><div class="detail-copy"><h3>Skills</h3><div class="job-meta">'+(person.skills||[]).map(s=>'<span class="tag">'+esc(s)+'</span>').join('')+'</div>' +
        '<h3>About</h3><p>'+esc(person.about || 'No additional information added yet.')+'</p>' +
        (person.experience_years != null ? '<h3>Experience</h3><p>'+esc(person.experience_years)+' years</p>' : '') +
        '</div></article><aside class="detail-card apply-sticky"><div class="notice">Candidate profile · India</div><div class="divider"></div>' +
        '<button class="btn btn-primary" id="messageTalent" style="width:100%">Start a conversation</button></aside></div>';
      $('#messageTalent').addEventListener('click', async () => {
        try {
          await RelayDB.createConversation({seeker_id:person.id, employer_id:session.user.id, job_id:null});
          location.href='messages.html';
        } catch (error) {
          if (error.message?.includes('duplicate')) { location.href='messages.html'; return; }
          toast(error.message || 'Could not start a conversation.');
        }
      });
    }
  }
  boot();
})();