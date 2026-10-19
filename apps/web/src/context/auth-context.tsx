'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    currency: string;
  };
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  permissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  activeBranchId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveBranchId: (branchId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('hotelpro_token');
    const savedUser = localStorage.getItem('hotelpro_user');
    const savedBranch = localStorage.getItem('hotelpro_branch_id');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        setActiveBranchId(savedBranch || parsed.branch?.id || null);
      } catch (e) {
        localStorage.removeItem('hotelpro_token');
        localStorage.removeItem('hotelpro_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient<{
      user: UserProfile;
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('hotelpro_token', res.tokens.accessToken);
    localStorage.setItem('hotelpro_refresh_token', res.tokens.refreshToken);
    localStorage.setItem('hotelpro_user', JSON.stringify(res.user));
    if (res.user.branch?.id) {
      localStorage.setItem('hotelpro_branch_id', res.user.branch.id);
      setActiveBranchId(res.user.branch.id);
    }

    setToken(res.tokens.accessToken);
    setUser(res.user);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('hotelpro_token');
    localStorage.removeItem('hotelpro_refresh_token');
    localStorage.removeItem('hotelpro_user');
    localStorage.removeItem('hotelpro_branch_id');
    setToken(null);
    setUser(null);
    setActiveBranchId(null);
    router.push('/login');
  };

  const setBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    localStorage.setItem('hotelpro_branch_id', branchId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeBranchId,
        login,
        logout,
        setActiveBranchId: setBranch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
