import { Icon } from '@/components/ui/Icon';
import { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMyRestaurant } from '@/lib/queries/owner';
import { useReviews } from '@/lib/queries/reviews';
import { useRestaurantDaily } from '@/lib/queries/analytics';
import { hasPlan } from '@/lib/plan';
import { PlanLock } from '@/components/ui/PlanLock';
import { useRouter } from 'expo-router';
import { TourGuide, type TourStep } from '@/components/tour/TourGuide';
import { capWidth, useIsTablet } from '@/lib/responsive';
import {
  CHANNELS, CONTACT_KEYS, PERIODS, bestWeekdays, caracasDay, insightText, lastDays,
  pctChange, summarize, sumKeys, toBars, type Bar,
} from '@/lib/metrics';

/** Variación contra el periodo anterior. Sin base de comparación no se muestra nada. */
function Delta({ now, before, show }: { now: number; before: number; show: boolean }) {
  const { C } = useTheme();
  if (!show || (now === 0 && before === 0)) return <View style={{ height: 16 }} />;
  if (before === 0) {
    return <AppText variant="caption" color={C.primary} style={{ fontSize: 12, fontWeight: '700' }}>Nuevo</AppText>;
  }
  const pct = pctChange(now, before) ?? 0;
  if (pct === 0) return <AppText variant="caption" color={C.outline} style={{ fontSize: 12 }}>Igual</AppText>;
  const up = pct > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Icon name={up ? 'arrow-up' : 'arrow-down'} size={12} color={up ? C.primary : C.error} />
      <AppText variant="caption" color={up ? C.primary : C.error} style={{ fontSize: 12, fontWeight: '700' }}>{Math.abs(pct)}%</AppText>
    </View>
  );
}

function Kpi({ icon, label, value, children }: { icon: string; label: string; value: string; children?: React.ReactNode }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, gap: 6, ...shadow.sm }}>
      <Icon name={icon} size={18} color={C.primary} />
      <AppText variant="title" style={{ fontSize: 28, lineHeight: 32 }} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
      <AppText variant="caption" color={C.onSurfaceVariant} numberOfLines={2}>{label}</AppText>
      {children}
    </View>
  );
}

