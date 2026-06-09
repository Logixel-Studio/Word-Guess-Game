import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { auth as supabaseAuth } from '@/api/supabaseAdapter';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth,   setIsLoadingAuth]   = useState(true);
  const [authChecked,     setAuthChecked]     = useState(false);
  const [appPublicSettings] = useState({ id: 'nutrimeth', public_settings: {} });

  const resolving = useRef(false);
  const mounted   = useRef(true);

  // ── Resolve user profile from Supabase profiles table ──────────────────────
  const resolveProfile = useCallback(async (authUser) => {
    if (resolving.current) return;
    resolving.current = true;
    try {
      // Try to get profile
      const { data: profile, error: fetchErr } = await supabase
        .from('profiles').select('*').eq('id', authUser.id).maybeSingle();

      let finalProfile = profile;

      // If profiles table exists but no row → create one
      if (!finalProfile && !fetchErr?.message?.includes('404')) {
        const { data: created } = await supabase.from('profiles').insert({
          id:         authUser.id,
          email:      authUser.email,
          full_name:  authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          role:       authUser.user_metadata?.role || 'employee',
          avatar_url: authUser.user_metadata?.avatar_url || '',
        }).select().maybeSingle();
        finalProfile = created;
      }

      if (!mounted.current) return;

      const merged = {
        id:         authUser.id,
        email:      authUser.email,
        full_name:  finalProfile?.full_name  || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        role:       finalProfile?.role       || authUser.user_metadata?.role || 'employee',
        avatar_url: finalProfile?.avatar_url || '',
        ...finalProfile,
      };

      setUser(merged);
      setIsAuthenticated(true);
    } catch (err) {
      console.warn('[AuthContext] resolveProfile error (non-fatal):', err.message);
      if (!mounted.current) return;
      // Still authenticate — just use auth metadata
      setUser({
        id:        authUser.id,
        email:     authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        role:      authUser.user_metadata?.role || 'employee',
        avatar_url:'',
      });
      setIsAuthenticated(true);
    } finally {
      resolving.current = false;
      if (mounted.current) { setIsLoadingAuth(false); setAuthChecked(true); }
    }
  }, []);

  // ── Force-refresh profile (call after role change) ────────────────────────
  const refreshProfile = useCallback(async () => {
    supabaseAuth.clearCache();
    resolving.current = false;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await resolveProfile(authUser);
  }, [resolveProfile]);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return;
      if (session?.user) {
        resolveProfile(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    }).catch(() => {
      if (!mounted.current) return;
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      supabaseAuth.clearCache();

      if (event === 'SIGNED_IN' && session?.user) {
        resolving.current = false;
        resolveProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        resolving.current = false;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
      // TOKEN_REFRESHED intentionally ignored — caused infinite loop
    });

    return () => { mounted.current = false; subscription.unsubscribe(); };
  }, [resolveProfile]);

  const logout = useCallback(async () => {
    supabaseAuth.clearCache();
    resolving.current = false;
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings,
      authChecked,
      logout,
      refreshProfile,          // ← call this after changing role in Supabase
      navigateToLogin: () => { supabaseAuth.clearCache(); window.location.href = '/login'; },
      checkUserAuth: refreshProfile,
      checkAppState: refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
