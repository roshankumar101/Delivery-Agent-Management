import axios from 'axios';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { ApiFailure, ApiSuccess, AuthUser, LoginResponse } from '../types/api';

const tokenStorageKey = 'delivery-agent-access-token';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    return error.response?.data.message ?? fallback;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const token = localStorage.getItem(tokenStorageKey);

    if (!token) {
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    api.get<ApiSuccess<AuthUser>>('/auth/me')
      .then(({ data }) => {
        if (isCurrent) setUser(data.data);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        localStorage.removeItem(tokenStorageKey);
        setSessionError(getApiErrorMessage(error, 'Could not restore your session. Please sign in again.'));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<ApiSuccess<LoginResponse>>('/auth/login', {
      email,
      password,
    });
    localStorage.setItem(tokenStorageKey, data.data.token);
    setSessionError(null);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenStorageKey);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, sessionError, login, logout }),
    [user, isLoading, sessionError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
