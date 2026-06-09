import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Simple hook that returns the current user from AuthContext.
 * No separate Supabase fetch — AuthContext already manages the profile.
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}
