import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

// First-use guided tours (coach marks) per screen — separate from the
// pre-login intro carousel in lib/onboarding.ts. Local-device flag, not
// tied to the account: fine trade-off for a one-time UI walkthrough.

const PREFIX = "elpoint_tour_";
export const TOUR_RESET_EVENT = "elpoint:tour-reset";

export async function hasSeenTour(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFIX + key)) === "1";
  } catch {
    return true; // fail open — never trap the user in a tour
  }
}

export async function markTourSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, "1");
  } catch {}
}

/** "Ver tutorial otra vez" — clears every tour flag and tells any mounted
 *  TourGuide to replay immediately. */
export async function resetAllTours(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    if (mine.length) await AsyncStorage.removeMany(mine);
  } catch {}
  DeviceEventEmitter.emit(TOUR_RESET_EVENT);
}
