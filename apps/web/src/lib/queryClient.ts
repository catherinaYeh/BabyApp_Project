import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.problem.detail ?? error.problem.title;
  return '操作未成功，請稍後再試。';
}

export const queryClient = new QueryClient({
  // A single place to surface write (mutation) failures so the user always
  // knows an action did not succeed — and no fake success is left on screen.
  mutationCache: new MutationCache({
    onError: (error) => {
      if (typeof window !== 'undefined') window.alert(messageFromError(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
