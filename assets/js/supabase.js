(function () {
  const cfg = window.RELAY_CONFIG || {};
  const ready = !!(cfg.supabaseUrl && cfg.supabasePublishableKey && window.supabase?.createClient);
  const client = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
  async function getProfile(userId) {
    if (!client) return null;
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }
  window.RelayDB = {
    enabled: ready, client,
    async signIn(email, password) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = data.user ? await getProfile(data.user.id) : null;
      return { user: data.user, profile };
    },
    async signUp({ email, password, name, role }) {
      if (!client) throw new Error('Supabase is not configured.');
      const { data, error } = await client.auth.signUp({ email, password, options: { data: { name, role }, emailRedirectTo: location.origin + '/login.html' } });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },
    async signOut() {
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
  };
})();