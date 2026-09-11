import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/lib/ThemeContext";
import { View } from "react-native";

/**
 * Badge for the first 100 restaurants ever approved — permanent, distinct
 * from the "Destacado" boost chip (which comes and goes). Gold, not brand
 * orange, on purpose: this is a rank, not a promo.
 */
export function FounderBadge({
  rank,
  size = "sm",
}: {
  rank: number;
  size?: "sm" | "md";
}) {
  const { scheme } = useTheme();
  const gold = scheme === "dark" ? "#f0c260" : "#b8860b";
  const bg = scheme === "dark" ? "#f0c26022" : "#f0c26022";
  const fs = size === "md" ? 12 : 10;

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
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: gold + "55",
      }}
    >
      <Icon name="crown" size={fs + 2} color={gold} />
      <AppText
        variant="caption"
        color={gold}
        style={{ fontSize: fs, fontFamily: "PlusJakartaSans_700Bold" }}
      >
        Fundador #{rank}
      </AppText>
    </View>
  );
}
