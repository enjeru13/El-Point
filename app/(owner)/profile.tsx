import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
import { uploadRestaurantImage, uploadRestaurantMenu } from '@/lib/storage';
import { DEFAULT_HOURS, DAY_LABELS, formatRange, type Hours } from '@/lib/hours';

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
  const router = useRouter();

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
  const [hours, setHoursState]    = useState<Hours>(DEFAULT_HOURS);
  const [uploading, setUploading] = useState<'logo' | 'cover' | 'menu' | null>(null);

  function setDay(dow: number, patch: Partial<Hours['days'][number]>) {
    setHoursState((h) => ({ days: h.days.map((d, i) => (i === dow ? { ...d, ...patch } : d)) }));
  }

  async function pickPhoto(kind: 'logo' | 'cover') {
    if (!restaurant) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'cover' ? [16, 9] : [1, 1],
      quality: 0.85,
    });
    if (r.canceled) return;
    setUploading(kind);
    try {
      const url = await uploadRestaurantImage(restaurant.id, kind, r.assets[0].uri);
      updateMut.mutate(kind === 'logo' ? { logo_url: url } : { cover_url: url });
    } catch (e: any) {
      Alert.alert('No se pudo subir la imagen', e?.message ?? 'Intenta de nuevo');
    } finally {
      setUploading(null);
    }
  }

  async function pickMenu() {
    if (!restaurant) return;
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (r.canceled) return;
    setUploading('menu');
    try {
      const url = await uploadRestaurantMenu(restaurant.id, r.assets[0].uri);
      updateMut.mutate({ menu_pdf_url: url });
    } catch (e: any) {
      Alert.alert('No se pudo subir el menú', e?.message ?? 'Intenta de nuevo');
    } finally {
      setUploading(null);
    }
  }

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
    setHoursState(restaurant.hours ?? DEFAULT_HOURS);
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
    setHoursState(restaurant.hours ?? DEFAULT_HOURS);
    setEditing(false);
  }

  function save() {
    if (!name.trim()) { Alert.alert('El nombre no puede quedar vacío'); return; }
    const badTime = hours.days.some(
      (d) => !d.closed && (!/^\d{1,2}:\d{2}$/.test(d.open) || !/^\d{1,2}:\d{2}$/.test(d.close)),
    );
    if (badTime) { Alert.alert('Horario inválido', 'Usa el formato HH:MM (ej. 12:00).'); return; }
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
        hours,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            <Pressable
              onPress={() => router.push('/settings')}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, backgroundColor: C.surface, ...shadow.sm }}
            >
              <Icon name="settings" size={18} color={C.onSurface} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: FLOATING_NAV_H + 20, gap: 20 }}>

        {/* Hero card */}
        <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: C.border, ...shadow.md }}>
          <View style={{ height: 110, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
            {restaurant.cover_url ? (
              <Image source={{ uri: restaurant.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={150} />
            ) : (
              <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={48} color={C.primary} />
            )}
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, backgroundColor: C.surface }}>
            <View style={{ marginTop: -28, marginBottom: 12, width: 64, height: 64, borderRadius: 20, overflow: 'hidden', backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.surface }}>
              {restaurant.logo_url ? (
                <Image source={{ uri: restaurant.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
              ) : (
                <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={30} color="#fff" />
              )}
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

        {/* Horario */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Horario</Text>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
              const d = hours.days[dow];
              return (
                <View key={dow} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 40, color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>
                    {DAY_LABELS[dow]}
                  </Text>
                  {editing ? (
                    <>
                      <Switch
                        value={!d.closed}
                        onValueChange={(v) => setDay(dow, { closed: !v })}
                        trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                        thumbColor={!d.closed ? C.primary : C.outline}
                      />
                      {d.closed ? (
                        <Text style={{ flex: 1, color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 }}>Cerrado</Text>
                      ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppTextInput
                            value={d.open}
                            onChangeText={(t) => setDay(dow, { open: t.slice(0, 5) })}
                            placeholder="12:00"
                            keyboardType="numbers-and-punctuation"
                            style={{ fontSize: 13, textAlign: 'center', backgroundColor: C.surfaceContainerLow, borderRadius: 8, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 6, minWidth: 56 }}
                          />
                          <Text style={{ color: C.outline }}>–</Text>
                          <AppTextInput
                            value={d.close}
                            onChangeText={(t) => setDay(dow, { close: t.slice(0, 5) })}
                            placeholder="22:00"
                            keyboardType="numbers-and-punctuation"
                            style={{ fontSize: 13, textAlign: 'center', backgroundColor: C.surfaceContainerLow, borderRadius: 8, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 6, minWidth: 56 }}
                          />
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ flex: 1, color: d.closed ? C.outline : C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>
                      {formatRange(d)}
                    </Text>
                  )}
                </View>
              );
            })}
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

        {/* Fotos y menú */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: C.outlineVariant }}>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Fotos y menú</Text>
          </View>
          <View style={{ padding: 18, gap: 14 }}>

            {/* Portada */}
            <Pressable
              onPress={() => pickPhoto('cover')}
              disabled={uploading !== null}
              style={{
                height: 150, borderRadius: 16, overflow: 'hidden',
                borderWidth: 2, borderColor: C.border, borderStyle: restaurant.cover_url ? 'solid' : 'dashed',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.surfaceContainerLow,
              }}
            >
              {restaurant.cover_url ? (
                <Image source={{ uri: restaurant.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Icon name="camera-plus-outline" size={30} color={C.primary} />
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>Subir foto de portada</Text>
                </View>
              )}
              {uploading === 'cover' && (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 14 }}>
              {/* Logo */}
              <Pressable
                onPress={() => pickPhoto('logo')}
                disabled={uploading !== null}
                style={{
                  width: 88, height: 88, borderRadius: 16, overflow: 'hidden',
                  borderWidth: 2, borderColor: C.border, borderStyle: restaurant.logo_url ? 'solid' : 'dashed',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: C.surfaceContainerLow,
                }}
              >
                {restaurant.logo_url ? (
                  <Image source={{ uri: restaurant.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Icon name="image-plus" size={24} color={C.primary} />
                )}
                {uploading === 'logo' && (
                  <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </Pressable>

              {/* Menú PDF */}
              <Pressable
                onPress={pickMenu}
                disabled={uploading !== null}
                style={{
                  flex: 1, borderRadius: 16, padding: 14,
                  borderWidth: 2, borderColor: C.border, borderStyle: restaurant.menu_pdf_url ? 'solid' : 'dashed',
                  backgroundColor: C.surfaceContainerLow,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: restaurant.menu_pdf_url ? C.primary : C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                  {uploading === 'menu'
                    ? <ActivityIndicator size="small" color={restaurant.menu_pdf_url ? '#fff' : C.primary} />
                    : <Icon name={restaurant.menu_pdf_url ? 'file-check' : 'file-pdf-box'} size={22} color={restaurant.menu_pdf_url ? '#fff' : C.primary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>
                    {restaurant.menu_pdf_url ? 'Menú cargado' : 'Subir menú PDF'}
                  </Text>
                  <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: 1 }}>
                    {restaurant.menu_pdf_url ? 'Toca para reemplazar' : 'Tus clientes lo verán en tu perfil'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
