import { Icon } from '@/components/ui/Icon';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { AppText } from '@/components/ui/AppText';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_NAV_H } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { StarRow } from '@/components/ui/StarRow';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toast';
import { useNearby, useRestaurantIcons, type NearbyRestaurant } from '@/lib/queries/nearby';
import { useCategories } from '@/lib/queries/categories';

// ─── Config ───────────────────────────────────────────────────────────────────

// San Cristobal, Tachira, Venezuela
const DEFAULT_ORIGIN = { latitude: 7.7669, longitude: -72.2251 };
const RADIUS_KM = 8;

type Restaurant = NearbyRestaurant & { icon: string; distanceLabel: string };

function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function priceLabel(level: number | null): string {
  return level && level >= 1 ? '$'.repeat(Math.min(level, 3)) : '';
}

const PINNED = [{ slug: 'all', label: 'Todo', icon: 'silverware-fork-knife' }];

const MAP_STYLE = [
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

// ─── Marker ────────────────────────────────────────────────────────────────────

const RestaurantMarker = memo(function RestaurantMarker({
  restaurant, isSelected, isDimmed, onPress,
}: {
  restaurant: Restaurant; isSelected: boolean; isDimmed: boolean; onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  // Brief tracksViewChanges window only when this marker's selected state flips,
  // then back to false so the native view stops re-rendering (perf + crash guard).
  const [tracking, setTracking] = useState(true);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; }
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 250);
    return () => clearTimeout(t);
  }, [isSelected]);

  return (
    <Marker
      coordinate={{ latitude: restaurant.lat, longitude: restaurant.lng }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracking}
      onPress={onPress}
    >
      <View style={{ alignItems: 'center', opacity: isDimmed ? 0.35 : 1 }}>
        {/* Bubble */}
        <View style={{
          width: isSelected ? 54 : 46,
          height: isSelected ? 54 : 46,
          borderRadius: isSelected ? 27 : 23,
          backgroundColor: isSelected ? C.primary : C.surface,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2.5,
          borderColor: isSelected ? C.border : C.outlineVariant,
          ...(isSelected ? shadow.primary : shadow.sm),
        }}>
          <Icon
            name={restaurant.icon}
            size={isSelected ? 26 : 22}
            color={isSelected ? C.onPrimary : C.primary}
          />
        </View>

        {/* Pointy tail */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderTopColor: isSelected ? C.primary : C.surface,
          marginTop: -1,
        }} />

        {/* Rating pill */}
        <View style={{
          marginTop: 2,
          backgroundColor: isSelected ? C.primary : C.surface,
          borderWidth: 1.5, borderColor: isSelected ? C.border : C.outlineVariant,
          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
          flexDirection: 'row', alignItems: 'center',
        }}>
          <Icon
            name="star" size={9}
            color={isSelected ? C.secondaryContainer : C.secondary}
          />
          <AppText variant="caption" color={isSelected ? C.onPrimary : C.onSurface} style={{ marginLeft: 2 }}>
            {restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–'}
          </AppText>
        </View>
      </View>
      <Callout tooltip><View /></Callout>
    </Marker>
  );
});

// ─── Bottom card ──────────────────────────────────────────────────────────────

const CARD_H = 196;

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
          borderWidth: 2, borderColor: C.border,
        }}>
          {restaurant.cover_url || restaurant.logo_url ? (
            <Image source={{ uri: (restaurant.cover_url ?? restaurant.logo_url)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
          ) : (
            <Icon name={restaurant.icon} size={28} color={C.onSurface} style={{ opacity: 0.65 }} />
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', gap: 3 }}>
          <AppText variant="heading" style={{ fontSize: 17, lineHeight: 21 }} numberOfLines={1}>
            {restaurant.name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StarRow rating={Math.round(restaurant.rating_avg)} size={13} />
            <AppText variant="caption" color={C.onSurfaceVariant}>
              {restaurant.rating_count > 0
                ? `${restaurant.rating_avg.toFixed(1)} (${restaurant.rating_count})`
                : 'Sin ranks'}
            </AppText>
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
  const { C, shadow } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const toast   = useToast();

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

  const origin = userLocation ?? DEFAULT_ORIGIN;
  const nearbyQ = useNearby(origin, RADIUS_KM, activeCategory === 'all' ? null : activeCategory);
  const iconsQ = useRestaurantIcons();

  const restaurants: Restaurant[] = useMemo(() => {
    const icons = iconsQ.data;
    return (nearbyQ.data ?? []).map(r => ({
      ...r,
      icon: icons?.get(r.id) ?? 'silverware-fork-knife',
      distanceLabel: fmtDistance(r.distance_m),
    }));
  }, [nearbyQ.data, iconsQ.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter(r => r.name.toLowerCase().includes(q));
  }, [restaurants, search]);

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
        customMapStyle={MAP_STYLE}
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
        {filtered.map(r => (
          <RestaurantMarker
            key={r.id}
            restaurant={r}
            isSelected={selected?.id === r.id}
            isDimmed={!!selected && selected.id !== r.id}
            onPress={() => selected?.id === r.id ? closeSheet() : openSheet(r)}
          />
        ))}
      </MapView>

      {/* ── Search + chips ── */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, gap: 8 }}>
        <View style={{ marginHorizontal: 12 }}>
          <SearchBar value={search} onChangeText={t => { setSearch(t); if (selected) closeSheet(); }} variant="floating" />
        </View>
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

        {/* Estado */}
        {nearbyQ.isLoading ? (
          <View style={{ alignSelf: 'center', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
            <ActivityIndicator size="small" color={C.primary} />
            <AppText variant="caption" color={C.onSurfaceVariant}>Buscando lugares...</AppText>
          </View>
        ) : filtered.length === 0 ? (
          <Pressable
            onPress={userLocation ? undefined : requestLocation}
            style={{ alignSelf: 'center', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, ...shadow.sm }}
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
      <Animated.View style={{
        position: 'absolute', right: 14,
        bottom: Math.max(insets.bottom, 12) + 84,
        transform: [{ translateY: gpsY }],
      }}>
        <Pressable
          onPress={requestLocation}
          style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: locLoading ? C.primaryFixed : C.surface,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: C.border,
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
        bottomInset={FLOATING_NAV_H + 24}
        style={{ marginHorizontal: 12 }}
        onClose={() => {
          setSelected(null);
          liftGps(false);
        }}
        handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 32 }}
        backgroundStyle={{
          backgroundColor: C.surface,
          borderRadius: 22,
          borderWidth: 2,
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
    </View>
  );
}
