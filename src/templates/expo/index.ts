import type { ProjectSettings } from "@/db/schema";
import type { Template } from "../types";
import { EXPO_TEMPLATE_FILES } from "./files.generated";

/**
 * Expo (React Native) templates. Each one is a real Expo SDK project: its screens live in
 * templates-src/expo/<id> (bundled into ./files.generated.ts by scripts/build-template-kits.mjs),
 * and the project files below are shared so every Expo template declares exactly the same
 * dependencies. The runner installs that set once (services/runner/prepare.ts, from the FIRST
 * template here) and links it into each sandbox, so previews start without an `npm install`.
 *
 * The versions are the ones Expo SDK 58 pins (expo/bundledNativeModules.json), which is what the
 * current Expo Go app on the App Store and Google Play runs.
 */

export const EXPO_PACKAGE_DEPENDENCIES = {
  "@expo/metro-runtime": "~58.0.17",
  "@expo/vector-icons": "^15.0.2",
  "@react-native-async-storage/async-storage": "2.2.0",
  expo: "~58.0.23",
  "expo-status-bar": "~58.0.4",
  react: "19.3.0",
  "react-dom": "19.3.0",
  "react-native": "0.88.1",
  "react-native-safe-area-context": "~5.11.1",
  "react-native-web": "~0.21.4",
} as const;

export const EXPO_PACKAGE_DEV_DEPENDENCIES = { "@types/react": "~19.3.0", typescript: "~6.0.3" } as const;

/** Dependencies documented on the public template pages. */
export const EXPO_DEPS: Record<string, string> = {
  expo: EXPO_PACKAGE_DEPENDENCIES.expo,
  react: EXPO_PACKAGE_DEPENDENCIES.react,
  "react-native": EXPO_PACKAGE_DEPENDENCIES["react-native"],
  "react-native-web": EXPO_PACKAGE_DEPENDENCIES["react-native-web"],
  "react-native-safe-area-context": EXPO_PACKAGE_DEPENDENCIES["react-native-safe-area-context"],
  "@expo/vector-icons": EXPO_PACKAGE_DEPENDENCIES["@expo/vector-icons"],
  "@react-native-async-storage/async-storage": EXPO_PACKAGE_DEPENDENCIES["@react-native-async-storage/async-storage"],
  typescript: EXPO_PACKAGE_DEV_DEPENDENCIES.typescript,
};

/** The dev server (Metro) serves the web build and the Expo Go manifest on one port. Publish exports the web build to dist/. */
export const EXPO_SETTINGS: ProjectSettings = { devCommand: "npm run dev", buildCommand: "npm run build", installCommand: "npm install", outputDir: "dist", port: 8081 };

export function expoPackageJson(name: string) {
  return JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      main: "index.ts",
      scripts: {
        dev: "expo start --port $PORT --max-workers 2",
        build: "expo export --platform web",
        typecheck: "tsc --noEmit",
        start: "expo start",
        web: "expo start --web",
      },
      dependencies: EXPO_PACKAGE_DEPENDENCIES,
      devDependencies: EXPO_PACKAGE_DEV_DEPENDENCIES,
    },
    null,
    2,
  );
}

export const EXPO_METRO_CONFIG = `// Metro bundler config (https://docs.expo.dev/guides/customizing-metro).
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Codexa previews link a shared, prebuilt node_modules into the sandbox. Metro only reads files
// inside its watch folders, so the runner names that folder here. Outside Codexa this is a no-op.
const shared = process.env.CODEXA_SHARED_NODE_MODULES;
if (shared && fs.existsSync(shared)) {
  config.watchFolders = [...(config.watchFolders || []), fs.realpathSync(shared)];
}

module.exports = config;
`;

export const EXPO_INDEX = `import { registerRootComponent } from "expo";
import App from "./App";

// Registers App as the root component on iOS, Android and the web.
registerRootComponent(App);
`;

function appJson(name: string, slug: string) {
  return JSON.stringify(
    {
      expo: {
        name,
        slug,
        version: "1.0.0",
        orientation: "portrait",
        userInterfaceStyle: "light",
        ios: { supportsTablet: true },
        web: { bundler: "metro", output: "single" },
      },
    },
    null,
    2,
  );
}

/** Project files every Expo template shares. */
export function expoBase(opts: { packageName: string; appName: string; slug: string; readme: string }): Record<string, string> {
  return {
    "package.json": expoPackageJson(opts.packageName),
    "app.json": appJson(opts.appName, opts.slug),
    "index.ts": EXPO_INDEX,
    "metro.config.js": EXPO_METRO_CONFIG,
    "tsconfig.json": JSON.stringify({ extends: "expo/tsconfig.base", compilerOptions: { strict: true } }, null, 2),
    ".gitignore": "node_modules\n.expo\ndist\nweb-build\nexpo-env.d.ts\n*.tsbuildinfo\n",
    "README.md": opts.readme,
  };
}

