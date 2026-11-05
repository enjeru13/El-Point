import { CategoryPickerSheet, type CategoryPickerHandle } from "@/components/community/CategoryPickerSheet";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { ChipRow } from "@/components/ui/ChipRow";
import { Icon } from "@/components/ui/Icon";
import { TOPICS, type TopicKey } from "@/lib/community/topics";
import { useCategories } from "@/lib/queries/categories";
import { useTheme } from "@/lib/ThemeContext";
import { useRef } from "react";
import { Pressable, View } from "react-native";

/**
 * Arriba del feed:
 *   1. chips de tema (Todo, Recomiéndame, Locales nuevos…),
 *   2. una fila tipo pestañas: "Recientes" (el orden del feed) y la
 *      categoría de comida como menú desplegable ("Pizza ▾"), que abre una
 *      hoja para elegir una.
 * La línea fina de abajo separa los filtros de los posts.
 */
export function TopicFilters({
  topic,
  categoryId,
  onTopic,
  onCategory,
}: {
  topic: TopicKey | undefined;
  categoryId: number | undefined;
  onTopic: (t: TopicKey | undefined) => void;
  onCategory: (c: number | undefined) => void;
}) {
  const { C } = useTheme();
  const { data: categories = [] } = useCategories();
  const sheet = useRef<CategoryPickerHandle>(null);
  const category = categories.find((c) => c.id === categoryId);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
      <ChipRow padY={10} side={20}>
        <Chip label="Todo" active={!topic} onPress={() => onTopic(undefined)} flat />
        {TOPICS.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={topic === t.key}
            onPress={() => onTopic(topic === t.key ? undefined : t.key)}
            flat
          />
        ))}
      </ChipRow>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 24, paddingHorizontal: 20, marginTop: 4 }}>
        <View style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: C.onSurface, marginBottom: -1 }}>
          <AppText variant="label">Recientes</AppText>
        </View>

        <Pressable
          onPress={() => sheet.current?.present(categoryId ? [categoryId] : [])}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por comida: ${category?.label ?? "toda la comida"}`}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingBottom: 10,
            borderBottomWidth: 2,
            borderBottomColor: category ? C.primary : "transparent",
            marginBottom: -1,
          }}
        >
          <AppText variant="label" color={category ? C.primary : C.onSurfaceVariant}>
            {category?.label ?? "Toda la comida"}
          </AppText>
          <Icon name="chevron-down" size={16} color={category ? C.primary : C.onSurfaceVariant} />
        </Pressable>

        {category && (
          <Pressable
            onPress={() => onCategory(undefined)}
            accessibilityRole="button"
            accessibilityLabel="Quitar filtro de comida"
            hitSlop={10}
            style={{ paddingBottom: 12, marginLeft: -16 }}
          >
            <Icon name="close-circle" size={16} color={C.outline} />
          </Pressable>
        )}
      </View>

      <CategoryPickerSheet
        ref={sheet}
        max={1}
        title="¿Qué comida?"
        hint="Muestra solo los posts y reseñas de esa comida."
        onDone={(ids) => onCategory(ids[0])}
      />
    </View>
  );
}
