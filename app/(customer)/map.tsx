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
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_NAV_H } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { useNearby, useRestaurantIcons, type NearbyRestaurant } from '@/lib/queries/nearby';

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

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'all',      label: 'Todo',     icon: 'silverware-fork-knife' },
  { id: 'burgers',  label: 'Burgers',  icon: 'hamburger' },
  { id: 'pizza',    label: 'Pizza',    icon: 'pizza' },
  { id: 'hotdogs',  label: 'Hot Dogs', icon: 'food-hot-dog' },
  { id: 'arepas',   label: 'Arepas',   icon: 'corn' },
  { id: 'finedining', label: 'Alta Cocina', icon: 'silverware-fork-knife' },
];

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
          <Text style={{
            color: isSelected ? C.onPrimary : C.onSurface,
            fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10,
            marginLeft: 2,
          }}>
            {restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : '–'}
          </Text>
        </View>
      </View>
      <Callout tooltip><View /></Callout>
    </Marker>
  );
});

// ─── Bottom card ──────────────────────────────────────────────────────────────

function RestaurantCard({
  restaurant, translateY, onClose, onViewProfile,
}: {
  restaurant: Restaurant | null;
  translateY: Animated.Value;
  onClose: () => void;
  onViewProfile: () => void;
}) {
  const { C, shadow } = useTheme();

  return (
    <Animated.View
      pointerEvents={restaurant ? 'auto' : 'none'}
      style={{
        position: 'absolute', bottom: FLOATING_NAV_H + 24,
        left: 12, right: 12,
        transform: [{ translateY }],
      }}
    >
      {restaurant && (
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 22,
          borderWidth: 2, borderColor: C.border,
          ...shadow.lg,
        }}>
          {/* Handle de cierre */}
          <Pressable onPress={onClose} style={{ paddingTop: 10, paddingBottom: 6, alignItems: 'center' }}>
            <View style={{ width: 32, height: 4, borderRadius: 99, backgroundColor: C.outlineVariant }} />
          </Pressable>

          {/* Fila principal */}
          <Pressable onPress={onViewProfile} style={{ padding: 14, paddingTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

              {/* Thumbnail 58x58 */}
              <View style={{
                width: 58, height: 58, borderRadius: 14,
                backgroundColor: C.primaryFixed,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}>
                <Icon name={restaurant.icon} size={28} color={C.onSurface} style={{ opacity: 0.65 }} />
              </View>

              {/* Info */}
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17, lineHeight: 21 }} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 }}>
                  {[priceLabel(restaurant.price_level), restaurant.distanceLabel].filter(Boolean).join(' · ')}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  {[1,2,3,4,5].map(i => (
                    <Icon
                      key={i}
                      name={i <= Math.round(restaurant.rating_avg) ? 'star' : 'star-outline'}
                      size={13}
                      color={C.secondary}
                    />
                  ))}
                  <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, marginLeft: 4 }}>
                    {restaurant.rating_count > 0 ? restaurant.rating_avg.toFixed(1) : 'Sin ranks'}
                  </Text>
                </View>
              </View>

              {/* Flecha */}
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: C.primary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}>
                <Icon name="arrow-right" size={20} color={C.onPrimary} />
              </View>

            </View>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { C, shadow } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [userLocation, setUserLocation]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected]             = useState<Restaurant | null>(null);
  const [search, setSearch]                 = useState('');
  const [locLoading, setLocLoading]         = useState(false);

  const sheetY   = useRef(new Animated.Value(400)).current;
  const gpsY     = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(1)).current;
  const mapRef   = useRef<MapView>(null);

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
    Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.8, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1,   duration: 800,  easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => { requestLocation(); }, []);

  async function requestLocation() {
    setLocLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocLoading(false); return; }
    const loc    = await Location.getCurrentPositionAsync({});
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);
    setLocLoading(false);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 800);
  }

  const CARD_HEIGHT = 220;

  function openSheet(r: Restaurant) {
    sheetY.stopAnimation();
    gpsY.stopAnimation();
    setSelected(r);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 14 }).start();
    Animated.spring(gpsY, { toValue: -(CARD_HEIGHT), useNativeDriver: true, bounciness: 5, speed: 14 }).start();
    mapRef.current?.animateToRegion({
      latitude: r.lat - 0.006,
      longitude: r.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 400);
  }

  function closeSheet() {
    sheetY.stopAnimation();
    gpsY.stopAnimation();
    Animated.timing(sheetY, { toValue: 400, duration: 240, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSelected(null);
    });
    Animated.timing(gpsY, { toValue: 0, duration: 240, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
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
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => { setActiveCategory(cat.id); if (selected) closeSheet(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
                  borderWidth: 2,
                  borderColor: active ? C.border : C.outlineVariant,
                  backgroundColor: active ? C.primary : C.surface,
                  ...(active ? shadow.primary : shadow.sm),
                }}
              >
                <Icon name={cat.icon} size={13} color={active ? C.onPrimary : C.onSurfaceVariant} />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: active ? C.onPrimary : C.onSurface }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Estado */}
        {(nearbyQ.isLoading || (!nearbyQ.isLoading && filtered.length === 0)) && (
          <View style={{ alignSelf: 'center', marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
            {nearbyQ.isLoading
              ? <><ActivityIndicator size="small" color={C.primary} /><Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurfaceVariant }}>Buscando lugares...</Text></>
              : <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurfaceVariant }}>Sin lugares en el área</Text>
            }
          </View>
        )}
      </View>

      {/* ── GPS button ── */}
      <Animated.View style={{
        position: 'absolute', right: 14, bottom: FLOATING_NAV_H + 16,
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

      {/* ── Restaurant card ── */}
      <RestaurantCard
        restaurant={selected}
        translateY={sheetY}
        onClose={closeSheet}
        onViewProfile={() => selected && router.push(`/restaurant/${selected.id}`)}
      />
    </View>
  );
}
