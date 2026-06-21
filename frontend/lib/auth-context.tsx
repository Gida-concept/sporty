'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, clearToken, setToken as storeToken } from '@/lib/admin-api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_token');
      if (stored) setToken(stored);
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (tokenValue: string) => {
    const result = await apiLogin(tokenValue);
    storeToken(result.sessionToken);
    setToken(result.sessionToken);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    window.location.href = '/admin/login';
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
