import { EditBar, SectionCard } from '@/components/owner/SectionShell';
import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import {
  useMyRestaurant,
  useUpdateMyRestaurant,
  useUpdateRestaurantCategories,
  useResubmitRestaurant,
  useSetRestaurantZoneLocation,
  type OwnerRestaurant,
} from '@/lib/queries/owner';
import { useCategories } from '@/lib/queries/categories';
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

const MAX_CATEGORIES = 3;

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

function IconBox({ name }: { name: string }) {
  const { C } = useTheme();
  return (
    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
      <Icon name={name} size={18} color={C.primary} />
    </View>
  );
}

function Field({
  icon, label, value, editing, onChangeText, placeholder, keyboardType, autoCapitalize = 'none',
}: {
  icon: string;
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
      <IconBox name={icon} />
      <View style={{ flex: 1 }}>
        <AppText variant="overline" color={C.outline}>{label.toUpperCase()}</AppText>
        {editing ? (
          <AppTextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
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

function Pill({ label, icon }: { label: string; icon?: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.border }}>
      {icon ? <Icon name={icon} size={13} color={C.onSurface} /> : null}
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

/** Nombre, descripción, categorías, dirección y precio. */
function BusinessBlock({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const catsMut = useUpdateRestaurantCategories(restaurant.id);
  const categoriesQ = useCategories();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDesc] = useState(restaurant.description ?? '');
  const [address, setAddress] = useState(restaurant.address ?? '');
  const [priceLevel, setPriceLevel] = useState<number | null>(restaurant.price_level);
  const [catSlugs, setCatSlugs] = useState<Set<string>>(new Set(restaurant.categories.map(c => c.slug)));

  function reset() {
    setName(restaurant.name);
    setDesc(restaurant.description ?? '');
    setAddress(restaurant.address ?? '');
    setPriceLevel(restaurant.price_level);
    setCatSlugs(new Set(restaurant.categories.map(c => c.slug)));
  }

  useEffect(() => {
    if (!editing) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant, editing]);

  function toggleCat(slug: string) {
    setCatSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size >= MAX_CATEGORIES) { toast.error(`Máximo ${MAX_CATEGORIES} categorías`); return prev; }
      else next.add(slug);
      return next;
    });
  }

  async function save() {
    if (!name.trim()) { toast.error('El nombre no puede quedar vacío'); return; }
    if (catSlugs.size < 1) { toast.error('Elige al menos una categoría'); return; }
    try {
      const before = restaurant.categories.map(c => c.slug).sort().join(',');
      const after = Array.from(catSlugs).sort().join(',');
      if (before !== after) {
        const ids = (categoriesQ.data ?? []).filter(c => catSlugs.has(c.slug)).map(c => c.id);
        await catsMut.mutateAsync(ids);
      }
      await updateMut.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        price_level: priceLevel,
      });
      setEditing(false);
      toast.success('Cambios guardados');
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo guardar');
    }
  }

  return (
    <>
      <SectionCard title="Datos del negocio">
        <Field icon="store-outline" label="Nombre" value={name} editing={editing} onChangeText={setName} placeholder="Nombre del local" autoCapitalize="words" />
        <Divider />

        {/* Descripción */}
        <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
          <IconBox name="text-box-outline" />
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={C.outline}>DESCRIPCIÓN</AppText>
            {editing ? (
              <>
                <AppTextInput
                  value={description}
                  onChangeText={(t) => setDesc(t.slice(0, 400))}
                  placeholder="Ej. Comida casera venezolana, ambiente familiar, 15 años en el sector…"
                  multiline
                  style={{ fontSize: 14, minHeight: 72, textAlignVertical: 'top', marginTop: 2 }}
                />
                <AppText variant="caption" color={C.outline} align="right" style={{ fontSize: 12 }}>{description.length}/400</AppText>
              </>
            ) : (
              <AppText variant="label" color={description ? C.onSurface : C.outline} style={{ fontSize: 14, marginTop: 1, lineHeight: 20 }}>
                {description || 'Cuéntale a la gente qué te hace especial.'}
              </AppText>
            )}
          </View>
        </View>
        <Divider />

        {/* Categorías */}
        <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
          <IconBox name="shape-outline" />
          <View style={{ flex: 1, gap: 6 }}>
            <AppText variant="overline" color={C.outline}>
              {editing ? `CATEGORÍAS · ${catSlugs.size}/${MAX_CATEGORIES}` : 'CATEGORÍAS'}
            </AppText>
            {editing ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(categoriesQ.data ?? []).map(cat => (
                  <Chip key={cat.id} label={cat.label} icon={cat.icon} tone="secondary" active={catSlugs.has(cat.slug)} onPress={() => toggleCat(cat.slug)} />
                ))}
              </View>
            ) : restaurant.categories.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {restaurant.categories.map(c => <Pill key={c.slug} label={c.label} icon={c.icon} />)}
              </View>
            ) : (
              <AppText variant="label" color={C.outline} style={{ fontSize: 14 }}>—</AppText>
            )}
          </View>
        </View>
        <Divider />

        <Field icon="map-marker" label="Dirección" value={address} editing={editing} onChangeText={setAddress} placeholder="Calle, sector, ciudad" autoCapitalize="sentences" />
        <Divider />

        {/* Precio */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 }}>
          <IconBox name="tag-outline" />
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
      </SectionCard>
      <EditBar
        editing={editing}
        saving={updateMut.isPending || catsMut.isPending}
        onEdit={() => setEditing(true)}
        onCancel={() => { reset(); setEditing(false); }}
        onSave={save}
      />
    </>
  );
}

