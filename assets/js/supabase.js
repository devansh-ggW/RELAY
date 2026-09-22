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
    getProfile,

    async session() {
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async signIn(email, password) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = data.user ? await getProfile(data.user.id) : null;
      return { user: data.user, profile };
    },

    async signUp({ email, password, name, role }) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
          emailRedirectTo: new URL('login.html', location.href).href
        }
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    async signInGoogle() {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: new URL('auth-callback.html', location.href).href }
      });
      if (error) throw error;
      return data;
    },

    async resetPassword(email) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('reset-password.html', location.href).href
      });
      if (error) throw error;
    },

    async updatePassword(password) {
      if (!client) throw new Error('Supabase is not configured.');
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },

    async completeProfile(payload) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data: authData } = await client.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Your session expired. Please sign in again.');
      const { data, error } = await client.from('profiles').update(payload).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },

    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async listJobs() {
      if (!client) return [];
      const { data, error } = await client.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false });
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
      const { data, error } = await client.from('applications').select('*, jobs(*)').eq('applicant_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async listApplicationsForEmployer(userId) {
      if (!client) return [];
      const { data, error } = await client.from('applications').select('*, jobs!inner(*)').eq('jobs.owner_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async conversations(userId) {
      if (!client) return [];
      const { data, error } = await client.from('conversations').select('*').or(`seeker_id.eq.${userId},employer_id.eq.${userId}`).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async messages(conversationId) {
      if (!client) return [];
      const { data, error } = await client.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async sendMessage(conversationId, senderId, body) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body }).select().single();
      if (error) throw error;
      return data;
    }
  };
})();
