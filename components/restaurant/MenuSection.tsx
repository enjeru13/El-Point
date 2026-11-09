import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { RateCard } from "@/components/restaurant/RateCard";
import { convertAmount, formatMoney, type Cur, type Rates } from "@/lib/money";
import { useCart } from "@/lib/orderCart";
import { isSpecialActive, type MenuItem, type MenuSettings } from "@/lib/queries/menu";
import { useTheme } from "@/lib/ThemeContext";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

/** Precio en la moneda elegida, grande; si no es la base del local, la base al lado en chiquito. */
function Price({ amount, base, currency, rates, muted, big }: { amount: number; base: Cur; currency: Cur; rates: Rates; muted?: boolean; big?: boolean }) {
  const { C } = useTheme();
  const converted = convertAmount(amount, base, currency, rates);
  const shown = converted == null ? formatMoney(amount, base, true) : formatMoney(converted, currency, currency === base);
  const showBase = converted != null && currency !== base;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, flexShrink: 1 }}>
      <AppText variant="bodyStrong" color={muted ? C.outline : C.primary} style={{ fontSize: big ? 18 : 16 }}>
        {shown}
      </AppText>
      {showBase && (
        <AppText variant="caption" color={C.onSurfaceVariant}>
          {formatMoney(amount, base, true)}
        </AppText>
      )}
    </View>
  );
}

function AddControl({ qty, onAdd, onRemove, name }: { qty: number; onAdd: () => void; onRemove: () => void; name: string }) {
  const { C } = useTheme();
  if (qty === 0) {
    return (
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={`Agregar ${name} al pedido`}
        hitSlop={6}
        style={{
          height: 34,
          paddingHorizontal: 14,
          borderRadius: 17,
          backgroundColor: C.primaryContainer,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Icon name="plus" size={16} color="#fff" />
        <AppText variant="bodyStrong" color="#fff" style={{ fontSize: 14 }}>
          Agregar
        </AppText>
      </Pressable>
    );
  }
  const round = {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.primaryContainer,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable onPress={onRemove} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Quitar uno de ${name}`} style={round}>
        <Icon name="minus" size={16} color={C.primaryContainer} />
      </Pressable>
      <AppText variant="bodyStrong" style={{ minWidth: 14, textAlign: "center" }} accessibilityLabel={`${qty} en el pedido`}>
        {qty}
      </AppText>
      <Pressable onPress={onAdd} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Agregar otro ${name}`} style={round}>
        <Icon name="plus" size={16} color={C.primaryContainer} />
      </Pressable>
    </View>
  );
}

/**
 * Menú con precios del local (solo con plan). Arriba la tasa y el selector de
 * moneda; plato del día; secciones plegables. Con `orderable`, cada plato
 * disponible tiene "+ Agregar" para armar el pedido por WhatsApp.
 */
export function MenuSection({
  items,
  settings,
  rates,
  bsLocal,
  copLocal,
  currency,
  available,
  onCurrencyChange,
  restaurantId,
  orderable,
}: {
  items: MenuItem[];
  settings: MenuSettings;
  rates: Rates;
  bsLocal: boolean;
  copLocal: boolean;
  currency: Cur;
  available: Cur[];
  onCurrencyChange: (c: Cur) => void;
  restaurantId: string;
  orderable: boolean;
}) {
  const { C, shadow } = useTheme();
  const cart = useCart(restaurantId);

  const special = items.filter((i) => isSpecialActive(i));
  const sections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, MenuItem[]>();
    for (const i of items) {
      if (!map.has(i.section)) {
        map.set(i.section, []);
        order.push(i.section);
      }
      map.get(i.section)!.push(i);
    }
    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [items]);

  // Con pocos platos se muestra todo abierto; con muchos, solo la primera sección.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(items.length <= 12 ? sections.map((s) => s.name) : sections.slice(0, 1).map((s) => s.name)),
  );
  function toggle(name: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (items.length === 0) return null;

  const control = (i: MenuItem) =>
    orderable && i.available && !(i.is_daily_special && !isSpecialActive(i)) ? (
      <AddControl name={i.name} qty={cart.qty(i.id)} onAdd={() => cart.add(i.id)} onRemove={() => cart.remove(i.id)} />
    ) : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="silverware-fork-knife" size={18} color={C.primary} />
        <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>
          Menú
        </AppText>
      </View>

      <RateCard
        available={available}
        rates={rates}
        bsLocal={bsLocal}
        copLocal={copLocal}
        bsUpdatedAt={settings.bsUpdatedAt}
        copUpdatedAt={settings.copUpdatedAt}
        currency={currency}
        onCurrencyChange={onCurrencyChange}
      />

      {special.map((i) => (
        <View
          key={i.id}
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: C.primary + "1f",
            borderWidth: 1,
            borderColor: C.primary + "40",
            borderLeftWidth: 6,
            borderLeftColor: C.primary,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: i.available ? 1 : 0.6 }}>
            <Icon name="fire" size={14} color={C.primary} />
            <AppText variant="overline" color={C.primary}>
              PLATO DEL DÍA{i.available ? "" : " · AGOTADO"}
            </AppText>
          </View>
          <View style={{ gap: 2, opacity: i.available ? 1 : 0.6 }}>
            <AppText variant="heading" style={{ fontSize: 18 }}>
              {i.name}
            </AppText>
            {!!i.description && (
              <AppText variant="bodySm" color={C.onSurfaceVariant}>
                {i.description}
              </AppText>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
            <Price amount={i.price} base={settings.base} currency={currency} rates={rates} muted={!i.available} big />
            {control(i)}
          </View>
        </View>
      ))}

      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: C.border,
          overflow: "hidden",
          ...shadow.sm,
        }}
      >
        {sections.map((s, idx) => {
          const isOpen = open.has(s.name);
          return (
            <View key={s.name} style={idx > 0 ? { borderTopWidth: 1, borderTopColor: C.outlineVariant } : undefined}>
              <Pressable onPress={() => toggle(s.name)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {s.name}
                </AppText>
                <AppText variant="caption" color={C.outline}>
                  {s.items.length}
                </AppText>
                <Icon name="chevron-right" size={18} color={C.outline} style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }} />
              </Pressable>

              {isOpen &&
                s.items.map((i) => (
                  <View key={i.id} style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 2 }}>
                    <View style={{ opacity: i.available ? 1 : 0.5, gap: 2 }}>
                      <AppText variant="body" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
                        {i.name}
                        {!i.available ? "  · Agotado" : ""}
                      </AppText>
                      {!!i.description && (
                        <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={2}>
                          {i.description}
                        </AppText>
                      )}
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginTop: 4,
                        opacity: i.available ? 1 : 0.5,
                      }}
                    >
                      <Price amount={i.price} base={settings.base} currency={currency} rates={rates} muted={!i.available} />
                      {control(i)}
                    </View>
                  </View>
                ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}
