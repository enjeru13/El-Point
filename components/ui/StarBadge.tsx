import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { Text, View } from "react-native";

interface Props {
  rating: number;
  /** Si es 0 (o no hay reseñas) muestra "Nuevo" en vez de la nota. */
  count?: number;
  size?: "sm" | "md";
}

/**
 * Badge de rating único de la app. Mismo aspecto en home, búsqueda y mapa:
 * píldora con estrella + nota, o "Nuevo" cuando el local no tiene reseñas.
 */
export function StarBadge({ rating, count, size = "md" }: Props) {
  const { C } = useTheme();
  const lg = size === "md";
  const isNew = count !== undefined && count <= 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: lg ? 4 : 3,
        paddingHorizontal: lg ? 10 : 8,
        paddingVertical: lg ? 4 : 3,
        borderRadius: 99,
        backgroundColor: C.secondaryContainer,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {!isNew && (
        <Icon
          name="star"
          size={lg ? 14 : 12}
          color={C.secondary}
          fill={C.secondary}
        />
      )}
      <Text
        style={{
          color: isNew ? C.onSurfaceVariant : C.secondary,
          fontFamily: "Outfit_700Bold",
          fontSize: lg ? 13 : 11.5,
        }}
      >
        {isNew ? "Nuevo" : rating.toFixed(1)}
      </Text>
    </View>
  );
}
