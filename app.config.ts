import type { ExpoConfig } from "expo/config";

// app.json can't interpolate env vars — it's static JSON. This file can, so
// the Google Maps key actually resolves instead of being the literal string
// "EXPO_PUBLIC_GOOGLE_MAPS_KEY" baked into the native build.
const config: ExpoConfig = {
  name: "El Point",
  slug: "El-Point",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "elpoint",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  owner: "enjeru1304",
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.elpoint.app",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.elpoint.app",
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      backgroundColor: "#c8451f",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      },
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#0b0b0d",
        },
      },
    ],
    "expo-secure-store",
    "expo-font",
    ["expo-notifications", { color: "#c8451f" }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "38fff885-5f06-46f6-b050-fa4fd90e9954",
    },
  },
};

export default config;
