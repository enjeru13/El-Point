import { useMyProfile } from "@/lib/queries/me";

/**
 * User-facing toggles, stored in profiles.settings (jsonb). Defaults here
 * are the source of truth for what a fresh account behaves like.
 */
export const SETTING_DEFAULTS = {
  // customer
  notifRanks: true,
  notifReplies: true,
  notifLevelup: true,
  notifPromos: false,
  haptics: true,
  compactCards: false,
  showDistance: true,
  // owner
  notifReviews: true,
  notifWeekly: true,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, boolean>;

/** Merged defaults + saved settings for the current user. */
export function useSettings(): Settings {
  const { data } = useMyProfile();
  const saved = (data?.settings ?? {}) as Partial<Settings>;
  return { ...SETTING_DEFAULTS, ...saved };
}
