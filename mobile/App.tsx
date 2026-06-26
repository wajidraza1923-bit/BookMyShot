/**
 * BookMyShot — Main App Entry Point
 * Integrates: Auth, Navigation, Push Notifications, Update Checker
 */
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, View, Text, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import UpdateChecker from './src/components/UpdateChecker';
import { colors, typography, spacing } from './src/theme';
import { getNavigationRef } from './src/navigation/navigationService';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  getNavigationTarget,
  setBadgeCount,
} from './src/services/pushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    prepareApp();
    setupNotificationListeners();
  }, []);

  const prepareApp = async () => {
    try {
      const onboarded = await AsyncStorage.getItem('bms_onboarded');
      if (!onboarded) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }

    // No artificial delay — show content immediately
    setAppReady(true);
    try { await SplashScreen.hideAsync(); } catch {}

    // Fade out brand splash quickly
    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShowBrandSplash(false));
    }, 100);
  };

  // ═══ Push Notification Listeners ═══
  const setupNotificationListeners = () => {
    // Foreground: notification received while app is open
    const receivedSub = addNotificationReceivedListener((notification: any) => {
      console.log('[App] Notification received (foreground):', notification.request?.content?.title);
      // Could update badge or show in-app toast here
    });

    // Tap: user clicked a notification (foreground, background, or terminated)
    const responseSub = addNotificationResponseListener((response: any) => {
      console.log('[App] Notification tapped:', response.notification?.request?.content?.title);
      const data = response.notification?.request?.content?.data;
      handleNotificationNavigation(data);
      setBadgeCount(0);
    });

    // Cold start: check if app was opened from a notification while terminated
    checkInitialNotification();

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  };

  const checkInitialNotification = async () => {
    const response = await getLastNotificationResponse();
    if (response) {
      const data = response.notification?.request?.content?.data;
      // Delay navigation slightly to ensure navigator is mounted
      setTimeout(() => handleNotificationNavigation(data), 1500);
    }
  };

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;
    const navRef = getNavigationRef();
    if (!navRef) return;
    const target = getNavigationTarget(data);
    if (target) {
      try {
        navRef.navigate(target.screen, target.params);
        console.log('[App] Navigated to:', target.screen);
      } catch (e: any) {
        console.log('[App] Navigation failed:', e.message);
      }
    }
  };

  const completeOnboarding = async () => {
    try { await AsyncStorage.setItem('bms_onboarded', 'true'); } catch {}
    setShowOnboarding(false);
  };

  if (!appReady) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.brandSplash}>
          <View style={styles.splashContent}>
            <Text style={styles.splashBrand}>BOOKMYSHOT</Text>
            <View style={styles.splashDivider} />
            <Text style={styles.splashTagline}>India's Premium Creator Platform</Text>
          </View>
        </View>
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <OnboardingScreen onComplete={completeOnboarding} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <AuthProvider>
        <UpdateChecker>
          <RootNavigator />
        </UpdateChecker>
      </AuthProvider>

      {showBrandSplash && (
        <Animated.View style={[styles.brandSplash, { opacity: fadeAnim }]}>
          <View style={styles.splashContent}>
            <Text style={styles.splashBrand}>BOOKMYSHOT</Text>
            <View style={styles.splashDivider} />
            <Text style={styles.splashTagline}>India's Premium Creator Platform</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  brandSplash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  splashContent: { alignItems: 'center' },
  splashBrand: { fontSize: 26, fontWeight: '300', color: colors.primary, letterSpacing: 8 },
  splashDivider: { width: 40, height: 1, backgroundColor: colors.primary, marginVertical: spacing.md, opacity: 0.5 },
  splashTagline: { ...typography.caption, color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
});
