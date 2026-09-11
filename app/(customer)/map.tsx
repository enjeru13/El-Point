import { Icon } from '@/components/ui/Icon';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { AppText } from '@/components/ui/AppText';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_NAV_H } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { StarBadge } from '@/components/ui/StarBadge';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toast';
import { useNearby, useRestaurantIcons, useRestaurantAmenitiesMap, type NearbyRestaurant, type NearbyAmenity } from '@/lib/queries/nearby';
import { isBoosted, isFounder } from '@/lib/queries/restaurants';
import { useCategories } from '@/lib/queries/categories';
import { TourGuide, type TourStep } from '@/components/tour/TourGuide';
import { capWidth, useIsTablet } from '@/lib/responsive';

// ─── Config ───────────────────────────────────────────────────────────────────

// San Cristobal, Tachira, Venezuela
const DEFAULT_ORIGIN = { latitude: 7.7669, longitude: -72.2251 };
const RADIUS_KM = 8;

type Restaurant = NearbyRestaurant & { icon: string; distanceLabel: string; amenities: NearbyAmenity[] };

function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function priceLabel(level: number | null): string {
  return level && level >= 1 ? '$'.repeat(Math.min(level, 3)) : '';
}

const PINNED = [{ slug: 'all', label: 'Todo', icon: 'silverware-fork-knife' }];

