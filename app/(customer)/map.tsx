import { Icon } from '@/components/ui/Icon';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

// ─── Types & data ─────────────────────────────────────────────────────────────

type MockBase = {
  id: string; name: string; category: string;
  icon: string;
  rating: number; hot: boolean; hotPct: number;
  iconBg: string; dLat: number; dLng: number;
};

const DEFAULT_ORIGIN = { latitude: 10.4806, longitude: -66.9036 };

function buildRestaurants(mockBase: MockBase[], origin: { latitude: number; longitude: number }) {
  return mockBase.map(r => {
    const lat   = origin.latitude  + r.dLat;
    const lng   = origin.longitude + r.dLng;
    const distM = Math.round(
      Math.sqrt(
        Math.pow(r.dLat * 111000, 2) +
        Math.pow(r.dLng * 111000 * Math.cos(origin.latitude * Math.PI / 180), 2)
      )
    );
    return { ...r, lat, lng, distance: distM < 1000 ? `${distM} m` : `${(distM / 1000).toFixed(1)} km` };
  });
}

type Restaurant = ReturnType<typeof buildRestaurants>[0];

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'all',      label: 'Todo',     icon: 'silverware-fork-knife' },
  { id: 'burgers',  label: 'Burgers',  icon: 'hamburger' },
  { id: 'pizza',    label: 'Pizza',    icon: 'pizza' },
  { id: 'hotdogs',  label: 'Hot Dogs', icon: 'food-hot-dog' },
  { id: 'arepas',   label: 'Arepas',   icon: 'corn' },
  { id: 'trending', label: 'Trending', icon: 'fire' },
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

function RestaurantMarker({
  restaurant, isSelected, isDimmed, onPress,
}: {
  restaurant: Restaurant; isSelected: boolean; isDimmed: boolean; onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  // tracksViewChanges: true briefly after selection changes so native re-renders, then false for perf
  const [tracking, setTracking] = useState(false);
  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 400);
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
          {restaurant.hot && !isSelected && (
            <View style={{
              position: 'absolute', top: -5, right: -5,
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: C.primaryContainer,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: C.border,
            }}>
              <Icon name="fire" size={10} color={C.onSurface} />
            </View>
          )}
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
            {restaurant.rating.toFixed(1)}
          </Text>
        </View>
      </View>
      <Callout tooltip><View /></Callout>
    </Marker>
  );
}

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

  // Always rendered — never return null, so translateY animation works before restaurant mounts
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
                backgroundColor: restaurant.iconBg,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}>
                <Icon name={restaurant.icon} size={28} color={C.onSurface} style={{ opacity: 0.65 }} />
                {restaurant.hot && (
                  <View style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: C.primaryContainer,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: C.border,
                  }}>
                    <Icon name="fire" size={10} color={C.onSurface} />
                  </View>
                )}
              </View>

              {/* Info — ocupa el espacio restante */}
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17, lineHeight: 21 }} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 }}>
                  {restaurant.category} · {restaurant.distance}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  {[1,2,3,4,5].map(i => (
                    <Icon
                      key={i}
                      name={i <= Math.round(restaurant.rating) ? 'star' : 'star-outline'}
                      size={13}
                      color={C.secondary}
                    />
                  ))}
                  <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, marginLeft: 4 }}>
                    {restaurant.rating.toFixed(1)}
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

  const MOCK_BASE: MockBase[] = [
    { id: '1', name: 'La Smasheria',    category: 'Burgers',  icon: 'hamburger',   rating: 4.8, hot: true,  hotPct: 85, iconBg: C.primaryFixed,       dLat:  0.0018, dLng:  0.0000 },
    { id: '2', name: 'Pizza Mágica',    category: 'Pizza',    icon: 'pizza',        rating: 4.2, hot: false, hotPct: 40, iconBg: C.tertiaryContainer,  dLat:  0.0032, dLng:  0.0026 },
    { id: '3', name: 'El Perrero Loco', category: 'Hot Dogs', icon: 'food-hot-dog', rating: 5.0, hot: true,  hotPct: 95, iconBg: C.secondaryContainer, dLat: -0.0016, dLng: -0.0019 },
    { id: '4', name: 'Arepa & Co.',     category: 'Arepas',   icon: 'corn',         rating: 4.6, hot: false, hotPct: 60, iconBg: C.primaryFixed,       dLat:  0.0029, dLng: -0.0034 },
  ];

  const [userLocation, setUserLocation]   = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected]             = useState<Restaurant | null>(null);
  const [search, setSearch]                 = useState('');
  const [locLoading, setLocLoading]         = useState(false);

  const sheetY   = useRef(new Animated.Value(400)).current;
  const gpsY     = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(1)).current;
  const mapRef   = useRef<MapView>(null);

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
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 800);
  }

  const CARD_HEIGHT = 220;

  function openSheet(r: Restaurant) {
    setSelected(r);
    // Animate card up
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 14 }).start();
    // Push GPS button up
    Animated.spring(gpsY, { toValue: -(CARD_HEIGHT), useNativeDriver: true, bounciness: 5, speed: 14 }).start();
    // Center map slightly above selected marker so card doesn't cover it
    mapRef.current?.animateToRegion({
      latitude: r.lat - 0.003,
      longitude: r.lng,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 400);
  }

  function closeSheet() {
    Animated.timing(sheetY, { toValue: 400, duration: 240, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(() => setSelected(null));
    Animated.timing(gpsY,   { toValue: 0,   duration: 240, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }

  const origin      = userLocation ?? DEFAULT_ORIGIN;
  const restaurants = buildRestaurants(MOCK_BASE, origin);

  const filtered = restaurants.filter(r => {
    if (activeCategory === 'trending') return r.hot;
    if (activeCategory !== 'all') return r.category.toLowerCase().replace(/\s+/g, '') === activeCategory;
    if (search.trim()) return r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        customMapStyle={MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => selected && closeSheet()}
      >
        {/* User dot */}
        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={80}
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
      </View>

      {/* ── GPS button (sube cuando card está abierta) ── */}
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
