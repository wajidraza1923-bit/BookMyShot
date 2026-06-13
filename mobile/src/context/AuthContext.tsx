import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

type UserRole = 'user' | 'creator' | 'admin' | null;

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, role: null, isLoading: true, isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('bms_token');
      const storedUser = await AsyncStorage.getItem('bms_user');
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Validate token is still valid
        try {
          const res = await authAPI.me();
          const freshUser = res.data?.user;
          if (freshUser) {
            setUser(freshUser);
            await AsyncStorage.setItem('bms_user', JSON.stringify(freshUser));
          }
        } catch {
          // Token expired — clear session
          await clearSession();
        }
      }
    } catch {
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = async () => {
    setUser(null);
    setToken(null);
    try {
      await AsyncStorage.removeItem('bms_token');
      await AsyncStorage.removeItem('bms_user');
    } catch {}
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await authAPI.login(email, password);
      const { token: newToken, user: newUser } = res.data;
      await AsyncStorage.setItem('bms_token', newToken);
      await AsyncStorage.setItem('bms_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      const res = await authAPI.register(name, email, password, role);
      const { token: newToken, user: newUser } = res.data;
      await AsyncStorage.setItem('bms_token', newToken);
      await AsyncStorage.setItem('bms_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    await clearSession();
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.me();
      const freshUser = res.data?.user;
      if (freshUser) {
        setUser(freshUser);
        await AsyncStorage.setItem('bms_user', JSON.stringify(freshUser));
      }
    } catch {}
  };

  const role: UserRole = user?.role || null;
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, role, isLoading, isAuthenticated, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
