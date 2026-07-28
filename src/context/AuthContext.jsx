import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, dbAvailable } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!dbAvailable) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) return;
      setProfile(data || null);
    } catch {

    }
  }, []);

  useEffect(() => {
    if (!dbAvailable) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        try { await supabase.rpc('check_auto_approve'); } catch {}
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) { setUser(session.user); fetchProfile(session.user.id); }
      else { setUser(null); setProfile(null); }
    });
    return () => subscription?.unsubscribe();
  }, [fetchProfile]);

  const mergedUser = useMemo(() => {
    if (!user) return null;
    if (profile) return { ...user, role: profile.role, name: profile.name || user.name, schoolId: profile.school_id || null };
    return { ...user, role: user.user_metadata?.role || 'pending', name: user.user_metadata?.name || user.email, schoolId: null };
  }, [user, profile]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!dbAvailable) { setError('Service unavailable'); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message || 'Authentication failed');
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setError(null);
    if (!user) { setError('Not logged in'); return false; }
    if (user.app_metadata?.providers?.includes('google')) { setError('Google accounts use your Google password'); return false; }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) { setError('Current password is incorrect'); return false; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setError('Operation failed. Try again.'); return false; }
    return true;
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    if (!dbAvailable) { setError('Service unavailable'); return false; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('Invalid email or password'); return false; }
    return true;
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    setError(null);
    if (!dbAvailable) { setError('Service unavailable'); return null; }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) { setError(error.message); return null; }
    return data?.user || null;
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null);
    if (!dbAvailable) { setError('Service unavailable'); return false; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    setError(null);
    if (!dbAvailable) { setError('Service unavailable'); return false; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return <AuthContext.Provider value={{ user: mergedUser, session, profile, loading, error, signIn, signUp, signOut, signInWithGoogle, changePassword, resetPassword, updatePassword, setError, refreshProfile }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
