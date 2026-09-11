import AsyncStorage from "@react-native-async-storage/async-storage";

// One-time "you're a founder" celebration — shown once ever per local, not
// on every dashboard visit. Keyed by restaurant id (an owner could
// conceivably end up with a different local later).
const PREFIX = "elpoint_founder_welcome_seen_";

export async function hasSeenFounderWelcome(restaurantId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFIX + restaurantId)) === "1";
  } catch {
    return true; // fail open — never nag on a storage error
  }
}

export async function markFounderWelcomeSeen(restaurantId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + restaurantId, "1");
  } catch {}
}
