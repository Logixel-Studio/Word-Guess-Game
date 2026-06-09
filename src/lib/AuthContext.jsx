import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { auth as supabaseAuth } from '@/api/supabaseAdapter';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked]     = useState(false);
  const [appPublicSettings]               = useState({ id: 'nutrimeth', public_settings: {} });

  const resolving = useRef(false);   // prevent concurrent resolveProfile calls
  const mounted   = useRef(true);

  const resolveProfile = useCallback(async (authUser) => {
    if (resolving.current) return;
    resolving.current = true;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();                   // maybeSingle won't throw on 0 rows

      let finalProfile = profile;
      if (!finalProfile) {
        const { data: created } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
            role: authUser.user_metadata?.role || 'employee',
            avatar_url: authUser.user_metadata?.avatar_url || '',
          })
          .select()
          .maybeSingle();
        finalProfile = created;
      }

      if (!mounted.current) return;
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: finalProfile?.full_name || '',
        role: finalProfile?.role || 'employee',
        avatar_url: finalProfile?.avatar_url || '',
        ...finalProfile,
      });
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Profile resolve error:', err);
      if (!mounted.current) return;
      // Still mark as authenticated so the app doesn't loop
      setUser({ id: authUser.id, email: authUser.email, role: 'employee' });
      setIsAuthenticated(true);
    } finally {
      resolving.current = false;
      if (mounted.current) {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // One-time session check on mount
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

    // Auth state listener — only react to explicit sign in / sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      supabaseAuth.clearCache();

      if (event === 'SIGNED_IN' && session?.user) {
        resolveProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        resolving.current = false;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
      // Intentionally ignore TOKEN_REFRESHED — it causes the loop
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [resolveProfile]);

  const logout = useCallback(async (shouldRedirect = true) => {
    supabaseAuth.clearCache();
    resolving.current = false;
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/login';
  }, []);

  const navigateToLogin = useCallback(() => {
    supabaseAuth.clearCache();
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
      navigateToLogin,
      checkUserAuth: () => {},
      checkAppState: () => {},
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
