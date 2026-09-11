import { Icon } from '@/components/ui/Icon';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { TimePickerSheet, type TimePickerHandle } from '@/components/ui/TimePickerSheet';
import { useMyRestaurant, useUpdateMyRestaurant, useUpdateRestaurantAmenities, useResubmitRestaurant } from '@/lib/queries/owner';
import { useAmenities } from '@/lib/queries/amenities';
import { Chip } from '@/components/ui/Chip';
import {
  uploadRestaurantImage,
  uploadRestaurantMenu,
  uploadRestaurantVerification,
  verificationPhotoUrl,
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { DEFAULT_HOURS, DAY_LABELS, DAY_LABELS_LONG, formatRange, to12h, type Hours } from '@/lib/hours';
import { instagramHandle } from '@/lib/contact';
import { TourGuide, type TourStep } from '@/components/tour/TourGuide';
import { capWidth, useIsTablet } from '@/lib/responsive';
import { isFounder } from '@/lib/queries/restaurants';
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
  const updateMut = useUpdateMyRestaurant(restaurant?.id);
  const updateAmenitiesMut = useUpdateRestaurantAmenities(restaurant?.id);
  const resubmit = useResubmitRestaurant();
  const amenitiesQ = useAmenities();

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
  const [amenityIds, setAmenityIds] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState<'logo' | 'cover' | 'menu' | null>(null);

  const [verifUploading, setVerifUploading] = useState(false);
  const [verifUrl, setVerifUrl] = useState<string | null>(null);
  const [rifDraft, setRifDraft] = useState('');

  const timePickerRef = useRef<TimePickerHandle>(null);

  // Coach-mark targets for the first-use tour.
  const tourEditRef   = useRef<View>(null);
  const tourInfoRef   = useRef<View>(null);
  const tourHoursRef  = useRef<View>(null);
  const tourPhotosRef = useRef<View>(null);
  const scrollRef     = useRef<ScrollView>(null);
  const scrollY       = useRef(0);
  const tourSteps: TourStep[] = [
    { ref: tourEditRef, icon: 'pencil-outline', title: 'Edita tu local', text: 'Toca aquí para actualizar dirección, contacto, comodidades y más.' },
    { ref: tourInfoRef, icon: 'store-outline', title: 'Información del negocio', text: 'Dirección, teléfono, WhatsApp, Instagram y tu rango de precio.' },
    { ref: tourHoursRef, icon: 'clock-outline', title: 'Tu horario', text: 'Marca los días abiertos y las horas de cada uno.' },
    { ref: tourPhotosRef, icon: 'camera-plus-outline', title: 'Fotos y menú', text: 'Portada, logo y tu carta en PDF: lo primero que ve el comensal.' },
  ];

  useEffect(() => {
    let alive = true;
    const path = restaurant?.verification_photo_path;
    if (!path) { setVerifUrl(null); return; }
    verificationPhotoUrl(path).then((u) => { if (alive) setVerifUrl(u); });
    return () => { alive = false; };
  }, [restaurant?.verification_photo_path]);

  async function pickFacade() {
    if (!restaurant) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (r.canceled) return;
    setVerifUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Sesión expirada');
      const path = await uploadRestaurantVerification(u.user.id, restaurant.id, r.assets[0].uri);
      updateMut.mutate({ verification_photo_path: path });
      const signed = await verificationPhotoUrl(path);
      setVerifUrl(signed ? `${signed}#${Date.now()}` : null);
      toast.success('Foto de fachada actualizada');
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

  function setDay(dow: number, patch: Partial<Hours['days'][number]>) {
    setHoursState((h) => ({ days: h.days.map((d, i) => (i === dow ? { ...d, ...patch } : d)) }));
  }

  function openTimePicker(dow: number, which: 'open' | 'close') {
    const d = hours.days[dow];
    timePickerRef.current?.present({
      title: `${DAY_LABELS_LONG[dow]} · ${which === 'open' ? 'abre' : 'cierra'}`,
      value: d[which],
      onPick: (hhmm) => setDay(dow, { [which]: hhmm }),
    });
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
      toast.error(e?.message ?? 'No se pudo subir la imagen');
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
      toast.error(e?.message ?? 'No se pudo subir el menú');
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
    setRifDraft(restaurant.rif ?? '');
    setAmenityIds(new Set(restaurant.amenities.map((a) => a.id)));
  }, [restaurant]);

  function toggleAmenity(id: number) {
    setAmenityIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
    setAmenityIds(new Set(restaurant.amenities.map((a) => a.id)));
    setEditing(false);
  }

  function save() {
    if (!name.trim()) { toast.error('El nombre no puede quedar vacío'); return; }
    const badTime = hours.days.some(
      (d) => !d.closed && (!/^\d{1,2}:\d{2}$/.test(d.open) || !/^\d{1,2}:\d{2}$/.test(d.close)),
    );
    if (badTime) { toast.error('Horario inválido. Usa el formato HH:MM (ej. 12:00).'); return; }
    updateMut.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        instagram: instagramHandle(instagram) ?? null,
        promo_text: promo.trim() || null,
        price_level: priceLevel,
        is_active: isActive,
        hours,
      },
      {
        onSuccess: () => { setEditing(false); toast.success('Cambios guardados'); },
        onError: (e: any) => toast.error(e?.message ?? 'No se pudo guardar'),
      },
    );
    updateAmenitiesMut.mutate(Array.from(amenityIds), {
      onError: (e: any) => toast.error(e?.message ?? 'No se pudieron guardar las comodidades'),
    });
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
            <Pressable
              onPress={cancel}
              disabled={busy}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.outlineVariant }}
            >
              <AppText variant="label" color={C.onSurfaceVariant}>Cancelar</AppText>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={busy}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: C.primary, borderWidth: 1, borderColor: C.border, ...shadow.sm,
              }}
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={15} color="#fff" />}
              <AppText variant="label" color="#fff">Guardar</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View ref={tourEditRef} collapsable={false}>
              <Pressable
                onPress={() => setEditing(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border, ...shadow.sm,
                }}
              >
                <Icon name="pencil-outline" size={15} color={C.primary} />
                <AppText variant="label" color={C.primary}>Editar</AppText>
              </Pressable>
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

                {/* Foto de fachada */}
                <View style={{ gap: 6 }}>
                  <AppText variant="overline" color={C.onSurfaceVariant}>
                    FOTO DE FACHADA
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
                        <Icon name="storefront-outline" size={26} color={C.outline} />
                        <AppText variant="caption" color={C.outline}>
                          Subir foto de la fachada
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
                    El frente del local con el letrero visible.
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
                  <View key={c.slug} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.border }}>
                    <AppText variant="caption" style={{ fontSize: 12 }}>{c.label}</AppText>
                  </View>
                ))}
              </View>
            )}

            {editing ? (
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
          <Field icon="phone-outline" label="Teléfono" value={phone} editing={editing} onChangeText={setPhone} placeholder="+58 276 000 0000" keyboardType="phone-pad" />
          <Divider />
          <Field icon="whatsapp" label="WhatsApp" value={whatsapp} editing={editing} onChangeText={setWhatsapp} placeholder="+58 412 000 0000" keyboardType="phone-pad" />
          <Divider />
          <Field icon="instagram" label="Instagram" value={instagram} editing={editing} onChangeText={setInstagram} placeholder="tu_local" />
          <Divider />

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

        {/* Comodidades */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <AppText variant="bodyStrong">Comodidades</AppText>
          </View>
          <View style={{ padding: 18 }}>
            {editing ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(amenitiesQ.data ?? []).map((am) => (
                  <Chip
                    key={am.id}
                    label={am.label}
                    icon={am.icon}
                    tone="secondary"
                    active={amenityIds.has(am.id)}
                    onPress={() => toggleAmenity(am.id)}
                  />
                ))}
              </View>
            ) : restaurant.amenities.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {restaurant.amenities.map((a) => (
                  <View key={a.slug} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.border }}>
                    <Icon name={a.icon} size={14} color={C.onSurface} />
                    <AppText variant="caption" style={{ fontSize: 12 }}>{a.label}</AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="bodySm" color={C.outline}>
                Aún no marcaste comodidades. Toca "Editar" para agregar.
              </AppText>
            )}
          </View>
        </View>

        {/* Horario */}
        <View ref={tourHoursRef} collapsable={false} style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <AppText variant="bodyStrong">Horario</AppText>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
              const d = hours.days[dow];
              return (
                <View key={dow} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="label" style={{ width: 40, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {DAY_LABELS[dow]}
                  </AppText>
                  {editing ? (
                    <>
                      <Switch
                        value={!d.closed}
                        onValueChange={(v) => setDay(dow, { closed: !v })}
                        trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                        thumbColor={!d.closed ? C.primary : C.outline}
                      />
                      {d.closed ? (
                        <AppText variant="bodySm" color={C.outline} style={{ flex: 1 }}>Cerrado</AppText>
                      ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pressable
                            onPress={() => openTimePicker(dow, 'open')}
                            style={{ flex: 1, backgroundColor: C.surfaceContainerLow, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <AppText variant="label" style={{ fontSize: 13 }}>{to12h(d.open)}</AppText>
                          </Pressable>
                          <AppText variant="bodySm" color={C.outline}>–</AppText>
                          <Pressable
                            onPress={() => openTimePicker(dow, 'close')}
                            style={{ flex: 1, backgroundColor: C.surfaceContainerLow, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 8, alignItems: 'center' }}
                          >
                            <AppText variant="label" style={{ fontSize: 13 }}>{to12h(d.close)}</AppText>
                          </Pressable>
                        </View>
                      )}
                    </>
                  ) : (
                    <AppText variant="label" color={d.closed ? C.outline : C.onSurfaceVariant} style={{ flex: 1 }}>
                      {formatRange(d)}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Oferta */}
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <AppText variant="bodyStrong">Oferta / promoción</AppText>
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
                <AppText variant="caption" color={C.outline} align="right" style={{ fontSize: 12 }}>{promo.length}/80</AppText>
              </>
            ) : restaurant.promo_text ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="tag" size={16} color={C.primary} />
                <AppText variant="bodyStrong" style={{ flex: 1, fontSize: 14 }}>{restaurant.promo_text}</AppText>
              </View>
            ) : (
              <AppText variant="bodySm" color={C.outline}>
                Sin oferta activa. Toca "Editar" para agregar una.
              </AppText>
            )}
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

        {/* Fotos y menú */}
        <View ref={tourPhotosRef} collapsable={false} style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <AppText variant="bodyStrong">Fotos y menú</AppText>
          </View>

          {/* Portada */}
          <View style={{ padding: 18, gap: 8, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
            <AppText variant="overline" color={C.outline}>FOTO DE PORTADA</AppText>
            <AppText variant="caption" color={C.onSurfaceVariant}>Se muestra grande arriba de tu perfil.</AppText>
            <Pressable
              onPress={() => pickPhoto('cover')}
              disabled={uploading !== null}
              style={{
                marginTop: 4,
                height: 150, borderRadius: 14, overflow: 'hidden',
                borderWidth: 1, borderColor: C.border, borderStyle: restaurant.cover_url ? 'solid' : 'dashed',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.surfaceContainerLow,
              }}
            >
              {restaurant.cover_url ? (
                <Image source={{ uri: restaurant.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Icon name="camera-plus-outline" size={28} color={C.primary} />
                  <AppText variant="label" color={C.onSurfaceVariant}>Elegir foto</AppText>
                </View>
              )}
              {restaurant.cover_url && uploading !== 'cover' && (
                <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                  <Icon name="camera-plus-outline" size={12} color={C.onSurface} />
                  <AppText variant="caption" color={C.onSurface} style={{ fontSize: 11 }}>Cambiar</AppText>
                </View>
              )}
              {uploading === 'cover' && (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </Pressable>
          </View>

          {/* Logo */}
          <Pressable
            onPress={() => pickPhoto('logo')}
            disabled={uploading !== null}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}
          >
            <View style={{
              width: 56, height: 56, borderRadius: 16, overflow: 'hidden',
              borderWidth: 1, borderColor: C.border, borderStyle: restaurant.logo_url ? 'solid' : 'dashed',
              alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryFixed,
            }}>
              {restaurant.logo_url ? (
                <Image source={{ uri: restaurant.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Icon name="image-plus" size={22} color={C.primary} />
              )}
              {uploading === 'logo' && (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Logo del local</AppText>
              <AppText variant="caption" color={C.outline} style={{ fontSize: 12, marginTop: 1 }}>
                {restaurant.logo_url ? 'Toca para cambiarlo' : 'Aparece junto a tu nombre'}
              </AppText>
            </View>
            <Icon name="chevron-right" size={18} color={C.outline} />
          </Pressable>

          {/* Menú PDF */}
          <Pressable
            onPress={pickMenu}
            disabled={uploading !== null}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: restaurant.menu_pdf_url ? C.primary : C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
              {uploading === 'menu'
                ? <ActivityIndicator size="small" color={restaurant.menu_pdf_url ? '#fff' : C.primary} />
                : <Icon name={restaurant.menu_pdf_url ? 'file-check' : 'file-pdf-box'} size={24} color={restaurant.menu_pdf_url ? '#fff' : C.primary} />}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Menú (PDF)</AppText>
              <AppText variant="caption" color={C.outline} style={{ fontSize: 12, marginTop: 1 }}>
                {restaurant.menu_pdf_url ? 'Cargado · toca para reemplazar' : 'Sube tu carta para los clientes'}
              </AppText>
            </View>
            <Icon name="chevron-right" size={18} color={C.outline} />
          </Pressable>
        </View>

      </ScrollView>

      <TimePickerSheet ref={timePickerRef} />
      <TourGuide tourKey="owner_profile" steps={tourSteps} scrollRef={scrollRef} scrollOffset={scrollY} />
    </View>
  );
}
