import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/queries/exchangeRate";
import type { Currency, MenuItem } from "@/lib/queries/menu";
import { useTheme } from "@/lib/ThemeContext";
import { useEffect, useState } from "react";
import { LogBox, Pressable, View } from "react-native";
import { NestedReorderableList, reorderItems, useIsActive, useReorderableDrag } from "react-native-reorderable-list";

// La librería anida la lista dentro de su propio ScrollViewContainer a propósito; React Native
// lo avisa en desarrollo aunque funciona bien. Solo se silencia ese aviso.
LogBox.ignoreLogs(["VirtualizedLists should never be nested inside plain ScrollViews"]);

const ROW_H = 58;
const RADIUS = 19;

function Row({ item, index, count, base }: { item: MenuItem; index: number; count: number; base: Currency }) {
  const { C } = useTheme();
  const drag = useReorderableDrag();
  const active = useIsActive();
  const first = index === 0;
  const last = index === count - 1;

  return (
    <View
      style={{
        height: ROW_H,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 16,
        // Arrastrando, la fila es una tarjeta con todas las esquinas redondeadas.
        // En reposo, las esquinas las llevan la primera y la última (la lista no recorta,
        // así la fila que se arrastra puede salirse del bloque).
        backgroundColor: active ? C.surfaceContainerHighest : C.surface,
        borderTopWidth: first || active ? (active ? 1 : 0) : 1,
        borderTopColor: active ? C.border : C.outlineVariant,
        ...(active
          ? { borderWidth: 1, borderColor: C.border, borderRadius: 16 }
          : {
              borderTopLeftRadius: first ? RADIUS : 0,
              borderTopRightRadius: first ? RADIUS : 0,
              borderBottomLeftRadius: last ? RADIUS : 0,
              borderBottomRightRadius: last ? RADIUS : 0,
            }),
      }}
    >
      <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{item.name}</AppText>
      <AppText variant="bodyStrong" color={C.primary}>{formatMoney(item.price, base, true)}</AppText>
      {/* Agarradera a la derecha, como en las listas del sistema. */}
      <Pressable onPressIn={drag} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }} style={{ width: 52, height: ROW_H, alignItems: "center", justifyContent: "center" }}>
        <Icon name="drag-vertical" size={24} color={C.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

/**
 * Los platos de una sección para reordenar arrastrando la agarradera. La lista
 * vive dentro del ScrollViewContainer de la pantalla, así hace scroll solo
 * mientras se arrastra cerca de los bordes. Al soltar se guarda el nuevo orden.
 */
export function ReorderSection({
  title,
  items,
  base,
  onCommit,
}: {
  title: string;
  items: MenuItem[];
  base: Currency;
  onCommit: (ordered: MenuItem[]) => void;
}) {
  const { C } = useTheme();
  const [order, setOrder] = useState(items);

  useEffect(() => {
    setOrder(items);
  }, [items]);

  return (
    <View style={{ gap: 8 }}>
      <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>{title.toUpperCase()}</AppText>
      <View style={{ borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}>
        <NestedReorderableList
          data={order}
          keyExtractor={(i) => i.id}
          scrollable={false}
          shouldUpdateActiveItem
          onReorder={({ from, to }) => {
            if (from === to) return;
            const next = reorderItems(order, from, to);
            setOrder(next);
            onCommit(next);
          }}
          renderItem={({ item, index }) => <Row item={item} index={index} count={order.length} base={base} />}
        />
      </View>
    </View>
  );
}
