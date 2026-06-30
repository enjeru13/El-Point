import { Icon } from '@/components/ui/Icon';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { NotificationsSheet, NotificationsHandle } from '@/components/ui/NotificationsSheet';
import { THEMES, THEME_META } from '@/lib/themes';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { AppLogo } from '@/components/ui/AppLogo';
import { supabase } from '@/lib/supabase';
import { StarRow } from '@/components/ui/StarRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionTitle } from '@/components/ui/SectionTitle';

// ─── Mock data ────────────────────────────────────────────────────────────────

const USER = {
  username: '@foodie_alex',
  rank: 'Comensal Experto',
  level: 42,
  xp: 3200,
  xpNext: 4000,
  xpNextRank: 'Crítico Local',
  totalReviews: 156,
  reviewPower: 9.8,
};


// ─── Componentes ──────────────────────────────────────────────────────────────

function XPBar({ xp, xpNext }: { xp: number; xpNext: number }) {
  const { C } = useTheme();
  const width = useRef(new Animated.Value(0)).current;
  const pct = xp / xpNext;

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 1000,
      delay: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={{ height: 12, borderRadius: 99, overflow: 'hidden', backgroundColor: C.primaryFixed }}>
      <Animated.View
        style={{
          height: '100%', borderRadius: 99, backgroundColor: C.primaryContainer,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { C, shadow, themeName } = useTheme();
  const router = useRouter();
  const notifsRef = useRef<NotificationsHandle>(null);

  const FAVORITES = [
    { id: '1', name: 'Neon Noodle Bar', category: 'Asian Fusion', rating: 4.9, icon: 'noodles' as const, bg: C.tertiaryContainer },
    { id: '2', name: 'Taco Stand',      category: 'Tacos',        rating: 4.7, icon: 'taco' as const,   bg: C.primaryFixed },
    { id: '3', name: 'Brew & Bake',     category: 'Café',         rating: 4.8, icon: 'coffee' as const, bg: C.secondaryContainer },
  ];

  const REVIEWS = [
    { id: '1', restaurant: 'Burger Joint', rating: 4, comment: '"Increíbles sabores. La salsa secreta es de otro mundo. Definitivamente mi nuevo spot favorito."', date: 'Hace 2 días', icon: 'hamburger' as const, iconBg: C.primaryFixed },
    { id: '2', restaurant: 'Green Bowl Oasis', rating: 5, comment: '"Perfecta comida post-entreno. Ingredientes súper frescos y servicio rápido incluso lleno."', date: 'Hace 1 semana', icon: 'leaf' as const, iconBg: C.secondaryContainer },
  ];

  const RANK_COLORS: Record<string, string> = {
    'Novato':              C.surfaceContainerHighest,
    'Explorador':          C.primaryFixed,
    'Comensal Experto':    C.primaryContainer,
    'Crítico Local':       C.secondary,
    'Gurú Gastronómico':   C.tertiary,
  };
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <ScreenHeader
        left={<AppLogo />}
        right={
          <Pressable onPress={() => notifsRef.current?.present()} style={{ width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.border, backgroundColor:C.surface }}>
            <Icon name="bell-outline" size={22} color={C.onSurface} />
            <View style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4, backgroundColor:C.primaryContainer, borderWidth:1.5, borderColor:C.surface }} />
          </Pressable>
        }
      />
      <NotificationsSheet ref={notifsRef} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={{ padding: 20, gap: 20 }}>

        {/* ── Card perfil ── */}
        <View
          style={{
            backgroundColor: C.surface, borderRadius: 28, padding: 24,
            alignItems: 'center', gap: 12,
            borderWidth: 2, borderColor: C.border,
            ...shadow.md,
          }}
        >
          {/* Avatar */}
          <View style={{ position: 'relative' }}>
            <View
              style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: C.primaryFixed,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: C.border,
              }}
            >
              <Icon name="account" size={48} color={C.primary} />
            </View>
            {/* Badge estrella */}
            <View
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: C.primaryContainer,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}
            >
              <Icon name="star" size={14} color={C.onPrimaryContainer} />
            </View>
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>
              {USER.username}
            </Text>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
              Amante de la comida picante y los rincones escondidos
            </Text>
          </View>

          <Pressable
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99,
              backgroundColor: C.primaryFixed,
              borderWidth: 2, borderColor: C.border,
              alignSelf: 'stretch', justifyContent: 'center',
            }}
          >
            <Icon name="pencil-outline" size={16} color={C.primary} />
            <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
              Editar perfil
            </Text>
          </Pressable>
        </View>

        {/* ── Gamificación ── */}
        <View
          style={{
            backgroundColor: C.surface, borderRadius: 28, padding: 20, gap: 12,
            borderWidth: 2, borderColor: C.border,
            ...shadow.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, letterSpacing: 1 }}>
                NIVEL ACTUAL
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: C.primary, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>
                  {USER.rank}
                </Text>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Icon name="fire" size={20} color={C.primaryContainer} />
                </Animated.View>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                backgroundColor: C.primaryFixed,
                borderWidth: 2, borderColor: C.border,
              }}
            >
              <Text style={{ color: C.primary, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                LVL {USER.level}
              </Text>
            </View>
          </View>

          <XPBar xp={USER.xp} xpNext={USER.xpNext} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
              {USER.xp.toLocaleString()} XP
            </Text>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
              {USER.xpNext.toLocaleString()} XP → {USER.xpNextRank}
            </Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { icon: 'medal' as const,      value: USER.totalReviews, label: 'Total Ranks',      color: C.primaryContainer },
            { icon: 'star-circle' as const, value: USER.reviewPower, label: 'Poder de Reseña', color: C.secondary },
          ].map(stat => (
            <View
              key={stat.label}
              style={{
                flex: 1, backgroundColor: C.surface, borderRadius: 24,
                padding: 20, alignItems: 'center', gap: 6,
                borderWidth: 2, borderColor: C.border,
                ...shadow.sm,
              }}
            >
              <Icon name={stat.icon} size={28} color={stat.color} />
              <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>
                {stat.value}
              </Text>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, textAlign: 'center' }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Favoritos ── */}
        <View style={{ gap: 12 }}>
          <SectionTitle icon="heart" label="Favoritos" />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Card grande */}
            <View
              style={{
                flex: 2, height: 180, borderRadius: 20,
                backgroundColor: FAVORITES[0].bg,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
                overflow: 'hidden',
                ...shadow.md,
              }}
            >
              <Icon name={FAVORITES[0].icon} size={64} color={C.onSurface} style={{ opacity: 0.4 }} />
              <View
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: 12, backgroundColor: 'rgba(28,27,27,0.55)',
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 15 }}>
                  {FAVORITES[0].name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name="star" size={12} color={C.secondaryContainer} />
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                    {FAVORITES[0].rating}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cards pequeñas */}
            <View style={{ flex: 1, gap: 10 }}>
              {FAVORITES.slice(1).map(fav => (
                <View
                  key={fav.id}
                  style={{
                    flex: 1, borderRadius: 16,
                    backgroundColor: fav.bg,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: C.border,
                    overflow: 'hidden',
                  }}
                >
                  <Icon name={fav.icon} size={28} color={C.onSurface} style={{ opacity: 0.4 }} />
                  <View
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: 8, backgroundColor: 'rgba(28,27,27,0.55)',
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }} numberOfLines={1}>
                      {fav.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Icon name="star" size={10} color={C.secondaryContainer} />
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                        {fav.rating}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Últimas reseñas ── */}
        <View style={{ gap: 12 }}>
          <SectionTitle icon="comment-text" label="Últimas Reseñas" />

          {REVIEWS.map(r => (
            <View
              key={r.id}
              style={{
                backgroundColor: C.surface, borderRadius: 20,
                padding: 16, flexDirection: 'row', gap: 14,
                borderWidth: 2, borderColor: C.border,
                ...shadow.sm,
              }}
            >
              <View
                style={{
                  width: 60, height: 60, borderRadius: 14,
                  backgroundColor: r.iconBg,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: C.border, flexShrink: 0,
                }}
              >
                <Icon name={r.icon} size={28} color={C.primary} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                    {r.restaurant}
                  </Text>
                  <StarRow rating={r.rating} />
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 20 }} numberOfLines={2}>
                  {r.comment}
                </Text>
                <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                  {r.date}
                </Text>
              </View>
            </View>
          ))}
        </View>



      </View>
      </ScrollView>
    </View>
  );
}
