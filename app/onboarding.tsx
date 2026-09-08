import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { markOnboardingSeen } from "@/lib/onboarding";
import { AppText } from "@/components/ui/AppText";
import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FoodBackdrop } from "@/components/ui/FoodBackdrop";

const { width: W } = Dimensions.get("window");

// ─── Per-slide hero illustrations ───────────────────────────────────────────

function HeroDiscover() {
  const { C, shadow } = useTheme();
  return (
    <View style={{ width: 260, height: 220, alignItems: "center", justifyContent: "center" }}>
      {/* "mapa" */}
      <View
        style={{
          width: 220,
          height: 170,
          borderRadius: 28,
          backgroundColor: C.surfaceContainerHigh,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.md,
        }}
      />
      {/* pines */}
      {[
        { x: 30, y: 20, icon: "hamburger", tone: C.primary },
        { x: 150, y: 45, icon: "pizza", tone: C.secondary },
        { x: 80, y: 110, icon: "coffee", tone: C.tertiary },
      ].map((p) => (
        <View
          key={p.icon}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: 46,
            height: 46,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            ...shadow.sm,
          }}
        >
          <Icon name={p.icon} size={22} color={p.tone} />
        </View>
      ))}
      {/* search pill */}
      <View
        style={{
          position: "absolute",
          bottom: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 99,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.md,
        }}
      >
        <Icon name="magnify" size={16} color={C.primary} />
        <AppText variant="label" color={C.onSurfaceVariant}>
          ¿Qué se te antoja hoy?
        </AppText>
      </View>
    </View>
  );
}

function HeroRank() {
  const { C, shadow } = useTheme();
  return (
    <View style={{ width: 260, height: 220, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 230,
          padding: 16,
          borderRadius: 24,
          gap: 12,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: C.primaryFixed,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Icon name="account" size={20} color={C.primary} />
          </View>
          <View style={{ gap: 5 }}>
            <View style={{ width: 90, height: 8, borderRadius: 99, backgroundColor: C.surfaceContainerHighest }} />
            <View style={{ flexDirection: "row", gap: 2 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="star" size={13} color={C.primary} fill={C.primary} />
              ))}
            </View>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ width: "100%", height: 7, borderRadius: 99, backgroundColor: C.surfaceContainerHighest }} />
          <View style={{ width: "80%", height: 7, borderRadius: 99, backgroundColor: C.surfaceContainerHighest }} />
        </View>
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 99,
            backgroundColor: C.primary + "1f",
          }}
        >
          <Icon name="fire" size={13} color={C.primary} />
          <AppText variant="caption" color={C.primary}>
            +10 XP
          </AppText>
        </View>
      </View>
    </View>
  );
}

function HeroFavorites() {
  const { C, shadow } = useTheme();
  return (
    <View style={{ width: 260, height: 220, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 130,
          height: 130,
          borderRadius: 44,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.primary + "1f",
          borderWidth: 1,
          borderColor: C.primary + "40",
        }}
      >
        <Icon name="heart" size={62} color={C.primary} fill={C.primary} />
      </View>
      {/* promo tag */}
      <View
        style={{
          position: "absolute",
          top: 24,
          right: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 99,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.md,
        }}
      >
        <Icon name="tag" size={14} color={C.primary} />
        <AppText variant="caption" color={C.onSurface}>
          2x1 hoy
        </AppText>
      </View>
      {/* bell */}
      <View
        style={{
          position: "absolute",
          bottom: 22,
          left: 26,
          width: 44,
          height: 44,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.sm,
        }}
      >
        <Icon name="bell-outline" size={20} color={C.secondary} />
      </View>
    </View>
  );
}

const SLIDES = [
  {
    Hero: HeroDiscover,
    kicker: "Tu ciudad, con hambre",
    title: "Encuentra dónde comer\nen San Cristóbal",
    body: "Descubre locales por antojo, por lo que queda cerca o por lo que está abierto ahora mismo. De la arepa de la esquina a la cena que te vas a acordar.",
  },
  {
    Hero: HeroRank,
    kicker: "Tu opinión pesa",
    title: "Deja tu rank y\nhazte leyenda",
    body: "Califica con estrellas, sube tus fotos y cuenta cómo te fue. Cada rank te da XP: sube de nivel, desbloquea rangos y guía a la comunidad.",
  },
  {
    Hero: HeroFavorites,
    kicker: "No te lo pierdas",
    title: "Guarda tus sitios,\nagarra las promos",
    body: "Marca tus locales favoritos y recibe un aviso al toque cuando publiquen una promo. El plan de hoy se decide solo.",
  },
];

