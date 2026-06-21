import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, View, Text, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors, typography, spacing } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      const onboarded = await AsyncStorage.getItem('bms_onboarded');
      if (!onboarded) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setAppReady(true);
    try { await SplashScreen.hideAsync(); } catch {}

    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowBrandSplash(false));
    }, 200);
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
        <RootNavigator />
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
