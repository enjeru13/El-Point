import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { useToast } from '@/lib/toast';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useMyRestaurant, useUpdateMyRestaurant, useResubmitRestaurant, useSetRestaurantZoneLocation } from '@/lib/queries/owner';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import {
  uploadRestaurantVerification,
  verificationPhotoUrl,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { instagramHandle } from '@/lib/contact';
import { TourGuide, type TourStep } from '@/components/tour/TourGuide';
import { capWidth, useIsTablet } from '@/lib/responsive';
import { isFounder } from '@/lib/queries/restaurants';
import { hasPlan } from '@/lib/plan';
import { PlanLock } from '@/components/ui/PlanLock';
import { FounderBadge } from '@/components/ui/FounderBadge';

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
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
        <Icon name={icon} size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="overline" color={C.outline}>{label.toUpperCase()}</AppText>
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
          <AppText variant="label" color={value ? C.onSurface : C.outline} style={{ fontSize: 14, marginTop: 1 }}>
            {value || '—'}
          </AppText>
        )}
      </View>
    </View>
  );
}

export default function OwnerProfileScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();

  const toast = useToast();
  const restaurantQ = useMyRestaurant();
  const restaurant = restaurantQ.data ?? null;
  // Perfil básico (sin plan): contacto, menú, fotos, horario, promo, comodidades y pagos van bloqueados.
  const plan = !!restaurant && hasPlan(restaurant);
  const updateMut = useUpdateMyRestaurant(restaurant?.id);
  const setZoneLocationMut = useSetRestaurantZoneLocation(restaurant?.id);
  const resubmit = useResubmitRestaurant();

  const [editing, setEditing] = useState(false);
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [address, setAddress]     = useState('');
  const [phone, setPhone]         = useState('');
  const [whatsapp, setWhatsapp]   = useState('');
  const [instagram, setInstagram] = useState('');
  const [priceLevel, setPriceLevel] = useState<number | null>(null);
  const [isActive, setIsActive]   = useState(true);
  const [ghostKitchen, setGhostKitchen] = useState(false);
  const [zoneLabel, setZoneLabel] = useState('');
  const [showZonePin, setShowZonePin] = useState(false);
  const [zoneCoords, setZoneCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoneLocating, setZoneLocating] = useState(false);
  const zoneMapRef = useRef<MapView>(null);

  const [verifUploading, setVerifUploading] = useState(false);
  const [verifUrl, setVerifUrl] = useState<string | null>(null);
  const [rifDraft, setRifDraft] = useState('');


  // Coach-mark targets for the first-use tour.
  const tourEditRef   = useRef<View>(null);
  const tourInfoRef   = useRef<View>(null);
  const scrollRef     = useRef<ScrollView>(null);
  const scrollY       = useRef(0);
  const tourSteps: TourStep[] = [
    { ref: tourEditRef, icon: 'pencil-outline', title: 'Edita tu local', text: 'Toca aquí para actualizar dirección, contacto, comodidades y más.' },
    { ref: tourInfoRef, icon: 'store-outline', title: 'Información del negocio', text: 'Dirección, teléfono, WhatsApp, Instagram y tu rango de precio.' },
  ];

  useEffect(() => {
    let alive = true;
    const path = restaurant?.verification_photo_path;
    if (!path) { setVerifUrl(null); return; }
    verificationPhotoUrl(path).then((u) => { if (alive) setVerifUrl(u); });
    return () => { alive = false; };
  }, [restaurant?.verification_photo_path]);

  /** Pregunta cámara o galería (mismo patrón que ReviewSheet.addPhotos) --
   *  antes solo abría la galería. */
  function pickImageSource(options: ImagePicker.ImagePickerOptions): Promise<string | null> {
    return new Promise((resolve) => {
      Alert.alert('Agregar foto', undefined, [
        {
          text: 'Tomar foto',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              toast.error('Permiso de cámara denegado');
              resolve(null);
              return;
            }
            const r = await ImagePicker.launchCameraAsync(options);
            resolve(r.canceled ? null : r.assets[0].uri);
          },
        },
        {
          text: 'Elegir de galería',
          onPress: async () => {
            const r = await ImagePicker.launchImageLibraryAsync(options);
            resolve(r.canceled ? null : r.assets[0].uri);
          },
        },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ]);
    });
  }

  async function pickFacade() {
    if (!restaurant) return;
    const uri = await pickImageSource({ mediaTypes: ['images'], quality: 0.85 });
    if (!uri) return;
    setVerifUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Sesión expirada');
      const path = await uploadRestaurantVerification(u.user.id, restaurant.id, uri);
      updateMut.mutate({ verification_photo_path: path });
      const signed = await verificationPhotoUrl(path);
      setVerifUrl(signed ? `${signed}#${Date.now()}` : null);
      toast.success(restaurant.ghost_kitchen ? 'Foto de la cocina actualizada' : 'Foto de fachada actualizada');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo subir la foto');
    } finally {
      setVerifUploading(false);
    }
  }

  async function detectZoneLocation() {
    setZoneLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permiso de ubicación denegado');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setZoneCoords({ lat: region.latitude, lng: region.longitude });
      zoneMapRef.current?.animateToRegion(region, 500);
    } catch {
      toast.error('No pudimos obtener tu ubicación');
    } finally {
      setZoneLocating(false);
    }
  }

  function saveZonePin() {
    setZoneLocationMut.mutate(zoneCoords, {
      onSuccess: () => toast.success(zoneCoords ? 'Ubicación aproximada guardada' : 'Ubicación quitada'),
      onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar'),
    });
  }

  function saveRif() {
    updateMut.mutate(
      { rif: rifDraft.trim() || null },
      { onSuccess: () => toast.success('RIF guardado') },
    );
  }

  useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.name ?? '');
    setDesc(restaurant.description ?? '');
    setAddress(restaurant.address ?? '');
    setPhone(restaurant.phone ?? '');
    setWhatsapp(restaurant.whatsapp ?? '');
    setInstagram(restaurant.instagram ?? '');
    setPriceLevel(restaurant.price_level ?? null);
    setIsActive(restaurant.is_active);
    setRifDraft(restaurant.rif ?? '');
    setGhostKitchen(restaurant.ghost_kitchen);
    setZoneLabel(restaurant.zone_label ?? '');
    setZoneCoords(
      restaurant.lat != null && restaurant.lng != null
        ? { lat: restaurant.lat, lng: restaurant.lng }
        : null,
    );
  }, [restaurant]);


  function cancel() {
    if (!restaurant) return;
    setName(restaurant.name ?? '');
    setDesc(restaurant.description ?? '');
    setAddress(restaurant.address ?? '');
    setPhone(restaurant.phone ?? '');
    setWhatsapp(restaurant.whatsapp ?? '');
    setInstagram(restaurant.instagram ?? '');
    setPriceLevel(restaurant.price_level ?? null);
    setIsActive(restaurant.is_active);
    setGhostKitchen(restaurant.ghost_kitchen);
    setZoneLabel(restaurant.zone_label ?? '');
    setEditing(false);
  }

  function save() {
    if (!name.trim()) { toast.error('El nombre no puede quedar vacío'); return; }
    updateMut.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        instagram: instagramHandle(instagram) ?? null,
        price_level: priceLevel,
        is_active: isActive,
        ghost_kitchen: ghostKitchen,
        zone_label: ghostKitchen ? (zoneLabel.trim() || null) : null,
      },
      {
        onSuccess: () => { setEditing(false); toast.success('Cambios guardados'); },
        onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar'),
      },
    );
  }

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 20 }}>
        <Skeleton width={120} height={24} />
        <Skeleton height={220} radius={24} />
        <Skeleton height={260} radius={22} />
        <Skeleton height={180} radius={22} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center' }}>
        <EmptyState
          icon="storefront-outline"
          title="Sin local registrado"
          body="Tu cuenta es de socio pero no tiene un local. Si crees que es un error, escríbenos."
          actionLabel="Reintentar"
          onAction={() => restaurantQ.refetch()}
        />
      </View>
    );
  }

  const busy = updateMut.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">Mi perfil</AppText>
        {editing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="Cancelar"
              onPress={cancel}
              disabled={busy}
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
            <Button
              label="Guardar"
              onPress={save}
              loading={busy}
              icon="check"
              size="sm"
              fullWidth={false}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View ref={tourEditRef} collapsable={false}>
              <Button
                label="Editar"
                onPress={() => setEditing(true)}
                variant="secondary"
                icon="pencil-outline"
                size="sm"
                fullWidth={false}
              />
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, ...shadow.sm }}
            >
              <Icon name="settings" size={18} color={C.onSurface} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 20, ...capWidth(isTablet) }}
      >

        {/* Verificación */}
        {restaurant.status !== 'approved' && (
          <View style={{
            borderRadius: 18, padding: 16, gap: 10,
            backgroundColor: restaurant.status === 'pending' ? C.tertiaryContainer : C.error + '22',
            borderWidth: 1, borderColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon
                name={restaurant.status === 'pending' ? 'clock-outline' : restaurant.status === 'suspended' ? 'shield-alert-outline' : 'close-circle'}
                size={18}
                color={C.onSurface}
              />
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                {restaurant.status === 'pending'
                  ? 'Local en revisión'
                  : restaurant.status === 'suspended'
                    ? 'Local suspendido'
                    : 'Local no aprobado'}
              </AppText>
            </View>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              {restaurant.status === 'pending'
                ? 'Estamos verificando tu local. Te avisaremos cuando lo aprobemos (suele tardar menos de 24 h). Mientras tanto no aparece para los comensales.'
                : restaurant.status_reason ??
                  (restaurant.status === 'suspended'
                    ? 'Escríbenos para resolverlo.'
                    : 'Revisa los datos y vuelve a enviarlo.')}
            </AppText>
            {(restaurant.status === 'pending' || restaurant.status === 'rejected') && (
              <>
                <View style={{ height: 1, backgroundColor: C.border, opacity: 0.4 }} />

                {/* Foto de fachada -- o de la cocina, si es cocina fantasma */}
                <View style={{ gap: 6 }}>
                  <AppText variant="overline" color={C.onSurfaceVariant}>
                    {restaurant.ghost_kitchen ? 'FOTO DE LA COCINA' : 'FOTO DE FACHADA'}
                  </AppText>
                  <Pressable
                    onPress={pickFacade}
                    disabled={verifUploading}
                    style={{
                      height: 130,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: verifUrl ? C.border : C.outlineVariant,
                      borderStyle: verifUrl ? 'solid' : 'dashed',
                      backgroundColor: C.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {verifUrl ? (
                      <Image
                        source={{ uri: verifUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <Icon name={restaurant.ghost_kitchen ? 'mdi:pot-steam-outline' : 'storefront-outline'} size={26} color={C.outline} />
                        <AppText variant="caption" color={C.outline}>
                          Subir foto de {restaurant.ghost_kitchen ? 'tu cocina' : 'la fachada'}
                        </AppText>
                      </View>
                    )}
                    {verifUrl && !verifUploading && (
                      <View style={{
                        position: 'absolute', bottom: 8, right: 8,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                        backgroundColor: C.surface,
                        borderWidth: 1, borderColor: C.border,
                      }}>
                        <AppText variant="label" color={C.onSurface}>Cambiar</AppText>
                      </View>
                    )}
                    {verifUploading && (
                      <View style={{
                        position: 'absolute', inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    )}
                  </Pressable>
                  <AppText variant="caption" color={C.outline}>
                    {restaurant.ghost_kitchen
                      ? 'Tu espacio de trabajo o lo que preparas.'
                      : 'El frente del local con el letrero visible.'}
                  </AppText>
                </View>

                {/* RIF */}
                <View style={{ gap: 6 }}>
                  <AppText variant="overline" color={C.onSurfaceVariant}>RIF</AppText>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <AppTextInput
                      value={rifDraft}
                      onChangeText={setRifDraft}
                      placeholder="J-12345678-9"
                      autoCapitalize="characters"
                      style={{ flex: 1 }}
                    />
                    {rifDraft.trim() !== (restaurant.rif ?? '') && (
                      <Button
                        label="Guardar"
                        onPress={saveRif}
                        loading={updateMut.isPending}
                        size="sm"
                        fullWidth={false}
                      />
                    )}
                  </View>
                </View>
              </>
            )}

            {restaurant.status === 'rejected' && (
              <Button
                label="Reenviar a revisión"
                onPress={() =>
                  resubmit.mutate(restaurant.id, {
                    onSuccess: () => toast.success('Local reenviado a revisión'),
                    onError: () => toast.error('No se pudo reenviar'),
                  })
                }
                loading={resubmit.isPending}
                icon="check"
                size="sm"
                fullWidth={false}
              />
            )}
          </View>
        )}

        {/* Hero card */}
        <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...shadow.md }}>
          <View style={{ height: 110, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
            {restaurant.cover_url ? (
              <Image source={{ uri: restaurant.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={150} />
            ) : (
              <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={48} color={C.primary} />
            )}
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, backgroundColor: C.surface }}>
            <View style={{ marginTop: -28, marginBottom: 12, width: 64, height: 64 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, overflow: 'hidden', backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.surface }}>
                {restaurant.logo_url ? (
                  <Image source={{ uri: restaurant.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                ) : (
                  <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={30} color="#fff" />
                )}
              </View>
              {isFounder(restaurant) && (
                <View style={{ position: 'absolute', top: -4, right: -4 }}>
                  <FounderBadge rank={restaurant.founder_rank!} size="md" />
                </View>
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
              <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }}>{restaurant.name}</AppText>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Icon key={s} name="star" size={13} color={s <= Math.round(restaurant.rating_avg) ? C.primary : C.outlineVariant} fill={s <= Math.round(restaurant.rating_avg) ? C.primary : 'none'} />
                ))}
              </View>
              <AppText variant="label" color={C.onSurfaceVariant}>
                {restaurant.rating_count > 0 ? `${restaurant.rating_avg.toFixed(1)} · ${restaurant.rating_count} reseñas` : 'Sin reseñas aún'}
              </AppText>
            </View>

            {isFounder(restaurant) && (
              <View style={{ marginTop: 8 }}>
                <FounderBadge rank={restaurant.founder_rank!} size="md" />
              </View>
            )}

            {/* Categorías (solo lectura por ahora) */}
            {restaurant.categories.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {restaurant.categories.map(c => (
                  <View key={c.slug} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText variant="label">{c.label}</AppText>
                  </View>
                ))}
              </View>
            )}

            {editing && plan ? (
              <View style={{ marginTop: 12, gap: 6 }}>
                <AppText variant="overline" color={C.outline}>DESCRIPCIÓN DEL LOCAL</AppText>
                <AppTextInput
                  value={description}
                  onChangeText={(t) => setDesc(t.slice(0, 400))}
                  placeholder="Ej. Comida casera venezolana, ambiente familiar, 15 años en el sector…"
                  multiline
                  style={{
                    fontSize: 14,
                    minHeight: 72,
                    textAlignVertical: 'top',
                    backgroundColor: C.surfaceContainerLow,
                    borderWidth: 1,
                    borderColor: C.outlineVariant,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
                <AppText variant="caption" color={C.outline} align="right" style={{ fontSize: 12 }}>
                  {description.length}/400
                </AppText>
              </View>
            ) : restaurant.description ? (
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 8, lineHeight: 20 }}>
                {restaurant.description}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Info editable */}
        <View ref={tourInfoRef} collapsable={false} style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <AppText variant="bodyStrong">Información del negocio</AppText>
          </View>

          <Field icon="map-marker" label="Dirección" value={address} editing={editing} onChangeText={setAddress} placeholder="Calle, sector, ciudad" />
          <Divider />
          {plan ? (
            <>
              <Field icon="phone-outline" label="Teléfono" value={phone} editing={editing} onChangeText={setPhone} placeholder="+58 276 000 0000" keyboardType="phone-pad" />
              <Divider />
              <Field icon="whatsapp" label="WhatsApp" value={whatsapp} editing={editing} onChangeText={setWhatsapp} placeholder="+58 412 000 0000" keyboardType="phone-pad" />
              <Divider />
              <Field icon="instagram" label="Instagram" value={instagram} editing={editing} onChangeText={setInstagram} placeholder="tu_local" />
              <Divider />
            </>
          ) : (
            <>
              {restaurant.ghost_kitchen ? (
                <>
                  <Field icon="whatsapp" label="WhatsApp" value={whatsapp} editing={editing} onChangeText={setWhatsapp} placeholder="+58 412 000 0000" keyboardType="phone-pad" />
                  <Divider />
                </>
              ) : null}
              <PlanLock
                compact
                title="Contacto"
                body={restaurant.ghost_kitchen
                  ? 'Teléfono e Instagram vienen con el plan. El WhatsApp sigue visible.'
                  : 'WhatsApp, llamada e Instagram vienen con el plan.'}
                onPress={() => router.push('/subscription' as any)}
              />
              <Divider />
            </>
          )}

          {/* Precio */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
              <Icon name="tag-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color={C.outline}>RANGO DE PRECIO</AppText>
              {editing ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {[1, 2, 3].map(p => {
                    const active = priceLevel === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setPriceLevel(active ? null : p)}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: active ? C.border : C.outlineVariant, backgroundColor: active ? C.primary : C.surface }}
                      >
                        <AppText variant="label" color={active ? '#fff' : C.onSurfaceVariant}>{'$'.repeat(p)}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <AppText variant="label" color={priceLevel ? C.onSurface : C.outline} style={{ fontSize: 14, marginTop: 1 }}>
                  {priceLevel ? '$'.repeat(priceLevel) : '—'}
                </AppText>
              )}
            </View>
          </View>
        </View>

        {/* Visibilidad */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
            <Icon name="store-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Local visible</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 1 }}>
              Aparece en el mapa y en búsquedas
            </AppText>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            disabled={!editing}
            trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
            thumbColor={isActive ? C.primary : C.outline}
          />
        </View>

        {/* Cocina fantasma */}
        <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
              <Icon name="mdi:ghost" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Cocina fantasma</AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 1 }}>
                Sin local físico -- solo delivery o pickup. No sale como pin en el mapa.
              </AppText>
            </View>
            <Switch
              value={ghostKitchen}
              onValueChange={setGhostKitchen}
              disabled={!editing}
              trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
              thumbColor={ghostKitchen ? C.primary : C.outline}
            />
          </View>
          {ghostKitchen && (
            <>
              <Divider />
              <Field
                icon="mdi:map-marker-radius-outline"
                label="Zona / sector"
                value={zoneLabel}
                editing={editing}
                onChangeText={setZoneLabel}
                placeholder="Ej. Barrio Obrero"
              />
              <Divider />
              <View style={{ padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name={zoneCoords ? 'check-circle' : 'map-marker-outline'} size={16} color={zoneCoords ? C.secondary : C.outline} />
                  <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1 }}>
                    {zoneCoords
                      ? 'Ubicación aproximada marcada — entras al orden "cerca de mí".'
                      : 'Sin ubicación aproximada (opcional) — no entras al orden "cerca de mí" todavía.'}
                  </AppText>
                  {editing && (
                    <Pressable onPress={() => setShowZonePin((v) => !v)} hitSlop={8}>
                      <AppText variant="label" color={C.primary}>{showZonePin ? 'Ocultar' : zoneCoords ? 'Cambiar' : 'Marcar'}</AppText>
                    </Pressable>
                  )}
                </View>

                {editing && showZonePin && (
                  <View style={{ gap: 8 }}>
                    <AppText variant="bodySm" color={C.outline}>
                      No hace falta que sea exacto — solo una zona aproximada.
                    </AppText>
                    <View style={{ height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: zoneCoords ? C.secondary : C.outlineVariant }}>
                      <MapView
                        ref={zoneMapRef}
                        style={{ flex: 1 }}
                        initialRegion={{
                          latitude: zoneCoords?.lat ?? 7.7669,
                          longitude: zoneCoords?.lng ?? -72.2251,
                          latitudeDelta: zoneCoords ? 0.015 : 0.06,
                          longitudeDelta: zoneCoords ? 0.015 : 0.06,
                        }}
                        onRegionChangeComplete={(r) => setZoneCoords({ lat: r.latitude, lng: r.longitude })}
                      />
                      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="map-marker" size={34} color={C.primary} style={{ marginBottom: 34 }} />
                      </View>
                      <Pressable
                        onPress={detectZoneLocation}
                        disabled={zoneLocating}
                        style={{
                          position: 'absolute', right: 10, bottom: 10,
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99,
                          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                          ...shadow.sm,
                        }}
                      >
                        <Icon name="crosshairs-gps" size={15} color={C.primary} />
                        <AppText variant="label" color={C.onSurface} style={{ fontSize: 13 }}>
                          {zoneLocating ? 'Ubicando…' : 'Mi ubicación'}
                        </AppText>
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button label="Guardar ubicación" onPress={saveZonePin} loading={setZoneLocationMut.isPending} size="sm" fullWidth={false} />
                      {zoneCoords && (
                        <Button
                          label="Quitar"
                          onPress={() => { setZoneCoords(null); setZoneLocationMut.mutate(null, { onSuccess: () => toast.success('Ubicación quitada') }); }}
                          variant="secondary"
                          size="sm"
                          fullWidth={false}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

      </ScrollView>

      <TourGuide tourKey="owner_profile" steps={tourSteps} scrollRef={scrollRef} scrollOffset={scrollY} />
    </View>
  );
}
