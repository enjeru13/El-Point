import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import MapView from "react-native-maps";

export const SAN_CRISTOBAL = { lat: 7.7669, lng: -72.2251 };

export type LatLng = { lat: number; lng: number };

/**
 * Mapa con un pin fijo en el centro: se mueve el mapa hasta dejar el pin en
 * el punto. "Mi ubicación" pide permiso y centra en el GPS. Lo usan el
 * registro del local y la ubicación de entrega del pedido.
 */
export function LocationPicker({
  value,
  onChange,
  onLocated,
  style,
  borderColor,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  /** Se llama con las coordenadas del GPS cuando "Mi ubicación" funciona. */
  onLocated?: (coords: Location.LocationObjectCoords) => void;
  style?: ViewStyle;
  borderColor?: string;
}) {
  const { C, shadow } = useTheme();
  const toast = useToast();
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);

  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error("Permiso de ubicación denegado");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
      onChange({ lat: region.latitude, lng: region.longitude });
      mapRef.current?.animateToRegion(region, 500);
      onLocated?.(loc.coords);
    } catch {
      toast.error("No pudimos obtener tu ubicación");
    } finally {
      setLocating(false);
    }
  }

  return (
    <View
      style={[
        { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: borderColor ?? C.outlineVariant },
        style,
      ]}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: value?.lat ?? SAN_CRISTOBAL.lat,
          longitude: value?.lng ?? SAN_CRISTOBAL.lng,
          latitudeDelta: value ? 0.008 : 0.05,
          longitudeDelta: value ? 0.008 : 0.05,
        }}
        onMapReady={() => {
          if (!value) onChange(SAN_CRISTOBAL);
        }}
        onRegionChangeComplete={(r) => onChange({ lat: r.latitude, lng: r.longitude })}
      />
      {/* Pin fijo en el centro */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="map-marker" size={40} color={C.primary} style={{ marginBottom: 40 }} />
      </View>
      <Pressable
        onPress={detectLocation}
        disabled={locating}
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 99,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.sm,
        }}
      >
        <Icon name="crosshairs-gps" size={15} color={C.primary} />
        <AppText variant="label" color={C.onSurface} style={{ fontSize: 13 }}>
          {locating ? "Ubicando…" : "Mi ubicación"}
        </AppText>
      </Pressable>
    </View>
  );
}
