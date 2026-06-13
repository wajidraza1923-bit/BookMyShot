import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, View, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors, typography, spacing } from './src/theme';

// Prevent auto-hide — we control when to hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('[App] Component mounted, starting prepareApp...');
    prepareApp();
  }, []);

  const prepareApp = async () => {
    console.log('[App] prepareApp started');
    try {
      const onboarded = await AsyncStorage.getItem('bms_onboarded');
      console.log('[App] AsyncStorage read, onboarded:', onboarded);
      if (!onboarded) {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.log('[App] AsyncStorage error (continuing):', e);
      // First launch or storage error — show onboarding
      setShowOnboarding(true);
    }

    // Show brand splash for 1.5s
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('[App] Splash timer done, setting appReady=true');

    setAppReady(true);

    // Hide the native Expo splash screen
    try {
      await SplashScreen.hideAsync();
      console.log('[App] Native splash hidden');
    } catch (e) {
      console.log('[App] SplashScreen.hideAsync error (non-fatal):', e);
    }

    // Fade out our custom brand splash overlay
    setTimeout(() => {
      console.log('[App] Starting fade-out animation');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        console.log('[App] Fade-out complete, removing brand splash');
        setShowBrandSplash(false);
      });
    }, 200);
  };

  const completeOnboarding = async () => {
    console.log('[App] Onboarding complete');
    try {
      await AsyncStorage.setItem('bms_onboarded', 'true');
    } catch (e) {
      console.log('[App] Failed to save onboarding state:', e);
    }
    setShowOnboarding(false);
  };

  // While loading, show our brand splash (not null — that causes blank screen)
  if (!appReady) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.brandSplash}>
          <View style={styles.splashContent}>
            <View style={styles.splashIcon}>
              <Text style={styles.splashEmoji}>📸</Text>
            </View>
            <Text style={styles.splashBrand}>BOOKMYSHOT</Text>
            <Text style={styles.splashTagline}>Premium Wedding Creators</Text>
          </View>
        </View>
      </View>
    );
  }

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

      {/* Animated brand splash overlay (fades out after load) */}
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
