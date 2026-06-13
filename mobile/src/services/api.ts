import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://site--bookmyshot--ykz2mr8mzlrv.code.run/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('bms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Debug logging
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data ? JSON.stringify(config.data).substring(0, 100) : '');
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    console.log(`[API] ✗ ${status || 'NETWORK'} ${url}`, error.response?.data?.message || error.message);

    if (status === 401 && url !== '/auth/login') {
      await AsyncStorage.removeItem('bms_token');
      await AsyncStorage.removeItem('bms_user');
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role = 'user') =>
    api.post('/auth/register', { name, email, password, role }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
};

// Creators (public)
export const creatorsAPI = {
  getAll: (params?: { city?: string; category?: string; search?: string; page?: number }) =>
    api.get('/creators', { params }),
  getById: (id: string) => api.get(`/creators/${id}`),
  getFeatured: () => api.get('/homepage/featured'),
};

// Config
export const configAPI = {
  getPublic: () => api.get('/config/public'),
};

// Homepage
export const homepageAPI = {
  getData: () => api.get('/homepage'),
  getFeatured: () => api.get('/homepage/featured'),
};

// User
export const userAPI = {
  getBookings: () => api.get('/user/bookings'),
  getFavorites: () => api.get('/user/favorites'),
  addFavorite: (creatorId: string) => api.post(`/user/favorites/${creatorId}`),
  removeFavorite: (creatorId: string) => api.delete(`/user/favorites/${creatorId}`),
};

// Creator
export const creatorAPI = {
  getDashboard: () => api.get('/creator/dashboard'),
  getBookings: () => api.get('/bookings/creator'),
  getBookingRequests: () => api.get('/creator/booking-requests'),
  getLeads: () => api.get('/creator/leads'),
  getAnalytics: () => api.get('/creator/analytics'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/creators/profile', data),
};

// Messages
export const messagesAPI = {
  getConversations: () => api.get('/messages'),
  getMessages: (userId: string) => api.get(`/messages/${userId}`),
  sendMessage: (userId: string, content: string) => api.post(`/messages/${userId}`, { content }),
};

// Bookings (shared)
export const bookingsAPI = {
  getUserBookings: () => api.get('/user/bookings'),
  getCreatorBookings: () => api.get('/bookings/creator'),
  updateStatus: (id: string, status: string, amount?: number) => api.patch(`/bookings/${id}/status`, { status, amount }),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
