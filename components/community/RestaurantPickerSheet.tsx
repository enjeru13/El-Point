import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useRestaurantSearch } from "@/lib/queries/search";
import { useTheme } from "@/lib/ThemeContext";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PickedRestaurant = { id: string; name: string; category: string | null };
export type SuggestedPlace = { name: string; zone: string };

export interface RestaurantPickerHandle {
  present: () => void;
  dismiss: () => void;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Hoja para etiquetar un local: buscador de locales de la app y, si no está,
 * "No está en El Point, escríbelo" (nombre y zona). `allowSuggest` = false
 * en las respuestas, donde solo vale un local de la app.
 */
export const RestaurantPickerSheet = forwardRef<
  RestaurantPickerHandle,
  {
    allowSuggest?: boolean;
    onPick: (r: PickedRestaurant) => void;
    onSuggest?: (s: SuggestedPlace) => void;
  }
>(({ allowSuggest = true, onPick, onSuggest }, ref) => {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { data: restaurants = [] } = useRestaurantSearch();
  const [q, setQ] = useState("");
  const [writing, setWriting] = useState(false);
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");

  useImperativeHandle(ref, () => ({
    present: () => {
      setQ("");
      setWriting(false);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const results = useMemo(() => {
    const f = fold(q.trim());
    const list = f ? restaurants.filter((r) => fold(r.name).includes(f)) : restaurants;
    return list.slice(0, 40);
  }, [restaurants, q]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const inputStyle = {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 14,
    color: C.onSurface,
    backgroundColor: C.surfaceContainerLow,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
  } as const;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["80%"]}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
      backgroundStyle={{ backgroundColor: C.surface, borderRadius: 28, borderWidth: 1, borderColor: C.border }}
    >
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
        <AppText variant="heading">{writing ? "Escribe el local" : "Etiqueta un local"}</AppText>
        {!writing && (
          <BottomSheetTextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar en El Point"
            placeholderTextColor={C.outline}
            autoCorrect={false}
            style={inputStyle}
            accessibilityLabel="Buscar local"
          />
        )}
      </View>

      {writing ? (
        <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: insets.bottom + 20 }}>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            Si la gente lo menciona, lo invitamos a El Point.
          </AppText>
          <BottomSheetTextInput
            value={name}
            onChangeText={(t) => setName(t.slice(0, 80))}
            placeholder="Nombre del local"
            placeholderTextColor={C.outline}
            style={inputStyle}
            accessibilityLabel="Nombre del local"
          />
          <BottomSheetTextInput
            value={zone}
            onChangeText={(t) => setZone(t.slice(0, 80))}
            placeholder="Zona (opcional): Barrio Obrero, Pueblo Nuevo…"
            placeholderTextColor={C.outline}
            style={inputStyle}
            accessibilityLabel="Zona del local"
          />
          <Button
            label="Usar este nombre"
            disabled={name.trim().length < 2}
            onPress={() => {
              onSuggest?.({ name: name.trim(), zone: zone.trim() });
              sheetRef.current?.dismiss();
            }}
          />
          <Button label="Volver a buscar" variant="ghost" onPress={() => setWriting(false)} />
        </View>
      ) : (
        <BottomSheetFlatList
          data={results}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={
            allowSuggest ? (
              <Pressable
                onPress={() => {
                  setName(q.trim());
                  setZone("");
                  setWriting(true);
                }}
                accessibilityRole="button"
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 52 }}
              >
                <Icon name="pencil-outline" size={20} color={C.primary} />
                <AppText variant="bodyStrong" color={C.primary}>
                  No está en El Point, escríbelo
                </AppText>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ padding: 12 }}>
              No encontramos ese local en El Point.
            </AppText>
          }
          renderItem={({ item }) => {
            const category = item.categories[0]?.label ?? null;
            return (
              <Pressable
                onPress={() => {
                  onPick({ id: item.id, name: item.name, category });
                  sheetRef.current?.dismiss();
                }}
                accessibilityRole="button"
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 52 }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: C.primaryFixed,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="storefront" size={16} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" color={C.onSurfaceVariant} numberOfLines={1}>
                    {[category, item.zone_label ?? item.address].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </BottomSheetModal>
  );
});

RestaurantPickerSheet.displayName = "RestaurantPickerSheet";
