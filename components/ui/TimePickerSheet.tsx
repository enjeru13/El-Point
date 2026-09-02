import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { TIME_SLOTS, to12h } from "@/lib/hours";

export interface TimePickerHandle {
  /** Open the picker for a field. `onPick` receives an "HH:MM" string. */
  present: (opts: { title: string; value: string; onPick: (hhmm: string) => void }) => void;
  dismiss: () => void;
}

export const TimePickerSheet = forwardRef<TimePickerHandle>((_, ref) => {
  const { C } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<any>(null);
  const snapPoints = useMemo(() => ["70%"], []);
  const [state, setState] = useState<{
    title: string;
    value: string;
    onPick: (hhmm: string) => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    present: (opts) => {
      setState(opts);
      sheetRef.current?.present();
      // jump close to the current value
      const idx = TIME_SLOTS.indexOf(opts.value);
      if (idx >= 0) {
        setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, idx * 48 - 120), animated: false }), 50);
      }
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.4} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
      backgroundStyle={{
        backgroundColor: C.surface,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: C.border,
      }}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
        <AppText variant="overline" color={C.onSurfaceVariant}>ELEGIR HORA</AppText>
        <AppText variant="title" style={{ fontSize: 20, lineHeight: 24 }}>{state?.title ?? ""}</AppText>
      </View>

      <BottomSheetScrollView ref={scrollRef} contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {TIME_SLOTS.map((slot) => {
          const active = slot === state?.value;
          return (
            <Pressable
              key={slot}
              onPress={() => {
                state?.onPick(slot);
                sheetRef.current?.dismiss();
              }}
              style={{
                height: 44,
                borderRadius: 12,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: active ? C.primaryFixed : "transparent",
              }}
            >
              <AppText variant={active ? "bodyStrong" : "body"} color={active ? C.primary : C.onSurface}>
                {to12h(slot)}
              </AppText>
              {active && <Icon name="check" size={18} color={C.primary} />}
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

TimePickerSheet.displayName = "TimePickerSheet";
