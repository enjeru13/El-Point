import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");

const FOOD_ICONS: {
  name: string;
  size: number;
  top: number;
  left: number;
  rotation: number;
  opacity: number;
  duration: number;
  delay: number;
  floatY: number;
}[] = [
  {
    name: "pizza",
    size: 52,
    top: 0.04,
    left: 0.08,
    rotation: -15,
    opacity: 0.18,
    duration: 4200,
    delay: 0,
    floatY: 12,
  },
  {
    name: "hamburger",
    size: 64,
    top: 0.1,
    left: 0.72,
    rotation: 20,
    opacity: 0.15,
    duration: 5100,
    delay: 600,
    floatY: 16,
  },
  {
    name: "coffee",
    size: 44,
    top: 0.17,
    left: 0.4,
    rotation: 30,
    opacity: 0.13,
    duration: 3800,
    delay: 300,
    floatY: 10,
  },
  {
    name: "ice-cream",
    size: 48,
    top: 0.25,
    left: 0.88,
    rotation: -10,
    opacity: 0.16,
    duration: 4600,
    delay: 900,
    floatY: 14,
  },
  {
    name: "food-fork-drink",
    size: 56,
    top: 0.32,
    left: 0.04,
    rotation: 10,
    opacity: 0.14,
    duration: 5400,
    delay: 150,
    floatY: 18,
  },
  {
    name: "noodles",
    size: 50,
    top: 0.37,
    left: 0.6,
    rotation: -25,
    opacity: 0.17,
    duration: 4000,
    delay: 750,
    floatY: 12,
  },
  {
    name: "cake",
    size: 44,
    top: 0.45,
    left: 0.25,
    rotation: 45,
    opacity: 0.13,
    duration: 4900,
    delay: 400,
    floatY: 10,
  },
  {
    name: "beer",
    size: 52,
    top: 0.51,
    left: 0.8,
    rotation: -20,
    opacity: 0.15,
    duration: 3600,
    delay: 1100,
    floatY: 16,
  },
  {
    name: "cupcake",
    size: 48,
    top: 0.59,
    left: 0.12,
    rotation: 15,
    opacity: 0.16,
    duration: 5200,
    delay: 250,
    floatY: 14,
  },
  {
    name: "taco",
    size: 56,
    top: 0.64,
    left: 0.5,
    rotation: -30,
    opacity: 0.14,
    duration: 4400,
    delay: 850,
    floatY: 18,
  },
  {
    name: "food-apple",
    size: 44,
    top: 0.71,
    left: 0.75,
    rotation: 25,
    opacity: 0.13,
    duration: 3900,
    delay: 500,
    floatY: 10,
  },
  {
    name: "silverware-fork-knife",
    size: 48,
    top: 0.77,
    left: 0.35,
    rotation: -12,
    opacity: 0.15,
    duration: 4700,
    delay: 1300,
    floatY: 12,
  },
  {
    name: "cookie",
    size: 60,
    top: 0.83,
    left: 0.88,
    rotation: 18,
    opacity: 0.16,
    duration: 5000,
    delay: 700,
    floatY: 16,
  },
  {
    name: "fish",
    size: 44,
    top: 0.88,
    left: 0.04,
    rotation: -35,
    opacity: 0.14,
    duration: 4300,
    delay: 200,
    floatY: 14,
  },
  {
    name: "corn",
    size: 48,
    top: 0.93,
    left: 0.55,
    rotation: 40,
    opacity: 0.13,
    duration: 5300,
    delay: 950,
    floatY: 10,
  },
  {
    name: "pizza",
    size: 36,
    top: 0.07,
    left: 0.55,
    rotation: 50,
    opacity: 0.1,
    duration: 4100,
    delay: 1500,
    floatY: 8,
  },
  {
    name: "egg-fried",
    size: 44,
    top: 0.2,
    left: 0.18,
    rotation: -8,
    opacity: 0.13,
    duration: 4800,
    delay: 350,
    floatY: 12,
  },
  {
    name: "coffee-outline",
    size: 36,
    top: 0.95,
    left: 0.28,
    rotation: 22,
    opacity: 0.1,
    duration: 5100,
    delay: 650,
    floatY: 8,
  },
  {
    name: "hamburger",
    size: 40,
    top: 0.55,
    left: 0.42,
    rotation: -18,
    opacity: 0.1,
    duration: 4500,
    delay: 1200,
    floatY: 10,
  },
  {
    name: "food-variant",
    size: 40,
    top: 0.42,
    left: 0.78,
    rotation: 35,
    opacity: 0.12,
    duration: 3700,
    delay: 1050,
    floatY: 10,
  },
];

function FloatingIcon({ icon }: { icon: (typeof FOOD_ICONS)[0] }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -icon.floatY,
          duration: icon.duration,
          delay: icon.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: icon.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: icon.duration * 2.5,
          delay: icon.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: icon.duration * 2.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: icon.top * H,
        left: icon.left * W,
        opacity: icon.opacity,
        transform: [
          { translateY },
          {
            rotate: rotate.interpolate({
              inputRange: [0, 1],
              outputRange: [`${icon.rotation}deg`, `${icon.rotation + 15}deg`],
            }),
          },
        ],
      }}
    >
      <Icon name={icon.name} size={icon.size} color="#fff" />
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) alert(error.message);
    // _layout.tsx detecta session y redirige automáticamente
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: C.primary, paddingTop: insets.top }}
    >
      {/* Fondo animado */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {FOOD_ICONS.map((icon, i) => (
          <FloatingIcon key={i} icon={icon} />
        ))}
      </View>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(94,20,0,0.30)",
        }}
      />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <AppLogo size="lg" variant="dark" />
          <Text
            style={{
              color: "rgba(255,255,255,0.9)",
              fontFamily: "PlusJakartaSans_600SemiBold",
              fontSize: 15,
              letterSpacing: 2,
              marginTop: 4,
            }}
          >
            Donde está el sabor.
          </Text>
        </View>

        {/* Card neo-brutalist */}
        <View
          style={{
            width: "100%",
            borderRadius: 32,
            padding: 24,
            gap: 20,
            backgroundColor: C.surface,
            borderWidth: 2,
            borderColor: C.border,
            ...shadow.md,
          }}
        >
          <Field
            label="Correo electrónico"
            icon="email-outline"
            placeholder="hambriento@elpoint.app"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Field
            label="Contraseña"
            icon="lock-outline"
            placeholder="••••••••"
            secure
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={{ alignSelf: "flex-end", marginTop: -8 }}
          >
            <Text
              style={{
                color: C.primary,
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 15,
              }}
            >
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

          {/* Botón ingresar */}
          <Button
            label={loading ? "Ingresando…" : "Ingresar"}
            onPress={handleLogin}
            loading={loading}
            iconTrailing="arrow-right"
          />

          {/* Divisor */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }}
            />
            <Text
              style={{
                color: C.outline,
                fontSize: 15,
                fontFamily: "PlusJakartaSans_600SemiBold",
                letterSpacing: 1.5,
              }}
            >
              O CONTINÚA CON
            </Text>
            <View
              style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }}
            />
          </View>

          {/* Google */}
          <Button
            label="Continuar con Google"
            onPress={() => {}}
            variant="secondary"
            icon="google"
            iconColor="#EA4335"
          />

          {/* Registro */}
          <View
            style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}
          >
            <Text
              style={{
                color: C.onSurfaceVariant,
                fontSize: 15,
                fontFamily: "PlusJakartaSans_400Regular",
              }}
            >
              ¿No tienes cuenta?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text
                style={{
                  color: C.primary,
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 15,
                }}
              >
                Regístrate
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
