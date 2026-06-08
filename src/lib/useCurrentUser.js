import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { auth as supabaseAuth } from '@/api/supabaseAdapter';

let _cached = null;
const _listeners = new Set();

export function useCurrentUser() {
  const [user, setUser] = useState(_cached);

  useEffect(() => {
    const update = (u) => setUser(u);
    _listeners.add(update);

    if (!_cached) {
      supabaseAuth.me()
        .then(u => {
          _cached = u;
          _listeners.forEach(fn => fn(u));
        })
        .catch(() => {});
    }

    // Listen for auth changes to invalidate cache
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        _cached = null;
        _listeners.forEach(fn => fn(null));
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        _cached = null;
        supabaseAuth.me()
          .then(u => {
            _cached = u;
            _listeners.forEach(fn => fn(u));
          })
          .catch(() => {});
      }
    });

    return () => {
      _listeners.delete(update);
      subscription.unsubscribe();
    };
  }, []);

  return user;
}