const MAP_STYLE_LIGHT = [
  { elementType: 'geometry',            stylers: [{ color: '#f5f5f0' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#8f7067' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry',        stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e4beb3' }] },
  { featureType: 'water', elementType: 'geometry',       stylers: [{ color: '#c9e8f0' }] },
  { featureType: 'poi',  elementType: 'geometry',        stylers: [{ color: '#e8f0e4' }] },
  { featureType: 'poi',  elementType: 'labels',          stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',                              stylers: [{ visibility: 'off' }] },
];

const MAP_STYLE_DARK = [
  { elementType: 'geometry',            stylers: [{ color: '#14141a' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#8a8a90' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#0a0a0b' }] },
  { featureType: 'road', elementType: 'geometry',        stylers: [{ color: '#26262d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9a9aa2' }] },
  { featureType: 'water', elementType: 'geometry',       stylers: [{ color: '#0e1a1f' }] },
  { featureType: 'poi',  elementType: 'geometry',        stylers: [{ color: '#1a201c' }] },
  { featureType: 'poi',  elementType: 'labels',          stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',                              stylers: [{ visibility: 'off' }] },
];

// ─── Marker image factory ───────────────────────────────────────────────────
// Android map markers need a real bitmap. A live custom View can get frozen
// mid-paint by react-native-maps' own snapshot step and render corrupted —
// e.g. only the top-left quarter of the circle. So instead we render each
// marker's look once, off-screen, capture it to a PNG ourselves with
// react-native-view-shot, and hand the Marker a plain `image` — no live view,
// nothing for react-native-maps to (mis)snapshot, ever.

const MARKER_W = 70;
const MARKER_H = 92;

function markerCacheKey(r: Restaurant, scheme: string): string {
  const rating = r.rating_count > 0 ? r.rating_avg.toFixed(1) : '-';
  return `${r.id}:${r.icon}:${rating}:${scheme}`;
}

function MarkerTemplate({ restaurant }: { restaurant: Restaurant }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{ width: MARKER_W, height: MARKER_H, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5, borderColor: C.outlineVariant,
        ...shadow.sm,
      }}>
        <Icon name={restaurant.icon} size={22} color={C.primary} />
      </View>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: C.surface,
        marginTop: -1,
      }} />
      <View style={{
        marginTop: 2,
        backgroundColor: C.surface,
        borderWidth: 1.5, borderColor: C.outlineVariant,
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Icon name="star" size={9} color={C.secondary} />
        <AppText variant="caption" color={C.onSurface} style={{ marginLeft: 2 }}>
          {restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–'}
        </AppText>
      </View>
    </View>
  );
}

function MarkerImageFactory({
  pending,
  onReady,
}: {
  pending: Restaurant[];
  onReady: (key: string, uri: string) => void;
}) {
  const { scheme } = useTheme();
  const refs = useRef<Record<string, View | null>>({});
  const started = useRef<Set<string>>(new Set());

  async function capture(key: string) {
    const node = refs.current[key];
    if (!node) return;
    try {
      const uri = await captureRef(node, { format: 'png', quality: 1, result: 'data-uri' });
      onReady(key, uri);
    } catch {
      started.current.delete(key); // deja reintentar en el próximo render
    }
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -1000, left: -1000, opacity: 0 }}>
      {pending.map(r => {
        const key = markerCacheKey(r, scheme);
        return (
          <View
            key={key}
            ref={(node) => { refs.current[key] = node; }}
            collapsable={false}
            onLayout={() => {
              if (started.current.has(key)) return;
              started.current.add(key);
              // Dos frames de margen para que Android termine de pintar antes de capturar.
              requestAnimationFrame(() => requestAnimationFrame(() => capture(key)));
            }}
          >
            <MarkerTemplate restaurant={r} />
          </View>
        );
      })}
    </View>
  );
}

// ─── Bottom card ──────────────────────────────────────────────────────────────

const CARD_H = 222;

function RestaurantCard({
  restaurant,
  onViewProfile,
}: {
  restaurant: Restaurant;
  onViewProfile: () => void;
}) {
  const { C } = useTheme();
  const meta = [priceLabel(restaurant.price_level), restaurant.distanceLabel]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2, gap: 12 }}>
      {/* top row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{
          width: 60, height: 60, borderRadius: 14, overflow: 'hidden',
          backgroundColor: C.primaryFixed,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: C.border,
        }}>
          {restaurant.cover_url || restaurant.logo_url ? (
            <Image source={{ uri: (restaurant.cover_url ?? restaurant.logo_url)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
          ) : (
            <Icon name={restaurant.icon} size={28} color={C.onSurface} style={{ opacity: 0.65 }} />
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="heading" style={{ fontSize: 17, lineHeight: 21, flexShrink: 1 }} numberOfLines={1}>
              {restaurant.name}
            </AppText>
            {isFounder(restaurant) && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
                backgroundColor: '#f0c26022', borderWidth: 1, borderColor: '#f0c26066',
              }}>
                <Icon name="crown" size={11} color="#b8860b" />
                <AppText variant="caption" color="#b8860b" style={{ fontSize: 10 }}>
                  Fundador #{restaurant.founder_rank}
                </AppText>
              </View>
            )}
            {isBoosted(restaurant) && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
                backgroundColor: C.primary + '22', borderWidth: 1, borderColor: C.primary + '55',
              }}>
                <Icon name="fire" size={11} color={C.primary} />
                <AppText variant="caption" color={C.primary} style={{ fontSize: 10 }}>Destacado</AppText>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StarBadge rating={restaurant.rating_avg} count={restaurant.rating_count} size="sm" />
            {restaurant.rating_count > 0 && (
              <AppText variant="caption" color={C.outline}>
                {restaurant.rating_count} {restaurant.rating_count === 1 ? 'rank' : 'ranks'}
              </AppText>
            )}
          </View>
          {!!meta && (
            <AppText variant="caption" color={C.outline}>{meta}</AppText>
          )}
        </View>
      </View>

      {/* address */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="map-marker-outline" size={14} color={C.outline} />
        <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={1} style={{ flex: 1 }}>
          {restaurant.address ?? 'Ubicación en el mapa'}
        </AppText>
      </View>

      {/* amenities resumidas (solo iconos para que quepan) */}
      {restaurant.amenities.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {restaurant.amenities.slice(0, 6).map((a) => (
            <View
              key={a.slug}
              style={{
                width: 26, height: 26, borderRadius: 8,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.surfaceContainerLow,
                borderWidth: 1, borderColor: C.outlineVariant,
              }}
            >
              <Icon name={a.icon} size={13} color={C.onSurfaceVariant} />
            </View>
          ))}
          {restaurant.amenities.length > 6 && (
            <AppText variant="caption" color={C.outline} style={{ fontSize: 11 }}>
              +{restaurant.amenities.length - 6}
            </AppText>
          )}
        </View>
      )}

      <Button
        label="Ver restaurante"
        onPress={onViewProfile}
        size="sm"
        iconTrailing="arrow-right"
      />
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { C, shadow, scheme } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const toast   = useToast();
  const isTablet = useIsTablet();

  const [userLocation, setUserLocation]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const categoriesQ = useCategories();
  const [selected, setSelected]             = useState<Restaurant | null>(null);
  const [search, setSearch]                 = useState('');
  const [locLoading, setLocLoading]         = useState(false);

  const sheetRef = useRef<BottomSheet>(null);
  const gpsY     = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(1)).current;
  const mapRef   = useRef<MapView>(null);
  const sheetSnap = useMemo(() => [CARD_H], []);

  // Coach-mark targets for the first-use tour.
  const tourSearchRef = useRef<View>(null);
  const tourChipsRef  = useRef<View>(null);
  const tourGpsRef    = useRef<View>(null);
  const tourSteps: TourStep[] = [
    { ref: tourSearchRef, icon: 'magnify', title: 'Busca directo en el mapa', text: 'Escribe un nombre y los pines se filtran al momento.' },
    { ref: tourChipsRef, icon: 'silverware-fork-knife', title: 'Filtra los pines', text: 'Toca una categoría para ver solo esos locales cerca de ti.' },
    { ref: tourGpsRef, icon: 'crosshairs-gps', title: 'Céntrate en tu ubicación', text: 'Un toque y el mapa se mueve a donde estás.' },
  ];

  const origin = userLocation ?? DEFAULT_ORIGIN;
  const nearbyQ = useNearby(origin, RADIUS_KM, activeCategory === 'all' ? null : activeCategory);
  const iconsQ = useRestaurantIcons();
  const amenitiesMapQ = useRestaurantAmenitiesMap();

  const restaurants: Restaurant[] = useMemo(() => {
    const icons = iconsQ.data;
    const am = amenitiesMapQ.data;
    return (nearbyQ.data ?? []).map(r => ({
      ...r,
      icon: icons?.get(r.id) ?? 'silverware-fork-knife',
      distanceLabel: fmtDistance(r.distance_m),
      amenities: am?.get(r.id) ?? [],
    }));
  }, [nearbyQ.data, iconsQ.data, amenitiesMapQ.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(r => r.name.toLowerCase().includes(q));
  }, [restaurants, search]);

  // Pre-rendered marker bitmaps (see MarkerImageFactory above).
  const [markerImages, setMarkerImages] = useState<Record<string, string>>({});
  const pendingImages = useMemo(
    () => filtered.filter(r => !markerImages[markerCacheKey(r, scheme)]),
    [filtered, markerImages, scheme],
  );

  // Ping animation for user dot
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.8, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1,   duration: 800,  easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // On mount: only use the location we already have permission for — never prompt.
  useEffect(() => { primeLocation(); }, []);

  async function primeLocation() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const last = await Location.getLastKnownPositionAsync();
      const loc  = last ?? (await Location.getCurrentPositionAsync({}));
      if (loc) {
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch {
      // sin ubicación: el mapa usa el centro de San Cristóbal
    }
  }

  // GPS button: this is where we may prompt.
  async function requestLocation() {
    setLocLoading(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        ({ status } = await Location.requestForegroundPermissionsAsync());
      }
      if (status !== 'granted') {
        toast.error('Activa el permiso de ubicación para centrarte en el mapa.');
        return;
      }
      const loc    = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 800);
    } catch {
      toast.error('No pudimos obtener tu ubicación.');
    } finally {
      setLocLoading(false);
    }
  }

  const GPS_LIFT = CARD_H + 20;

  function liftGps(up: boolean) {
    gpsY.stopAnimation();
    Animated.spring(gpsY, {
      toValue: up ? -GPS_LIFT : 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }

  function openSheet(r: Restaurant) {
    setSelected(r);
    sheetRef.current?.snapToIndex(0);
    liftGps(true);
    mapRef.current?.animateToRegion({
      latitude: r.lat - 0.006,
      longitude: r.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 400);
  }

  function closeSheet() {
    sheetRef.current?.close();
    liftGps(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        customMapStyle={scheme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={(e) => {
          // Ignore taps that land on a marker so switching selection is one tap.
          if ((e.nativeEvent as any)?.action === 'marker-press') return;
          if (selected) closeSheet();
        }}
      >
        {/* User dot */}
        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={120}
              fillColor={`${C.primary}14`}
              strokeColor={`${C.primary}33`}
              strokeWidth={1}
            />
            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{
                  position: 'absolute',
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: `${C.primary}33`,
                  transform: [{ scale: pingAnim }],
                }} />
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary, borderWidth: 2.5, borderColor: '#fff' }} />
              </View>
            </Marker>
          </>
        )}

        {/* Restaurant markers */}
        {filtered.map(r => {
          const uri = markerImages[markerCacheKey(r, scheme)];
          if (!uri) return null; // aún capturando su bitmap
          const isSelected = selected?.id === r.id;
          return (
            <Fragment key={r.id}>
              {isSelected && (
                <Circle
                  center={{ latitude: r.lat, longitude: r.lng }}
                  radius={35}
                  fillColor={`${C.primary}33`}
                  strokeColor={`${C.primary}66`}
                  strokeWidth={2}
                />
              )}
              <Marker
                coordinate={{ latitude: r.lat, longitude: r.lng }}
                anchor={{ x: 0.5, y: 1 }}
                image={{ uri }}
                opacity={!!selected && !isSelected ? 0.4 : 1}
                tracksViewChanges={false}
                onPress={() => (isSelected ? closeSheet() : openSheet(r))}
              />
            </Fragment>
          );
        })}
      </MapView>

      {pendingImages.length > 0 && (
        <MarkerImageFactory
          pending={pendingImages}
          onReady={(key, uri) =>
            setMarkerImages(prev => (prev[key] ? prev : { ...prev, [key]: uri }))
          }
        />
      )}

      {/* ── Search + chips ── */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, gap: 8, ...capWidth(isTablet) }}>
        <View ref={tourSearchRef} collapsable={false} style={{ marginHorizontal: 12 }}>
          <SearchBar value={search} onChangeText={t => { setSearch(t); if (selected) closeSheet(); }} variant="floating" />
        </View>
        <View ref={tourChipsRef} collapsable={false}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingBottom: 4, paddingTop: 2 }}
          >
            {[...PINNED, ...(categoriesQ.data ?? [])].map(cat => (
              <Chip
                key={cat.slug}
                label={cat.label}
                icon={cat.icon}
                active={activeCategory === cat.slug}
                onPress={() => { setActiveCategory(cat.slug); if (selected) closeSheet(); }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Estado */}
        {nearbyQ.isLoading ? (
          <View style={{ alignSelf: 'center', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
            <ActivityIndicator size="small" color={C.primary} />
            <AppText variant="caption" color={C.onSurfaceVariant}>Buscando lugares...</AppText>
          </View>
        ) : filtered.length === 0 ? (
          <Pressable
            onPress={userLocation ? undefined : requestLocation}
            style={{ alignSelf: 'center', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm }}
          >
            <Icon name={userLocation ? 'map-marker-outline' : 'crosshairs-gps'} size={13} color={C.outline} />
            <AppText variant="caption" color={C.onSurfaceVariant}>
              {search.trim()
                ? 'Ningún lugar coincide'
                : userLocation
                  ? 'Sin lugares en el área'
                  : 'Toca para usar tu ubicación'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {/* ── GPS button ── */}
      <Animated.View
        ref={tourGpsRef}
        collapsable={false}
        style={{
          position: 'absolute', right: 14,
          bottom: Math.max(insets.bottom, 12) + 84,
          transform: [{ translateY: gpsY }],
        }}
      >
        <Pressable
          onPress={requestLocation}
          style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: locLoading ? C.primaryFixed : C.surface,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: C.border,
            ...shadow.md,
          }}
        >
          {locLoading
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Icon name="crosshairs-gps" size={22} color={C.primary} />
          }
        </Pressable>
      </Animated.View>

      {/* ── Restaurant card (bottom sheet) ── */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={sheetSnap}
        detached
        enableDynamicSizing={false}
        enablePanDownToClose
        bottomInset={FLOATING_NAV_H + Math.max(insets.bottom, 12)}
        style={{ marginHorizontal: 12 }}
        onClose={() => {
          setSelected(null);
          liftGps(false);
        }}
        handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 32 }}
        backgroundStyle={{
          backgroundColor: C.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <BottomSheetView>
          {selected && (
            <RestaurantCard
              restaurant={selected}
              onViewProfile={() => router.push(`/restaurant/${selected.id}`)}
            />
          )}
        </BottomSheetView>
      </BottomSheet>

      <TourGuide tourKey="map" ready={!nearbyQ.isLoading} steps={tourSteps} />
    </View>
  );
}
