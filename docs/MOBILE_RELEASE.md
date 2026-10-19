# HotelPro — Android Google Play Release Runbook

This guide details the procedure for packaging, signing, and releasing the **HotelPro** mobile operations app (`com.hotelpro.app`) to the Google Play Store.

---

## 1. Prerequisites

1. **Google Play Developer Account**: Active developer organization account.
2. **EAS CLI**:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. **App Identifier**: `com.hotelpro.app`
4. **Target Architecture**: Android 14+ (API Level 34 target).

---

## 2. Release Signing Configuration

### Option A: Cloud Managed via EAS (Recommended)
EAS automatically provisions and securely stores the Android keystore in Expo Secrets.
Run:
```bash
cd apps/mobile
eas credentials
```
Select **Android** -> **production** -> **Set up a new keystore**.

### Option B: Local Keystore Generation
If managing signing keys manually:
```bash
keytool -genkeypair -v -keystore hotelpro-release-key.jks -alias hotelpro-key -keyalg RSA -keysize 2048 -validity 10000
```
> [!CAUTION]
> Never commit `.jks` keystores or password credentials into Git. Back up the keystore in encrypted cloud storage (e.g. AWS Secrets Manager or GCP Secret Manager).

---

## 3. Building the Production Android App Bundle (.aab)

Google Play requires the modern `.aab` (Android App Bundle) format for production distribution:

```bash
cd apps/mobile
eas build --platform android --profile production
```

The build output will be an optimized `.aab` file located in the Expo dashboard or downloaded locally.

For internal team testing on physical APK devices:
```bash
eas build --platform android --profile preview
```

---

## 4. Google Play Console Listing Configuration

1. **Create Application**:
   - App Name: `HotelPro - Hotel & Restaurant Manager`
   - Default Language: `English (United States)`
   - App / Game: `App`
   - Free / Paid: `Free` (SaaS account subscription required)
2. **App Access Declaration**:
   - Select "All or some functionality is restricted".
   - Provide demo credentials for Google review:
     - Username: `manager@hailehotels.com`
     - Password: `Password123!`
3. **Permissions Declaration & Data Safety**:
   - **CAMERA**: Used by staff to scan customer dining QR codes and equipment inventory barcodes. No photo data is sent to external advertising trackers.
   - **INTERNET & ACCESS_NETWORK_STATE**: Used to synchronize room reservations, orders, and cashier shifts with HotelPro Cloud.
4. **Target Audience**:
   - 18 and older (Business & Enterprise).

---

## 5. Release Track Deployment

1. Go to **Testing** -> **Internal Testing**.
2. Create a new release and upload the generated `hotelpro.aab`.
3. Add internal tester email list.
4. Verify rollout and confirm successful installation on Android devices.
5. Promote to **Production** following organizational review.
