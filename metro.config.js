const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .mjs files (needed for lucide-react-native)
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs"];
config.resolver.unstable_enablePackageExports = true;

// react-native-maps is native-only; swap it for a stub on web so the
// web bundle builds (used for quick UI previews).
const mapsWebStub = path.resolve(__dirname, "shims/react-native-maps.web.js");
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return { type: "sourceFile", filePath: mapsWebStub };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

const nativeWindConfig = withNativeWind(config, { input: "./global.css" });

// Applied after withNativeWind so it isn't overwritten
nativeWindConfig.transformer = {
  ...nativeWindConfig.transformer,
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-worklets|react-native-reanimated)",
  ],
};

module.exports = nativeWindConfig;