// ─── Screen ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { C, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  // Keep at least one listener attached so the JS-driven Animated.event
  // doesn't log "onAnimatedValueUpdate with no listeners registered".
  useEffect(() => {
    const id = scrollX.addListener(() => {});
    return () => scrollX.removeListener(id);
  }, [scrollX]);

  const last = page === SLIDES.length - 1;

  function finish() {
    markOnboardingSeen();
    router.replace("/(auth)/login");
  }
  function goRegister() {
    markOnboardingSeen();
    router.replace("/(auth)/login");
    // Stack register on top of login so "back" from register lands on login.
    setTimeout(() => router.push("/(auth)/register"), 0);
  }
  function next() {
    if (last) return goRegister();
    scrollRef.current?.scrollTo({ x: W * (page + 1), animated: true });
  }
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const p = Math.round(e.nativeEvent.contentOffset.x / W);
    if (p !== page) setPage(p);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <FoodBackdrop
        seed={21}
        color={scheme === "dark" ? "#ff8a5c" : C.primary}
        opacityScale={scheme === "dark" ? 1.8 : 0.6}
      />

      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 2,
        }}
      >
        <AppLogo size="sm" />
        {!last && (
          <Pressable onPress={finish} hitSlop={10}>
            <AppText variant="bodyStrong" color={C.outline}>
              Saltar
            </AppText>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: onScroll },
        )}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => {
          const inRange = [(i - 1) * W, i * W, (i + 1) * W];
          const heroTx = scrollX.interpolate({
            inputRange: inRange,
            outputRange: [W * 0.28, 0, -W * 0.28],
            extrapolate: "clamp",
          });
          const heroScale = scrollX.interpolate({
            inputRange: inRange,
            outputRange: [0.82, 1, 0.82],
            extrapolate: "clamp",
          });
          const textOpacity = scrollX.interpolate({
            inputRange: inRange,
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          });
          const textTy = scrollX.interpolate({
            inputRange: inRange,
            outputRange: [28, 0, 28],
            extrapolate: "clamp",
          });
          return (
            <View
              key={s.title}
              style={{
                width: W,
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 32,
                gap: 30,
              }}
            >
              <Animated.View
                style={{ transform: [{ translateX: heroTx }, { scale: heroScale }] }}
              >
                <s.Hero />
              </Animated.View>

              <Animated.View
                style={{
                  gap: 12,
                  alignItems: "center",
                  opacity: textOpacity,
                  transform: [{ translateY: textTy }],
                }}
              >
                <AppText variant="overline" color={C.primary}>
                  {s.kicker.toUpperCase()}
                </AppText>
                <AppText
                  variant="title"
                  align="center"
                  style={{ fontSize: 27, lineHeight: 33 }}
                >
                  {s.title}
                </AppText>
                <AppText
                  variant="body"
                  color={C.onSurfaceVariant}
                  align="center"
                  style={{ lineHeight: 22, maxWidth: 320 }}
                >
                  {s.body}
                </AppText>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 20,
          gap: 20,
          zIndex: 2,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, i) => {
            const dotW = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const dotOp = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={{
                  width: dotW,
                  height: 8,
                  borderRadius: 99,
                  backgroundColor: C.primary,
                  opacity: dotOp,
                }}
              />
            );
          })}
        </View>

        {last ? (
          <View style={{ gap: 10 }}>
            <Button label="Crear cuenta" onPress={goRegister} iconTrailing="arrow-right" />
            <Pressable onPress={finish} style={{ alignSelf: "center", paddingVertical: 6 }} hitSlop={8}>
              <AppText variant="bodyStrong" color={C.primary}>
                Ya tengo cuenta
              </AppText>
            </Pressable>
          </View>
        ) : (
          <Button label="Siguiente" onPress={next} />
        )}
      </View>
    </View>
  );
}
