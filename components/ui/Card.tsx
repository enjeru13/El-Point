import { useTheme } from "@/lib/ThemeContext";
import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: "sm" | "md" | "none";
  radius?: number;
}

export function Card({
  children,
  style,
  elevation = "md",
  radius = 20,
}: Props) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: radius,
          borderWidth: 2,
          borderColor: C.border,
          ...(elevation === "md"
            ? shadow.md
            : elevation === "sm"
              ? shadow.sm
              : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
