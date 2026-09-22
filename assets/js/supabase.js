(function () {
  const cfg = window.RELAY_CONFIG || {};
  const ready = !!(cfg.supabaseUrl && cfg.supabasePublishableKey && window.supabase?.createClient);
  const client = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  async function getProfile(userId) {
    if (!client) return null;
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  window.RelayDB = {
    enabled: ready,
    client,

    async session() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session || null;
    },

    async completeAuthRedirect() {
      if (!client) return null;
      const code = new URLSearchParams(location.search).get('code');
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      return this.session();
    },

    async signIn(email, password) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { user: data.user, session: data.session, profile: await getProfile(data.user.id) };
    },

    async signUp({ email, password, name, role, age, ageConfirmed, termsAcceptedAt, privacyAcceptedAt }) {
      if (!client) throw new Error('Supabase is not configured.');
      if (Number(age) < 18) throw new Error('Relay is currently for adults aged 18 and over.');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, age, age_confirmed: !!ageConfirmed },
          emailRedirectTo: new URL('auth-callback.html?flow=email', location.href).href
        }
      });
      if (error) throw error;
      return { user: data.user, session: data.session, profile: data.user ? await getProfile(data.user.id).catch(() => null) : null };
    },

    async resendSignupConfirmation(email) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.auth.resend({ type: 'signup', email });
      if (error) throw error;
    },

    async signInGoogle() {
      if (!client) throw new Error('Supabase is not configured.');
      try {
        const settingsResponse = await fetch(cfg.supabaseUrl + '/auth/v1/settings', {
          headers: { apikey: cfg.supabasePublishableKey }
        });
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          const enabled = settings?.external?.google;
          if (enabled === false) {
            throw new Error('Google sign-in is not enabled in Relay yet. In Supabase, open Authentication → Providers → Google and enable it.');
          }
        }
      } catch (error) {
        if (error?.message?.includes('Google sign-in is not enabled')) throw error;
      }
      const redirectTo = new URL('auth-callback.html?flow=google', location.href).href;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } }
      });
      if (error) {
        if (error.message?.toLowerCase().includes('provider') && error.message?.toLowerCase().includes('not enabled')) {
          throw new Error('Google sign-in is not enabled in Relay yet. Enable Google under Supabase → Authentication → Providers → Google.');
        }
        throw error;
      }
      if (data?.url) location.assign(data.url);
    },

    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async resetPassword(email) {
      if (!client) throw new Error('Supabase is not configured.');
      const redirectTo = new URL('reset-password.html', location.href).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    },

    async updatePassword(password) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },

    async getProfile(userId) { return getProfile(userId); },

    async updateProfile(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const s = await this.session();
      if (!s?.user) throw new Error('Your session has expired. Please log in again.');
      const update = { ...payload, id: s.user.id, email: s.user.email, updated_at: new Date().toISOString() };
      const { data, error } = await client.from('profiles').upsert(update, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return data;
    },

    async completeProfile(payload) {
      return this.updateProfile(payload);
    },

    async listNotifications(userId) {
      if (!client) return [];
      const { data, error } = await client.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(60);
      if (error) throw error;
      return data || [];
    },

    async markNotificationRead(id) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.from('notifications').update({ read_at:new Date().toISOString() }).eq('id',id);
      if (error) throw error;
    },

    async markAllNotificationsRead(userId) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.from('notifications').update({ read_at:new Date().toISOString() }).eq('user_id',userId).is('read_at',null);
      if (error) throw error;
    },

    async saveJob(userId, jobId) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.from('saved_jobs').insert({ user_id:userId, job_id:jobId });
      if (error && !error.message?.toLowerCase().includes('duplicate')) throw error;
    },

    async unsaveJob(userId, jobId) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.from('saved_jobs').delete().eq('user_id',userId).eq('job_id',jobId);
      if (error) throw error;
    },

    async listSavedJobs(userId) {
      if (!client) return [];
      const { data, error } = await client.from('saved_jobs').select('created_at,jobs(*)').eq('user_id',userId).order('created_at',{ascending:false});
      if (error) throw error;
      return data || [];
    },

    async report(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('reports').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async listJobs() {
      if (!client) return [];
      const { data, error } = await client.from('jobs').select('*').eq('status','open').order('created_at',{ascending:false});
      if (error) throw error;
      return data || [];
    },

    async getJob(id) {
      if (!client) return null;
      const { data, error } = await client.from('jobs').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },

    async updateJob(id, payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('jobs').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async createJob(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('jobs').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async closeJob(id) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.from('jobs').update({ status:'closed' }).eq('id',id);
      if (error) throw error;
    },

    async apply(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('applications').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async listApplicationsForApplicant(userId) {
      if (!client) return [];
      const { data, error } = await client.from('applications').select('*, jobs(*)').eq('applicant_id',userId).order('created_at',{ascending:false});
      if (error) throw error;
      return data || [];
    },

    async listTalent() {
      if (!client) return [];
      const { data, error } = await client
        .from('profile_public')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getTalent(id) {
      if (!client) return null;
      const { data, error } = await client.from('profile_public').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },

    async listApplicationsForEmployer(userId) {
      if (!client) return [];
      const { data, error } = await client
        .from('applications')
        .select('id,job_id,applicant_id,status,cover_note,created_at,applicant_name,applicant_headline,applicant_city,applicant_state,applicant_skills,applicant_about,applicant_experience_years,applicant_portfolio_url,jobs!inner(id,title,company,location,owner_id)')
        .eq('jobs.owner_id', userId)
        .order('created_at',{ascending:false});
      if (error) throw error;
      return data || [];
    },

    async updateApplication(id, status) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.from('applications').update({ status }).eq('id',id);
      if (error) throw error;
    },

    async listConversations(userId) {
      if (!client) return [];
      const { data, error } = await client.from('conversations').select('id,job_id,seeker_id,employer_id,seeker_name,employer_name,created_at').or('seeker_id.eq.'+userId+',employer_id.eq.'+userId).order('created_at',{ascending:false});
      if (error) throw error;
      return data || [];
    },

    async createConversation(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('conversations').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async getMessages(conversationId) {
      if (!client) return [];
      const { data, error } = await client.from('messages').select('*').eq('conversation_id',conversationId).order('created_at',{ascending:true});
      if (error) throw error;
      return data || [];
    },

    async sendMessage(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('messages').insert(payload).select().single();
      if (error) throw error;
      return data;
    }
  };
})();