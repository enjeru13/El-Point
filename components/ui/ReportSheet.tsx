import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, View } from "react-native";

export interface ReportSheetHandle {
  present: (targetId: string) => void;
  dismiss: () => void;
}

export const ReportSheet = forwardRef<
  ReportSheetHandle,
  {
    title?: string;
    subtitle?: string;
    reasons: { key: string; label: string }[];
    submitting: boolean;
    onSubmit: (targetId: string, reason: string, note: string) => void;
  }
>(({ title = "Reportar", subtitle, reasons, submitting, onSubmit }, ref) => {
  const { C } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["62%"], []);

  const [targetId, setTargetId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(reasons[0]?.key ?? "other");
  const [note, setNote] = useState("");

  useImperativeHandle(ref, () => ({
    present: (id: string) => {
      setTargetId(id);
      setReason(reasons[0]?.key ?? "other");
      setNote("");
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.45}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
      backgroundStyle={{
        backgroundColor: C.surface,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: C.border,
      }}
    >
      <BottomSheetView style={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="flag" size={20} color={C.error} />
          <AppText variant="title" style={{ fontSize: 20, lineHeight: 25 }}>
            {title}
          </AppText>
        </View>
        <AppText variant="bodySm" color={C.onSurfaceVariant}>
          {subtitle ?? "Un moderador lo revisará."}
        </AppText>

        <View style={{ gap: 8 }}>
          {reasons.map((r) => {
            const active = reason === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setReason(r.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: active ? C.border : C.outlineVariant,
                  backgroundColor: active ? C.primaryFixed : C.surface,
                }}
              >
                <Icon
                  name={active ? "check-circle" : "circle"}
                  size={18}
                  color={active ? C.primary : C.outlineVariant}
                />
                <AppText variant="bodyStrong" style={{ fontSize: 14 }}>
                  {r.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Field
          value={note}
          onChangeText={(t) => setNote(t.slice(0, 300))}
          placeholder="Detalle (opcional)…"
          multiline
        />

        <Button
          label={submitting ? "Enviando…" : "Enviar reporte"}
          onPress={() => targetId && onSubmit(targetId, reason, note.trim())}
          loading={submitting}
          disabled={!targetId}
          icon="flag"
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

ReportSheet.displayName = "ReportSheet";
