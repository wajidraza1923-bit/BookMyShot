import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Production API — same backend used by website
const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

console.log('[API] Base URL:', API_BASE);
console.log('[API] Platform:', Platform.OS, Platform.Version);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30s timeout for mobile networks
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Important for React Native - don't transform request
  transformRequest: [(data, headers) => {
    if (data && typeof data === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }],
});

// Request interceptor — attach token + logging
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('bms_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // AsyncStorage failure — continue without token
    }

    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`[API] → ${config.method?.toUpperCase()} ${fullUrl}`);
    if (config.data) {
      const safeData = { ...JSON.parse(config.data || '{}') };
      if (safeData.password) safeData.password = '***';
      console.log('[API] → Body:', JSON.stringify(safeData));
    }
    return config;
  },
  (error) => {
    console.log('[API] Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor — logging + 401 handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ← ${response.status} ${response.config.url} OK`);
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const fullUrl = `${error.config?.baseURL || ''}${url}`;
    const responseData = error.response?.data as any;

    // Detailed error logging
    if (error.response) {
      // Server responded with error status
      console.log(`[API] ← ${status} ${fullUrl}`);
      console.log('[API] ← Error:', responseData?.message || JSON.stringify(responseData)?.substring(0, 200));
    } else if (error.request) {
      // Request was made but no response received (NETWORK ERROR)
      console.log(`[API] ← NETWORK ERROR ${fullUrl}`);
      console.log('[API] ← Details:', error.message);
      console.log('[API] ← Code:', (error as any).code);
      console.log('[API] ← This means the request could not reach the server.');
      console.log('[API] ← Possible causes: No internet, DNS failure, SSL error, server down');
    } else {
      // Something went wrong setting up the request
      console.log('[API] ← REQUEST SETUP ERROR:', error.message);
    }

    // Clear auth on 401 (except for login attempts)
    if (status === 401 && !url.includes('/auth/login')) {
      try {
        await AsyncStorage.removeItem('bms_token');
        await AsyncStorage.removeItem('bms_user');
      } catch {}
    }

    return Promise.reject(error);
  }
);

// ═══ API CONNECTIVITY TEST ═══
// Call this on app startup to verify the backend is reachable
export async function testApiConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    console.log('[API] Testing connection to:', API_BASE);
    const response = await fetch(`${API_BASE}/config/public`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const data = await response.json();
    console.log('[API] Connection test:', response.status, data.success ? 'SUCCESS' : 'FAILED');
    return { ok: response.ok, message: `Status ${response.status}` };
  } catch (e: any) {
    console.log('[API] Connection test FAILED:', e.message);
    return { ok: false, message: e.message };
  }
}

// ═══ AUTH API ═══
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role = 'user') =>
    api.post('/auth/register', { name, email, password, role }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
};

// ═══ CREATORS API (public) ═══
export const creatorsAPI = {
  getAll: (params?: { city?: string; category?: string; search?: string; page?: number }) =>
    api.get('/creators', { params }),
  getById: (id: string) => api.get(`/creators/${id}`),
  getFeatured: () => api.get('/homepage/featured'),
};

// ═══ CONFIG API ═══
export const configAPI = {
  getPublic: () => api.get('/config/public'),
};

// ═══ HOMEPAGE API ═══
export const homepageAPI = {
  getData: () => api.get('/homepage'),
  getFeatured: () => api.get('/homepage/featured'),
};

// ═══ USER API ═══
export const userAPI = {
  getBookings: () => api.get('/user/bookings'),
  getFavorites: () => api.get('/user/favorites'),
  addFavorite: (creatorId: string) => api.post(`/user/favorites/${creatorId}`),
  removeFavorite: (creatorId: string) => api.delete(`/user/favorites/${creatorId}`),
};

// ═══ CREATOR API ═══
export const creatorAPI = {
  getDashboard: () => api.get('/creator/dashboard'),
  getBookings: () => api.get('/bookings/creator'),
  getBookingRequests: () => api.get('/creator/booking-requests'),
  getLeads: () => api.get('/creator/leads'),
  getAnalytics: () => api.get('/creator/analytics'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/creators/profile', data),
};

// ═══ MESSAGES API ═══
export const messagesAPI = {
  getConversations: () => api.get('/messages'),
  getMessages: (userId: string) => api.get(`/messages/${userId}`),
  sendMessage: (userId: string, content: string) => api.post(`/messages/${userId}`, { content }),
};

// ═══ BOOKINGS API ═══
export const bookingsAPI = {
  getUserBookings: () => api.get('/user/bookings'),
  getCreatorBookings: () => api.get('/bookings/creator'),
  updateStatus: (id: string, status: string, amount?: number) => api.patch(`/bookings/${id}/status`, { status, amount }),
};

// ═══ NOTIFICATIONS API ═══
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
