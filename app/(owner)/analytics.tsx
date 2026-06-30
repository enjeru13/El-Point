import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { FLOATING_NAV_H } from '@/lib/theme';

const PERIODS = ['Semana', 'Mes', 'Año'] as const;
type Period = typeof PERIODS[number];

const BARS: Record<Period, { label: string; value: number }[]> = {
  Semana: [
    { label: 'L', value: 2 }, { label: 'M', value: 4 }, { label: 'X', value: 3 },
    { label: 'J', value: 6 }, { label: 'V', value: 8 }, { label: 'S', value: 5 }, { label: 'D', value: 7 },
  ],
  Mes: [
    { label: 'S1', value: 18 }, { label: 'S2', value: 24 }, { label: 'S3', value: 31 }, { label: 'S4', value: 27 },
  ],
  Año: [
    { label: 'E', value: 12 }, { label: 'F', value: 18 }, { label: 'M', value: 22 },
    { label: 'A', value: 30 }, { label: 'My', value: 28 }, { label: 'J', value: 35 },
    { label: 'Jl', value: 40 }, { label: 'A', value: 38 }, { label: 'S', value: 44 },
    { label: 'O', value: 50 }, { label: 'N', value: 46 }, { label: 'D', value: 55 },
  ],
};

const METRICS: Record<Period, { rating: string; reviews: string; views: string; rank: string }> = {
  Semana: { rating: '4.8', reviews: '35',   views: '820',  rank: '#4 Burgers' },
  Mes:    { rating: '4.7', reviews: '142',  views: '3.2k', rank: '#2 Burgers' },
  Año:    { rating: '4.6', reviews: '1.2k', views: '28k',  rank: '#1 Burgers' },
};

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
      <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 20, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('Semana');

  const bars = BARS[period];
  const metrics = METRICS[period];
  const maxVal = Math.max(...bars.map(b => b.value));
  const BAR_H = 120;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20 }}>
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>Métricas</Text>
        <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 2 }}>La Smasheria</Text>
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
              <Text style={{ color: period === p ? '#fff' : C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* Metric cards */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard icon="star"        label="Calificación" value={metrics.rating}  color={C.primary} />
          <MetricCard icon="comment-text" label="Reseñas"     value={metrics.reviews} color={C.secondary} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricCard icon="trending-up" label="Vistas"       value={metrics.views}   color={C.tertiary} />
          <MetricCard icon="trophy-outline" label="Ranking"   value={metrics.rank}    color={C.primary} />
        </View>

        {/* Bar chart - reseñas */}
        <View style={{ padding: 18, borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, gap: 16, ...shadow.sm }}>
          <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Reseñas por período</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: BAR_H + 24 }}>
            {bars.map((b, i) => {
              const h = Math.max(8, (b.value / maxVal) * BAR_H);
              const isLast = i === bars.length - 1;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10 }}>{b.value}</Text>
                  <View style={{
                    width: '100%', height: h, borderRadius: 8,
                    backgroundColor: isLast ? C.primary : C.primaryFixed,
                    borderWidth: 1.5, borderColor: C.border,
                  }} />
                  <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10 }}>{b.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Calificación promedio */}
        <View style={{ padding: 18, borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, gap: 14, ...shadow.sm }}>
          <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Distribución de estrellas</Text>
          {[5, 4, 3, 2, 1].map(star => {
            const pcts: Record<number, number> = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 };
            const pct = pcts[star];
            return (
              <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 2, width: 68 }}>
                  {[1,2,3,4,5].map(s => (
                    <Icon key={s} name="star" size={11} color={s <= star ? C.primary : C.outlineVariant} fill={s <= star ? C.primary : 'none'} />
                  ))}
                </View>
                <View style={{ flex: 1, height: 10, borderRadius: 99, overflow: 'hidden', backgroundColor: C.surfaceContainerHighest }}>
                  <View style={{ height: '100%', width: `${pct}%`, borderRadius: 99, backgroundColor: star >= 4 ? C.primary : star === 3 ? C.secondary : C.error }} />
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, width: 30, textAlign: 'right' }}>{pct}%</Text>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}
