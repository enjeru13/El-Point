import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { RankBadge } from "@/components/ui/RankBadge";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useMyProfile } from "@/lib/queries/me";
import { RANKS, rankForLevel, xpForLevel } from "@/lib/queries/me";
import { capWidth, useIsTablet } from "@/lib/responsive";

// Mismo orden que RANKS (lib/queries/me.ts) — cada tramo va de min a max.
const TIERS = RANKS.map((r, i) => ({
  ...r,
  min: i === 0 ? 1 : RANKS[i - 1].max + 1,
}));

const WAYS = [
  { icon: "star", title: "Publicar una reseña", xp: "+10 XP", detail: "Cada rank que dejas suma, sin importar el local." },
  { icon: "thumb-up", title: 'Que marquen tu reseña "útil"', xp: "+2 XP", detail: "Por cada persona que la marca. Sin límite." },
  { icon: "fire", title: "Mantener tu racha semanal", xp: "+15 XP", detail: "Desde tu 2da semana seguida rankeando, cada semana." },
  { icon: "trophy-outline", title: "Completar logros", xp: "20–150 XP", detail: "Mira la lista completa en tu perfil, más abajo." },
] as const;

function TierRow({ tier, current }: { tier: (typeof TIERS)[number]; current: boolean }) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: current ? 12 : 0,
        borderRadius: 14,
        backgroundColor: current ? C.primaryFixed : "transparent",
      }}
    >
      <RankBadge level={tier.min} size="md" />
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm" color={C.onSurfaceVariant}>
          Nivel {tier.min}
          {tier.max === Infinity ? "+" : `–${tier.max}`} · desde {xpForLevel(tier.min)} XP
        </AppText>
      </View>
      {current && (
        <AppText variant="label" color={C.primary}>Tú</AppText>
      )}
    </View>
  );
}

export default function RankInfoScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();

  const profileQ = useMyProfile();
  const level = profileQ.data?.level ?? 1;
  const rank = rankForLevel(level);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
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
        <AppText variant="title" style={{ flex: 1 }}>Rango y XP</AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          gap: 18,
          paddingBottom: insets.bottom + 40,
          ...capWidth(isTablet, 640),
        }}
      >
        {/* Qué es */}
        <View
          style={{
            borderRadius: 24,
            padding: 20,
            gap: 10,
            backgroundColor: C.primary + "14",
            borderWidth: 1,
            borderColor: C.primary + "40",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="medal" size={22} color={C.primary} />
            <AppText variant="heading" style={{ fontSize: 18 }}>Cómo funciona</AppText>
          </View>
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 21 }}>
            Cada cosa que haces en El Point suma XP. Al juntar suficiente subes
            de nivel, y cada tramo de niveles tiene un rango: hoy eres{" "}
            <AppText variant="bodyStrong" color={C.onSurface}>{rank}</AppText>, nivel {level}.
          </AppText>
        </View>

        {/* Cómo ganas XP */}
        <View style={{ gap: 10 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>Cómo ganas XP</AppText>
          <View
            style={{
              borderRadius: 22,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              padding: 16,
              gap: 14,
              ...shadow.sm,
            }}
          >
            {WAYS.map((w, i) => (
              <View key={w.title} style={{ gap: 14 }}>
                {i > 0 && <View style={{ height: 1, backgroundColor: C.outlineVariant }} />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: C.primaryFixed,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <Icon name={w.icon} size={18} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" style={{ fontSize: 14 }}>{w.title}</AppText>
                    <AppText variant="caption" color={C.outline} style={{ fontSize: 12, marginTop: 1 }}>
                      {w.detail}
                    </AppText>
                  </View>
                  <AppText variant="label" color={C.primary}>{w.xp}</AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Rangos */}
        <View style={{ gap: 10 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>Rangos</AppText>
          <View
            style={{
              borderRadius: 22,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 12,
              paddingVertical: 6,
              ...shadow.sm,
            }}
          >
            {TIERS.map((t) => (
              <TierRow key={t.name} tier={t} current={rank === t.name} />
            ))}
          </View>
        </View>

        {/* Racha */}
        <View style={{ gap: 10 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>Tu racha semanal</AppText>
          <View
            style={{
              borderRadius: 22,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              padding: 16,
              gap: 8,
              ...shadow.sm,
            }}
          >
            <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 20 }}>
              Rankea al menos un local por semana. Desde tu 2da semana seguida
              ganas <AppText variant="bodyStrong" color={C.onSurface}>+15 XP extra</AppText> cada
              semana que la mantengas, y a las 4 semanas seguidas desbloqueas
              el logro "Un mes en racha" (+100 XP).
            </AppText>
            <AppText variant="caption" color={C.outline} style={{ lineHeight: 15 }}>
              Si te saltas una semana completa sin rankear, la racha se
              reinicia — pero tu mejor marca queda guardada como récord.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
