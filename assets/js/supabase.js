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

    async signIn(email, password) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = data.user ? await getProfile(data.user.id) : null;
      return { user: data.user, profile, session: data.session };
    },

    async signUp({ email, password, name, role }) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
          emailRedirectTo: location.origin + '/login.html'
        }
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    async signInGoogle() {
      if (!client) throw new Error('Supabase is not configured.');
      const redirectTo = new URL('auth-callback.html', location.href).href;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw error;
      if (data?.url) window.location.assign(data.url);
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

    async getProfile(userId) {
      return getProfile(userId);
    },

    async completeProfile(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const s = await this.session();
      if (!s?.user) throw new Error('Your session has expired. Please log in again.');
      const clean = { ...payload, id: s.user.id, email: s.user.email };
      const { data, error } = await client.from('profiles').upsert(clean, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return data;
    },

    async listJobs() {
      if (!client) return [];
      const { data, error } = await client
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getJob(id) {
      if (!client) return null;
      const { data, error } = await client.from('jobs').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },

    async createJob(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('jobs').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async apply(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('applications').insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async listApplicationsForApplicant(userId) {
      if (!client) return [];
      const { data, error } = await client
        .from('applications')
        .select('*, jobs(*)')
        .eq('applicant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async listApplicationsForEmployer(userId) {
      if (!client) return [];
      const { data, error } = await client
        .from('applications')
        .select('*, jobs!inner(*)')
        .eq('jobs.owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  };
})();