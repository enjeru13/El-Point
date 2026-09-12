import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { copyToClipboard } from "@/lib/clipboard";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/queries/payments";
import { useState } from "react";
import { Pressable, View } from "react-native";

function CopyRow({ label, value }: { label: string; value: string }) {
  const { C } = useTheme();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("No se pudo copiar — selecciona el texto manualmente");
    }
  }

  return (
    <Pressable onPress={onCopy} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="overline" color={C.outline}>{label.toUpperCase()}</AppText>
        <AppText variant="bodyStrong" style={{ fontSize: 14 }}>{value}</AppText>
      </View>
      <Icon name={copied ? "check" : "content-copy"} size={18} color={copied ? C.primary : C.onSurfaceVariant} />
    </Pressable>
  );
}

/**
 * Selector de método + cuentas con botón de copiar por campo. Mismas
 * cuentas reales para dos contextos distintos: la suscripción paga del
 * dueño (monto fijo, controla `method` porque lo necesita para el envío
 * del comprobante) y el aporte voluntario de "Apoya el proyecto" (sin
 * monto fijo, showAmountNote=false lo oculta).
 */
export function PaymentMethodPicker({
  method,
  onMethodChange,
  showAmountNote = true,
}: {
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  showAmountNote?: boolean;
}) {
  const { C } = useTheme();
  const active = PAYMENT_METHODS.find((m) => m.key === method) ?? PAYMENT_METHODS[0];

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {PAYMENT_METHODS.map((m) => {
          const isActive = method === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => onMethodChange(m.key)}
              style={{
                flex: 1, alignItems: "center", gap: 6, paddingVertical: 12,
                borderRadius: 14, borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? C.primary : C.border,
                backgroundColor: isActive ? C.primaryFixed : C.surface,
              }}
            >
              <Icon name={m.icon} size={20} color={isActive ? C.primary : C.onSurfaceVariant} />
              <AppText variant="label" color={isActive ? C.primary : C.onSurfaceVariant} style={{ fontSize: 12, textAlign: "center" }}>
                {m.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {active.accounts.map((acc) => (
        <View
          key={acc.name}
          style={{ borderRadius: 18, backgroundColor: C.surfaceContainerLow, padding: 14, gap: 10 }}
        >
          <AppText variant="bodyStrong" style={{ fontSize: 14 }}>{acc.name}</AppText>
          {acc.fields.map((f) => (
            <CopyRow key={f.label} label={f.label} value={f.value} />
          ))}
        </View>
      ))}

      {showAmountNote && (
        <AppText variant="caption" color={C.outline}>{active.amountNote}</AppText>
      )}
    </View>
  );
}
