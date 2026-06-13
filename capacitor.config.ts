import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.bookmyshot.app',
  appName: 'BookMyShot',
  webDir: 'public',
  server: {
    url: 'https://bookmyshot.in',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0a0806',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#D4AF37',
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0a0806',
    overrideUserAgent: 'BookMyShot/1.0.0 Android',
    appendUserAgent: 'BookMyShot-App',
    initialFocus: true,
    buildOptions: {
      keystorePath: '../bookmyshot-release.keystore',
      keystoreAlias: 'bookmyshot',
    },
  },
};

export default config;
