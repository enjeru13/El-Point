import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useCategories } from "@/lib/queries/categories";
import { useTheme } from "@/lib/ThemeContext";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface CategoryPickerHandle {
  present: (current: number[]) => void;
}

const MAX = 2;

/** Hoja para elegir de 0 a 2 categorías de comida. */
export const CategoryPickerSheet = forwardRef<CategoryPickerHandle, { onDone: (ids: number[]) => void }>(
  ({ onDone }, ref) => {
    const { C } = useTheme();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const { data: categories = [] } = useCategories();
    const [picked, setPicked] = useState<number[]>([]);

    useImperativeHandle(ref, () => ({
      present: (current) => {
        setPicked(current);
        sheetRef.current?.present();
      },
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.45} />
      ),
      [],
    );

    const toggle = (id: number) =>
      setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? [p[1], id] : [...p, id]));

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
        backgroundStyle={{ backgroundColor: C.surface, borderRadius: 28, borderWidth: 1, borderColor: C.border }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="heading">Categorías</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              Elige hasta {MAX}. Ayudan a que lo encuentren quienes buscan esa comida.
            </AppText>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                icon={c.icon}
                active={picked.includes(c.id)}
                onPress={() => toggle(c.id)}
                tone="secondary"
                flat
              />
            ))}
          </View>
          <Button
            label="Listo"
            onPress={() => {
              onDone(picked);
              sheetRef.current?.dismiss();
            }}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

CategoryPickerSheet.displayName = "CategoryPickerSheet";
