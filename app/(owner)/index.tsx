import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { useMyRestaurant } from '@/lib/queries/owner';
import { useReviews, type Review } from '@/lib/queries/reviews';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';

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
      borderWidth: 1, borderColor: C.border,
      gap: 6, ...shadow.sm,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }}>{value}</AppText>
      <AppText variant="caption" color={C.onSurfaceVariant} style={{ fontSize: 12 }}>{label}</AppText>
    </View>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{
      padding: 14, borderRadius: 18,
      backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.border,
      gap: 8, ...shadow.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar uri={review.author?.avatar_url} size={36} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" style={{ fontSize: 14 }}>{authorLabel(review.author)}</AppText>
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Icon key={s} name="star" size={11} color={s <= review.rating ? C.primary : C.outlineVariant} fill={s <= review.rating ? C.primary : 'none'} />
            ))}
          </View>
        </View>
        <AppText variant="caption" color={C.outline} style={{ fontSize: 12 }}>{timeAgo(review.created_at)}</AppText>
      </View>
      <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={3}>
        {review.body}
      </AppText>
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
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([restaurantQ.refetch(), reviewsQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const reviewsToday = reviews.filter(r => new Date(r.created_at) >= startOfToday).length;

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton width={44} height={44} radius={22} />
          <View style={{ gap: 6 }}>
            <Skeleton width={80} height={13} />
            <Skeleton width={160} height={22} />
          </View>
        </View>
        <Skeleton height={80} radius={20} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton height={92} radius={18} style={{ flex: 1 }} />
          <Skeleton height={92} radius={18} style={{ flex: 1 }} />
          <Skeleton height={92} radius={18} style={{ flex: 1 }} />
        </View>
        <SkeletonList count={2} kind="row" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center' }}>
        <EmptyState
          icon="store-outline"
          title="No encontramos tu local"
          body="Puede ser un problema de conexión. Vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={() => restaurantQ.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 10, paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <Avatar uri={restaurant.logo_url ?? restaurant.cover_url} size={44} icon={restaurant.categories[0]?.icon ?? 'store-outline'} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={C.onSurfaceVariant}>Bienvenido</AppText>
          <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }} numberOfLines={1}>{restaurant.name}</AppText>
        </View>
        <NotificationBell />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        }
      >

        {/* Banner de verificación (mientras no esté aprobado) */}
        {restaurant.status !== 'approved' && (() => {
          const map = {
            pending: {
              icon: 'clock-outline',
              bg: C.tertiaryContainer,
              title: 'Local en revisión',
              body: 'Te avisaremos cuando lo aprobemos. Suele tardar menos de 24 h.',
              cta: 'Ver perfil',
            },
            rejected: {
              icon: 'close-circle',
              bg: C.error + '22',
              title: 'Local no aprobado',
              body: restaurant.status_reason ?? 'Revisa los datos y vuelve a enviarlo.',
              cta: 'Corregir y reenviar',
            },
            suspended: {
              icon: 'shield-alert-outline',
              bg: C.error + '22',
              title: 'Local suspendido',
              body: restaurant.status_reason ?? 'Escríbenos para resolverlo.',
              cta: 'Ver perfil',
            },
          }[restaurant.status];
          return (
            <View style={{
              borderRadius: 22, backgroundColor: map.bg,
              borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: C.border,
                }}>
                  <Icon name={map.icon} size={24} color={C.onSurface} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyStrong">{map.title}</AppText>
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>{map.body}</AppText>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/(owner)/profile')}
                android_ripple={{ color: C.outlineVariant }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 12, borderTopWidth: 2, borderTopColor: C.border,
                }}
              >
                <Icon name="cog-outline" size={16} color={C.onSurface} />
                <AppText variant="label">{map.cta}</AppText>
              </Pressable>
            </View>
          );
        })()}

        {/* Banner estado (solo si el local ya está aprobado) */}
        {restaurant.status === 'approved' && (
        <View style={{
          borderRadius: 22,
          backgroundColor: restaurant.is_active ? C.primaryFixed : C.surfaceContainerHighest,
          borderWidth: 1, borderColor: C.border,
          overflow: 'hidden',
          ...shadow.sm,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: restaurant.is_active ? C.primary : C.outline,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: C.border,
            }}>
              <Icon name={restaurant.is_active ? 'store-outline' : 'eye-off-outline'} size={24} color="#fff" />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong">
                {restaurant.is_active ? 'Local visible' : 'Local oculto'}
              </AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant}>
                {restaurant.is_active
                  ? 'Visible en mapa y búsquedas'
                  : 'No aparece para los comensales'}
              </AppText>
            </View>

            <View style={{
              paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99,
              backgroundColor: restaurant.is_active ? C.secondaryContainer : C.surface,
              borderWidth: 1, borderColor: C.border,
            }}>
              <AppText variant="caption" color={restaurant.is_active ? C.onSurface : C.outline}>
                {restaurant.is_active ? 'ACTIVO' : 'PAUSADO'}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(owner)/profile')}
            android_ripple={{ color: C.outlineVariant }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              borderTopWidth: 2,
              borderTopColor: C.border,
            }}
          >
            <Icon name="cog-outline" size={16} color={C.onSurface} />
            <AppText variant="label">
              {restaurant.is_active ? 'Pausar o editar en Perfil' : 'Activar en Perfil'}
            </AppText>
          </Pressable>
        </View>
        )}

        {/* Promo activa */}
        {restaurant.promo_text && (
          <View style={{
            padding: 14, borderRadius: 16, gap: 4,
            backgroundColor: C.primary + '1f',
            borderWidth: 1, borderColor: C.primary + '40',
            borderLeftWidth: 6, borderLeftColor: C.primary,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="tag" size={14} color={C.primary} />
              <AppText variant="overline" color={C.primary}>PROMO ACTIVA</AppText>
            </View>
            <AppText variant="bodyStrong" style={{ fontSize: 15 }} numberOfLines={2}>
              {restaurant.promo_text}
            </AppText>
          </View>
        )}

        {/* Stats */}
        <View style={{ gap: 8 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>Resumen</AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="star"         label="Calificación"   value={restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–'} color={C.primary} />
            <StatCard icon="comment-text" label="Reseñas hoy"    value={String(reviewsToday)} color={C.secondary} />
            <StatCard icon="trophy-outline" label="Total reseñas" value={String(restaurant.rating_count)} color={C.tertiary} />
          </View>
        </View>

        {/* Reseñas recientes */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="heading" style={{ fontSize: 17 }}>Reseñas recientes</AppText>
            {reviews.length > 5 && (
              <Pressable onPress={() => router.push(`/restaurant/${restaurant.id}`)} hitSlop={8}>
                <AppText variant="label" color={C.primary}>Ver todas</AppText>
              </Pressable>
            )}
          </View>
          {reviewsQ.isLoading ? (
            <SkeletonList count={3} kind="row" />
          ) : reviews.length === 0 ? (
            <EmptyState
              icon="comment-text-multiple"
              title="Aún no tienes reseñas"
              body="Comparte tu local para recibir las primeras."
            />
          ) : (
            reviews.slice(0, 5).map(r => <ReviewRow key={r.id} review={r} />)
          )}
        </View>

      </ScrollView>
    </View>
  );
}
