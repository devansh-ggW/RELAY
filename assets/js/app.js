(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  const $ = (s, r = document) => r.querySelector(s);

  let session = null;
  let profile = null;
  let jobs = [];

  const icons = {
    arrow: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    briefcase: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    message: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.7-.8L4 20l1.6-3.8A7.3 7.3 0 0 1 4 11.5 8 8 0 0 1 12 4a8 8 0 0 1 8 7.5Z"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 12 4 4L19 6"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    logout: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19a2 2 0 0 1-2 2h-5M14 3h5a2 2 0 0 1 2 2v4"/></svg>'
  };

  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const initials = (name='You') => name.split(/\s+/).filter(Boolean).map(x => x[0]).join('').slice(0,2).toUpperCase() || 'Y';

  function toast(message) {
    let node = $('.toast');
    if (!node) { node = document.createElement('div'); node.className = 'toast'; document.body.appendChild(node); }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(window.__relayToast);
    window.__relayToast = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function pending() {
    try { return JSON.parse(sessionStorage.getItem('relay_pending_onboarding') || 'null'); } catch { return null; }
  }

  function savePending(data) {
    sessionStorage.setItem('relay_pending_onboarding', JSON.stringify(data));
  }

  function clearPending() {
    sessionStorage.removeItem('relay_pending_onboarding');
  }

  async function loadSession() {
    if (!window.RelayDB?.enabled) return;
    try {
      session = await RelayDB.session();
      if (session?.user) profile = await RelayDB.getProfile(session.user.id);
    } catch (error) {
      console.error(error);
      session = null;
      profile = null;
    }
  }

  async function liveJobs() {
    try { return await RelayDB.listJobs(); }
    catch (error) { console.error(error); return []; }
  }

  function shell() {
    const root = $('#app-shell');
    if (!root) return;
    const logged = !!session?.user;
    root.innerHTML = `
      <header class="site-header">
        <div class="container nav">
          <a class="brand" href="index.html"><img class="brand-mark" src="assets/relay-icon.svg" alt="Relay"><span class="brand-word">Relay</span></a>
          <nav class="nav-links">
            <a href="jobs.html">Find work</a>
            ${logged ? '<a href="dashboard.html">Dashboard</a><a href="messages.html">Messages</a>' : '<a href="index.html#how">How it works</a>'}
          </nav>
          <div class="nav-actions">
            ${logged ? `<a class="btn btn-small" href="profile.html"><span class="avatar">${initials(profile?.name)}</span></a><button class="btn btn-small" id="logoutBtn">${icons.logout} Log out</button>` : '<a class="btn btn-small" href="login.html">Log in</a><a class="btn btn-primary btn-small" href="signup.html">Get started</a>'}
          </div>
        </div>
      </header>`;
    $('#logoutBtn')?.addEventListener('click', async () => { await RelayDB.signOut().catch(() => {}); session = null; profile = null; location.href = 'index.html'; });
  }

  function footer() {
    const node = $('#site-footer');
    if (!node) return;
    node.innerHTML = `
      <footer class="footer"><div class="container footer-inner">
        <div><strong>Relay</strong><div><small>Hiring and work, without the clutter.</small></div></div>
        <div class="footer-links"><a href="privacy.html"><small>Privacy</small></a><a href="terms.html"><small>Terms</small></a><a href="safety.html"><small>Safety</small></a><a href="community-rules.html"><small>Community rules</small></a><a href="grievance.html"><small>Complaints</small></a></div>
      </div></footer>`;
  }

  function jobRow(job) {
    return `
      <a class="job-card" href="job.html?id=${encodeURIComponent(job.id)}">
        <div class="company-chip">${esc(initials(job.company).slice(0,1))}</div>
        <div><strong>${esc(job.title)}</strong><div class="small-muted">${esc(job.company)} · ${esc(job.location)}</div>
          <div class="job-meta"><span class="tag">${esc(job.type)}</span><span class="tag">${esc(job.mode)}</span><span class="tag tag-blue">${esc(job.category)}</span></div>
        </div>
        <div class="salary">${esc(job.salary)}</div>
      </a>`;
  }

  function sidebar(active) {
    return `
      <aside class="sidebar">
        <a class="side-link ${active==='dashboard'?'active':''}" href="dashboard.html">${icons.briefcase} Overview</a>
        <a class="side-link ${active==='applications'?'active':''}" href="applications.html">${icons.check} Applications</a>
        <a class="side-link ${active==='messages'?'active':''}" href="messages.html">${icons.message} Messages</a>
        <a class="side-link ${active==='profile'?'active':''}" href="profile.html">${icons.user} Profile</a>
      </aside>`;
  }

  function requireAuth() {
    if (session?.user) return true;
    location.href = 'login.html?next=' + encodeURIComponent(location.href);
    return false;
  }

  function requireOnboarding() {
    if (profile?.onboarding_complete) return true;
    location.href = 'onboarding.html';
    return false;
  }

  async function home() {
    const list = $('#featuredJobs');
    if (!list) return;
    jobs = await liveJobs();
    list.innerHTML = jobs.length
      ? jobs.slice(0,3).map(jobRow).join('')
      : '<div class="empty"><strong>No live openings yet.</strong><br>When an employer publishes a real role, it will appear here.</div>';
    $('#heroSearch')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#heroQuery').value.trim();
      location.href = 'jobs.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  async function jobsPage() {
    const list = $('#jobsList');
    if (!list) return;
    jobs = await liveJobs();
    const query = $('#jobQuery');
    const type = $('#jobType');
    const mode = $('#jobMode');
    const count = $('#jobCount');
    query.value = new URLSearchParams(location.search).get('q') || '';
    const render = () => {
      const q = query.value.trim().toLowerCase();
      const filtered = jobs.filter(job => [job.title, job.company, job.location, job.state, job.category, ...(job.skills || [])].join(' ').toLowerCase().includes(q)
        && (!type.value || job.type === type.value)
        && (!mode.value || job.mode === mode.value));
      count.textContent = `${filtered.length} ${filtered.length === 1 ? 'opening' : 'openings'}`;
      list.innerHTML = filtered.length
        ? filtered.map(jobRow).join('')
        : '<div class="empty"><strong>No live openings match.</strong><br>There are no published roles matching those filters right now.</div>';
    };
    [query, type, mode].forEach(control => control?.addEventListener('input', render));
    $('#clearFilters')?.addEventListener('click', () => { query.value=''; type.value=''; mode.value=''; render(); });
    render();
  }

  async function jobPage() {
    const root = $('#jobRoot');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    const job = await RelayDB.getJob(id).catch(() => null);
    if (!job) { root.innerHTML = '<div class="empty"><strong>Opening not found.</strong><br>This role may have been closed or removed.</div>'; return; }

    root.innerHTML = `
      <div class="job-detail">
        <article class="detail-card">
          <div class="detail-header"><div class="detail-icon">${esc(initials(job.company).slice(0,1))}</div><div><div class="eyebrow"><span class="dot"></span>${esc(job.category)}</div><h2>${esc(job.title)}</h2><div class="small-muted">${esc(job.company)} · ${esc(job.location)}</div></div></div>
          <div class="divider"></div>
          <div class="detail-copy"><h3>About the role</h3><p>${esc(job.description)}</p><h3>Skills</h3><div class="job-meta">${(job.skills||[]).map(skill => `<span class="tag">${esc(skill)}</span>`).join('')}</div></div>
        </article>
        <aside class="detail-card apply-sticky">
          <div class="notice">Published on Relay · India</div>
          <div class="divider"></div>
          <div class="kpi"><span>Pay</span><strong>${esc(job.salary)}</strong></div>
          <div class="kpi"><span>Type</span><strong>${esc(job.type)}</strong></div>
          <div class="kpi"><span>Work style</span><strong>${esc(job.mode)}</strong></div>
          <div class="kpi"><span>Location</span><strong>${esc(job.location)}</strong></div>
          <div style="height:16px"></div>
          <button class="btn btn-blue" id="apply" style="width:100%">Apply for this role ${icons.arrow}</button>
        </aside>
      </div>`;

    $('#apply').addEventListener('click', async () => {
      if (!requireAuth() || !requireOnboarding()) return;
      if (profile.role !== 'seeker') { toast('Only job-seeker profiles can apply.'); return; }
      try {
        await RelayDB.apply({ job_id: job.id, applicant_id: session.user.id });
        toast('Application submitted.');
      } catch (error) {
        toast(error.message?.includes('duplicate') ? 'You already applied to this opening.' : error.message || 'Could not submit application.');
      }
    });
  }

  function prepareSignupData(form) {
    const data = new FormData(form);
    const age = Number(data.get('age'));
    if (!age || age < 18) throw new Error('Relay is currently for adults aged 18 and over.');
    if (!data.get('ageTruth') || !data.get('terms') || !data.get('privacy')) throw new Error('Please confirm your age and accept the required policies.');
    return {
      name: data.get('name').toString().trim(),
      email: data.get('email').toString().trim(),
      password: data.get('password').toString(),
      role: data.get('role').toString(),
      age
    };
  }

  function wireGoogle(button, source) {
    if (!button) return;
    button.addEventListener('click', async () => {
      try {
        if (source === 'signup') {
          const form = $('#authForm');
          const info = prepareSignupData(form);
          savePending({ role: info.role, age: info.age, ageConfirmed: true, terms: true, privacy: true, name: info.name });
        }
        await RelayDB.signInGoogle();
      } catch (error) {
        toast(error.message || 'Google sign-in could not start.');
      }
    });
  }

  function roleButtons() {
    document.querySelectorAll('.role-choice').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.role-choice').forEach(x => x.classList.remove('active'));
        button.classList.add('active');
        const hidden = $('#roleValue');
        if (hidden) hidden.value = button.dataset.role;
      });
    });
  }

  async function auth(kind) {
    const form = $('#authForm');
    if (!form) return;
    roleButtons();
    wireGoogle($('#googleBtn'), kind === 'signup' ? 'signup' : 'login');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (kind === 'signup') {
          const info = prepareSignupData(form);
          savePending({ role: info.role, age: info.age, ageConfirmed: true, terms: true, privacy: true, name: info.name });
          const result = await RelayDB.signUp({
            email: info.email,
            password: info.password,
            name: info.name,
            role: info.role,
            age: info.age,
            ageConfirmed: true,
            termsAcceptedAt: new Date().toISOString(),
            privacyAcceptedAt: new Date().toISOString()
          });
          if (!result.session) {
            location.href = 'check-email.html?email=' + encodeURIComponent(info.email);
            return;
          }
          session = result.session;
          profile = result.profile || await RelayDB.getProfile(result.user.id);
          location.href = 'onboarding.html';
        } else {
          const data = new FormData(form);
          const result = await RelayDB.signIn(data.get('email').toString().trim(), data.get('password').toString());
          session = result.session;
          profile = result.profile;
          location.href = new URLSearchParams(location.search).get('next') || (profile?.onboarding_complete ? 'dashboard.html' : 'onboarding.html');
        }
      } catch (error) {
        toast(error.message || 'Authentication failed.');
      }
    });
  }

  async function onboarding() {
    if (!session?.user) { location.href = 'login.html'; return; }
    const form = $('#onboardingForm');
    if (!form) return;
    const p = pending() || {};
    if (!$('#onboardingAge')) $('#age')?.setAttribute('id','onboardingAge');
    const age = $('#onboardingAge');
    if (age && p.age) age.value = String(p.age);
    const role = form.elements.role;
    if (role && p.role) role.value = p.role;
    const name = form.elements.name;
    if (name && p.name) name.value = p.name;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(form);
      const selectedAge = Number(data.get('age'));
      if (selectedAge < 18) { toast('Relay is currently for adults 18 and over.'); return; }
      if (!data.get('ageTruth') || !data.get('terms') || !data.get('privacy')) { toast('Confirm your age and accept the required policies.'); return; }
      try {
        profile = await RelayDB.completeProfile({
          name: data.get('name').toString().trim(),
          role: data.get('role').toString(),
          age: selectedAge,
          age_confirmed: true,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          onboarding_complete: true,
          city: data.get('city').toString().trim(),
          state: data.get('state').toString().trim(),
          headline: data.get('headline').toString().trim(),
          skills: data.get('skills').toString().split(',').map(x => x.trim()).filter(Boolean),
          about: data.get('about').toString().trim(),
          experience_years: data.get('experience_years') ? Number(data.get('experience_years')) : null
        });
        clearPending();
        location.href = 'dashboard.html';
      } catch (error) {
        toast(error.message || 'Could not complete your profile.');
      }
    });
  }

  async function dashboard() {
    if (!requireAuth() || !requireOnboarding()) return;
    const root = $('#workspace');
    const employer = profile.role === 'employer';
    let apps = [], mine = [];
    try {
      apps = employer ? await RelayDB.listApplicationsForEmployer(session.user.id) : await RelayDB.listApplicationsForApplicant(session.user.id);
      mine = employer ? (await liveJobs()).filter(j => j.owner_id === session.user.id) : [];
    } catch {}
    const applicantCount = employer ? apps.length : apps.filter(a => a.status === 'Applied').length;
    root.innerHTML = sidebar('dashboard') + `
      <section class="workspace-panel">
        <div class="profile-head"><div class="big-avatar">${initials(profile.name)}</div><div><div class="eyebrow"><span class="dot"></span>${employer ? 'Employer workspace' : 'Job seeker workspace'}</div><h2 style="margin:4px 0 0;letter-spacing:-.03em">Welcome back, ${esc(profile.name.split(' ')[0])}.</h2><div class="small-muted">${employer ? 'Publish real openings and manage applicants.' : 'Keep your profile current and apply to real openings.'}</div></div></div>
        <div class="divider"></div>
        <div class="stat-grid"><div class="stat"><strong>${employer ? mine.length : apps.length}</strong><span>${employer ? 'Openings' : 'Applications'}</span></div><div class="stat"><strong>${employer ? applicantCount : apps.filter(a => a.status === 'Interview').length}</strong><span>${employer ? 'Applications' : 'Interviews'}</span></div><div class="stat"><strong>${employer ? new Set(apps.map(a => a.job_id)).size : apps.filter(a => a.status === 'Offer').length}</strong><span>${employer ? 'Roles with applicants' : 'Offers'}</span></div></div>
        <div class="divider"></div>
        ${employer ? '<div class="section-head"><div><h3 class="section-title" style="font-size:1.2rem">Your openings</h3><p class="section-copy">Only roles you actually publish appear here.</p></div><a class="btn btn-blue btn-small" href="post-job.html">Post a job '+icons.arrow+'</a></div><div class="job-list">'+(mine.length ? mine.map(j => jobRow(j).replace('</a>', '<span class="job-card-note"></span></a>')).join('') : '<div class="empty">You have not published an opening yet.</div>')+'</div>' : '<div class="section-head"><div><h3 class="section-title" style="font-size:1.2rem">Ready when you are.</h3><p class="section-copy">Relay will only show real openings published by employers.</p></div><a class="btn btn-blue btn-small" href="jobs.html">Find work '+icons.arrow+'</a></div>'}
      </section>`;
    if (employer) {
      root.querySelectorAll('.job-card').forEach(card => {
        const id = new URL(card.href, location.href).searchParams.get('id');
        if (!id || !mine.some(j => j.id === id)) return;
        const button = document.createElement('button');
        button.className = 'btn btn-small close-job';
        button.type = 'button';
        button.textContent = 'Close';
        button.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          try { await RelayDB.closeJob(id); toast('Opening closed.'); await dashboard(); } catch (error) { toast(error.message || 'Could not close opening.'); }
        });
        card.appendChild(button);
      });
    }
  }

  async function applications() {
    if (!requireAuth() || !requireOnboarding()) return;
    const root = $('#workspace');
    const employer = profile.role === 'employer';
    let apps = [];
    try { apps = employer ? await RelayDB.listApplicationsForEmployer(session.user.id) : await RelayDB.listApplicationsForApplicant(session.user.id); } catch (error) { toast(error.message || 'Could not load applications.'); }
    if (!employer) {
      const cards = apps.filter(a => a.jobs).map(a => `
        <a class="job-card" href="job.html?id=${a.job_id}"><div class="company-chip">${esc(initials(a.jobs.company).slice(0,1))}</div><div><strong>${esc(a.jobs.title)}</strong><div class="small-muted">${esc(a.jobs.company)} · ${esc(a.jobs.location)}</div><div class="job-meta"><span class="tag tag-blue">${esc(a.status)}</span></div></div></a>`).join('');
      root.innerHTML = sidebar('applications') + `<section class="workspace-panel"><div class="eyebrow"><span class="dot"></span>Applications</div><h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Your applications</h2><p class="section-copy">Every application here comes from your Relay account.</p><div style="height:18px"></div><div class="job-list">${cards || '<div class="empty">No applications yet.</div>'}</div></section>`;
      return;
    }
    const rows = apps.map(a => `
      <div class="applicant-card">
        <div class="profile-head"><div class="big-avatar">${esc(initials(a.profiles?.name))}</div><div><strong>${esc(a.profiles?.name || 'Applicant')}</strong><div class="small-muted">${esc(a.profiles?.headline || 'Relay applicant')} · ${esc(a.profiles?.city || 'India')}</div><div class="job-meta">${(a.profiles?.skills || []).slice(0,5).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div></div></div>
        <div class="small-muted applicant-role">Applied for <strong>${esc(a.jobs?.title || 'Opening')}</strong> · ${esc(a.jobs?.company || '')}</div>
        <div class="applicant-actions"><select class="select status-select"><option ${a.status==='Applied'?'selected':''}>Applied</option><option ${a.status==='Reviewing'?'selected':''}>Reviewing</option><option ${a.status==='Interview'?'selected':''}>Interview</option><option ${a.status==='Offer'?'selected':''}>Offer</option><option ${a.status==='Rejected'?'selected':''}>Rejected</option></select><button class="btn message-applicant" data-app="${a.id}" data-seeker="${a.applicant_id}">Message</button></div>
      </div>`).join('');
    root.innerHTML = sidebar('applications') + `<section class="workspace-panel"><div class="eyebrow"><span class="dot"></span>Applicants</div><h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Applications to your openings</h2><p class="section-copy">Review the people who actually applied to your roles.</p><div style="height:18px"></div><div class="applicant-list">${rows || '<div class="empty">No one has applied to your openings yet.</div>'}</div></section>`;
    root.querySelectorAll('.applicant-card').forEach((card, index) => {
      const app = apps[index];
      card.querySelector('.status-select')?.addEventListener('change', async e => { try { await RelayDB.updateApplication(app.id, e.target.value); toast('Application status updated.'); } catch (error) { toast(error.message || 'Could not update status.'); } });
      card.querySelector('.message-applicant')?.addEventListener('click', async () => {
        try {
          await RelayDB.createConversation({ job_id: app.job_id, seeker_id: app.applicant_id, employer_id: session.user.id });
          location.href = 'messages.html';
        } catch (error) {
          if (error.message?.includes('duplicate')) { location.href = 'messages.html'; return; }
          toast(error.message || 'Could not start conversation.');
        }
      });
    });
  }

  async function messages() {
    if (!requireAuth() || !requireOnboarding()) return;
    const root = $('#workspace');
    let conversations = [];
    try { conversations = await RelayDB.listConversations(session.user.id); } catch (error) { toast(error.message || 'Could not load messages.'); }
    root.innerHTML = sidebar('messages') + `
      <section class="workspace-panel message-workspace">
        <div class="eyebrow"><span class="dot"></span>Messages</div>
        <h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Direct conversations</h2>
        <p class="section-copy">Messages appear here only after a real conversation starts.</p>
        <div class="message-layout">
          <div class="conversation-list" id="conversationList">${conversations.length ? conversations.map((c,i)=>`<button class="conversation-item ${i===0?'active':''}" data-conversation="${c.id}" type="button"><strong>Conversation ${i+1}</strong><span>Open thread</span></button>`).join('') : '<div class="empty">No conversations yet.</div>'}</div>
          <div class="thread-panel" id="threadPanel"><div class="empty">Select a conversation to view messages.</div></div>
        </div>
      </section>`;
    const items = root.querySelectorAll('.conversation-item');
    items.forEach(item => item.addEventListener('click', () => { items.forEach(x => x.classList.remove('active')); item.classList.add('active'); openConversation(item.dataset.conversation); }));
    if (conversations[0]) await openConversation(conversations[0].id);
  }

  async function openConversation(id) {
    const panel = $('#threadPanel');
    if (!panel) return;
    let messages = [];
    try { messages = await RelayDB.getMessages(id); } catch {}
    panel.innerHTML = `<div class="thread-head"><strong>Conversation</strong><span class="small-muted">Relay messages</span></div><div class="thread-messages">${messages.length ? messages.map(m=>`<div class="message-bubble ${m.sender_id===session.user.id?'mine':''}">${esc(m.body)}<small>${new Date(m.created_at).toLocaleString()}</small></div>`).join('') : '<div class="empty">No messages yet.</div>'}</div><form class="thread-compose" id="threadCompose"><input class="input" name="body" placeholder="Write a message" maxlength="2000" required><button class="btn btn-primary">Send</button></form>`;
    $('#threadCompose')?.addEventListener('submit', async e => {
      e.preventDefault();
      const body = new FormData(e.currentTarget).get('body').toString().trim();
      if (!body) return;
      try { await RelayDB.sendMessage({ conversation_id:id, sender_id:session.user.id, body }); await openConversation(id); } catch (error) { toast(error.message || 'Could not send message.'); }
    });
  }

  async function profilePage() {
    if (!requireAuth() || !requireOnboarding()) return;
    const root = $('#workspace');
    root.innerHTML = sidebar('profile') + `
      <section class="workspace-panel">
        <div class="eyebrow"><span class="dot"></span>Profile</div>
        <h2 class="section-title" style="font-size:1.7rem;margin-top:5px">Your Relay profile</h2>
        <p class="section-copy">Keep it accurate. This is the information you choose to share with the marketplace.</p>
        <div style="height:18px"></div>
        <form id="profileForm" class="form-grid">
          <div class="field"><label class="label">Name</label><input class="input" name="name" value="${esc(profile.name)}" required></div>
          <div class="field"><label class="label">Role</label><select class="select" name="role"><option value="seeker" ${profile.role==='seeker'?'selected':''}>Job seeker</option><option value="employer" ${profile.role==='employer'?'selected':''}>Employer</option></select></div>
          <div class="field"><label class="label">Age</label><input class="input" value="${esc(profile.age || '')}" disabled></div>
          <div class="field"><label class="label">City</label><input class="input" name="city" value="${esc(profile.city || '')}" placeholder="Pune"></div>
          <div class="field"><label class="label">State</label><input class="input" name="state" value="${esc(profile.state || '')}" placeholder="Maharashtra"></div>
          <div class="field full"><label class="label">Headline</label><input class="input" name="headline" value="${esc(profile.headline || '')}" placeholder="Frontend developer · React · UI"></div>
          <div class="field"><label class="label">Experience (years)</label><input class="input" name="experience_years" type="number" min="0" max="70" value="${esc(profile.experience_years ?? '')}"></div>
          <div class="field"><label class="label">Skills</label><input class="input" name="skills" value="${esc((profile.skills||[]).join(', '))}" placeholder="JavaScript, Design, Sales"></div>
          <div class="field full"><label class="label">About</label><textarea class="textarea" name="about">${esc(profile.about || '')}</textarea></div>
          <div class="field full"><button class="btn btn-primary">Save profile</button></div>
        </form>
      </section>`;
    $('#profileForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      try {
        profile = await RelayDB.updateProfile({
          name:f.get('name').toString().trim(), role:f.get('role').toString(), city:f.get('city').toString().trim(), state:f.get('state').toString().trim(),
          headline:f.get('headline').toString().trim(), skills:f.get('skills').toString().split(',').map(x=>x.trim()).filter(Boolean), about:f.get('about').toString().trim(),
          experience_years:f.get('experience_years') ? Number(f.get('experience_years')) : null
        });
        shell(); profilePage(); toast('Profile saved.');
      } catch (error) { toast(error.message || 'Could not update profile.'); }
    });
  }

  async function postJob() {
    if (!requireAuth() || !requireOnboarding()) return;
    if (profile.role !== 'employer') { location.href = 'profile.html'; return; }
    const root = $('#postRoot');
    root.innerHTML = `
      <div class="detail-card">
        <div class="eyebrow"><span class="dot"></span>New opening</div>
        <h1 style="font-size:2.2rem;margin:7px 0 8px">Publish a real job.</h1>
        <p class="hero-copy" style="font-size:.95rem">What you submit becomes a public Relay opening. Keep it clear and honest.</p>
        <form id="jobForm" class="form-grid">
          <div class="field full"><label class="label">Job title</label><input class="input" name="title" placeholder="Frontend Developer" required></div>
          <div class="field"><label class="label">Company / hiring name</label><input class="input" name="company" value="${esc(profile.name)}" required></div>
          <div class="field"><label class="label">Category</label><select class="select" name="category"><option>Development</option><option>Design</option><option>Marketing</option><option>Sales</option><option>Support</option><option>Operations</option><option>Other</option></select></div>
          <div class="field"><label class="label">Location</label><input class="input" name="location" placeholder="Pune, Maharashtra" required></div>
          <div class="field"><label class="label">State</label><input class="input" name="state" placeholder="Maharashtra"></div>
          <div class="field"><label class="label">Work style</label><select class="select" name="mode"><option>Remote</option><option>Hybrid</option><option>On-site</option></select></div>
          <div class="field"><label class="label">Job type</label><select class="select" name="type"><option>Full-time</option><option>Part-time</option><option>Freelance</option><option>Contract</option></select></div>
          <div class="field"><label class="label">Pay</label><input class="input" name="salary" placeholder="₹30,000–₹45,000 / month" required></div>
          <div class="field"><label class="label">Application link (optional)</label><input class="input" name="application_url" type="url" placeholder="https://..."></div>
          <div class="field full"><label class="label">Skills</label><input class="input" name="skills" placeholder="JavaScript, React, UI" required></div>
          <div class="field full"><label class="label">Description</label><textarea class="textarea" name="description" placeholder="What will this person actually do?" required></textarea></div>
          <div class="field full"><button class="btn btn-blue">Publish opening ${icons.arrow}</button></div>
        </form>
      </div>`;
    $('#jobForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      try {
        await RelayDB.createJob({
          owner_id:session.user.id, title:f.get('title').toString().trim(), company:f.get('company').toString().trim(), owner_name:profile.name,
          category:f.get('category').toString(), location:f.get('location').toString().trim(), state:f.get('state').toString().trim() || null,
          mode:f.get('mode').toString(), type:f.get('type').toString(), salary:f.get('salary').toString().trim(),
          application_url:f.get('application_url').toString().trim() || null, skills:f.get('skills').toString().split(',').map(x=>x.trim()).filter(Boolean),
          description:f.get('description').toString().trim()
        });
        location.href = 'dashboard.html';
      } catch (error) { toast(error.message || 'Could not publish this opening.'); }
    });
  }

  async function forgot() {
    const form = $('#forgotForm'); if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      try { await RelayDB.resetPassword(new FormData(form).get('email').toString().trim()); $('#authNotice').textContent='If that email belongs to a Relay account, a reset link has been sent.'; }
      catch (error) { toast(error.message || 'Could not send the reset link.'); }
    });
  }

  async function reset() {
    const form = $('#resetForm'); if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const password = new FormData(form).get('password').toString();
      if (password.length < 8) { toast('Use at least 8 characters.'); return; }
      try { await RelayDB.updatePassword(password); toast('Password updated.'); setTimeout(() => location.href='dashboard.html',700); }
      catch (error) { toast(error.message || 'Could not update your password.'); }
    });
  }

  async function callback() {
    try {
      const result = await RelayDB.completeAuthRedirect();
      if (!result?.user) throw new Error('No Relay session was found.');
      session = result;
      profile = await RelayDB.getProfile(result.user.id).catch(() => null);
      location.href = profile?.onboarding_complete ? 'dashboard.html' : 'onboarding.html';
    } catch (error) {
      location.href = 'login.html?auth_error=' + encodeURIComponent(error.message || 'Authentication could not be completed.');
    }
  }

  async function init() {
    if (!window.RelayDB?.enabled) {
      console.error('RelayDB is not configured.');
      return;
    }
    if (page === 'auth-callback.html') { await callback(); return; }
    await loadSession();
    shell(); footer();

    if ((page === 'login.html' || page === 'signup.html') && session?.user) {
      location.href = profile?.onboarding_complete ? 'dashboard.html' : 'onboarding.html';
      return;
    }

    const authError = new URLSearchParams(location.search).get('auth_error');
    if (authError && $('#authNotice')) $('#authNotice').textContent = authError;

    if (page === 'index.html' || page === '') await home();
    if (page === 'jobs.html') await jobsPage();
    if (page === 'job.html') await jobPage();
    if (page === 'login.html') await auth('login');
    if (page === 'signup.html') await auth('signup');
    if (page === 'onboarding.html') await onboarding();
    if (page === 'dashboard.html') await dashboard();
    if (page === 'applications.html') await applications();
    if (page === 'messages.html') await messages();
    if (page === 'profile.html') await profilePage();
    if (page === 'post-job.html') await postJob();
    if (page === 'forgot-password.html') await forgot();
    if (page === 'reset-password.html') await reset();
  }

  init();
})();