const RUN_NOTES = `## Run it

- **In Codexa:** press Run. The preview shows the web render in a phone frame; open **Your Device** to scan the QR code with Expo Go on your phone.
- **Locally:** \`npm install\` then \`npx expo start\`, and scan the QR code in the terminal with Expo Go.

## Publish

Publishing in Codexa builds the **web version** (\`npx expo export --platform web\`) and hosts it. App Store and Google Play builds are not made by Codexa; use [EAS Build](https://docs.expo.dev/build/introduction/) for those.
`;

function files(id: string): Record<string, string> {
  const own = EXPO_TEMPLATE_FILES[id];
  if (!own) throw new Error(`Expo template sources for ${id} are missing; run node scripts/build-template-kits.mjs`);
  return own;
}

type ExpoMeta = Pick<Template, "id" | "name" | "description" | "longDescription" | "tags" | "featured" | "difficulty"> & { appName: string; readmeIntro: string };

function expoTemplate(meta: ExpoMeta): Template {
  const { appName, readmeIntro, ...rest } = meta;
  return {
    ...rest,
    category: "mobile-apps",
    framework: "expo",
    dependencies: EXPO_DEPS,
    settings: EXPO_SETTINGS,
    prebuilt: true,
    previewPath: "/",
    files: {
      ...expoBase({ packageName: `codexa-${meta.id}`, appName, slug: meta.id, readme: `# ${appName}\n\n${readmeIntro}\n\nBuilt with Expo and React Native (TypeScript). The same code runs on iOS, Android and the web.\n\n${RUN_NOTES}` }),
      ...files(meta.id),
    },
  };
}

/** The first template defines the prebuilt dependency set (services/runner/prepare.ts). */
export const expoTemplates: Template[] = [
  expoTemplate({
    id: "expo-starter",
    name: "Mobile app starter",
    description: "A blank Expo app with three tabs, safe-area handling and a small theme file, ready for your first screen.",
    longDescription:
      "An Expo SDK 58 app in TypeScript: a bottom tab bar (Home, Explore, Profile) switched with React state, screens built from View, Text, Pressable and ScrollView, a getting-started checklist, a searchable list and settings switches. Runs in Expo Go on iOS and Android and renders on the web with react-native-web.",
    tags: ["expo", "react native", "mobile", "ios", "android", "tabs", "starter"],
    featured: true,
    difficulty: "beginner",
    appName: "My App",
    readmeIntro: "A blank three-tab app. Screens live in `src/screens`, the tab bar in `src/components/TabBar.tsx` and colours in `src/theme.ts`.",
  }),
  expoTemplate({
    id: "expo-habits",
    name: "Habit tracker",
    description: "Check off daily habits, see streaks and a seven-day history. Saved on the device with AsyncStorage.",
    longDescription:
      "A single-screen habit tracker: today's progress, a week strip to look back at any of the last seven days, habit rows with streaks and a mini history, and a form to add habits with an icon. Data persists with AsyncStorage (device storage on phones, localStorage on the web).",
    tags: ["expo", "react native", "mobile", "habits", "health", "asyncstorage"],
    difficulty: "beginner",
    appName: "Habits",
    readmeIntro: "Habit data and date helpers are in `src/habits.ts`; `src/useStoredState.ts` saves state with AsyncStorage.",
  }),
  expoTemplate({
    id: "expo-grocery",
    name: "Grocery delivery app",
    description: "A delivery app home screen with search, categories, a product grid, a live cart and a checkout summary.",
    longDescription:
      "A grocery delivery storefront for phones: delivery address and ETA, search, category chips, a two-column product grid with add-to-cart steppers, a floating cart bar and a cart screen with subtotal and delivery fee. The catalogue is in src/data.ts; checkout is not connected to a payment provider.",
    tags: ["expo", "react native", "mobile", "ecommerce", "delivery", "cart"],
    featured: true,
    difficulty: "intermediate",
    appName: "Greengate",
    readmeIntro: "Products and categories are in `src/data.ts`, cart logic in `src/cart.ts`. Checkout is not connected to payments yet.",
  }),
  expoTemplate({
    id: "expo-notes",
    name: "Notes",
    description: "A notes app with search, pinning and a full-screen editor that saves as you type.",
    longDescription:
      "A two-screen notes app: a searchable list with pinned notes first and relative dates, and an editor with title and body fields that save as you type, pin and delete. Notes persist with AsyncStorage, and an empty note is discarded when you go back.",
    tags: ["expo", "react native", "mobile", "notes", "productivity", "asyncstorage"],
    difficulty: "beginner",
    appName: "Notes",
    readmeIntro: "The list and editor are in `src/screens`; note helpers in `src/notes.ts`.",
  }),
];
