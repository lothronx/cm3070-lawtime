import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

interface User {
  id: string;
  phone: string;
  created_at: string;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

interface AuthContextValue {
  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  session: AuthSession | null;
  user: User | null;
  
  // Actions
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authState = useAuthSession();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}