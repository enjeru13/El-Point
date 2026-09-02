import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Global on/off, driven by the user's "Vibración háptica" setting via
// setHapticsEnabled() (see components/SettingsBridge).
let enabled = true;

export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

type ImpactStyle = "light" | "medium" | "heavy";
type NotifyType = "success" | "error" | "warning";

export function impact(style: ImpactStyle = "light") {
  if (!enabled || Platform.OS === "web") return;
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  };
  Haptics.impactAsync(map[style]).catch(() => {});
}

export function notify(type: NotifyType) {
  if (!enabled || Platform.OS === "web") return;
  const map = {
    success: Haptics.NotificationFeedbackType.Success,
    error: Haptics.NotificationFeedbackType.Error,
    warning: Haptics.NotificationFeedbackType.Warning,
  };
  Haptics.notificationAsync(map[type]).catch(() => {});
}
