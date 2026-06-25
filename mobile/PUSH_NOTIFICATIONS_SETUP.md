# BookMyShot Push Notifications — Production Setup

## Architecture

```
Mobile App (expo-notifications)
    ↓ registers
Expo Push Token (wraps FCM token)
    ↓ saved to
Backend (User.pushToken)
    ↓ sends via
Expo Push API (exp.host)
    ↓ relays to
Firebase Cloud Messaging (FCM)
    ↓ delivers to
Android Device (foreground/background/terminated)
```

## Setup Steps

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project "BookMyShot" (or use existing)
3. Add Android app with package name: `in.bookmyshot.app`
4. Download `google-services.json`
5. Place it at: `android/app/google-services.json`

### 2. EAS Build Configuration

The `google-services.json` is gitignored for security. For EAS builds:

**Option A: EAS Secrets (recommended for CI)**
```bash
eas secret:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

**Option B: Local builds**
Simply place `google-services.json` at `android/app/google-services.json` before building.

### 3. Expo Push Token → FCM

The `expo-notifications` package handles FCM registration automatically:
- On EAS build, it reads `google-services.json` for the Firebase sender ID
- Calls FCM to get a device registration token
- Wraps it as `ExponentPushToken[xxx]`
- This token is sent to our backend at `/api/notifications/push-token`

### 4. Backend Push Delivery

When `Notification.create()` is called anywhere in the backend:
1. Mongoose `post('save')` hook fires
2. Calls `pushService.sendToUser(userId, title, body, data)`
3. Looks up `User.pushToken`
4. Sends to Expo Push API
5. Expo relays to FCM
6. FCM delivers to device

### 5. Notification Types & Deep Links

| Type | Target Screen | Trigger |
|------|--------------|---------|
| booking | CreatorBookings | Booking created/accepted/rejected |
| inquiry | CreatorLeads | Inquiry received/replied |
| payment | CreatorPaymentVerification | Payment proof uploaded/verified |
| commission | CreatorWallet | Commission generated |
| subscription | CreatorSubscription | Sub expiry/renewal |
| promotion | CreatorPromotions | Promo approved/expired |
| review | CreatorReviews | New review received |
| message | Messages | New chat message |
| admin | AdminDashboard | Admin broadcast |

### 6. Testing

**In Expo Go:** Notifications are DISABLED (native module not available).

**In EAS Development Build:**
```bash
cd mobile
eas build --platform android --profile development
```

**In EAS Preview APK:**
```bash
cd mobile
eas build --platform android --profile preview
```

### 7. Verification Checklist

- [ ] `google-services.json` placed at `android/app/google-services.json`
- [ ] EAS build completes without FCM errors
- [ ] App requests notification permission on first launch
- [ ] Token appears in backend logs on login
- [ ] Push received when app is in foreground (shows as banner)
- [ ] Push received when app is in background (system tray)
- [ ] Push received when app is terminated (system tray)
- [ ] Tapping notification opens correct screen
- [ ] All notification types trigger push delivery

## Cost

**FREE** — Expo Push API has no usage limits. FCM delivery is free for all volumes.
