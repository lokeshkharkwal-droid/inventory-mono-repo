import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearTokens,
  getAuthToken,
  initAuthFromStorage,
  login as httpLogin,
  onAuthLogout,
} from '@/lib/http';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Minimal auth context. Identity is owned by kalnostics-new — we only hold the
 * access token (restored from localStorage) and expose login/logout. The http
 * layer emits `auth-logout` when a refresh fails for good.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    initAuthFromStorage();
    return !!getAuthToken();
  });

  const login = useCallback(async (identifier: string, password: string) => {
    await httpLogin(identifier, password);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => onAuthLogout(() => setIsAuthenticated(false)), []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
