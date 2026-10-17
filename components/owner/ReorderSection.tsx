import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/queries/exchangeRate";
import type { Currency, MenuItem } from "@/lib/queries/menu";
import { useTheme } from "@/lib/ThemeContext";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, View } from "react-native";

const ROW_H = 58;

type Handlers = {
  start: (i: number) => void;
  move: (i: number, dy: number) => void;
  end: (i: number, dy: number) => void;
};

/** Agarradera: arrastrar desde aquí mueve el plato. Reclama el gesto para que la pantalla no haga scroll. */
function Grip({ index, handlers }: { index: number; handlers: React.MutableRefObject<Handlers> }) {
  const { C } = useTheme();
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => handlers.current.start(index),
      onPanResponderMove: (_, g) => handlers.current.move(index, g.dy),
      onPanResponderRelease: (_, g) => handlers.current.end(index, g.dy),
      onPanResponderTerminate: (_, g) => handlers.current.end(index, g.dy),
    }),
  ).current;

  return (
    <View {...pan.panHandlers} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 40, height: ROW_H, alignItems: "center", justifyContent: "center" }}>
      <Icon name="drag-vertical" size={24} color={C.outline} />
    </View>
  );
}

/**
 * Los platos de una sección para reordenar arrastrando. Las filas tienen alto
 * fijo: al arrastrar, las demás se corren de lugar y, al soltar, se guarda el
 * nuevo orden con onCommit.
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
  const [active, setActive] = useState<{ from: number; to: number } | null>(null);
  const dy = useRef(new Animated.Value(0)).current;
  const shifts = useRef<Map<string, Animated.Value>>(new Map()).current;
  const orderRef = useRef(order);
  orderRef.current = order;
  const activeRef = useRef(active);
  activeRef.current = active;

  // Si cambia la lista de fuera (otro guardado), se refleja salvo en pleno arrastre.
  useEffect(() => {
    if (!activeRef.current) setOrder(items);
  }, [items]);

  function shiftValue(id: string): Animated.Value {
    let v = shifts.get(id);
    if (!v) {
      v = new Animated.Value(0);
      shifts.set(id, v);
    }
    return v;
  }

  function applyShifts(from: number, to: number) {
    orderRef.current.forEach((item, j) => {
      let target = 0;
      if (from < to && j > from && j <= to) target = -ROW_H;
      else if (from > to && j >= to && j < from) target = ROW_H;
      Animated.timing(shiftValue(item.id), { toValue: target, duration: 120, useNativeDriver: true }).start();
    });
  }

  const handlers = useRef<Handlers>({ start: () => {}, move: () => {}, end: () => {} });
  handlers.current = {
    start: (i) => {
      dy.setValue(0);
      setActive({ from: i, to: i });
    },
    move: (i, d) => {
      dy.setValue(d);
      const n = orderRef.current.length;
      const to = Math.max(0, Math.min(n - 1, Math.round(i + d / ROW_H)));
      const cur = activeRef.current;
      if (cur && cur.to !== to) {
        setActive({ from: i, to });
        applyShifts(i, to);
      }
    },
    end: (i, d) => {
      const n = orderRef.current.length;
      const to = Math.max(0, Math.min(n - 1, Math.round(i + d / ROW_H)));
      const next = [...orderRef.current];
      const [moved] = next.splice(i, 1);
      next.splice(to, 0, moved);
      shifts.forEach((v) => v.setValue(0));
      dy.setValue(0);
      setActive(null);
      if (to !== i) {
        setOrder(next);
        onCommit(next);
      }
    },
  };

  return (
    <View style={{ gap: 8 }}>
      <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>{title.toUpperCase()}</AppText>
      <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
        {order.map((i, idx) => {
          const dragging = active?.from === idx;
          return (
            <Animated.View
              key={i.id}
              style={{
                height: ROW_H,
                flexDirection: "row",
                alignItems: "center",
                paddingRight: 16,
                backgroundColor: dragging ? C.surfaceContainerHighest : C.surface,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: C.outlineVariant,
                borderRadius: dragging ? 14 : 0,
                zIndex: dragging ? 10 : 0,
                elevation: dragging ? 6 : 0,
                shadowColor: "#000",
                shadowOpacity: dragging ? 0.25 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                transform: [{ translateY: dragging ? dy : shiftValue(i.id) }],
              }}
            >
              <Grip index={idx} handlers={handlers} />
              <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{i.name}</AppText>
              <AppText variant="bodyStrong" color={C.primary}>{formatMoney(i.price, base, true)}</AppText>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
