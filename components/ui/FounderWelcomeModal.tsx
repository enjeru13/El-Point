import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/lib/ThemeContext";
import { Modal, View } from "react-native";

/** Shown once, ever, the first time an owner's local turns out to be one of
 *  the first 100 approved — a celebration, not a subscription notice. */
export function FounderWelcomeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { C, shadow } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(12,9,7,0.62)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 28,
            backgroundColor: C.surface,
            padding: 28,
            alignItems: "center",
            gap: 14,
            ...shadow.lg,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "#f0c260",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="crown" size={36} color="#3a2a05" />
          </View>
          <AppText variant="title" align="center">¡Eres Fundador de El Point!</AppText>
          <AppText variant="body" color={C.onSurfaceVariant} align="center" style={{ lineHeight: 21 }}>
            Tu local entró entre los primeros 100 de la app. Gracias por sumarte desde el día uno — la corona es tuya para siempre.
          </AppText>
          <Button label="Genial" onPress={onClose} style={{ marginTop: 6 }} />
        </View>
      </View>
    </Modal>
  );
}
