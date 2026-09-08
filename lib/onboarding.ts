import * as SecureStore from "expo-secure-store";

export const ONBOARDING_KEY = "elpoint_onboarding_seen";

export async function markOnboardingSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
  } catch {}
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === "1";
  } catch {
    return true; // fail open — don't trap the user in onboarding
  }
}
