/**
 * BookMyShot Push Notification Service — Production Ready
 * 
 * Uses expo-notifications which wraps FCM on Android (via google-services.json).
 * Push delivery: Expo Push API → FCM → Device (free, reliable, production-proven)
 * 
 * Notifications work in:
 * - Foreground: shown as alert via setNotificationHandler
 * - Background: handled by OS + FCM natively
 * - Terminated: handled by OS + FCM natively (data persisted)
 * 
 * IMPORTANT: Only works in EAS builds (dev/preview/production), NOT Expo Go (SDK 53+).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// ═══ Module loading (safe for Expo Go) ═══
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;
let isNotificationAvailable = false;

const canLoadNotifications = (() => {
  try {
    const ExpoConstants = require('expo-constants');
    const executionEnv = ExpoConstants?.default?.executionEnvironment || ExpoConstants?.executionEnvironment;
    // 'storeClient' = Expo Go (no native module), 'standalone'/'bare' = real build
    if (executionEnv === 'storeClient') {
      console.log('[Push] Expo Go detected — notifications disabled (use EAS build)');
      return false;
    }
    return true;
  } catch {
    return false;
  }
})();

if (canLoadNotifications) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    Constants = require('expo-constants');

    if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
      // FOREGROUND notification handling — show alert even when app is open
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority?.MAX,
        }),
      });
      isNotificationAvailable = true;
      console.log('[Push] ✅ expo-notifications loaded and configured');
    }
  } catch (e: any) {
    console.log('[Push] expo-notifications load failed:', e.message);
  }
} else {
  console.log('[Push] Skipping notification module load');
}

/**
 * Register for push notifications:
 * 1. Check/request Android 13+ POST_NOTIFICATIONS permission
 * 2. Get Expo Push Token (wraps FCM token)
 * 3. Create Android notification channel
 * 4. Send token to backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!isNotificationAvailable || !Notifications || !Device) {
    console.log('[Push] Notifications not available in this environment');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Push] Emulator detected — skipping registration');
    return null;
  }

  try {
    // ═══ STEP 1: Android 13+ Permission (POST_NOTIFICATIONS) ═══
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Push] Requesting notification permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] ❌ Permission denied by user');
      return null;
    }
    console.log('[Push] ✅ Permission granted');

    // ═══ STEP 2: Create Android Notification Channel ═══
    if (Platform.OS === 'android') {
      // Main channel
      await Notifications.setNotificationChannelAsync('bookmyshot', {
        name: 'BookMyShot',
        description: 'Bookings, inquiries, payments, and updates',
        importance: Notifications.AndroidImportance?.MAX || 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4AF37',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      // Payment channel (high priority)
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        description: 'Payment confirmations and reminders',
        importance: Notifications.AndroidImportance?.HIGH || 4,
        sound: 'default',
        enableVibrate: true,
      });
      console.log('[Push] ✅ Android channels created');
    }

    // ═══ STEP 3: Get Expo Push Token (FCM under the hood) ═══
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.default?.expoConfig?.extra?.eas?.projectId ||
      '1ac5a660-1182-471d-9584-0c9ccb80b306';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Push] ✅ Token:', token);

    // ═══ STEP 4: Send token to backend ═══
    try {
      const authToken = await AsyncStorage.getItem('bms_token');
      if (authToken) {
        await api.post('/notifications/push-token', { token, platform: Platform.OS });
        console.log('[Push] ✅ Token saved to backend');
      }
    } catch (e: any) {
      console.log('[Push] ⚠️ Failed to send token to backend:', e.message);
    }

    return token;
  } catch (e: any) {
    console.log('[Push] ❌ Registration error:', e.message);
    return null;
  }
}

/**
 * Set app badge count
 */
export async function setBadgeCount(count: number) {
  if (!isNotificationAvailable || !Notifications) return;
  try { await Notifications.setBadgeCountAsync(count); } catch {}
}

/**
 * Listen for notification received while app is in FOREGROUND
 */
export function addNotificationReceivedListener(callback: (notification: any) => void) {
  if (!isNotificationAvailable || !Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Listen for notification TAP (user clicks notification)
 * Works for foreground, background, and terminated-state notifications
 */
export function addNotificationResponseListener(callback: (response: any) => void) {
  if (!isNotificationAvailable || !Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response (if app was opened from a notification while terminated)
 */
export async function getLastNotificationResponse(): Promise<any | null> {
  if (!isNotificationAvailable || !Notifications) return null;
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch { return null; }
}

/**
 * Deep link routing — maps notification data.type to screen name
 * Called when user taps a notification to navigate to the correct screen
 */
export function getNavigationTarget(data: any): { screen: string; params?: any } | null {
  if (!data) return null;

  const type = data.type || '';
  const targetScreen = data.targetScreen || '';
  const targetId = data.targetId || data.notificationId || '';

  // If explicit targetScreen is set, use it directly
  if (targetScreen) {
    return { screen: targetScreen, params: targetId ? { id: targetId } : undefined };
  }

  // Map by notification type
  switch (type) {
    case 'booking':
      return { screen: 'CreatorBookings', params: targetId ? { bookingId: targetId } : undefined };
    case 'inquiry':
      return { screen: 'CreatorLeads' };
    case 'payment':
      return { screen: 'CreatorPaymentVerification' };
    case 'commission':
      return { screen: 'CreatorWallet' };
    case 'subscription':
      return { screen: 'CreatorSubscription' };
    case 'promotion':
      return { screen: 'CreatorPromotions' };
    case 'review':
      return { screen: 'CreatorReviews' };
    case 'message':
      return { screen: 'BookingChat', params: targetId ? { bookingId: targetId } : undefined };
    case 'admin':
      return { screen: 'AdminDashboard' };
    case 'warning':
      return { screen: 'CreatorSettings' };
    case 'app_update':
      return { screen: 'CreatorSettings' };
    case 'info':
      return { screen: 'CreatorNotifications' };
    default:
      return { screen: 'CreatorNotifications' };
  }
}

/**
 * Check if notifications are available in this environment
 */
export function isAvailable(): boolean {
  return isNotificationAvailable;
}
