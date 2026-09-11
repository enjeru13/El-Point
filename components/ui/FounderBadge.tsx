import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { View } from "react-native";

/**
 * Badge for the first 100 restaurants ever approved — permanent, distinct
 * from the "Destacado" boost chip (which comes and goes). Gold, not brand
 * orange, on purpose: this is a rank, not a promo. Icon-only by design —
 * the exact number is for the owner's own dashboard, not clutter on cards.
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
  const box = size === "md" ? 28 : 22;

  return (
    <View
      accessibilityLabel={`Fundador #${rank}`}
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gold + "22",
        borderWidth: 1,
        borderColor: gold + "55",
      }}
    >
      <Icon name="crown" size={size === "md" ? 16 : 13} color={gold} />
    </View>
  );
}
