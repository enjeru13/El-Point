import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, rateAgeDays, rateNote, type Cur, type Rates } from "@/lib/money";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable, View } from "react-native";

const LABEL: Record<Cur, string> = { usd: "$", bs: "Bs", cop: "COP" };

/**
 * Tasa del local arriba del menú, en grande, con de dónde sale y qué tan
 * vieja es; debajo, el selector de moneda. No sale si solo hay una moneda.
 */
export function RateCard({
  available,
  rates,
  bsLocal,
  copLocal,
  bsUpdatedAt,
  copUpdatedAt,
  currency,
  onCurrencyChange,
}: {
  available: Cur[];
  rates: Rates;
  bsLocal: boolean;
  copLocal: boolean;
  bsUpdatedAt: string | null;
  copUpdatedAt: string | null;
  currency: Cur;
  onCurrencyChange: (c: Cur) => void;
}) {
  const { C } = useTheme();
  if (available.length <= 1) return null;

  const now = new Date();
  const parts: string[] = [];
  const notes: { text: string; stale: boolean }[] = [];
  if (available.includes("bs") && rates.bs) {
    parts.push(formatMoney(rates.bs, "bs").replace(/,00$/, ""));
    notes.push(rateNote("bs", bsLocal, bsLocal ? rateAgeDays(bsUpdatedAt, now) : null));
  }
  if (available.includes("cop") && rates.cop) {
    parts.push(formatMoney(rates.cop, "cop", copLocal));
    notes.push(rateNote("cop", copLocal, copLocal ? rateAgeDays(copUpdatedAt, now) : null));
  }
  // Las dos automáticas dicen lo mismo de forma distinta; con propias, cada una lleva su fecha.
  const uniqueNotes = notes.filter((n, i) => notes.findIndex((m) => m.text === n.text) === i);

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          backgroundColor: C.primary + "14",
          borderWidth: 1,
          borderColor: C.primary + "33",
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="cash-only" size={18} color={C.primary} />
          <AppText variant="bodyStrong" style={{ fontSize: 17, flexShrink: 1 }}>
            1 $ = {parts.join(" · ")}
          </AppText>
        </View>
        {uniqueNotes.map((n) => (
          <AppText key={n.text} variant="caption" color={n.stale ? C.error : C.onSurfaceVariant}>
            {n.text}
          </AppText>
        ))}
        <AppText variant="caption" color={C.onSurfaceVariant}>
          Los precios en otras monedas son aproximados.
        </AppText>
      </View>

      <View
        accessibilityRole="tablist"
        style={{ flexDirection: "row", backgroundColor: C.surfaceContainerHigh, borderRadius: 12, padding: 3 }}
      >
        {available.map((c) => {
          const on = c === currency;
          return (
            <Pressable
              key={c}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Ver precios en ${LABEL[c]}`}
              onPress={() => onCurrencyChange(c)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: on ? C.surface : "transparent",
              }}
            >
              <AppText variant="bodyStrong" color={on ? C.primary : C.onSurfaceVariant}>
                {LABEL[c]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
