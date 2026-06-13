import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors, typography, spacing } from './src/theme';

// Prevent auto-hide of splash
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const fadeAnim = new Animated.Value(1);

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      // Check if user has completed onboarding
      const onboarded = await AsyncStorage.getItem('bms_onboarded');
      if (!onboarded) {
        setShowOnboarding(true);
      }

      // Preload any assets here in the future
      await new Promise(resolve => setTimeout(resolve, 1500)); // Brand splash duration
    } catch (e) {
      // Continue anyway
    } finally {
      setAppReady(true);
      await SplashScreen.hideAsync();

      // Fade out brand splash
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setShowBrandSplash(false));
      }, 300);
    }
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('bms_onboarded', 'true');
    setShowOnboarding(false);
  };

  if (!appReady) return null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {showOnboarding ? (
        <OnboardingScreen onComplete={completeOnboarding} />
      ) : (
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
              notification: colors.primary,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '900' },
            },
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      )}

      {/* Brand Splash Overlay */}
      {showBrandSplash && (
        <Animated.View style={[styles.brandSplash, { opacity: fadeAnim }]}>
          <View style={styles.splashContent}>
            <View style={styles.splashIcon}>
              <Text style={styles.splashEmoji}>📸</Text>
            </View>
            <Text style={styles.splashBrand}>BOOKMYSHOT</Text>
            <Text style={styles.splashTagline}>Premium Wedding Creators</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  brandSplash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashContent: {
    alignItems: 'center',
  },
  splashIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  splashEmoji: {
    fontSize: 38,
  },
  splashBrand: {
    fontSize: 22,
    fontWeight: '300',
    color: colors.primary,
    letterSpacing: 6,
    marginBottom: spacing.sm,
  },
  splashTagline: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
