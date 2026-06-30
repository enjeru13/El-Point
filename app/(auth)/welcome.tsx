import { Icon } from '@/components/ui/Icon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const CONFETTI_COUNT = 36;

function ConfettiParticle({ x, color, size, delay, duration, rotation }: {
  x: number; color: string; size: number; delay: number; duration: number; rotation: number;
}) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      translateY.setValue(-20);
      rotate.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: H + 20, duration, delay, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotate,     { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.85, duration: 200, delay, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 400, delay: delay + duration - 400, useNativeDriver: true }),
        ]),
      ]).start(() => run());
    };
    run();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: 0,
        width: size, height: size, borderRadius: 2,
        backgroundColor: color, opacity,
        transform: [
          { translateY },
          { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: [`${rotation}deg`, `${rotation + 360}deg`] }) },
        ],
      }}
    />
  );
}

export default function WelcomeScreen() {
  const { C, shadow } = useTheme();
  const router  = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isOwner = role === 'owner';

  const confetti = useMemo(() => {
    const colors = [C.primary, C.primaryContainer, '#ffd167', C.secondary, C.primaryFixedDim, C.tertiaryContainer];
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * W,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 2000,
      duration: 3000 + Math.random() * 2000,
      rotation: Math.random() * 360,
    }));
  }, [C.primary]);

  const floatY  = useRef(new Animated.Value(0)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const xpWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -14, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 700, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    Animated.timing(xpWidth, { toValue: 0.25, duration: 1200, delay: 800, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        {confetti.map(p => <ConfettiParticle key={p.id} {...p} />)}
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: isOwner ? 3 : 4 }).map((_, i, arr) => (
            <View key={i} style={{ height: 6, borderRadius: 99, width: 48, backgroundColor: i === arr.length - 1 ? C.primary : C.primaryFixed }} />
          ))}
        </View>

        <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ translateY: floatY }] }}>
          <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: isOwner ? C.secondary : C.primary, opacity: 0.08, transform: [{ scaleX: 1.3 }] }} />
          <View style={{ width: 224, height: 224, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: isOwner ? C.secondaryContainer : C.primaryFixed, borderWidth: 2, borderColor: C.border, ...shadow.lg }}>
            <Icon name={isOwner ? 'storefront' : 'silverware-fork-knife'} size={80} color={isOwner ? C.secondary : C.primary} />
          </View>
          <View style={{ position: 'absolute', bottom: -16, right: -16, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: isOwner ? C.primaryFixed : C.secondaryContainer, borderWidth: 2, borderColor: C.border, ...shadow.md }}>
            <Icon name={isOwner ? 'fire' : 'food-fork-drink'} size={30} color={isOwner ? C.primary : C.secondary} />
          </View>
        </Animated.View>

        <Animated.View style={{ alignItems: 'center', gap: 12, opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <Text style={{ color: C.primary, fontFamily: 'Outfit_800ExtraBold', fontSize: 32, lineHeight: 38, textAlign: 'center' }}>
            {isOwner ? '¡Tu local está en El Point!' : '¡Bienvenido a El Point!'}
          </Text>
          <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, textAlign: 'center', lineHeight: 24, maxWidth: 280 }}>
            {isOwner
              ? 'Tu restaurante ya está visible. Empieza a recibir reseñas y conectar con tu comunidad.'
              : <><Text>Todo listo, </Text><Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: C.onSurface }}>Comensal</Text><Text>. Los mejores sabores de tu barrio te esperan.</Text></>
            }
          </Text>
        </Animated.View>

        <Animated.View style={{ width: '100%', padding: 20, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.border, ...shadow.md, opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: isOwner ? C.primaryFixed : C.secondaryContainer, borderWidth: 2, borderColor: C.border }}>
            <Icon name={isOwner ? 'chart-line' : 'star'} size={24} color={isOwner ? C.primary : C.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, marginBottom: 6 }}>
              {isOwner ? 'Rango: Local Nuevo 🏪' : 'Nivel 1 · Novato'}
            </Text>
            <View style={{ height: 10, borderRadius: 99, overflow: 'hidden', backgroundColor: isOwner ? C.primaryFixed : C.secondaryContainer }}>
              <Animated.View style={{ height: '100%', borderRadius: 99, backgroundColor: isOwner ? C.primary : C.secondary, width: xpWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            </View>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, marginTop: 4 }}>
              {isOwner ? '¡Consigue tu primera reseña para subir de rango!' : '¡Haz tu primera reseña para subir de nivel!'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={{ width: '100%', gap: 12, opacity: fadeIn }}>
          <Pressable
            onPress={() => router.replace(isOwner ? '/(owner)' : '/(customer)')}
            style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: C.primary, borderWidth: 2, borderColor: C.border, ...shadow.primary }}
          >
            <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
              {isOwner ? 'Ver mi panel' : 'Explorar ahora'}
            </Text>
            <Icon name={isOwner ? 'view-dashboard' : 'arrow-right'} size={20} color="#fff" />
          </Pressable>
          <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, textAlign: 'center' }}>
            {isOwner ? '¿Listo para recibir a tus primeros clientes?' : '¿Listo para encontrar tu nuevo lugar favorito?'}
          </Text>
        </Animated.View>

      </View>
    </View>
  );
}
