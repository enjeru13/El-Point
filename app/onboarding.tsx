import { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
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

const SLIDES = [
  {
    icon: "map-marker",
    title: "Descubre dónde comer",
    body: "Explora los locales de San Cristóbal por categoría, cercanía o lo que está abierto ahora mismo.",
  },
  {
    icon: "fire",
    title: "Deja tu rank",
    body: "Califica con estrellas, sube fotos y cuenta cómo te fue. Ganas XP, subes de nivel y desbloqueas rangos.",
  },
  {
    icon: "heart",
    title: "Favoritos y promos",
    body: "Guarda tus lugares favoritos y recibe un aviso cuando publiquen una promoción.",
  },
];

const { width: W } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const last = page === SLIDES.length - 1;

  function finish() {
    markOnboardingSeen();
    router.replace("/(auth)/login");
  }

  function next() {
    if (last) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: W * (page + 1), animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const p = Math.round(e.nativeEvent.contentOffset.x / W);
    if (p !== page) setPage(p);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <AppLogo size="sm" />
        <Pressable onPress={finish} hitSlop={10}>
          <AppText variant="bodyStrong" color={C.outline}>
            Saltar
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View
            key={s.title}
            style={{
              width: W,
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 36,
              gap: 24,
            }}
          >
            <View
              style={{
                width: 132,
                height: 132,
                borderRadius: 40,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.primaryFixed,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Icon name={s.icon} size={64} color={C.primary} />
            </View>
            <View style={{ gap: 10, alignItems: "center" }}>
              <AppText
                variant="title"
                align="center"
                style={{ fontSize: 26, lineHeight: 32 }}
              >
                {s.title}
              </AppText>
              <AppText
                variant="body"
                color={C.onSurfaceVariant}
                align="center"
                style={{ lineHeight: 22, maxWidth: 300 }}
              >
                {s.body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 20,
          gap: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 22 : 8,
                height: 8,
                borderRadius: 99,
                backgroundColor: i === page ? C.primary : C.outlineVariant,
              }}
            />
          ))}
        </View>

        <Button
          label={last ? "Empezar" : "Siguiente"}
          onPress={next}
          iconTrailing={last ? "arrow-right" : undefined}
        />
      </View>
    </View>
  );
}
