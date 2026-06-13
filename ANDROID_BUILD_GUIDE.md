# BookMyShot — Android App Build Guide

## Overview

BookMyShot Android app is built with Capacitor 7, wrapping the live production website (`bookmyshot.in`) in a native Android shell with:
- Native splash screen (dark + gold branding)
- Adaptive app icon
- Push notifications (Firebase Cloud Messaging)
- Camera + gallery access for uploads
- Razorpay payment support
- Deep linking (`bookmyshot.in/*` and `bookmyshot://`)
- Pull to refresh
- Offline detection with auto-retry
- Double-tap back to exit
- Login session persistence across app restarts
- No visible browser UI

---

## Prerequisites

1. **Android Studio** (Hedgehog or newer) — [Download](https://developer.android.com/studio)
2. **JDK 17** — bundled with Android Studio
3. **Node.js 18+** and npm
4. **Firebase Project** — for push notifications

---

## Quick Start

```bash
# From the project root
npm install
npx cap sync android
```

Then open in Android Studio:
```bash
npx cap open android
```

---

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/in/bookmyshot/app/
│   │   │   ├── MainActivity.java      # Custom WebView + back button
│   │   │   └── FCMService.java        # Push notification handler
│   │   ├── res/
│   │   │   ├── drawable/
│   │   │   │   ├── splash.xml         # Splash screen layout
│   │   │   │   ├── ic_splash_camera.xml
│   │   │   │   ├── ic_stat_notification.xml
│   │   │   │   └── ic_launcher_foreground.xml
│   │   │   ├── values/
│   │   │   │   ├── colors.xml         # Brand colors
│   │   │   │   ├── strings.xml
│   │   │   │   └── styles.xml         # Dark theme
│   │   │   └── xml/
│   │   │       └── network_security_config.xml
│   │   └── AndroidManifest.xml         # Permissions + deep links
│   ├── build.gradle                    # App build config + signing
│   └── proguard-rules.pro             # Production minification rules
├── build.gradle                        # Project-level (Firebase)
└── variables.gradle                    # SDK versions
```

---

## Firebase Setup (Push Notifications)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project "BookMyShot" (or use existing)
3. Add Android app with package name: `in.bookmyshot.app`
4. Download `google-services.json`
5. Place it in: `android/app/google-services.json`
6. Build — FCM will auto-register

---

## Generating Signed Release Keystore

```bash
keytool -genkey -v -keystore bookmyshot-release.keystore -alias bookmyshot -keyalg RSA -keysize 2048 -validity 10000
```

**Store securely! You need this for every future update.**

Create `android/local.properties` (never commit):
```properties
sdk.dir=C\:\\Users\\HP\\AppData\\Local\\Android\\Sdk
BOOKMYSHOT_KEYSTORE_FILE=../../bookmyshot-release.keystore
BOOKMYSHOT_KEYSTORE_PASSWORD=your_password
BOOKMYSHOT_KEY_ALIAS=bookmyshot
BOOKMYSHOT_KEY_PASSWORD=your_password
```

Or pass as Gradle properties:
```bash
./gradlew assembleRelease \
  -PBOOKMYSHOT_KEYSTORE_FILE=../../bookmyshot-release.keystore \
  -PBOOKMYSHOT_KEYSTORE_PASSWORD=your_password \
  -PBOOKMYSHOT_KEY_ALIAS=bookmyshot \
  -PBOOKMYSHOT_KEY_PASSWORD=your_password
```

---

## Building APK (for testing)

```bash
# Sync Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/BookMyShot-v1.0.0-debug.apk
```

---

## Building AAB (for Play Store)

```bash
# Sync first
npx cap sync android

# Build release bundle
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/BookMyShot-v1.0.0-release.aab
```

---

## Building from Android Studio

1. Open `android/` folder in Android Studio
2. Wait for Gradle sync to complete
3. **Debug**: Run → Run 'app' (green play button)
4. **Release**: Build → Generate Signed Bundle / APK
   - Choose Android App Bundle
   - Select keystore file
   - Enter passwords
   - Select release build variant
   - Finish

---

## App Icon

The adaptive icon uses:
- **Background**: `#0a0806` (dark, matches app theme)
- **Foreground**: Gold camera icon with ring (`ic_launcher_foreground.xml`)

To replace with your custom icon:
1. Right-click `res/` → New → Image Asset
2. Select your 1024x1024 PNG icon
3. Set background color to `#0a0806`
4. Generate all densities

---

## Deep Linking Setup

The app handles these URL patterns:
- `https://bookmyshot.in/*` — opens in app instead of browser
- `bookmyshot://path` — custom scheme for notifications

### Android App Links Verification

For `autoVerify="true"` to work, add this file to your server:

**`.well-known/assetlinks.json`** (served at `https://bookmyshot.in/.well-known/assetlinks.json`):
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "in.bookmyshot.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

Get your fingerprint:
```bash
keytool -list -v -keystore bookmyshot-release.keystore -alias bookmyshot
```

---

## Version Management

Before each release, update in `android/app/build.gradle`:
```groovy
versionCode 2        // Increment for EVERY upload
versionName "1.1.0"  // Semantic versioning
```

---

## Play Store Deployment Checklist

### Required Assets
- [ ] App icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG
- [ ] Screenshots: minimum 2, all phone sizes (1080x1920)
- [ ] Short description (80 chars): "Book premium wedding photographers instantly"
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL: `https://bookmyshot.in/privacy`
- [ ] Category: Photography → Events

### Play Console Steps
1. Create app in [Google Play Console](https://play.google.com/console)
2. Fill out Store listing
3. Set up Content rating questionnaire
4. Set up Pricing (Free)
5. Upload AAB to Production track
6. Submit for review

### Content Rating
- Photography & Social
- No violence, no mature content
- Contains: User-generated content, financial transactions

---

## Testing on Device

```bash
# Connect device via USB (enable USB Debugging in Developer Options)
npx cap run android

# Or install APK directly
adb install android/app/build/outputs/apk/debug/BookMyShot-v1.0.0-debug.apk
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on launch | Check `capacitor.config.ts` server URL |
| Push not working | Verify `google-services.json` is in `android/app/` |
| Camera not working | Check permissions in AndroidManifest |
| Razorpay popup blocked | Already handled — Capacitor opens external URLs in system browser |
| Build fails on signing | Verify keystore path in `local.properties` |
| Back button exits immediately | Fixed in `MainActivity.java` with double-tap |

---

## Important Notes

- **Never commit** `google-services.json`, keystore files, or `local.properties`
- The app loads `bookmyshot.in` live — any website change is instantly reflected
- Push notification tokens are sent to `/api/notifications/push-token`
- The `native-app.js` script handles native features (only runs inside Capacitor)
- ProGuard is enabled for release builds — test thoroughly before shipping
