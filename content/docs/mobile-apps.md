---
title: Mobile apps
description: Build iOS and Android apps with Expo and React Native, preview them in a phone frame, run them on your phone with Expo Go, and publish the web version.
category: Build
order: 17
tags: [mobile, expo, react native, ios, android, expo go]
author: Codexa Team
date: 2026-11-06
related: [projects, deployment, ai-agent]
---

A mobile app project is an [Expo](https://expo.dev) app written in React Native and TypeScript. The same code runs on iOS and Android (through the Expo Go app) and in the browser (through react-native-web).

## Create one

- On the dashboard, pick the **Mobile app** tab above the composer and describe your app, or
- start from a template in the [Mobile apps](/templates/mobile-apps) category: a blank three-tab starter, a habit tracker, a grocery delivery app and a notes app.

Every mobile template uses Expo SDK 58 with the same dependency set: `expo`, `react-native`, `react-native-web`, `react-native-safe-area-context`, `expo-status-bar`, `@expo/vector-icons` and `@react-native-async-storage/async-storage`. The runtime has these installed already, so a preview starts without an `npm install`.

## Project layout

| File | What it is |
| ---- | ---------- |
| `index.ts` | Registers `App` as the root component. |
| `App.tsx` | The app: providers, the tab bar or screen switcher. |
| `src/` | Screens, components, data and `theme.ts` (colours and spacing). |
| `app.json` | Expo config: app name, orientation, web output. |
| `metro.config.js` | Metro bundler config. It lets Codexa's shared, prebuilt `node_modules` work in the sandbox; leave it in place. |

Screens are built from React Native components (`View`, `Text`, `Pressable`, `ScrollView`, `FlatList`, `TextInput`) and styled with `StyleSheet`. HTML elements, CSS files and Tailwind classes do not work in a React Native app. The AI agent knows this for mobile projects.

## Preview modes

Press **Run**. The preview shows four tabs:

| Tab | What you see |
| --- | ------------ |
| **Web** | The web render (react-native-web) at the full width of the panel. |
| **iOS** | The same web render inside an iPhone-sized frame (390 × 844). |
| **Android** | The same web render inside an Android-sized frame (412 × 915). |
| **Your Device** | Instructions and a QR code to run the native app on your phone with Expo Go. |

> Note: The iOS and Android tabs are web renders in a phone-sized frame, not native emulators. Native-only behaviour (gestures, keyboard handling, platform fonts, native modules) can differ. Check it on a real phone with **Your Device**.

Edits sync into the running dev server and apply with Fast Refresh, in the browser and in Expo Go.

## Run it on your phone with Expo Go

1. Install **Expo Go** from the [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).
2. Open **Your Device** in the preview and scan the QR code: on iPhone with the Camera app, on Android from inside Expo Go.

The QR code holds an Expo Go link for the preview address (`exps://<preview host>` on HTTPS, `exp://<host>:<port>` on HTTP). Expo Go downloads the app from the project's dev server, the same server that renders the web preview.

Limits:

- The phone must be able to reach the preview address. Previews on `localhost` (a local Codexa install) or a private network address cannot be opened from a phone; the panel says so when that is the case.
- Private previews that need a Codexa sign-in are not supported in Expo Go. Codexa previews are open to anyone with the link while the preview runs.
- Expo Go only runs apps for the Expo SDK it supports. The templates track the SDK the current Expo Go release runs; if Expo Go reports an SDK mismatch, update Expo Go.
- Expo Go includes a fixed set of native modules. A package that needs its own native code will not load in Expo Go.

## Publish

**Publish** builds the **web version** with `npx expo export --platform web` and hosts the `dist/` folder on Codexa hosting, like any other site. The publish panel says this for mobile projects.

Codexa does not build App Store or Google Play binaries. To ship to the stores, push the project to [GitHub](/docs/github) and use Expo's [EAS Build](https://docs.expo.dev/build/introduction/) from your own Expo account.

## Troubleshooting

- **The preview shows an error from Metro.** Open the Logs panel; Metro prints the file and line. Ask the agent to fix it with **Fix**.
- **"Unable to resolve module".** The package is not installed. Add it to `package.json` and run **Install dependencies** from the preview menu, or use one of the packages listed above.
- **Expo Go cannot connect.** Check that the preview is running and that the address in **Your Device** is reachable from your phone's browser.
