import { Icon } from '@/components/ui/Icon';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { FLOATING_NAV_H } from '@/lib/theme';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useMyRestaurant, useUpdateMyRestaurant } from '@/lib/queries/owner';

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

function Field({
  icon, label, value, editing, onChangeText, placeholder, keyboardType,
}: {
  icon: string;
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
        <Icon name={icon} size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
        {editing ? (
          <AppTextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize="none"
            style={{ fontSize: 14, marginTop: 2 }}
          />
        ) : (
          <Text style={{ color: value ? C.onSurface : C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, marginTop: 1 }}>
            {value || '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function OwnerProfileScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  const restaurantQ = useMyRestaurant();
  const restaurant = restaurantQ.data ?? null;
  const updateMut = useUpdateMyRestaurant(restaurant?.id);

  const [editing, setEditing] = useState(false);
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [address, setAddress]     = useState('');
  const [phone, setPhone]         = useState('');
  const [whatsapp, setWhatsapp]   = useState('');
  const [instagram, setInstagram] = useState('');
  const [promo, setPromo]         = useState('');
  const [priceLevel, setPriceLevel] = useState<number | null>(null);
  const [isActive, setIsActive]   = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.name ?? '');
    setDesc(restaurant.description ?? '');
    setAddress(restaurant.address ?? '');
    setPhone(restaurant.phone ?? '');
    setWhatsapp(restaurant.whatsapp ?? '');
    setInstagram(restaurant.instagram ?? '');
    setPromo(restaurant.promo_text ?? '');
    setPriceLevel(restaurant.price_level ?? null);
    setIsActive(restaurant.is_active);
  }, [restaurant]);

  function cancel() {
    if (!restaurant) return;
    setName(restaurant.name ?? '');
    setDesc(restaurant.description ?? '');
    setAddress(restaurant.address ?? '');
    setPhone(restaurant.phone ?? '');
    setWhatsapp(restaurant.whatsapp ?? '');
    setInstagram(restaurant.instagram ?? '');
    setPromo(restaurant.promo_text ?? '');
    setPriceLevel(restaurant.price_level ?? null);
    setIsActive(restaurant.is_active);
    setEditing(false);
  }

  function save() {
    if (!name.trim()) { Alert.alert('El nombre no puede quedar vacío'); return; }
    updateMut.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        instagram: instagram.trim() || null,
        promo_text: promo.trim() || null,
        price_level: priceLevel,
        is_active: isActive,
      },
      {
        onSuccess: () => setEditing(false),
        onError: (e: any) => Alert.alert('No se pudo guardar', e?.message ?? 'Intenta de nuevo'),
      },
    );
  }

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Icon name="store-outline" size={44} color={C.outline} />
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 16, textAlign: 'center' }}>
          No hay un local registrado
        </Text>
      </View>
    );
  }

  const busy = updateMut.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>Mi perfil</Text>
        {editing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={cancel}
              disabled={busy}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2, borderColor: C.outlineVariant }}
            >
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={busy}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: C.primary, borderWidth: 2, borderColor: C.border, ...shadow.sm,
              }}
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={15} color="#fff" />}
              <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>Guardar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border, ...shadow.sm,
            }}
          >
            <Icon name="pencil-outline" size={15} color={C.primary} />
            <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>Editar</Text>
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: FLOATING_NAV_H + 20, gap: 20 }}>

        {/* Hero card */}
        <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: C.border, ...shadow.md }}>
          <View style={{ height: 110, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={48} color={C.primary} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, backgroundColor: C.surface }}>
            <View style={{ marginTop: -28, marginBottom: 12, width: 64, height: 64, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.surface }}>
              <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={30} color="#fff" />
            </View>

            {editing ? (
              <AppTextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre del local"
                style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: C.onSurface }}
              />
            ) : (
              <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>{restaurant.name}</Text>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Icon key={s} name="star" size={13} color={s <= Math.round(restaurant.rating_avg) ? C.primary : C.outlineVariant} fill={s <= Math.round(restaurant.rating_avg) ? C.primary : 'none'} />
                ))}
              </View>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>
                {restaurant.rating_count > 0 ? `${restaurant.rating_avg.toFixed(1)} · ${restaurant.rating_count} reseñas` : 'Sin reseñas aún'}
              </Text>
            </View>

            {/* Categorías (solo lectura por ahora) */}
            {restaurant.categories.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {restaurant.categories.map(c => (
                  <View key={c.slug} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 2, borderColor: C.border }}>
                    <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 }}>{c.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {editing ? (
              <AppTextInput
                value={description}
                onChangeText={setDesc}
                placeholder="Cuéntale a la comunidad sobre tu local…"
                multiline
                style={{ fontSize: 14, marginTop: 10, minHeight: 60, textAlignVertical: 'top' }}
              />
            ) : restaurant.description ? (
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
                {restaurant.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Info editable */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Información del negocio</Text>
          </View>

          <Field icon="map-marker" label="Dirección" value={address} editing={editing} onChangeText={setAddress} placeholder="Calle, sector, ciudad" />
          <Divider />
          <Field icon="phone-outline" label="Teléfono" value={phone} editing={editing} onChangeText={setPhone} placeholder="+58 276 000 0000" keyboardType="phone-pad" />
          <Divider />
          <Field icon="whatsapp" label="WhatsApp" value={whatsapp} editing={editing} onChangeText={setWhatsapp} placeholder="+58 412 000 0000" keyboardType="phone-pad" />
          <Divider />
          <Field icon="instagram" label="Instagram" value={instagram} editing={editing} onChangeText={setInstagram} placeholder="tu_local" />
          <Divider />

          {/* Precio */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
              <Icon name="tag-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, letterSpacing: 0.5 }}>RANGO DE PRECIO</Text>
              {editing ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {[1, 2, 3].map(p => {
                    const active = priceLevel === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setPriceLevel(active ? null : p)}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 2, borderColor: active ? C.border : C.outlineVariant, backgroundColor: active ? C.primary : C.surface }}
                      >
                        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: active ? '#fff' : C.onSurfaceVariant }}>{'$'.repeat(p)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: priceLevel ? C.onSurface : C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, marginTop: 1 }}>
                  {priceLevel ? '$'.repeat(priceLevel) : '—'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Oferta */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Oferta / promoción</Text>
          </View>
          <View style={{ padding: 18, gap: 6 }}>
            {editing ? (
              <>
                <AppTextInput
                  value={promo}
                  onChangeText={setPromo}
                  placeholder="Ej. 2x1 en hamburguesas los martes"
                  maxLength={80}
                  style={{ fontSize: 14 }}
                />
                <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, textAlign: 'right' }}>{promo.length}/80</Text>
              </>
            ) : restaurant.promo_text ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="tag" size={16} color={C.primary} />
                <Text style={{ flex: 1, color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>{restaurant.promo_text}</Text>
              </View>
            ) : (
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 }}>
                Sin oferta activa. Toca "Editar" para agregar una.
              </Text>
            )}
          </View>
        </View>

        {/* Visibilidad */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
            <Icon name="store-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Local visible</Text>
            <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 1 }}>
              Aparece en el mapa y en búsquedas
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            disabled={!editing}
            trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
            thumbColor={isActive ? C.primary : C.outline}
          />
        </View>

        {/* Fotos — pendiente Storage */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Fotos del local</Text>
          </View>
          <View style={{ padding: 18, alignItems: 'center', gap: 8 }}>
            <Icon name="image-plus" size={28} color={C.outlineVariant} />
            <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, textAlign: 'center' }}>
              La carga de fotos estará disponible pronto.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
