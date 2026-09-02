import { useEffect } from "react";
import { setHapticsEnabled } from "@/lib/haptics";
import { useSettings } from "@/lib/settings";

/**
 * Pushes user settings that live-affect non-React modules (haptics gate).
 * Renders nothing; mount once inside the query provider.
 */
export function SettingsBridge() {
  const { haptics } = useSettings();
  useEffect(() => {
    setHapticsEnabled(haptics);
  }, [haptics]);
  return null;
}
