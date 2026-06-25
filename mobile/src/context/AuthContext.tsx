import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import api from '../services/api';

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
  subscriptionStatus?: string;
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
  register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; message?: string; requiresVerification?: boolean; email?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAuthDirect: (token: string, user: any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, role: null, isLoading: true, isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  setAuthDirect: () => {},
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
      // Test API connectivity with timeout (don't block app startup)
      const { testApiConnection } = require('../services/api');
      const connPromise = testApiConnection();
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, message: 'Timeout' }), 5000));
      const connTest: any = await Promise.race([connPromise, timeoutPromise]);
      console.log('[Auth] API connectivity:', connTest.ok ? 'OK' : 'FAILED -', connTest.message);

      const storedToken = await AsyncStorage.getItem('bms_token');
      const storedUser = await AsyncStorage.getItem('bms_user');
      console.log('[Auth] Stored token exists:', !!storedToken);
      console.log('[Auth] Stored user exists:', !!storedUser);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(normalizeUser(parsedUser));

        // Validate token with timeout (don't block if server is slow)
        try {
          const mePromise = authAPI.me();
          const meTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));
          const res: any = await Promise.race([mePromise, meTimeout]);
          const freshUser = res.data?.user;
          const freshCreator = res.data?.creator;
          if (freshUser) {
            const normalized = normalizeUser(freshUser);
            // Include creatorStatus and subscriptionStatus from creator document
            if (freshCreator && freshCreator.status) {
              normalized.creatorStatus = freshCreator.status;
              normalized.subscriptionStatus = freshCreator.subscriptionStatus;
            }
            setUser(normalized);
            await AsyncStorage.setItem('bms_user', JSON.stringify(normalized));
            console.log('[Auth] Session valid, user:', normalized.name, 'role:', normalized.role, 'creatorStatus:', normalized.creatorStatus, 'subStatus:', normalized.subscriptionStatus);
            registerPush();
            // Connect Socket.IO for real-time
            try { const { connect, setupAppStateHandler } = require('../services/socket'); connect(); setupAppStateHandler(); } catch {}
          }
        } catch (e: any) {
          console.log('[Auth] Token validation failed:', e.message, '- using cached session');
          // Don't clear session on timeout — use cached data
          if (e.message !== 'Timeout' && e.response?.status === 401) {
            await clearSession();
          }
        }
      }
    } catch (e) {
      console.log('[Auth] Restore error:', e);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const registerPush = async () => {
    try {
      const { registerForPushNotifications } = require('../services/pushNotifications');
      await registerForPushNotifications();
    } catch (e) {
      console.log('[Auth] Push registration skipped:', e);
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
    subscriptionStatus: u.subscriptionStatus,
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
    const LOGIN_URL = `${API_BASE}/auth/login`;
    console.log('═══════════════════════════════════════');
    console.log('LOGIN URL =', LOGIN_URL);
    console.log('PAYLOAD =', JSON.stringify({ email, password: '***' }));
    console.log('═══════════════════════════════════════');

    try {
      // Use raw fetch — bypasses axios entirely for debugging
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('STATUS =', response.status);
      console.log('CONTENT-TYPE =', response.headers.get('content-type'));

      const rawText = await response.text();
      console.log('RAW RESPONSE =', rawText.substring(0, 500));

      // Try to parse JSON
      let data: any;
      try {
        data = JSON.parse(rawText);
        console.log('JSON PARSED OK');
      } catch (parseErr) {
        console.log('INVALID JSON RESPONSE');
        console.log('FIRST 300 CHARS:', rawText.substring(0, 300));
        return { success: false, message: 'Server returned invalid response. Status: ' + response.status };
      }

      // Check for HTTP errors
      if (!response.ok) {
        console.log('HTTP ERROR:', response.status, data.message);
        if (response.status === 403 && data.requiresVerification) {
          return { success: false, message: 'Please verify your email first.' };
        }
        if (response.status === 401) {
          return { success: false, message: 'Invalid email or password' };
        }
        if (response.status === 429) {
          return { success: false, message: 'Too many attempts. Try again in 15 minutes.' };
        }
        return { success: false, message: data.message || `Error ${response.status}` };
      }

      // Success — check for token
      if (!data.token) {
        console.log('NO TOKEN IN RESPONSE:', JSON.stringify(data).substring(0, 200));
        return { success: false, message: data.message || 'Account requires verification' };
      }

      const normalizedUser = normalizeUser(data.user);
      console.log('TOKEN =', data.token.substring(0, 25) + '...');
      console.log('USER =', normalizedUser.name, '| ROLE =', normalizedUser.role);

      // Save to storage
      await AsyncStorage.setItem('bms_token', data.token);
      await AsyncStorage.setItem('bms_user', JSON.stringify(normalizedUser));
      console.log('SAVED TO STORAGE OK');

      setToken(data.token);
      setUser(normalizedUser);
      console.log('═══ LOGIN SUCCESS ═══');

      // Connect Socket.IO for real-time updates
      try { const { connect } = require('../services/socket'); connect(); } catch {}

      return { success: true };
    } catch (e: any) {
      console.log('═══ LOGIN EXCEPTION ═══');
      console.log('ERROR TYPE:', e.constructor.name);
      console.log('ERROR MESSAGE:', e.message);
      console.log('ERROR STACK:', e.stack?.substring(0, 300));

      return {
        success: false,
        message: `Cannot reach server: ${e.message}`,
      };
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const REGISTER_URL = `${API_BASE}/auth/register`;
    console.log('═══════════════════════════════════════');
    console.log('REGISTER URL =', REGISTER_URL);
    console.log('PAYLOAD =', JSON.stringify({ name, email, role, password: '***' }));
    console.log('═══════════════════════════════════════');

    try {
      const response = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      console.log('STATUS =', response.status);
      console.log('CONTENT-TYPE =', response.headers.get('content-type'));

      const rawText = await response.text();
      console.log('RAW RESPONSE =', rawText.substring(0, 500));

      // Parse JSON safely
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.log('INVALID JSON — raw:', rawText.substring(0, 200));
        return { success: false, message: 'Server returned invalid response. Please try again.' };
      }

      // HTTP errors
      if (!response.ok) {
        // Check if it's an incomplete registration (OTP not verified)
        if (data.incomplete && data.requiresVerification) {
          return {
            success: false,
            requiresVerification: true,
            email: data.email || email,
            message: data.message || 'Your registration is incomplete. Verify OTP to continue.',
          };
        }
        return { success: false, message: data.message || `Error ${response.status}` };
      }

      // Success response but with requiresVerification (incomplete from 200 status)
      if (data.requiresVerification || data.incomplete) {
        return {
          success: false,
          requiresVerification: true,
          email: data.email || email,
          message: data.message || 'Please verify your email to continue.',
        };
      }

      // Success but no token (requires email verification)
      if (!data.token) {
        return {
          success: false,
          requiresVerification: true,
          email: email,
          message: data.message || 'Please verify your email to continue.',
        };
      }

      // Full success with token
      const normalizedUser = normalizeUser(data.user);
      await AsyncStorage.setItem('bms_token', data.token);
      await AsyncStorage.setItem('bms_user', JSON.stringify(normalizedUser));
      setToken(data.token);
      setUser(normalizedUser);
      console.log('═══ REGISTER SUCCESS ═══');
      return { success: true };
    } catch (e: any) {
      console.log('═══ REGISTER EXCEPTION ═══');
      console.log('ERROR:', e.message);
      return { success: false, message: `Cannot reach server: ${e.message}` };
    }
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');
    // Disconnect Socket.IO
    try { const { disconnect } = require('../services/socket'); disconnect(); } catch {}
    // Clear push token on backend
    try { await api.post('/notifications/push-token', { token: '', platform: '' }); } catch {}
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

  const setAuthDirect = (newToken: string, newUser: any) => {
    const normalized = normalizeUser(newUser);
    setToken(newToken);
    setUser(normalized);
  };

  const role: UserRole = user?.role || null;
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, role, isLoading, isAuthenticated, login, register, logout, refreshUser, setAuthDirect }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
