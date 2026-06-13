import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

type UserRole = 'user' | 'creator' | 'admin' | null;

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  emailVerified?: boolean;
  creatorStatus?: string;
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

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    console.log('[Auth] Restoring session...');
    try {
      // Test API connectivity first
      const { testApiConnection } = require('../services/api');
      const connTest = await testApiConnection();
      console.log('[Auth] API connectivity:', connTest.ok ? 'OK' : 'FAILED -', connTest.message);

      const storedToken = await AsyncStorage.getItem('bms_token');
      const storedUser = await AsyncStorage.getItem('bms_user');
      console.log('[Auth] Stored token exists:', !!storedToken);
      console.log('[Auth] Stored user exists:', !!storedUser);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(normalizeUser(parsedUser));

        // Validate token is still valid
        try {
          const res = await authAPI.me();
          const freshUser = res.data?.user;
          if (freshUser) {
            const normalized = normalizeUser(freshUser);
            setUser(normalized);
            await AsyncStorage.setItem('bms_user', JSON.stringify(normalized));
            console.log('[Auth] Session valid, user:', normalized.name, 'role:', normalized.role);
          }
        } catch (e: any) {
          console.log('[Auth] Token validation failed:', e.response?.status, '- clearing session');
          await clearSession();
        }
      }
    } catch (e) {
      console.log('[Auth] Restore error:', e);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize user object (backend sends 'id', we use '_id')
  const normalizeUser = (u: any): User => ({
    _id: u._id || u.id || '',
    name: u.name || '',
    email: u.email || '',
    role: u.role || 'user',
    avatar: u.avatar || '',
    phone: u.phone || '',
    emailVerified: u.emailVerified,
    creatorStatus: u.creatorStatus,
  });

  const clearSession = async () => {
    setUser(null);
    setToken(null);
    try {
      await AsyncStorage.removeItem('bms_token');
      await AsyncStorage.removeItem('bms_user');
    } catch {}
  };

  const login = async (email: string, password: string) => {
    console.log('[Auth] ═══ LOGIN ATTEMPT ═══');
    console.log('[Auth] URL: POST', `${API_BASE}/auth/login`);
    console.log('[Auth] Payload:', JSON.stringify({ email, password: '***' }));

    try {
      const res = await authAPI.login(email, password);
      console.log('[Auth] Response status:', res.status);
      console.log('[Auth] Response headers content-type:', res.headers?.['content-type']);
      console.log('[Auth] Response data type:', typeof res.data);
      console.log('[Auth] Response data:', JSON.stringify(res.data)?.substring(0, 300));

      const data = res.data;

      // Check if we got a non-JSON error response
      if (data._raw) {
        console.log('[Auth] ⚠ Server returned non-JSON:', data._raw.substring(0, 200));
        return { success: false, message: 'Server error. Please try again.' };
      }

      // Backend may return success but with a message (e.g., creator pending approval)
      if (!data.token) {
        console.log('[Auth] No token in response — account may need verification/approval');
        return { success: false, message: data.message || 'Account requires verification' };
      }

      const normalizedUser = normalizeUser(data.user);
      console.log('[Auth] Token received:', data.token.substring(0, 20) + '...');
      console.log('[Auth] User:', normalizedUser.name, '| Role:', normalizedUser.role, '| ID:', normalizedUser._id);

      // Save to storage
      await AsyncStorage.setItem('bms_token', data.token);
      await AsyncStorage.setItem('bms_user', JSON.stringify(normalizedUser));
      console.log('[Auth] Saved to AsyncStorage ✓');

      setToken(data.token);
      setUser(normalizedUser);
      console.log('[Auth] State updated ✓');
      console.log('[Auth] ═══ LOGIN SUCCESS ═══');

      return { success: true };
    } catch (e: any) {
      const status = e.response?.status;
      const errorData = e.response?.data;
      const message = errorData?.message || e.message || 'Login failed';

      console.log('[Auth] ═══ LOGIN FAILED ═══');
      console.log('[Auth] Status:', status);
      console.log('[Auth] Error data:', JSON.stringify(errorData));
      console.log('[Auth] Message:', message);

      // Handle specific cases
      if (status === 403 && errorData?.requiresVerification) {
        return { success: false, message: 'Please verify your email first. Check your inbox.' };
      }

      if (status === 401) {
        return { success: false, message: 'Invalid email or password' };
      }

      if (status === 429) {
        return { success: false, message: 'Too many login attempts. Try again in 15 minutes.' };
      }

      if (!e.response) {
        // No response at all — network level failure
        console.log('[Auth] No response object — pure network failure');
        console.log('[Auth] Error code:', (e as any).code);
        console.log('[Auth] Error message:', e.message);
        return {
          success: false,
          message: `Cannot reach server. Please check:\n• Internet connection is active\n• Try again in a few seconds\n\nTechnical: ${e.message}`,
        };
      }

      return { success: false, message };
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    console.log('[Auth] ═══ REGISTER ATTEMPT ═══');
    console.log('[Auth] Payload:', JSON.stringify({ name, email, role, password: '***' }));

    try {
      const res = await authAPI.register(name, email, password, role);
      console.log('[Auth] Register response:', JSON.stringify(res.data));

      const data = res.data;

      // Registration may not return a token if email verification is required
      if (!data.token) {
        return {
          success: false,
          message: data.message || 'Please verify your email to continue.',
        };
      }

      const normalizedUser = normalizeUser(data.user);
      await AsyncStorage.setItem('bms_token', data.token);
      await AsyncStorage.setItem('bms_user', JSON.stringify(normalizedUser));
      setToken(data.token);
      setUser(normalizedUser);
      console.log('[Auth] ═══ REGISTER SUCCESS ═══');
      return { success: true };
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || 'Registration failed';
      console.log('[Auth] Register failed:', message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');
    await clearSession();
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.me();
      const freshUser = res.data?.user;
      if (freshUser) {
        const normalized = normalizeUser(freshUser);
        setUser(normalized);
        await AsyncStorage.setItem('bms_user', JSON.stringify(normalized));
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
