import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true while checking existing session
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Silent token refresh ─────────────────────────────────────────────────
  const scheduleRefresh = useCallback((delayMs: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include', // sends HTTP-only refresh token cookie
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          scheduleRefresh(14 * 60 * 1000); // refresh again in 14 min
        } else {
          // Refresh failed — session expired
          setUser(null);
          setAccessToken(null);
        }
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    }, delayMs);
  }, []);

  // ─── On mount: try to restore session via refresh token cookie ────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);

          // Fetch user info
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            setUser(me);
            scheduleRefresh(14 * 60 * 1000);
          }
        }
      } catch {
        // No session — user must log in
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setAccessToken(data.accessToken);
    setUser(data.user);
    scheduleRefresh(14 * 60 * 1000);
  }, [scheduleRefresh]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue logout even if request fails
    }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
