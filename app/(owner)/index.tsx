import { Icon } from '@/components/ui/Icon';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { FLOATING_NAV_H } from '@/lib/theme';

const MOCK_REVIEWS = [
  { id: '1', user: '@foodie_mx', avatar: '🌮', rating: 5, text: 'El mejor lugar del barrio, sin duda. La smash burger es increíble.', time: 'Hace 2h' },
  { id: '2', user: '@carloseat',  avatar: '🍕', rating: 4, text: 'Muy buena atención, los precios son justos. Volvería.', time: 'Hace 5h' },
  { id: '3', user: '@ana_foodie', avatar: '☕', rating: 5, text: 'El café de especialidad está brutísimo. Top 3 de la ciudad.', time: 'Ayer' },
];

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color: string }) {
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
      {sub && <Text style={{ color: color, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11 }}>{sub}</Text>}
    </View>
  );
}

function ReviewRow({ review }: { review: typeof MOCK_REVIEWS[0] }) {
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
          <Text style={{ fontSize: 18 }}>{review.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>{review.user}</Text>
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
            {[1,2,3,4,5].map(s => (
              <Icon key={s} name="star" size={11} color={s <= review.rating ? C.primary : C.outlineVariant} fill={s <= review.rating ? C.primary : 'none'} />
            ))}
          </View>
        </View>
        <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12 }}>{review.time}</Text>
      </View>
      <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 19 }} numberOfLines={2}>
        {review.text}
      </Text>
    </View>
  );
}

export default function OwnerHomeScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 10, paddingBottom: 14,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>Bienvenido</Text>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>La Smasheria 🍔</Text>
        </View>
        <Pressable style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: C.primaryFixed,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: C.border,
          ...shadow.sm,
        }}>
          <Icon name="bell-outline" size={22} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: FLOATING_NAV_H + 20, gap: 20 }}
      >

        {/* Banner estado */}
        <View style={{
          padding: 16, borderRadius: 20,
          backgroundColor: C.primaryFixed,
          borderWidth: 2, borderColor: C.border,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          ...shadow.sm,
        }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
            <Icon name="store-outline" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Tu local está activo</Text>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 2 }}>Visible para todos los comensales</Text>
          </View>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: C.border }} />
        </View>

        {/* Stats */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Hoy</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="star"        label="Calificación"   value="4.8"  sub="↑ +0.2"   color={C.primary} />
            <StatCard icon="comment-text" label="Reseñas hoy"    value="3"    sub="↑ +1"     color={C.secondary} />
            <StatCard icon="trending-up" label="Vistas perfil"  value="124"  sub="↑ +18%"   color={C.tertiary} />
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Acciones rápidas</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { icon: 'pencil-outline', label: 'Editar perfil' },
              { icon: 'image-plus',     label: 'Subir foto' },
              { icon: 'share-variant-outline', label: 'Compartir' },
            ].map(a => (
              <Pressable key={a.label} style={({ pressed }) => ({
                flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 16, borderRadius: 18,
                backgroundColor: C.surfaceContainerLow,
                borderWidth: 2, borderColor: C.border,
                opacity: pressed ? 0.7 : 1,
              })}>
                <Icon name={a.icon} size={22} color={C.primary} />
                <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, textAlign: 'center' }}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reseñas recientes */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Reseñas recientes</Text>
            <Pressable>
              <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>Ver todas</Text>
            </Pressable>
          </View>
          {MOCK_REVIEWS.map(r => <ReviewRow key={r.id} review={r} />)}
        </View>

      </ScrollView>
    </View>
  );
}
