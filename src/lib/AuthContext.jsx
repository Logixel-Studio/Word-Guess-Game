import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { auth as supabaseAuth } from '@/api/supabaseAdapter';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                       = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth]     = useState(true);
  const [isLoadingPublicSettings]             = useState(false); // No public settings needed
  const [authError, setAuthError]             = useState(null);
  const [authChecked, setAuthChecked]         = useState(false);
  const [appPublicSettings]                   = useState({ id: 'nutrimeth', public_settings: {} });

  // Load current session on mount
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          await resolveProfile(session.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Session load error:', err);
        if (mounted) {
          setAuthError({ type: 'unknown', message: err.message });
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
      }
    };

    loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      supabaseAuth.clearCache();

      if (event === 'SIGNED_IN' && session?.user) {
        await resolveProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await resolveProfile(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const resolveProfile = async (authUser) => {
    try {
      // Fetch or create profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        // Auto-create profile on first login
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
            role: authUser.user_metadata?.role || 'employee',
            avatar_url: authUser.user_metadata?.avatar_url || '',
          })
          .select()
          .single();
        profile = newProfile;
      }

      const merged = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || '',
        role: profile?.role || 'employee',
        avatar_url: profile?.avatar_url || '',
        ...profile,
      };

      setUser(merged);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      console.error('Profile resolve error:', err);
      setUser({ id: authUser.id, email: authUser.email, role: 'employee' });
      setIsAuthenticated(true);
    }
  };

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await resolveProfile(authUser);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const logout = useCallback(async (shouldRedirect = true) => {
    supabaseAuth.clearCache();
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
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
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
