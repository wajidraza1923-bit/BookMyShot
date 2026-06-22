# BookMyShot APK Releases

Upload the latest APK here as: `bookmyshot-latest.apk`

## How to update:
1. Build: `cd mobile && eas build --platform android --profile preview`
2. Download the APK from EAS
3. Rename it to `bookmyshot-latest.apk`
4. Place it in this folder
5. Push to GitHub → auto-deploys
6. All users see "Update Available" on next app open

## Force update:
Edit `server/routes/appVersion.js`:
- Increment `versionCode`
- Set `forceUpdate: true` for critical updates
- Update `version` string
