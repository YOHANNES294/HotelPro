import React, { createContext, useContext, useState, useEffect } from 'react';
import { secureStorage } from '../services/secure-storage';
import { apiRequest } from '../services/api-client';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  branchId?: string;
  organizationName?: string;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await secureStorage.getItem('auth_token');
        const storedUser = await secureStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to restore auth session', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.success || !res.data) {
        return { success: false, error: res.error || 'Invalid credentials' };
      }

      const receivedToken = res.data.token;
      const receivedUser: UserSession = {
        id: res.data.user.id,
        name: res.data.user.name,
        email: res.data.user.email,
        role: res.data.user.role,
        organizationId: res.data.user.organizationId,
        branchId: res.data.user.branchId,
        organizationName: res.data.organization?.name,
      };

      await secureStorage.setItem('auth_token', receivedToken);
      await secureStorage.setItem('auth_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    await secureStorage.removeItem('auth_token');
    await secureStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'HOTEL_OWNER' || user.role === 'GENERAL_MANAGER') {
      return true;
    }
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
