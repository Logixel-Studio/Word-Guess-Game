import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase, setCreatorContext } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ id: 'nutrimeth', public_settings: {} });

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile(data);
        setCreatorContext({ id: data.id, name: data.full_name, email: data.email });
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const ensureProfile = useCallback(async (authUser) => {
    if (!authUser) return;
    const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
    // Try to fetch existing
    let existing = null;
    try {
      const { data } = await supabase.from('user_profiles').select('*').eq('id', authUser.id).single();
      existing = data;
    } catch {}

    if (!existing) {
      try {
        await supabase.from('user_profiles').insert([{
          id: authUser.id,
          email: authUser.email,
          full_name: fullName,
          avatar_url: authUser.user_metadata?.avatar_url || null,
        }]);
      } catch {}
    }
    const prof = await fetchProfile(authUser.id);
    return prof;
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        // await ensureProfile(session.user);
        await fetchProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
        setCreatorContext({ id: null, name: null, email: null });
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }).catch(() => {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        // await ensureProfile(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setCreatorContext({ id: null, name: null, email: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setCreatorContext({ id: null, name: null, email: null });
  };

  const navigateToLogin = () => {};
  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) { setUser(currentUser); setIsAuthenticated(true); await ensureProfile(currentUser); }
    } catch {}
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };
  const checkAppState = async () => { await checkUserAuth(); };

  const displayName = profile?.full_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'User';

  return (
    <AuthContext.Provider value={{
      user, profile, displayName, isAuthenticated, isLoadingAuth,
      isLoadingPublicSettings, authError, appPublicSettings, authChecked,
      logout, navigateToLogin, checkUserAuth, checkAppState, fetchProfile, ensureProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
