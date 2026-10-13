import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { View } from "react-native";

/**
 * Tarjeta de "esto viene con el plan". Reemplaza una sección que un local con
 * perfil básico no puede usar. No muestra precios (el cobro es fuera de la
 * app): solo explica qué se gana y lleva a la pantalla del plan.
 */
export function PlanLock({
  title,
  body,
  onPress,
  compact = false,
}: {
  title: string;
  body: string;
  onPress: () => void;
  /** Sin encabezado de sección, para filas dentro de otra tarjeta. */
  compact?: boolean;
}) {
  const { C } = useTheme();
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: C.primaryFixed,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="lock-outline" size={19} color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{compact ? title : "Incluido en el plan"}</AppText>
        <AppText variant="bodySm" color={C.onSurfaceVariant}>
          {body}
        </AppText>
      </View>
      <Button label="Ver plan" onPress={onPress} size="sm" variant="secondary" fullWidth={false} />
    </View>
  );

  if (compact) return row;

  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
      }}
    >
      <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
        <AppText variant="bodyStrong">{title}</AppText>
      </View>
      {row}
    </View>
  );
}
