import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 30_000,      // data stays fresh for 30s — prevents refetch on every navigation
      gcTime: 5 * 60_000,     // keep unused cache for 5 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});
