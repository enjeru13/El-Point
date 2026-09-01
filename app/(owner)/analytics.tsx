import { Icon } from '@/components/ui/Icon';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { FLOATING_NAV_H } from '@/lib/theme';
import { useMyRestaurant } from '@/lib/queries/owner';
import { useReviews } from '@/lib/queries/reviews';

const PERIODS = ['Semana', 'Mes', 'Año'] as const;
type Period = typeof PERIODS[number];

const DAY = 86400_000;

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const w = Math.floor(d / 7);
  if (w < 5) return `hace ${w} sem`;
  return `hace ${Math.floor(d / 30)} mes`;
}

function buildBars(dates: Date[], period: Period): { label: string; value: number }[] {
  const now = new Date();

  if (period === 'Semana') {
    const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start.getTime() + i * DAY);
      const next = new Date(day.getTime() + DAY);
      return {
        label: labels[day.getDay()],
        value: dates.filter(d => d >= day && d < next).length,
      };
    });
  }

  if (period === 'Mes') {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 27);
    return Array.from({ length: 4 }, (_, i) => {
      const wStart = new Date(start.getTime() + i * 7 * DAY);
      const wEnd = new Date(wStart.getTime() + 7 * DAY);
      return { label: `S${i + 1}`, value: dates.filter(d => d >= wStart && d < wEnd).length };
    });
  }

  // Año — últimos 12 meses
  const labels = ['E', 'F', 'M', 'A', 'My', 'J', 'Jl', 'A', 'S', 'O', 'N', 'D'];
  return Array.from({ length: 12 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 1);
    return { label: labels[m.getMonth()], value: dates.filter(d => d >= m && d < mEnd).length };
  });
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{
      flex: 1, padding: 14, borderRadius: 18,
      backgroundColor: C.surface, borderWidth: 2, borderColor: C.border,
      gap: 4, ...shadow.sm,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <AppText variant="heading" style={{ fontSize: 20, lineHeight: 24, marginTop: 4 }}>{value}</AppText>
      <AppText variant="caption" color={C.onSurfaceVariant}>{label}</AppText>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('Semana');

  const restaurantQ = useMyRestaurant();
  const restaurant = restaurantQ.data ?? null;
  const reviewsQ = useReviews(restaurant?.id ?? '');
  const reviews = reviewsQ.data ?? [];

  const dates = useMemo(() => reviews.map(r => new Date(r.created_at)), [reviews]);
  const bars = useMemo(() => buildBars(dates, period), [dates, period]);
  const maxVal = Math.max(1, ...bars.map(b => b.value));
  const BAR_H = 120;

  const periodDays = period === 'Semana' ? 7 : period === 'Mes' ? 28 : 365;
  const since = Date.now() - periodDays * DAY;
  const inPeriod = reviews.filter(r => new Date(r.created_at).getTime() >= since).length;
  const lastReview = reviews[0]?.created_at;

  const dist = [5, 4, 3, 2, 1].map(s => reviews.filter(r => r.rating === s).length);
  const total = reviews.length;

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 20 }}>
        <Skeleton width={140} height={24} />
        <Skeleton height={48} radius={20} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton height={90} radius={18} style={{ flex: 1 }} />
          <Skeleton height={90} radius={18} style={{ flex: 1 }} />
        </View>
        <Skeleton height={180} radius={22} />
        <Skeleton height={200} radius={22} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Icon name="analytics" size={44} color={C.outline} />
        <AppText variant="heading" align="center" style={{ fontSize: 16 }}>
          No hay un local registrado
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20 }}>
        <AppText variant="title">Métricas</AppText>
        <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 2 }}>{restaurant.name}</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: FLOATING_NAV_H + 20, gap: 20 }}>

        {/* Period selector */}
        <View style={{ flexDirection: 'row', gap: 8, padding: 4, borderRadius: 20, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.border }}>
          {PERIODS.map(p => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center',
                backgroundColor: period === p ? C.primary : 'transparent',
                borderWidth: period === p ? 2 : 0,
                borderColor: C.border,
              }}
            >
              <AppText variant="bodyStrong" color={period === p ? '#fff' : C.onSurfaceVariant} style={{ fontSize: 14 }}>{p}</AppText>
            </Pressable>
          ))}
        </View>

        {/* Metric cards */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard icon="star"         label="Calificación"  value={restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–'} color={C.primary} />
          <MetricCard icon="comment-text" label="Total reseñas" value={String(restaurant.rating_count)} color={C.secondary} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard icon="trending-up"   label={`Reseñas (${period.toLowerCase()})`} value={String(inPeriod)} color={C.tertiary} />
          <MetricCard icon="clock-outline" label="Última reseña" value={lastReview ? timeAgo(lastReview) : '—'} color={C.primary} />
        </View>

        {/* Bar chart - reseñas */}
        <View style={{ padding: 18, borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, gap: 16, ...shadow.sm }}>
          <AppText variant="bodyStrong">Reseñas por período</AppText>
          {total === 0 ? (
            <AppText variant="bodySm" color={C.outline}>Aún no hay datos.</AppText>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_H + 24 }}>
              {bars.map((b, i) => {
                const h = b.value === 0 ? 4 : Math.max(8, (b.value / maxVal) * BAR_H);
                const isLast = i === bars.length - 1;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <AppText variant="caption" color={C.onSurfaceVariant} style={{ fontSize: 10 }}>{b.value}</AppText>
                    <View style={{
                      width: '100%', height: h, borderRadius: 8,
                      backgroundColor: b.value === 0 ? C.surfaceContainerHighest : isLast ? C.primary : C.primaryFixed,
                      borderWidth: 1.5, borderColor: C.border,
                    }} />
                    <AppText variant="caption" color={C.outline} style={{ fontSize: 10 }}>{b.label}</AppText>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Distribución de estrellas */}
        <View style={{ padding: 18, borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, gap: 14, ...shadow.sm }}>
          <AppText variant="bodyStrong">Distribución de estrellas</AppText>
          {total === 0 ? (
            <AppText variant="bodySm" color={C.outline}>Aún no hay reseñas.</AppText>
          ) : (
            [5, 4, 3, 2, 1].map((star, idx) => {
              const count = dist[idx];
              const pct = Math.round((count / total) * 100);
              return (
                <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 2, width: 68 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Icon key={s} name="star" size={11} color={s <= star ? C.primary : C.outlineVariant} fill={s <= star ? C.primary : 'none'} />
                    ))}
                  </View>
                  <View style={{ flex: 1, height: 10, borderRadius: 99, overflow: 'hidden', backgroundColor: C.surfaceContainerHighest }}>
                    <View style={{ height: '100%', width: `${pct}%`, borderRadius: 99, backgroundColor: star >= 4 ? C.primary : star === 3 ? C.secondary : C.error }} />
                  </View>
                  <AppText variant="caption" color={C.onSurfaceVariant} align="right" style={{ fontSize: 12, width: 44 }}>{count} · {pct}%</AppText>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </View>
  );
}
