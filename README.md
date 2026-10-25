# Iris

Iris is an Expo and React Native mobile prototype for recording symptoms, viewing symptom history, and preparing a concise report to share with a clinician. It also includes a prototype symptom-translation screen and an optional Supabase backend for syncing app records and wearable sensor data.

> **Health notice:** Iris is a tracking and communication aid, not a medical device. It does not diagnose, treat, or replace professional medical advice. Review records and generated summaries for accuracy before sharing them with a clinician.

## Features

- Mark a painful area on an interactive body map, add symptom details, and save or edit records.
- Record text-based symptoms and organize them with tags.
- Browse recent records and severity trends.
- View daily, weekly, and monthly sensor charts. Seed/demo data is shown when no live readings are configured.
- Create and share a clinician-oriented PDF summary from marked-pain records.
- View notifications and wearable data when connected to the optional Supabase backend.
- Explore the Translate screen, which currently contains a design example and a lightweight keyword-extraction prototype.


## Technology

- Expo SDK 58
- React Native 0.88 and React 19
- TypeScript with strict checking
- Expo Router for routing
- Zustand and AsyncStorage for local app state and persistence
- Supabase JS for optional authentication, record sync, notifications, and wearable readings
- Supabase Edge Function and ESP32 Arduino example for wearable ingestion

## Requirements

- Node.js and npm. Use a Node.js release supported by the installed Expo SDK and project dependencies.
- Git, to clone the repository.
- For local device/simulator development, follow the [Expo SDK 58 documentation](https://docs.expo.dev/versions/v58.0.0/). Native simulators require their respective platform development tools.
- A Supabase project is optional. Without its environment variables, the app uses local seed data.

## Getting started

From the repository root:

```sh
npm ci
npx expo start
```

Use the Expo CLI shortcuts printed in the terminal or choose a platform:

```sh
npm run android
npm run ios
npm run web
```

`npm run ios` and `npm run android` start Expo for the selected platform; they do not by themselves create a production build. Native development builds may be required if you add native modules or change native configuration. See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm start` or `npx expo start` | Start the Expo development server. |
| `npm run android` | Start Expo for Android. |
| `npm run ios` | Start Expo for iOS. |
| `npm run web` | Start Expo for web. |
| `npm run lint` or `npx expo lint` | Run the Expo-configured ESLint checks. |
| `npx tsc --noEmit` | Type-check the TypeScript project without emitting files. |
| `node --test supabase/functions/ingest/validate.test.ts` | Run tests for the wearable-ingest payload validator. |

## App structure

```text
src/
  app/                 Expo Router screens and layouts
    (tabs)/            Main tab navigator and app screens
    survey.tsx         Survey modal
    body-map-fullscreen.tsx
  components/          Reusable UI and body-map components
  data/                Seed/demo data
  lib/                 Data access, formatting, reports, sync, and helpers
  store/               Persisted Zustand app state
  theme/               Design tokens
assets/                Images, fonts, and icons
supabase/
  functions/           Edge Functions and ingest validation tests
  migrations/          App-specific SQL migration
esp32/
  send_to_supabase/    ESP32 firmware example and secrets template
```

### Main screens

| Screen | Route | Purpose |
| --- | --- | --- |
| Home | `/` | Overview, latest check-in, and entry points to record symptoms. |
| Body map | `/body-map` | Mark or draw a location and record pain details. |
| History | `/history` | Filter and review saved records and trends. |
| Report | `/report` | Review and export a PDF summary of marked-pain records. |
| Record a symptom | `/record-symptom` | Add or edit a text note and tags. |
| Record detail | `/record/[id]` | View a saved record. |
| Translate | `/translate` | Prototype symptom translation and keyword extraction. |
| Sensors | `/sensors` | Review sensor charts and readings. |
| Notifications | `/notifications` | Review alerts and notifications. |

The bottom navigation displays Home, Body map, History, and Report. Other routes remain available through app flows and their relevant controls.

## Local data and persistence

The app starts with seed records, notifications, and demo sensor series. App state is persisted locally with AsyncStorage, so core screens can be explored without a backend. Wearable readings are held separately and are loaded from Supabase when configured.

## Optional Supabase setup

Supabase is not required to run the app locally. To connect it:

1. Create/configure a Supabase project and its database schema, authentication user, and row-level security policies for the tables used by the app.
2. Copy `.env.example` to `.env.local`.
3. Set the project URL, the **anon/publishable key**, and demo sign-in credentials in `.env.local`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
   EXPO_PUBLIC_DEMO_EMAIL=your-demo-user@example.com
   EXPO_PUBLIC_DEMO_PASSWORD=your-demo-user-password
   ```

4. If your database starts from a base schema, apply that schema before `supabase/migrations/20261024_app_feelings_tags.sql`. The migration is an **app-specific addition**, not a complete database schema.
5. Restart the Expo development server after changing environment variables.

When configured, the app attempts to sign in at startup, sync pending app records, and load records, alerts, and recent wearable readings. If backend startup fails, the app logs a warning and continues using local data.

### Credential safety

- `.env.local` is ignored by Git. Do not commit it or share its contents.
- Only the Supabase anon/publishable key belongs in `EXPO_PUBLIC_*` app variables. Never put a service-role/secret key in the mobile app.
- Keep Supabase Edge Function secrets and ESP32 device tokens out of source control. Use the deployment platform's secret storage for server-side keys.
- The example ESP32 firmware currently disables TLS certificate verification as a hackathon shortcut. Do not use that setting in a production deployment; configure certificate validation first.

## Optional ESP32 wearable

The firmware and Supabase ingest function are examples for sending wearable readings and touch events to Supabase.

1. Set up the Supabase database tables expected by `supabase/functions/ingest/index.ts`, plus a device row whose stored token hash matches the device token.
2. Configure the Edge Function's server-side `SUPABASE_URL` and secret key.
3. Deploy the `ingest` function. Its configuration in `supabase/config.toml` disables platform JWT verification because the function validates the `x-device-token` header itself. Protect and rotate device tokens appropriately.
4. Copy `esp32/send_to_supabase/secrets.example.h` to `secrets.h` and fill in Wi-Fi credentials, the deployed ingest URL, and the device token. `secrets.h` is excluded from version control.
5. Replace the `NAN` placeholders in `readSensors()` with readings from the hardware sensors, then compile and flash the sketch using the Arduino IDE or ESP32-compatible build tooling.

The example sends readings on a five-second interval and posts a touch event. The ingest validator accepts up to 100 readings per request, applies basic value/time checks, and reports ignored values. See `supabase/functions/ingest/validate.test.ts` for validation examples.

## Privacy and safety

Symptom notes and health-related data are sensitive. Use demo data for development; only connect real data to a backend you control and have configured with appropriate authentication, access policies, retention, and security. This prototype does not promise clinical accuracy or production-grade security.

## Useful references

- [Expo SDK 58 documentation](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Router documentation](https://docs.expo.dev/versions/v58.0.0/sdk/router.md)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Supabase documentation](https://supabase.com/docs)
