import { Icon } from '@/components/ui/Icon';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { FLOATING_NAV_H } from '@/lib/theme';

const INFO_ROWS = [
  { icon: 'map-marker',          label: 'Dirección',   value: 'Carrera 22, Barrio Obrero, San Cristóbal' },
  { icon: 'phone-outline',       label: 'Teléfono',    value: '+58 276 344 1234' },
  { icon: 'clock-outline',       label: 'Horario',     value: 'Lun–Vie 12:00–22:00' },
  { icon: 'silverware-fork-knife', label: 'Categoría', value: 'Hamburguesas · Smash Burger' },
  { icon: 'globe',               label: 'Instagram',   value: '@lasmasheria' },
];

function EditRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { C, shadow } = useTheme();
  return (
    <Pressable style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingVertical: 14, paddingHorizontal: 18,
      opacity: pressed ? 0.7 : 1,
    })}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
        <Icon name={icon} size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
        <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, marginTop: 1 }}>{value}</Text>
      </View>
      <Icon name="pencil-outline" size={16} color={C.outline} />
    </Pressable>
  );
}

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

export default function OwnerProfileScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>Mi Perfil</Text>
        <Pressable style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
          backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border,
          ...shadow.sm,
        }}>
          <Icon name="pencil-outline" size={15} color={C.primary} />
          <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>Editar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: FLOATING_NAV_H + 20, gap: 20 }}>

        {/* Hero card */}
        <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: C.border, ...shadow.md }}>
          {/* Banner */}
          <View style={{ height: 110, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="store-outline" size={48} color={C.primary} />
          </View>
          {/* Avatar */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, backgroundColor: C.surface }}>
            <View style={{ marginTop: -28, marginBottom: 12, width: 64, height: 64, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.surface }}>
              <Text style={{ fontSize: 30 }}>🍔</Text>
            </View>
            <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>La Smasheria</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[1,2,3,4,5].map(s => (
                  <Icon key={s} name="star" size={13} color={s <= 5 ? C.primary : C.outlineVariant} fill={s <= 4 ? C.primary : 'none'} />
                ))}
              </View>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>4.8 · 142 reseñas</Text>
            </View>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
              Las mejores smash burgers de la colonia. Ingredientes frescos, papas artesanales y salsas de la casa.
            </Text>
          </View>
        </View>

        {/* Info editable */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Información del negocio</Text>
          </View>
          {INFO_ROWS.map((row, i) => (
            <View key={row.label}>
              <EditRow {...row} />
              {i < INFO_ROWS.length - 1 && <Divider />}
            </View>
          ))}
        </View>

        {/* Galería placeholder */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Fotos del local</Text>
            <Pressable>
              <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>Agregar</Text>
            </Pressable>
          </View>
          <View style={{ padding: 18, flexDirection: 'row', gap: 10 }}>
            {[C.primaryFixed, C.secondaryContainer, C.tertiaryContainer].map((bg, i) => (
              <View key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                <Icon name="image-plus" size={22} color={C.outline} />
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
