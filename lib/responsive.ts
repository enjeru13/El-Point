import { useWindowDimensions } from "react-native";

/** Matches Android's sw600dp — the standard phone/tablet cutoff. */
export const TABLET_BREAKPOINT = 600;

/** Max width for a screen's scrollable content on tablet/landscape, so long
 *  lines and stretched cards don't span the whole iPad. Center it with
 *  `alignSelf: 'center'` on the same style object. */
export const CONTENT_MAX_W = 720;

/** Narrower cap for form-like screens (auth, settings) — reads better than
 *  the general content width. */
export const FORM_MAX_W = 480;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_BREAKPOINT;
  const isLandscape = width > height;
  return { width, height, isTablet, isLandscape };
}

export function useIsTablet(): boolean {
  return useResponsive().isTablet;
}

/** Spread into a ScrollView's contentContainerStyle (or any full-bleed
 *  container) to cap + center it on tablet, no-op on phone. */
export function capWidth(isTablet: boolean, maxWidth: number = CONTENT_MAX_W) {
  return isTablet ? { maxWidth, width: "100%" as const, alignSelf: "center" as const } : {};
}
