import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { CHANGELOG } from "@/lib/changelog";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";

export default function ChangelogScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>
          Novedades
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, FORM_MAX_W) }}
        showsVerticalScrollIndicator={false}
      >
        {CHANGELOG.map((r, i) => (
          <View
            key={r.version}
            style={{
              padding: 18,
              borderRadius: 20,
              gap: 12,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 99,
                  backgroundColor: i === 0 ? C.primary : C.surfaceContainerHigh,
                }}
              >
                <AppText variant="caption" color={i === 0 ? C.onPrimary : C.onSurfaceVariant}>
                  v{r.version}
                </AppText>
              </View>
              <AppText variant="bodySm" color={C.outline}>
                {r.date}
              </AppText>
            </View>
            <View style={{ gap: 8 }}>
              {r.notes.map((n, j) => (
                <View key={j} style={{ flexDirection: "row", gap: 8 }}>
                  <Icon name="check" size={15} color={C.primary} style={{ marginTop: 2 }} />
                  <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1, lineHeight: 20 }}>
                    {n}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
