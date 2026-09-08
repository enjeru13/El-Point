import { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";

/** Shared shell for the Terms / Privacy screens. */
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 48,
          gap: 6,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="bodySm" color={C.outline} style={{ marginBottom: 10 }}>
          Última actualización: {updated}
        </AppText>
        {children}
      </ScrollView>
    </View>
  );
}

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const { C } = useTheme();
  return (
    <View style={{ gap: 8, marginTop: 22 }}>
      <AppText variant="heading" style={{ fontSize: 17, lineHeight: 22 }}>
        {n}. {title}
      </AppText>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  const { C } = useTheme();
  return (
    <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 21 }}>
      {children}
    </AppText>
  );
}

export function LegalBullet({ children }: { children: ReactNode }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8, paddingLeft: 4 }}>
      <AppText variant="body" color={C.primary}>
        •
      </AppText>
      <AppText
        variant="body"
        color={C.onSurfaceVariant}
        style={{ flex: 1, lineHeight: 21 }}
      >
        {children}
      </AppText>
    </View>
  );
}
