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
import { useIsTablet } from "@/lib/responsive";

const { width: W } = Dimensions.get("window");

// ─── Per-slide hero illustrations ───────────────────────────────────────────

function HeroDiscover() {
  const { C, shadow } = useTheme();
  const road = C.outlineVariant;
  return (
    <View style={{ width: 260, height: 220, alignItems: "center", justifyContent: "center" }}>
      {/* mapa estilizado */}
      <View
        style={{
          width: 230,
          height: 180,
          borderRadius: 28,
          overflow: "hidden",
          backgroundColor: C.surfaceContainerHigh,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.md,
        }}
      >
        {/* manzana / parque */}
        <View style={{ position: "absolute", left: 18, top: 20, width: 74, height: 52, borderRadius: 12, backgroundColor: C.secondary + "26" }} />
        <View style={{ position: "absolute", right: 20, bottom: 24, width: 60, height: 44, borderRadius: 12, backgroundColor: C.tertiary + "22" }} />
        {/* calles */}
        <View style={{ position: "absolute", left: -10, right: -10, top: 66, height: 10, backgroundColor: road, transform: [{ rotate: "-4deg" }] }} />
        <View style={{ position: "absolute", left: -10, right: -10, bottom: 40, height: 8, backgroundColor: road }} />
        <View style={{ position: "absolute", top: -10, bottom: -10, left: 96, width: 10, backgroundColor: road, transform: [{ rotate: "5deg" }] }} />
        {/* ruta */}
        <View style={{ position: "absolute", left: 40, top: 40, width: 120, height: 3, borderRadius: 99, backgroundColor: C.primary, transform: [{ rotate: "22deg" }] }} />
        <View style={{ position: "absolute", left: 150, top: 84, width: 60, height: 3, borderRadius: 99, backgroundColor: C.primary, transform: [{ rotate: "70deg" }] }} />
      </View>

      {/* pines dentro del mapa */}
      {[
        { x: 34, y: 26, icon: "hamburger", tone: C.primary },
        { x: 150, y: 40, icon: "pizza", tone: C.secondary },
        { x: 92, y: 104, icon: "coffee", tone: C.tertiary },
      ].map((p) => (
        <View
          key={p.icon}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: 44,
            height: 44,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            ...shadow.sm,
          }}
        >
          <Icon name={p.icon} size={21} color={p.tone} />
        </View>
      ))}

      {/* search pill */}
      <View
        style={{
          position: "absolute",
          bottom: 2,
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

function HeroOrder() {
  const { C, shadow } = useTheme();
  const row = (name: string, price: string, qty: number | null) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" style={{ fontFamily: "PlusJakartaSans_700Bold" }} color={C.onSurface}>
          {name}
        </AppText>
        <AppText variant="caption" color={C.primary}>
          {price}
        </AppText>
      </View>
      {qty == null ? (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryContainer, alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={14} color="#fff" />
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.primaryContainer, alignItems: "center", justifyContent: "center" }}>
            <Icon name="minus" size={11} color={C.primaryContainer} />
          </View>
          <AppText variant="caption" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
            {qty}
          </AppText>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.primaryContainer, alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={11} color={C.primaryContainer} />
          </View>
        </View>
      )}
    </View>
  );
  return (
    <View style={{ width: 260, height: 220, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 190,
          borderRadius: 24,
          padding: 14,
          gap: 10,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="silverware-fork-knife" size={14} color={C.primary} />
          <AppText variant="label" color={C.onSurface}>
            Menú
          </AppText>
        </View>
        {row("Hamburguesa mixta", "$5,00", 2)}
        {row("Polar", "$1,50", null)}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: C.primary,
          }}
        >
          <Icon name="shopping-bag" size={13} color="#fff" />
          <AppText variant="caption" color="#fff" style={{ flex: 1, fontFamily: "PlusJakartaSans_700Bold" }}>
            Ver pedido · 2
          </AppText>
          <AppText variant="caption" color="#fff" style={{ fontFamily: "PlusJakartaSans_700Bold" }}>
            $10,00
          </AppText>
        </View>
      </View>
      {/* WhatsApp — enganchado a la esquina superior derecha */}
      <View
        style={{
          position: "absolute",
          top: 14,
          right: 18,
          width: 46,
          height: 46,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1fa855",
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.sm,
        }}
      >
        <Icon name="whatsapp" size={24} color="#fff" />
      </View>
    </View>
  );
}

function HeroCommunity() {
  const { C, shadow } = useTheme();
  const bubble = (text: string, mine: boolean) => (
    <View
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: 180,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderBottomRightRadius: mine ? 4 : 16,
        borderBottomLeftRadius: mine ? 16 : 4,
        backgroundColor: mine ? C.primary : C.surface,
        borderWidth: 1,
        borderColor: C.border,
        ...shadow.sm,
      }}
    >
      <AppText variant="caption" color={mine ? C.onPrimary : C.onSurface}>
        {text}
      </AppText>
    </View>
  );
  return (
    <View style={{ width: 240, height: 220, justifyContent: "center", gap: 10 }}>
      {bubble("¿Dónde venden las mejores empanadas por Barrio Obrero?", false)}
      {bubble("Ve a la de la esquina de la 20, ¡brutales! 🥟", true)}
      {bubble("Confirmo, y temprano salen calienticas", false)}
      <View
        style={{
          position: "absolute",
          top: 6,
          right: 0,
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.secondaryContainer,
          borderWidth: 1,
          borderColor: C.border,
          ...shadow.sm,
        }}
      >
        <Icon name="comment-text-multiple" size={18} color={C.secondary} />
      </View>
    </View>
  );
}

const SLIDES = [
  {
    Hero: HeroDiscover,
    kicker: "Tu ciudad, con hambre",
    title: "Encuentra dónde comer\nen San Cristóbal",
    body: "Descubre locales por antojo, por lo que queda cerca o por lo que está abierto ahora mismo. Guarda tus favoritos y entérate de sus promos.",
  },
  {
    Hero: HeroOrder,
    kicker: "Pide sin escribir",
    title: "Arma tu pedido\ny mándalo por WhatsApp",
    body: "Elige los platos del menú, ve el total en dólares, bolívares o pesos y envía el pedido listo al local, con tu ubicación si es delivery.",
  },
  {
    Hero: HeroCommunity,
    kicker: "Pregunta a los que saben",
    title: "Opina y gana XP\nen la Comunidad",
    body: "Deja tu rank, pide recomendaciones, vota en encuestas y responde a otros comensales. Participar te da XP: sube de nivel y de rango.",
  },
];

// ─── Screen ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { C, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();
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

  /** Ya tengo cuenta. */
  function finish() {
    markOnboardingSeen();
    router.replace("/(auth)/login");
  }
  /** Explorar sin cuenta: pide registro solo cuando haga falta. */
  function explore() {
    markOnboardingSeen();
    router.replace("/(customer)");
  }
  function goRegister() {
    markOnboardingSeen();
    router.replace("/(auth)/login");
    // Stack register on top of login so "back" from register lands on login.
    setTimeout(() => router.push("/(auth)/register"), 0);
  }
  function next() {
    if (last) return explore();
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
              }}
            >
              <View style={{ alignItems: "center", gap: 30, width: "100%", ...(isTablet ? { maxWidth: 420 } : {}) }}>
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
          width: "100%",
          ...(isTablet ? { maxWidth: 420, alignSelf: "center" } : {}),
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
            <Button label="Explorar El Point" onPress={explore} iconTrailing="arrow-right" />
            <Button label="Crear cuenta" onPress={goRegister} variant="secondary" />
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
