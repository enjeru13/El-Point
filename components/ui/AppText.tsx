import { useTheme } from "@/lib/ThemeContext";
import type { StyleProp, TextProps, TextStyle } from "react-native";
import { Text } from "react-native";

/**
 * Typography scale. Every text style in the app should come from here so
 * family / size / weight / line-height stay consistent.
 *
 * Families: Outfit (display/titles, geometric + punchy for the brutalist
 * headers), Plus Jakarta Sans (everything else).
 */
export type TextVariant =
  | "display" // hero numbers / splash headline
  | "title" // screen title
  | "heading" // card / section heading
  | "subtitle" // smaller heading, still bold
  | "body" // default paragraph
  | "bodyStrong" // emphasized paragraph
  | "bodySm" // secondary / helper text
  | "label" // form labels, list meta
  | "caption" // tiny text, timestamps
  | "overline"; // UPPERCASE eyebrow

const SCALE: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  bodyStrong: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  bodySm: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  caption: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  overline: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1.5,
  },
};

type AppTextProps = TextProps & {
  variant?: TextVariant;
  /** overrides the theme default (onSurface) */
  color?: string;
  align?: TextStyle["textAlign"];
  style?: StyleProp<TextStyle>;
};

export function AppText({
  variant = "body",
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  const { C } = useTheme();
  return (
    <Text
      {...rest}
      style={[
        SCALE[variant],
        { color: color ?? C.onSurface },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
