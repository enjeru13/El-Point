import { LocationPicker, SAN_CRISTOBAL, type LatLng } from "@/components/LocationPicker";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Pantalla completa para marcar un punto en el mapa (entrega de un pedido,
 * ubicación de un local). Arranca en `initial`, si no en tu ubicación (si ya
 * diste permiso), si no en San Cristóbal.
 */
export function LocationPickerModal({
  visible,
  initial,
  onConfirm,
  onClose,
  title = "¿Dónde te lo llevamos?",
  subtitle = "Mueve el mapa hasta dejar el pin en tu puerta.",
  confirmLabel = "Confirmar ubicación",
}: {
  visible: boolean;
  initial: LatLng | null;
  onConfirm: (p: LatLng) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
}) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState<LatLng | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!visible) {
      setStart(null);
      return;
    }
    if (initial) {
      setStart(initial);
      setPoint(initial);
      return;
    }
    let alive = true;
    (async () => {
      let p: LatLng = SAN_CRISTOBAL;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === "granted") {
          const loc = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
          if (loc) p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch {
        // sin ubicación: San Cristóbal
      }
      if (alive) {
        setStart(p);
        setPoint(p);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, initial]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Icon name="close" size={24} color={C.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{title}</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              {subtitle}
            </AppText>
          </View>
        </View>

        {start ? (
          <LocationPicker value={start} onChange={setPoint} style={{ flex: 1, marginHorizontal: 16, borderRadius: 20 }} />
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
          <Button label={confirmLabel} disabled={!point} onPress={() => point && onConfirm(point)} />
        </View>
      </View>
    </Modal>
  );
}
