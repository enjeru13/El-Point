import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { StarBadge } from "@/components/ui/StarBadge";
import { useTheme } from "@/lib/ThemeContext";
import { Image } from "expo-image";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import type { SearchResult } from "@/lib/queries/search";

/** "¿Qué comer hoy?" reveal — a short "picking..." beat, then one random
 *  restaurant with a way to re-roll or go. Lives outside any one screen's
 *  layout on purpose (it's a decision tool, not a list). */
export function QuickPickModal({
  visible,
  spinning,
  item,
  onReroll,
  onGo,
  onClose,
}: {
  visible: boolean;
  spinning: boolean;
  item: SearchResult | null;
  onReroll: () => void;
  onGo: () => void;
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
            padding: 24,
            gap: 16,
            ...shadow.lg,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} style={{ alignSelf: "flex-end", marginBottom: -12 }}>
            <Icon name="close" size={20} color={C.outline} />
          </Pressable>

          {spinning || !item ? (
            <View style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
              <ActivityIndicator size="large" color={C.primary} />
              <AppText variant="bodyStrong" align="center">Pensando qué se te antoja…</AppText>
            </View>
          ) : (
            <>
              <View
                style={{
                  height: 140,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: C.primaryFixed,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.cover_url ? (
                  <Image source={{ uri: item.cover_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
                ) : (
                  <Icon name={item.categories[0]?.icon ?? "silverware-fork-knife"} size={56} color={C.primary} style={{ opacity: 0.5 }} />
                )}
                <View style={{ position: "absolute", top: 10, right: 10 }}>
                  <StarBadge rating={item.rating_avg} count={item.rating_count} size="sm" />
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <AppText variant="overline" color={C.primary}>HOY COMES EN</AppText>
                <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }} numberOfLines={1}>
                  {item.name}
                </AppText>
                {item.categories[0] && (
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>{item.categories[0].label}</AppText>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button label="Otro" onPress={onReroll} variant="secondary" icon="dice-5-outline" style={{ flex: 1 }} />
                <Button label="Vamos" onPress={onGo} iconTrailing="arrow-right" style={{ flex: 1 }} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