/** Teléfono, WhatsApp e Instagram. Sin plan: candado (la cocina fantasma conserva su WhatsApp). */
function ContactBlock({ restaurant }: { restaurant: OwnerRestaurant }) {
  const router = useRouter();
  const toast = useToast();
  const plan = hasPlan(restaurant);
  const ghost = restaurant.ghost_kitchen;
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(restaurant.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(restaurant.whatsapp ?? '');
  const [instagram, setInstagram] = useState(restaurant.instagram ?? '');

  function reset() {
    setPhone(restaurant.phone ?? '');
    setWhatsapp(restaurant.whatsapp ?? '');
    setInstagram(restaurant.instagram ?? '');
  }

  useEffect(() => {
    if (!editing) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant, editing]);

  function save() {
    const patch = plan
      ? { phone: phone.trim() || null, whatsapp: whatsapp.trim() || null, instagram: instagramHandle(instagram) ?? null }
      : { whatsapp: whatsapp.trim() || null };
    updateMut.mutate(patch, {
      onSuccess: () => { setEditing(false); toast.success('Contacto guardado'); },
      onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar'),
    });
  }

  const canEdit = plan || ghost;

  return (
    <>
      <SectionCard title="Contacto">
        {plan ? (
          <>
            <Field icon="phone-outline" label="Teléfono" value={phone} editing={editing} onChangeText={setPhone} placeholder="+58 276 000 0000" keyboardType="phone-pad" />
            <Divider />
            <Field icon="whatsapp" label="WhatsApp" value={whatsapp} editing={editing} onChangeText={setWhatsapp} placeholder="+58 412 000 0000" keyboardType="phone-pad" />
            <Divider />
            <Field icon="instagram" label="Instagram" value={instagram} editing={editing} onChangeText={setInstagram} placeholder="tu_local" />
          </>
        ) : (
          <>
            {ghost ? (
              <>
                <Field icon="whatsapp" label="WhatsApp" value={whatsapp} editing={editing} onChangeText={setWhatsapp} placeholder="+58 412 000 0000" keyboardType="phone-pad" />
                <Divider />
              </>
            ) : null}
            <PlanLock
              compact
              title="Contacto"
              body={ghost
                ? 'Teléfono e Instagram vienen con el plan. El WhatsApp sigue visible.'
                : 'WhatsApp, llamada e Instagram vienen con el plan.'}
              onPress={() => router.push('/subscription' as any)}
            />
          </>
        )}
      </SectionCard>
      {canEdit && (
        <EditBar editing={editing} saving={updateMut.isPending} onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={save} />
      )}
    </>
  );
}

/** Visibilidad y cocina fantasma (con su zona y pin aproximado). */
function SettingsBlock({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C, shadow } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const setZoneLocationMut = useSetRestaurantZoneLocation(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [isActive, setIsActive] = useState(restaurant.is_active);
  const [ghostKitchen, setGhostKitchen] = useState(restaurant.ghost_kitchen);
  const [zoneLabel, setZoneLabel] = useState(restaurant.zone_label ?? '');
  const [showZonePin, setShowZonePin] = useState(false);
  const [zoneCoords, setZoneCoords] = useState<{ lat: number; lng: number } | null>(
    restaurant.lat != null && restaurant.lng != null ? { lat: restaurant.lat, lng: restaurant.lng } : null,
  );
  const [zoneLocating, setZoneLocating] = useState(false);
  const zoneMapRef = useRef<MapView>(null);

  function reset() {
    setIsActive(restaurant.is_active);
    setGhostKitchen(restaurant.ghost_kitchen);
    setZoneLabel(restaurant.zone_label ?? '');
    setZoneCoords(restaurant.lat != null && restaurant.lng != null ? { lat: restaurant.lat, lng: restaurant.lng } : null);
    setShowZonePin(false);
  }

  useEffect(() => {
    if (!editing) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant, editing]);

  async function detectZoneLocation() {
    setZoneLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { toast.error('Permiso de ubicación denegado'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const region = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
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

  function save() {
    updateMut.mutate(
      {
        is_active: isActive,
        ghost_kitchen: ghostKitchen,
        zone_label: ghostKitchen ? (zoneLabel.trim() || null) : null,
      },
      {
        onSuccess: () => { setEditing(false); toast.success('Ajustes guardados'); },
        onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar'),
      },
    );
  }

  const trackColor = { false: C.surfaceContainerHighest, true: C.primaryContainer };

  return (
    <>
      <SectionCard title="Ajustes del local">
        {/* Visibilidad */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}>
          <IconBox name="eye-outline" />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Local visible</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 1 }}>
              {isActive ? 'Aparece en el mapa y en las búsquedas.' : 'Oculto: nadie te encuentra hasta que lo actives.'}
            </AppText>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} disabled={!editing} trackColor={trackColor} thumbColor={isActive ? C.primary : C.outline} />
        </View>
        <Divider />

        {/* Cocina fantasma */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}>
          <IconBox name="mdi:ghost" />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Cocina fantasma</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 1 }}>
              Sin local físico: solo delivery o pickup. No sale como pin en el mapa.
            </AppText>
          </View>
          <Switch value={ghostKitchen} onValueChange={setGhostKitchen} disabled={!editing} trackColor={trackColor} thumbColor={ghostKitchen ? C.primary : C.outline} />
        </View>

        {ghostKitchen && (
          <>
            <Divider />
            <Field icon="mdi:map-marker-radius-outline" label="Zona / sector" value={zoneLabel} editing={editing} onChangeText={setZoneLabel} placeholder="Ej. Barrio Obrero" autoCapitalize="words" />
            <Divider />
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name={zoneCoords ? 'check-circle' : 'map-marker-outline'} size={16} color={zoneCoords ? C.secondary : C.outline} />
                <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1 }}>
                  {zoneCoords
                    ? 'Ubicación aproximada marcada: entras al orden "cerca de mí".'
                    : 'Sin ubicación aproximada (opcional): no entras al orden "cerca de mí" todavía.'}
                </AppText>
                {editing && (
                  <Pressable onPress={() => setShowZonePin(v => !v)} hitSlop={8}>
                    <AppText variant="label" color={C.primary}>{showZonePin ? 'Ocultar' : zoneCoords ? 'Cambiar' : 'Marcar'}</AppText>
                  </Pressable>
                )}
              </View>

              {editing && showZonePin && (
                <View style={{ gap: 8 }}>
                  <AppText variant="bodySm" color={C.outline}>No hace falta que sea exacto, solo una zona aproximada.</AppText>
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
                      <AppText variant="label" color={C.onSurface} style={{ fontSize: 13 }}>{zoneLocating ? 'Ubicando…' : 'Mi ubicación'}</AppText>
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
      </SectionCard>
      <EditBar editing={editing} saving={updateMut.isPending} onEdit={() => setEditing(true)} onCancel={() => { reset(); setEditing(false); }} onSave={save} />
    </>
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
  const plan = !!restaurant && hasPlan(restaurant);
  const updateMut = useUpdateMyRestaurant(restaurant?.id);
  const resubmit = useResubmitRestaurant();

  const [verifOpen, setVerifOpen] = useState(false);
  const [verifUploading, setVerifUploading] = useState(false);
  const [verifUrl, setVerifUrl] = useState<string | null>(null);
  const [rifDraft, setRifDraft] = useState('');

  // Coach-mark targets for the first-use tour.
  const tourHeroRef   = useRef<View>(null);
  const tourInfoRef   = useRef<View>(null);
  const scrollRef     = useRef<ScrollView>(null);
  const scrollY       = useRef(0);
  const tourSteps: TourStep[] = [
    { ref: tourHeroRef, icon: 'store-outline', title: 'Tu tarjeta', text: 'Así te presentas. Toca para cambiar tu portada y tu logo.' },
    { ref: tourInfoRef, icon: 'pencil-outline', title: 'Edita por bloques', text: 'Datos, contacto y ajustes tienen su propio botón Editar.' },
  ];

  useEffect(() => {
    let alive = true;
    const path = restaurant?.verification_photo_path;
    if (!path) { setVerifUrl(null); return; }
    verificationPhotoUrl(path).then((u) => { if (alive) setVerifUrl(u); });
    return () => { alive = false; };
  }, [restaurant?.verification_photo_path]);

  useEffect(() => {
    setRifDraft(restaurant?.rif ?? '');
  }, [restaurant?.rif]);

  /** Pregunta cámara o galería (mismo patrón que ReviewSheet.addPhotos). */
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

  function saveRif() {
    updateMut.mutate(
      { rif: rifDraft.trim() || null },
      { onSuccess: () => toast.success('RIF guardado') },
    );
  }

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 20 }}>
        <Skeleton width={120} height={24} />
        <Skeleton height={190} radius={24} />
        <Skeleton height={300} radius={22} />
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

  const founder = isFounder(restaurant);
  const needsVerif = restaurant.status === 'pending' || restaurant.status === 'rejected';
  const showVerif = needsVerif && (verifOpen || restaurant.status === 'rejected');
  const verifDone = !!restaurant.verification_photo_path && !!restaurant.rif;
  const statusTint = restaurant.status === 'pending' ? C.tertiaryContainer : C.error + '22';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.background }}>

      {/* Header */}
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <AppText variant="title">Mi perfil</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 2 }}>Cómo te ve la gente</AppText>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, ...shadow.sm }}
        >
          <Icon name="settings" size={18} color={C.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96, gap: 20, ...capWidth(isTablet) }}
      >

        {/* Estado de la revisión */}
        {restaurant.status !== 'approved' && (
          <View style={{ borderRadius: 18, padding: 16, gap: 10, backgroundColor: statusTint, borderWidth: 1, borderColor: C.border }}>
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

            {restaurant.status === 'pending' && (
              <Pressable onPress={() => setVerifOpen(v => !v)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={verifDone ? 'check-circle' : 'alert-circle-outline'} size={16} color={C.onSurface} />
                <AppText variant="label" style={{ flex: 1 }}>
                  {verifDone ? 'Foto y RIF enviados' : 'Falta la foto o el RIF'}
                </AppText>
                <AppText variant="label" color={C.primary}>{showVerif ? 'Ocultar' : 'Ver'}</AppText>
              </Pressable>
            )}

            {showVerif && (
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
                      <Image source={{ uri: verifUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <Icon name={restaurant.ghost_kitchen ? 'mdi:pot-steam-outline' : 'storefront-outline'} size={26} color={C.outline} />
                        <AppText variant="caption" color={C.outline}>
                          Subir foto de {restaurant.ghost_kitchen ? 'tu cocina' : 'la fachada'}
                        </AppText>
                      </View>
                    )}
                    {verifUrl && !verifUploading && (
                      <View style={{ position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                        <AppText variant="label" color={C.onSurface}>Cambiar</AppText>
                      </View>
                    )}
                    {verifUploading && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
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
                      <Button label="Guardar" onPress={saveRif} loading={updateMut.isPending} size="sm" fullWidth={false} />
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

        {/* Tarjeta: solo lectura; portada y logo se cambian en Fotos */}
        <Pressable
          ref={tourHeroRef}
          collapsable={false}
          onPress={() => router.push((plan ? '/local/photos' : '/subscription') as any)}
          style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...shadow.md }}
        >
          <View style={{ height: 110, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
            {restaurant.cover_url ? (
              <Image source={{ uri: restaurant.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={150} />
            ) : (
              <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={48} color={C.primary} />
            )}
            <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
              <Icon name={plan ? 'camera-plus-outline' : 'lock-outline'} size={12} color={C.onSurface} />
              <AppText variant="caption" color={C.onSurface} style={{ fontSize: 11 }}>{plan ? 'Cambiar fotos' : 'Con el plan'}</AppText>
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 18, backgroundColor: C.surface }}>
            <View style={{ marginTop: -28, marginBottom: 10, width: 64, height: 64 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, overflow: 'hidden', backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.surface }}>
                {restaurant.logo_url ? (
                  <Image source={{ uri: restaurant.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                ) : (
                  <Icon name={restaurant.categories[0]?.icon ?? 'store-outline'} size={30} color="#fff" />
                )}
              </View>
              {founder && (
                <View style={{ position: 'absolute', top: -4, right: -4 }}>
                  <FounderBadge rank={restaurant.founder_rank!} size="md" />
                </View>
              )}
            </View>

            <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }}>{restaurant.name}</AppText>

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

            {founder && (
              <View style={{ marginTop: 8 }}>
                <FounderBadge rank={restaurant.founder_rank!} size="md" />
              </View>
            )}
          </View>
        </Pressable>

        <View ref={tourInfoRef} collapsable={false} style={{ gap: 12 }}>
          <BusinessBlock restaurant={restaurant} />
        </View>
        <ContactBlock restaurant={restaurant} />
        <SettingsBlock restaurant={restaurant} />

      </ScrollView>

      <TourGuide tourKey="owner_profile" steps={tourSteps} scrollRef={scrollRef} scrollOffset={scrollY} />
    </KeyboardAvoidingView>
  );
}
