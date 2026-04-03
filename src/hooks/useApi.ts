import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

export function useApi() {
  const { accessToken } = useAuth();

  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options?.headers,
      },
      credentials: 'include',
    });
    return res;
  }, [accessToken]);

  return { apiFetch };
}
