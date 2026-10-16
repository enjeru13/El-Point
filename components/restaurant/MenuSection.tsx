import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useBcvRate, useCopRate, priceLines } from "@/lib/queries/exchangeRate";
import { isSpecialActive, normalizeCurrencies, type MenuItem } from "@/lib/queries/menu";
import { useTheme } from "@/lib/ThemeContext";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

function Prices({ usd, currencies, rates, muted }: { usd: number; currencies: ReturnType<typeof normalizeCurrencies>; rates: { bs: number | null; cop: number | null }; muted?: boolean }) {
  const { C } = useTheme();
  const lines = priceLines(usd, currencies, rates);
  return (
    <View style={{ alignItems: "flex-end", gap: 1 }}>
      {lines.map((l, i) => (
        <AppText
          key={l}
          variant={i === 0 ? "bodyStrong" : "caption"}
          color={muted ? C.outline : i === 0 ? C.primary : C.onSurfaceVariant}
        >
          {l}
        </AppText>
      ))}
    </View>
  );
}

/**
 * Menú con precios del local (solo se muestra con plan). Plato del día arriba,
 * secciones plegables y precios en las monedas que eligió el dueño.
 */
export function MenuSection({ items, currenciesRaw }: { items: MenuItem[]; currenciesRaw: string[] | null | undefined }) {
  const { C, shadow } = useTheme();
  const currencies = normalizeCurrencies(currenciesRaw);
  const bsQ = useBcvRate();
  const copQ = useCopRate();
  const rates = { bs: bsQ.data ?? null, cop: copQ.data ?? null };

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
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  if (items.length === 0) return null;

  const showBs = currencies.includes("bs") && rates.bs;
  const showCop = currencies.includes("cop") && rates.cop;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="silverware-fork-knife" size={18} color={C.primary} />
        <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>
          Menú
        </AppText>
      </View>

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
            opacity: i.available ? 1 : 0.6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="fire" size={14} color={C.primary} />
            <AppText variant="overline" color={C.primary}>
              PLATO DEL DÍA{i.available ? "" : " · AGOTADO"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading" style={{ fontSize: 18 }}>
                {i.name}
              </AppText>
              {!!i.description && (
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  {i.description}
                </AppText>
              )}
            </View>
            <Prices usd={i.price_usd} currencies={currencies} rates={rates} muted={!i.available} />
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
              <Pressable
                onPress={() => toggle(s.name)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}
              >
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {s.name}
                </AppText>
                <AppText variant="caption" color={C.outline}>
                  {s.items.length}
                </AppText>
                <Icon
                  name="chevron-right"
                  size={18}
                  color={C.outline}
                  style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
                />
              </Pressable>

              {isOpen &&
                s.items.map((i) => (
                  <View
                    key={i.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingBottom: 14,
                      opacity: i.available ? 1 : 0.5,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
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
                    <Prices usd={i.price_usd} currencies={currencies} rates={rates} muted={!i.available} />
                  </View>
                ))}
            </View>
          );
        })}
      </View>

      {(showBs || showCop) && (
        <AppText variant="caption" color={C.outline}>
          Tasas del día:{showBs ? ` BCV ${rates.bs!.toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs/USD` : ""}
          {showBs && showCop ? " ·" : ""}
          {showCop ? ` ${Math.round(rates.cop!).toLocaleString("es-VE")} COP/USD` : ""}. Los precios en bolívares y pesos son equivalentes aproximados.
        </AppText>
      )}
    </View>
  );
}
