import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyReferralInfo, REFERRAL_SHARE_MESSAGE } from "@/lib/queries/referrals";
import { capWidth, useIsTablet } from "@/lib/responsive";

export default function ReferralsScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();

  const infoQ = useMyReferralInfo();
  const code = infoQ.data?.code ?? null;

  async function share() {
    if (!code) return;
    try {
      await Share.share({ message: REFERRAL_SHARE_MESSAGE(code) });
    } catch {
      toast.error("No se pudo abrir el menú para compartir");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 14,
          flexDirection: "row", alignItems: "center", gap: 12,
          borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>Invita amigos</AppText>
      </View>

      {infoQ.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, 640) }}
        >
          <View
            style={{
              borderRadius: 24, padding: 20, gap: 10,
              backgroundColor: C.primary + "14", borderWidth: 1, borderColor: C.primary + "40",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="account-multiple-plus-outline" size={22} color={C.primary} />
              <AppText variant="heading" style={{ fontSize: 18 }}>Invita y ganen los dos</AppText>
            </View>
            <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 21 }}>
              Comparte tu código. Cuando tu amigo se registre con él y deje su
              primer rank, tú ganas <AppText variant="bodyStrong" color={C.onSurface}>+50 XP</AppText> y
              él <AppText variant="bodyStrong" color={C.onSurface}>+25 XP</AppText> de bienvenida.
            </AppText>
          </View>

          <View
            style={{
              alignItems: "center", gap: 14, padding: 24, borderRadius: 24,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm,
            }}
          >
            <AppText variant="overline" color={C.onSurfaceVariant}>TU CÓDIGO</AppText>
            <AppText
              variant="display"
              style={{ fontSize: 40, lineHeight: 56, letterSpacing: 6, paddingVertical: 6 }}
            >
              {code ?? "······"}
            </AppText>
            <Button label="Compartir código" icon="share-variant-outline" onPress={share} disabled={!code} />
          </View>

          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              padding: 16, borderRadius: 20,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
              <Icon name="account-check-outline" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{infoQ.data?.count ?? 0} {infoQ.data?.count === 1 ? "amigo unido" : "amigos unidos"}</AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant}>Se registraron con tu código</AppText>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
