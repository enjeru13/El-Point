import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { FLOATING_NAV_H } from '@/lib/theme';
import { useMyRestaurant } from '@/lib/queries/owner';
import { useReviews, type Review } from '@/lib/queries/reviews';
import { NotificationBell } from '@/components/ui/NotificationBell';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const w = Math.floor(d / 7);
  return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`;
}

function authorLabel(a: Review['author']): string {
  return a?.username ? `@${a.username}` : a?.full_name ?? 'Anónimo';
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{
      flex: 1, padding: 16, borderRadius: 20,
      backgroundColor: C.surface,
      borderWidth: 2, borderColor: C.border,
      gap: 6, ...shadow.sm,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>{value}</Text>
      <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{
      padding: 14, borderRadius: 18,
      backgroundColor: C.surface,
      borderWidth: 2, borderColor: C.border,
      gap: 8, ...shadow.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
          <Icon name="account" size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>{authorLabel(review.author)}</Text>
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Icon key={s} name="star" size={11} color={s <= review.rating ? C.primary : C.outlineVariant} fill={s <= review.rating ? C.primary : 'none'} />
            ))}
          </View>
        </View>
        <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12 }}>{timeAgo(review.created_at)}</Text>
      </View>
      <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 19 }} numberOfLines={3}>
        {review.body}
      </Text>
    </View>
  );
}

export default function OwnerHomeScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const restaurantQ = useMyRestaurant();
  const restaurant = restaurantQ.data ?? null;
  const reviewsQ = useReviews(restaurant?.id ?? '');
  const reviews = reviewsQ.data ?? [];

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const reviewsToday = reviews.filter(r => new Date(r.created_at) >= startOfToday).length;

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Icon name="store-outline" size={48} color={C.outline} />
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 18, textAlign: 'center' }}>
          Todavía no tienes un local registrado
        </Text>
        <Pressable
          onPress={() => restaurantQ.refetch()}
          style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border }}
        >
          <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 10, paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>Bienvenido</Text>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }} numberOfLines={1}>{restaurant.name}</Text>
        </View>
        <NotificationBell />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: FLOATING_NAV_H + 20, gap: 20 }}
      >

        {/* Banner estado */}
        <View style={{
          padding: 16, borderRadius: 20,
          backgroundColor: restaurant.is_active ? C.primaryFixed : C.surfaceContainerHighest,
          borderWidth: 2, borderColor: C.border,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          ...shadow.sm,
        }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: restaurant.is_active ? C.primary : C.outline, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
            <Icon name="store-outline" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
              {restaurant.is_active ? 'Tu local está activo' : 'Tu local está oculto'}
            </Text>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 2 }}>
              {restaurant.is_active ? 'Visible para todos los comensales' : 'No aparece en el mapa ni en búsquedas'}
            </Text>
          </View>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: restaurant.is_active ? '#22c55e' : C.outline, borderWidth: 2, borderColor: C.border }} />
        </View>

        {/* Promo activa */}
        {restaurant.promo_text && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            padding: 14, borderRadius: 16,
            backgroundColor: C.primaryContainer,
            borderWidth: 2, borderColor: C.border, borderLeftWidth: 6,
          }}>
            <Icon name="tag" size={18} color={C.onSurface} />
            <Text style={{ flex: 1, color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }} numberOfLines={2}>
              {restaurant.promo_text}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Resumen</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="star"         label="Calificación"   value={restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–'} color={C.primary} />
            <StatCard icon="comment-text" label="Reseñas hoy"    value={String(reviewsToday)} color={C.secondary} />
            <StatCard icon="trophy-outline" label="Total reseñas" value={String(restaurant.rating_count)} color={C.tertiary} />
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Acciones rápidas</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { icon: 'pencil-outline', label: 'Editar perfil', onPress: () => router.push('/(owner)/profile') },
              { icon: 'analytics',      label: 'Métricas',      onPress: () => router.push('/(owner)/analytics') },
              { icon: 'store-outline',  label: 'Ver local',     onPress: () => router.push(`/restaurant/${restaurant.id}`) },
            ].map(a => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                style={({ pressed }) => ({
                  flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 16, borderRadius: 18,
                  backgroundColor: C.surfaceContainerLow,
                  borderWidth: 2, borderColor: C.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name={a.icon} size={22} color={C.primary} />
                <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, textAlign: 'center' }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reseñas recientes */}
        <View style={{ gap: 12 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Reseñas recientes</Text>
          {reviewsQ.isLoading ? (
            <View style={{ paddingVertical: 24 }}><ActivityIndicator color={C.primary} /></View>
          ) : reviews.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Icon name="comment-text-multiple" size={32} color={C.outlineVariant} />
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, textAlign: 'center' }}>
                Aún no tienes reseñas. Comparte tu local para recibir las primeras.
              </Text>
            </View>
          ) : (
            reviews.slice(0, 5).map(r => <ReviewRow key={r.id} review={r} />)
          )}
        </View>

      </ScrollView>
    </View>
  );
}
