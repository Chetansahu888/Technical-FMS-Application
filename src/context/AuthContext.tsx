import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { masterDataService } from '../services/masterDataService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoUser: (userId: string) => void;
  logout: () => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => masterDataService.getUsers());

  const refreshUsers = () => {
    setUsers(masterDataService.getUsers());
  };

  const login = async (email: string, password?: string) => {
    const res = await authService.login(email, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  const loginAsDemoUser = (userId: string) => {
    const user = authService.loginAsDemo(userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, loginAsDemoUser, logout, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
