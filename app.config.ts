import type { ExpoConfig } from "expo/config";

// app.json can't interpolate env vars — it's static JSON. This file can, so
// the Google Maps key actually resolves instead of being the literal string
// "EXPO_PUBLIC_GOOGLE_MAPS_KEY" baked into the native build.
// iOS: el esquema de URL de Google Sign-In es el ID de cliente iOS invertido
// (123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc).
// Sin la variable el plugin se omite y la app usa el inicio de sesión web.
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleIosUrlScheme = googleIosClientId
  ? `com.googleusercontent.apps.${googleIosClientId.replace(".apps.googleusercontent.com", "")}`
  : undefined;

const config: ExpoConfig = {
  name: "El Point",
  slug: "El-Point",
  version: "1.0.0",
  // Unlocked at the native level — RootLayout locks phones to portrait at
  // runtime and leaves tablets free to rotate (see expo-screen-orientation
  // call in app/_layout.tsx).
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme: "elpoint",
  userInterfaceStyle: "automatic",
  // Actualizaciones por aire (EAS Update): arreglos solo de JS llegan sin build
  // nuevo. Cambiar código nativo (plugins, librerías nativas) exige subir
  // `version`: la política appVersion ata cada update a una versión concreta.
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: "https://u.expo.dev/38fff885-5f06-46f6-b050-fa4fd90e9954",
  },
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
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#0b0b0d",
        },
        // iOS: wordmark "el Point" + pin, mismo tamaño (197 pt) y colores que el
        // logo de SplashScreenView -- el paso nativo -> JS no cambia de logo.
        ios: {
          image: "./assets/images/splash-logo.png",
          imageWidth: 197,
          dark: {
            image: "./assets/images/splash-logo-dark.png",
            backgroundColor: "#0b0b0d",
          },
        },
        // Android 12+ recorta el ícono a un círculo de 192 dp: un wordmark
        // ancho se cortaría, ahí va solo el pin.
        android: {
          image: "./assets/images/logo-pin.png",
          imageWidth: 120,
          dark: {
            image: "./assets/images/logo-pin-dark.png",
            backgroundColor: "#0b0b0d",
          },
        },
      },
    ],
    ...(googleIosUrlScheme
      ? ([["@react-native-google-signin/google-signin", { iosUrlScheme: googleIosUrlScheme }]] as [string, object][])
      : []),
    [
      "expo-image-picker",
      {
        photosPermission:
          "El Point necesita acceso a tus fotos para que puedas subir tu foto de perfil, las fotos de tus reseñas y las de tu local.",
        cameraPermission:
          "El Point usa la cámara para que tomes fotos de tus reseñas, tu perfil y tu local.",
        microphonePermission: false,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "El Point usa tu ubicación para mostrarte los locales cercanos y calcular las distancias.",
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
