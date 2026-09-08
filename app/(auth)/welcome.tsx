import { Icon } from "@/components/ui/Icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  View,
} from "react-native";
import { useTheme } from "@/lib/ThemeContext";
import { useMyProfile } from "@/lib/queries/me";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");
const CONFETTI_COUNT = 44;

function ConfettiParticle({
  x,
  color,
  size,
  delay,
  duration,
  rotation,
}: {
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}) {
  const translateY = useRef(new Animated.Value(-24)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      translateY.setValue(-24);
      rotate.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: H + 24, duration, delay, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9, duration: 180, delay, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 400, delay: delay + duration - 400, useNativeDriver: true }),
        ]),
      ]).start(() => run());
    };
    run();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: size,
        height: size * 0.5,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateY },
          { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: [`${rotation}deg`, `${rotation + 540}deg`] }) },
        ],
      }}
    />
  );
}

function Step({ icon, label, xp, tone }: { icon: string; label: string; xp?: string; tone: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone + "22",
        }}
      >
        <Icon name={icon} size={17} color={tone} />
      </View>
      <AppText variant="bodySm" style={{ flex: 1 }}>
        {label}
      </AppText>
      {xp && (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 99,
            backgroundColor: C.primary + "1f",
          }}
        >
          <AppText variant="caption" color={C.primary}>
            {xp}
          </AppText>
        </View>
      )}
    </View>
  );
}

export default function WelcomeScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isOwner = role === "owner";
  const profileQ = useMyProfile();
  const username = profileQ.data?.username;
  const greet = username ? `@${username}` : isOwner ? "Socio" : "Comensal";

  const confetti = useMemo(() => {
    const colors = [C.primary, C.primaryContainer, C.secondary, C.tertiary, "#ffd167", C.primaryFixedDim];
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      color: colors[i % colors.length],
      size: 7 + Math.random() * 9,
      delay: Math.random() * 900,
      duration: 2600 + Math.random() * 1800,
      rotation: Math.random() * 360,
    }));
  }, [C.primary]);

  const pop = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const b1 = useRef(new Animated.Value(0)).current;
  const b2 = useRef(new Animated.Value(0)).current;
  const b3 = useRef(new Animated.Value(0)).current;
  const b4 = useRef(new Animated.Value(0)).current;
  const xpWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, delay: 120, damping: 9, stiffness: 140, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    Animated.stagger(
      110,
      [b1, b2, b3, b4].map((v) =>
        Animated.timing(v, { toValue: 1, duration: 460, delay: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ),
    ).start();
    if (!isOwner) {
      Animated.timing(xpWidth, { toValue: 0.16, duration: 1100, delay: 900, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }
  }, []);

  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        {confetti.map((p) => (
          <ConfettiParticle key={p.id} {...p} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Medalla */}
        <Animated.View
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
            opacity: pop,
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: (isOwner ? C.secondary : C.primary) + "1f",
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            }}
          />
          <View
            style={{
              width: 116,
              height: 116,
              borderRadius: 38,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isOwner ? C.secondaryContainer : C.primaryFixed,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.lg,
            }}
          >
            <Icon
              name={isOwner ? "storefront" : "medal"}
              size={58}
              color={isOwner ? C.secondary : C.primary}
            />
          </View>
          {!isOwner && (
            <View
              style={{
                position: "absolute",
                bottom: -8,
                right: -8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
                backgroundColor: C.primary,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <AppText variant="caption" color={C.onPrimary}>
                NV 1
              </AppText>
            </View>
          )}
        </Animated.View>

        {/* Saludo */}
        <Animated.View style={[{ alignItems: "center", gap: 8 }, rise(b1)]}>
          <AppText variant="display" color={C.primary} align="center" style={{ fontSize: 30, lineHeight: 34 }}>
            {isOwner ? "¡Tu local está en camino!" : `¡Listo, ${greet}!`}
          </AppText>
          <AppText variant="body" color={C.onSurfaceVariant} align="center" style={{ lineHeight: 22, maxWidth: 300 }}>
            {isOwner
              ? "Ya recibimos tu solicitud. Un moderador la revisa y te avisamos apenas quede aprobada."
              : "Estás dentro. San Cristóbal tiene mucho sabor esperándote — y tu opinión ya cuenta."}
          </AppText>
        </Animated.View>

        {/* Tarjeta de estado / nivel */}
        <Animated.View
          style={[
            {
              width: "100%",
              padding: 18,
              borderRadius: 22,
              gap: 12,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.sm,
            },
            rise(b2),
          ]}
        >
          {isOwner ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.tertiary }} />
                <AppText variant="bodyStrong">En revisión</AppText>
              </View>
              <AppText variant="bodySm" color={C.onSurfaceVariant}>
                Suele tardar poco. Mientras tanto, deja tu perfil listo para
                salir con todo.
              </AppText>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                <AppText variant="display" color={C.primary} style={{ fontSize: 34, lineHeight: 36 }}>
                  1
                </AppText>
                <AppText variant="bodyStrong" color={C.onSurfaceVariant} style={{ marginBottom: 4 }}>
                  Nivel · Novato
                </AppText>
              </View>
              <View style={{ height: 8, borderRadius: 99, overflow: "hidden", backgroundColor: C.surfaceContainerHighest }}>
                <Animated.View
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    backgroundColor: C.primary,
                    width: xpWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  }}
                />
              </View>
              <AppText variant="caption" color={C.outline}>
                Tu primer rank te acerca al Nivel 2.
              </AppText>
            </>
          )}
        </Animated.View>

        {/* Próximos pasos */}
        <Animated.View
          style={[
            {
              width: "100%",
              padding: 18,
              borderRadius: 22,
              gap: 14,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.sm,
            },
            rise(b3),
          ]}
        >
          <AppText variant="overline" color={C.outline}>
            PRÓXIMOS PASOS
          </AppText>
          {isOwner ? (
            <>
              <Step icon="image-plus" label="Sube tu logo y portada" tone={C.primary} />
              <Step icon="file-pdf-box" label="Agrega tu menú en PDF" tone={C.secondary} />
              <Step icon="clock-outline" label="Define tu horario de atención" tone={C.tertiary} />
            </>
          ) : (
            <>
              <Step icon="fire" label="Deja tu primer rank" xp="+10 XP" tone={C.primary} />
              <Step icon="heart-outline" label="Guarda un local en favoritos" tone={C.secondary} />
              <Step icon="map-marker" label="Explora el mapa de tu zona" tone={C.tertiary} />
            </>
          )}
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[{ width: "100%" }, rise(b4)]}>
          <Button
            label={isOwner ? "Ir a mi panel" : "Empezar a explorar"}
            onPress={() => router.replace(isOwner ? "/(owner)" : "/(customer)")}
            iconTrailing="arrow-right"
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}