function BarChart({ bars, height = 110 }: { bars: Bar[]; height?: number }) {
  const { C } = useTheme();
  const max = Math.max(1, ...bars.map(b => b.value));
  const dense = bars.length > 14;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: dense ? 3 : 6, height: height + 40, marginTop: 14 }}>
      {bars.map((b, i) => {
        const h = b.value === 0 ? 3 : Math.max(8, (b.value / max) * height);
        const isLast = i === bars.length - 1;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            {!dense && (
              <AppText variant="caption" color={b.value === 0 ? C.outlineVariant : C.onSurfaceVariant} style={{ fontSize: 10 }}>{b.value}</AppText>
            )}
            <View style={{
              width: '100%', height: h, borderTopLeftRadius: 5, borderTopRightRadius: 5,
              borderBottomLeftRadius: b.value === 0 ? 5 : 0, borderBottomRightRadius: b.value === 0 ? 5 : 0,
              backgroundColor: b.value === 0 ? C.surfaceContainerHighest : isLast ? C.primary : C.primaryFixedDim,
            }} />
            <View style={{ height: 14, width: 40, alignItems: 'center' }}>
              <AppText variant="caption" color={isLast ? C.primary : C.outline} style={{ fontSize: 10 }} numberOfLines={1}>{b.label}</AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{ padding: 18, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, gap: 2, ...shadow.sm }}>
      <AppText variant="heading" style={{ fontSize: 17 }}>{title}</AppText>
      {subtitle ? <AppText variant="caption" color={C.outline}>{subtitle}</AppText> : null}
      {children}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const router = useRouter();
  const [days, setDays] = useState<number>(7);
  const [refreshing, setRefreshing] = useState(false);

  // Coach-mark targets for the first-use tour.
  const tourPeriodRef  = useRef<View>(null);
  const tourMetricsRef = useRef<View>(null);
  const tourChartRef   = useRef<View>(null);
  const scrollRef      = useRef<ScrollView>(null);
  const scrollY        = useRef(0);
  const tourSteps: TourStep[] = [
    { ref: tourPeriodRef, icon: 'calendar-range', title: 'Cambia el período', text: 'Mira tus números de los últimos 7, 30 o 90 días.' },
    { ref: tourMetricsRef, icon: 'chart-box-outline', title: 'Lo que importa', text: 'Visitas, contactos y calificación, comparados con el período anterior.' },
    { ref: tourChartRef, icon: 'chart-bar', title: 'Tus mejores días', text: 'Ve qué días te visitan más para planificar promos y platos del día.' },
  ];

  const restaurantQ = useMyRestaurant();
  const restaurant = restaurantQ.data ?? null;
  const reviewsQ = useReviews(restaurant?.id ?? '');
  const reviews = useMemo(() => reviewsQ.data ?? [], [reviewsQ.data]);
  const dailyQ = useRestaurantDaily(restaurant?.id, days);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([restaurantQ.refetch(), reviewsQ.refetch(), dailyQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const plan = restaurant ? hasPlan(restaurant) : false;
  const summary = useMemo(() => summarize(dailyQ.data ?? [], days), [dailyQ.data, days]);
  const visits = summary.current.view ?? 0;
  const prevVisits = summary.previous.view ?? 0;
  const contacts = sumKeys(summary.current, CONTACT_KEYS);
  const prevContacts = sumKeys(summary.previous, CONTACT_KEYS);
  const blocked = summary.current.blocked ?? 0;
  const prevBlocked = summary.previous.blocked ?? 0;
  const best = useMemo(() => bestWeekdays(summary.visitsPerDay), [summary]);
  const visitBars = useMemo(() => toBars(summary.visitsPerDay), [summary]);

  const channels = CHANNELS
    .map(c => ({ ...c, value: summary.current[c.key] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const channelMax = Math.max(1, ...channels.map(c => c.value));
  const per100 = visits > 0 ? Math.round((contacts / visits) * 100) : 0;

  // Reseñas del periodo (por fecha en Caracas).
  const periodDays = useMemo(() => lastDays(days), [days]);
  const periodReviews = useMemo(() => {
    const set = new Set(periodDays);
    return reviews.filter(r => set.has(caracasDay(new Date(r.created_at))));
  }, [reviews, periodDays]);
  const reviewBars = useMemo(() => {
    const per = new Map<string, number>();
    for (const r of periodReviews) {
      const d = caracasDay(new Date(r.created_at));
      per.set(d, (per.get(d) ?? 0) + 1);
    }
    return toBars(periodDays.map(day => ({ day, value: per.get(day) ?? 0 })));
  }, [periodReviews, periodDays]);
  const total = periodReviews.length;
  const dist = [5, 4, 3, 2, 1].map(s => periodReviews.filter(r => r.rating === s).length);
  const ratingValue = restaurant && restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–';
  const periodText = days === 7 ? 'últimos 7 días' : `últimos ${days} días`;

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 20 }}>
        <Skeleton width={140} height={24} />
        <Skeleton height={48} radius={20} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton height={110} radius={18} style={{ flex: 1 }} />
          <Skeleton height={110} radius={18} style={{ flex: 1 }} />
          <Skeleton height={110} radius={18} style={{ flex: 1 }} />
        </View>
        <Skeleton height={180} radius={22} />
        <Skeleton height={200} radius={22} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center' }}>
        <EmptyState
          icon="analytics"
          title="Sin métricas todavía"
          body="No encontramos un local en tu cuenta. Si crees que es un error, escríbenos."
          actionLabel="Reintentar"
          onAction={() => restaurantQ.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20 }}>
        <AppText variant="title">Métricas</AppText>
        <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 2 }}>{restaurant.name}</AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 20, ...capWidth(isTablet) }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        }
      >

        {/* Period selector */}
        <View ref={tourPeriodRef} collapsable={false} style={{ flexDirection: 'row', gap: 6, padding: 4, borderRadius: 20, backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.border }}>
          {PERIODS.map(p => (
            <Pressable
              key={p}
              onPress={() => setDays(p)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 15, alignItems: 'center',
                backgroundColor: days === p ? C.primary : 'transparent',
                borderWidth: 1,
                borderColor: days === p ? C.border : 'transparent',
              }}
            >
              <AppText variant="bodyStrong" color={days === p ? '#fff' : C.onSurfaceVariant} style={{ fontSize: 14 }}>{p} días</AppText>
            </Pressable>
          ))}
        </View>

        {/* KPIs */}
        <View ref={tourMetricsRef} collapsable={false} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Kpi icon="eye-outline" label="Visitas" value={String(visits)}>
              <Delta now={visits} before={prevVisits} show={summary.hasPrevious} />
            </Kpi>
            {plan ? (
              <Kpi icon="message-text-outline" label="Contactos" value={String(contacts)}>
                <Delta now={contacts} before={prevContacts} show={summary.hasPrevious} />
              </Kpi>
            ) : (
              <Kpi icon="lock-outline" label="Quisieron contactarte" value={String(blocked)}>
                <Delta now={blocked} before={prevBlocked} show={summary.hasPrevious} />
              </Kpi>
            )}
            <Kpi icon="star" label={restaurant.rating_count === 1 ? '1 reseña' : `${restaurant.rating_count} reseñas`} value={ratingValue} />
          </View>

          {plan && (
            <AppText variant="body" color={C.onSurfaceVariant}>
              {insightText(days, visits, contacts, best)}
            </AppText>
          )}
        </View>

        {/* Sin plan: solo el gancho */}
        {!plan && (
          <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <PlanLock
              compact
              title="El detalle va con el plan"
              body={blocked > 0
                ? `${blocked} ${blocked === 1 ? 'persona quiso' : 'personas quisieron'} escribirte o llamarte y no pudieron. Con el plan, tu contacto queda visible y ves cuántos te contactan, por qué canal y tus mejores días.`
                : 'Con el plan ves quién toca WhatsApp, llamar, cómo llegar, Instagram y menú, y tus mejores días.'}
              onPress={() => router.push('/subscription' as any)}
            />
          </View>
        )}

        {plan && (
          <>
            {/* Visitas por día */}
            <View ref={tourChartRef} collapsable={false}>
              <Card
                title="Visitas"
                subtitle={days > 31 ? `Por semana · ${periodText}` : `Por día · ${periodText}`}
              >
                {visits === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
                    <Icon name="analytics" size={28} color={C.outlineVariant} />
                    <AppText variant="bodySm" color={C.outline}>Sin visitas en este período.</AppText>
                  </View>
                ) : (
                  <BarChart bars={visitBars} />
                )}
              </Card>
            </View>

            {/* Cómo te contactan */}
            <Card title="Cómo te contactan" subtitle={`Toques en tu perfil · ${periodText}`}>
              <View style={{ gap: 14, marginTop: 12 }}>
                {channels.map(c => (
                  <View key={c.key} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Icon name={c.icon} size={16} color={c.value > 0 ? C.primary : C.outlineVariant} />
                      <AppText variant="body" style={{ flex: 1 }} color={c.value > 0 ? C.onSurface : C.outline}>{c.label}</AppText>
                      <AppText variant="bodyStrong" color={c.value > 0 ? C.onSurface : C.outline}>{c.value}</AppText>
                    </View>
                    <View style={{ height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: C.surfaceContainerHighest }}>
                      <View style={{ height: '100%', width: `${Math.round((c.value / channelMax) * 100)}%`, borderRadius: 99, backgroundColor: C.primary }} />
                    </View>
                  </View>
                ))}
              </View>
              {visits > 0 && (
                <AppText variant="caption" color={C.onSurfaceVariant} style={{ marginTop: 14 }}>
                  {contacts === 0
                    ? 'Nadie te ha contactado todavía en este período.'
                    : `De cada 100 visitas, ${per100} terminan en un contacto (WhatsApp, llamada, Instagram o pedido).`}
                </AppText>
              )}
              <AppText variant="caption" color={C.outline} style={{ marginTop: 6 }}>
                Se cuenta desde que se activó esta función.
              </AppText>
            </Card>
          </>
        )}

        {/* Reseñas */}
        <Card title="Reseñas" subtitle={`${total} ${total === 1 ? 'reseña' : 'reseñas'} · ${periodText}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <AppText variant="title" style={{ fontSize: 40, lineHeight: 44 }}>{ratingValue}</AppText>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Icon key={s} name="star" size={16} color={s <= Math.round(restaurant.rating_avg) && restaurant.rating_count > 0 ? C.primary : C.outlineVariant} fill={s <= Math.round(restaurant.rating_avg) && restaurant.rating_count > 0 ? C.primary : 'none'} />
                ))}
              </View>
              <AppText variant="caption" color={C.onSurfaceVariant}>
                {restaurant.rating_count} {restaurant.rating_count === 1 ? 'reseña en total' : 'reseñas en total'}
              </AppText>
            </View>
          </View>

          {total === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
              <Icon name="star-outline" size={28} color={C.outlineVariant} />
              <AppText variant="bodySm" color={C.outline}>Sin reseñas en este período.</AppText>
            </View>
          ) : (
            <>
              <View style={{ gap: 12, marginTop: 16 }}>
                {[5, 4, 3, 2, 1].map((star, idx) => {
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
                })}
              </View>
              <AppText variant="caption" color={C.outline} style={{ marginTop: 18 }}>
                {days > 31 ? 'Reseñas por semana' : 'Reseñas por día'}
              </AppText>
              <BarChart bars={reviewBars} height={70} />
            </>
          )}
        </Card>

      </ScrollView>

      <TourGuide tourKey="owner_analytics" ready={!reviewsQ.isLoading} steps={plan ? tourSteps : tourSteps.slice(0, 2)} scrollRef={scrollRef} scrollOffset={scrollY} />
    </View>
  );
}
