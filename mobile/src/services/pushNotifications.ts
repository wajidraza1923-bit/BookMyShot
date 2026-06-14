/**
 * BookMyShot Push Notification Service
 * 
 * IMPORTANT: expo-notifications native module is NOT available in Expo Go (SDK 53+).
 * All notification code is wrapped safely to prevent crashes in Expo Go.
 * Push notifications only work in development builds or production APKs.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Safely load notification modules (they crash in Expo Go)
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;
let isNotificationAvailable = false;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
  
  // Test if native module actually works
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    isNotificationAvailable = true;
  }
} catch (e: any) {
  console.log('[Push] expo-notifications not available:', e.message || 'Expo Go detected');
}

/**
 * Register for push notifications and send token to backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!isNotificationAvailable || !Notifications || !Device) {
    console.log('[Push] Notifications not available in this environment');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] Not a physical device — skipping registration');
    return null;
  }

  try {
    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // Get Expo push token (works with FCM on Android)
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const token = tokenData.data;
    console.log('[Push] Token:', token);

    // Send token to backend
    try {
      const authToken = await AsyncStorage.getItem('bms_token');
      if (authToken) {
        await api.post('/notifications/push-token', { token, platform: Platform.OS });
        console.log('[Push] Token sent to backend');
      }
    } catch (e) {
      console.log('[Push] Failed to send token to backend:', e);
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bookmyshot', {
        name: 'BookMyShot',
        description: 'Booking updates, inquiries, payments, and promotions',
        importance: Notifications.AndroidImportance?.MAX || 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4AF37',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return token;
  } catch (e: any) {
    console.log('[Push] Registration error:', e.message);
    return null;
  }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number) {
  if (!isNotificationAvailable || !Notifications) return;
  try { await Notifications.setBadgeCountAsync(count); } catch {}
}

/**
 * Listen for notification received (foreground)
 */
export function addNotificationReceivedListener(callback: (notification: any) => void) {
  if (!isNotificationAvailable || !Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Listen for notification tap (opens app / deep link)
 */
export function addNotificationResponseListener(callback: (response: any) => void) {
  if (!isNotificationAvailable || !Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the screen to navigate to based on notification data
 */
export function getDeepLinkScreen(data: any): { screen: string; params?: any } | null {
  if (!data) return null;
  switch (data.type) {
    case 'booking': return { screen: 'CreatorBookings' };
    case 'inquiry': return { screen: 'CreatorLeads' };
    case 'payment': return { screen: 'CreatorWallet' };
    case 'promotion': return { screen: 'CreatorPromotions' };
    case 'subscription': return { screen: 'CreatorSubscription' };
    case 'review': return { screen: 'CreatorReviews' };
    default: return { screen: 'CreatorNotifications' };
  }
}
