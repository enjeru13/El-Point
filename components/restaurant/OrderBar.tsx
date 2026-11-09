import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ORDER_BAR_HEIGHT = 56;

/** Barra fija abajo cuando el pedido tiene algo: "Ver pedido · N productos" y el total. */
export function OrderBar({ count, total, onPress }: { count: number; total: string; onPress: () => void }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  if (count <= 0) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver pedido, ${count} ${count === 1 ? "producto" : "productos"}, total ${total}`}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: insets.bottom + 12,
        height: ORDER_BAR_HEIGHT,
        borderRadius: 18,
        backgroundColor: C.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        gap: 10,
        shadowColor: C.primary,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <Icon name="shopping-bag" size={20} color="#fff" />
      <AppText variant="bodyStrong" color="#fff" style={{ flex: 1 }}>
        Ver pedido · {count} {count === 1 ? "producto" : "productos"}
      </AppText>
      <AppText variant="bodyStrong" color="#fff">
        {total}
      </AppText>
    </Pressable>
  );
}
