import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { rankForLevel } from "@/lib/queries/me";
import { Text, View } from "react-native";

type Pair = { bg: string; fg: string };

function tierStyle(rank: string, C: any): Pair {
  switch (rank) {
    case "Comensal":
      return { bg: C.primaryFixed, fg: C.primary };
    case "Explorador":
      return { bg: C.secondaryContainer, fg: C.secondary };
    case "Crítico Local":
      return { bg: C.primaryContainer, fg: "#fff" };
    case "Gurú Gastronómico":
      return { bg: C.tertiaryContainer, fg: C.tertiary };
    case "Leyenda":
      return { bg: C.tertiary, fg: "#fff" };
    default:
      return { bg: C.surfaceContainerHighest, fg: C.onSurfaceVariant }; // Novato
  }
}

export function RankBadge({
  level,
  showLevel = false,
  size = "sm",
}: {
  level: number;
  showLevel?: boolean;
  size?: "sm" | "md";
}) {
  const { C } = useTheme();
  const rank = rankForLevel(level);
  const st = tierStyle(rank, C);
  const fs = size === "md" ? 13 : 11;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingHorizontal: size === "md" ? 10 : 7,
        paddingVertical: size === "md" ? 4 : 2,
        borderRadius: 99,
        backgroundColor: st.bg,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <Icon name="medal" size={fs + 1} color={st.fg} />
      <Text
        style={{
          color: st.fg,
          fontFamily: "PlusJakartaSans_700Bold",
          fontSize: fs,
        }}
      >
        {showLevel ? `${rank} · Nv ${level}` : rank}
      </Text>
    </View>
  );
}
