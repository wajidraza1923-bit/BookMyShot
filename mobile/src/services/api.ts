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
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
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

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
