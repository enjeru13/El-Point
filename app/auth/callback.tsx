import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/lib/ThemeContext";

/**
 * Landing spot for the elpoint://auth/callback redirect from Google OAuth.
 * expo-router's own linking listener can navigate here even though
 * lib/oauth.ts's WebBrowser.openAuthSessionAsync already captured the same
 * URL and set the session — without a real route here that lands as
 * "Unmatched Route". We just bounce through the auth group: by the time this
 * mounts the session is already set, so app/_layout.tsx's own redirect
 * effect (which does recognize the "(auth)" group) takes it from there.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { C } = useTheme();

  useEffect(() => {
    router.replace("/(auth)/login");
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.surface,
      }}
    >
      <ActivityIndicator color={C.primary} />
    </View>
  );
}
