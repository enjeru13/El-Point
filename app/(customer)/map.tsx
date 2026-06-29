import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FLOATING_NAV_H, shadow } from '@/lib/theme';
import { SearchBar } from '@/components/ui/SearchBar';
import { StarRow } from '@/components/ui/StarRow';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BASE = [
  { id: '1', name: 'La Smasheria',    category: 'Burgers',  icon: 'hamburger' as const,   rating: 4.8, hot: true,  hotPct: 85, iconBg: C.primaryFixed,       dLat:  0.0018, dLng:  0.0000 },
  { id: '2', name: 'Pizza Mágica',    category: 'Pizza',    icon: 'pizza' as const,        rating: 4.2, hot: false, hotPct: 40, iconBg: C.tertiaryContainer,  dLat:  0.0032, dLng:  0.0026 },
  { id: '3', name: 'El Perrero Loco', category: 'Hot Dogs', icon: 'food-hot-dog' as const, rating: 5.0, hot: true,  hotPct: 95, iconBg: C.secondaryContainer, dLat: -0.0016, dLng: -0.0019 },
  { id: '4', name: 'Arepa & Co.',     category: 'Arepas',   icon: 'corn' as const,         rating: 4.6, hot: false, hotPct: 60, iconBg: C.primaryFixed,       dLat:  0.0029, dLng: -0.0034 },
];

const DEFAULT_ORIGIN = { latitude: 10.4806, longitude: -66.9036 };

function buildRestaurants(origin: { latitude: number; longitude: number }) {
  return MOCK_BASE.map(r => {
    const lat = origin.latitude  + r.dLat;
    const lng = origin.longitude + r.dLng;
    const distM = Math.round(
      Math.sqrt(Math.pow(r.dLat * 111000, 2) + Math.pow(r.dLng * 111000 * Math.cos(origin.latitude * Math.PI / 180), 2))
    );
    const distance = distM < 1000 ? `${distM} m` : `${(distM / 1000).toFixed(1)} km`;
    return { ...r, lat, lng, distance };
  });
}

const CATEGORIES: { id: string; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { id: 'all',      label: 'Todo',     icon: 'silverware-fork-knife' },
  { id: 'burgers',  label: 'Burgers',  icon: 'hamburger' },
  { id: 'pizza',    label: 'Pizza',    icon: 'pizza' },
  { id: 'hotdogs',  label: 'Hot Dogs', icon: 'food-hot-dog' },
  { id: 'arepas',   label: 'Arepas',   icon: 'corn' },
  { id: 'trending', label: 'Trending', icon: 'fire' },
];

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8f7067' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e4beb3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f0' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e8f0e4' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

type Restaurant = ReturnType<typeof buildRestaurants>[0];

// ─── Selected card (compact bottom) ───────────────────────────────────────────

function SelectedCard({
  restaurant,
  translateY,
  onClose,
  onViewProfile,
}: {
  restaurant: Restaurant | null;
  translateY: Animated.Value;
  onClose: () => void;
  onViewProfile: () => void;
}) {
  if (!restaurant) return null;
  return (
    <Animated.View
      style={{
        position: 'absolute', bottom: FLOATING_NAV_H, left: 0, right: 0,
        transform: [{ translateY }],
      }}
    >
      <View
        style={{
          margin: 12, marginBottom: 16,
          backgroundColor: C.surface,
          borderRadius: 24,
          borderWidth: 2, borderColor: C.border,
          padding: 16, gap: 12,
          ...shadow.lg,
        }}
      >
        {/* Handle */}
        <Pressable onPress={onClose} style={{ alignItems: 'center' }}>
          <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: C.outlineVariant }} />
        </Pressable>

        {/* Info row */}
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {/* Thumb */}
          <View
            style={{
              width: 72, height: 72, borderRadius: 18,
              backgroundColor: restaurant.iconBg,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: C.border,
              flexShrink: 0,
            }}
          >
            <MaterialCommunityIcons name={restaurant.icon} size={34} color={C.onSurface} style={{ opacity: 0.7 }} />
            {restaurant.hot && (
              <View
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: C.primaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: C.border,
                }}
              >
                <MaterialCommunityIcons name="fire" size={11} color={C.onSurface} />
              </View>
            )}
          </View>

          {/* Text */}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 20, lineHeight: 24 }}>
              {restaurant.name}
            </Text>

            {/* Category chip */}
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 4 }}>
              <View
                style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
                  backgroundColor: C.surfaceContainerHigh,
                  borderWidth: 1.5, borderColor: C.outlineVariant,
                }}
              >
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                  {restaurant.category}
                </Text>
              </View>
            </View>

            {/* Stars + rating */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <StarRow rating={restaurant.rating} />
              <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>
                {restaurant.rating.toFixed(1)}
              </Text>
            </View>

            {/* Distance */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color={C.primary} />
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                {restaurant.distance} de tu ubicación
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={onViewProfile}
          style={{
            height: 48, borderRadius: 99,
            backgroundColor: C.primary,
            borderWidth: 2, borderColor: C.border,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            ...shadow.primary,
          }}
        >
          <Text style={{ color: C.onPrimary, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>
            Ver perfil
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={C.onPrimary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected]             = useState<Restaurant | null>(null);
  const [search, setSearch]                 = useState('');
  const [locLoading, setLocLoading]         = useState(false);

  const sheetY    = useRef(new Animated.Value(300)).current;
  const pingAnim  = useRef(new Animated.Value(1)).current;
  const mapRef    = useRef<MapView>(null);

  // Ping loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.8, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1,   duration: 800,  easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Initial location
  useEffect(() => {
    requestLocation();
  }, []);

  async function requestLocation() {
    setLocLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocLoading(false); return; }
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);
    setLocLoading(false);
    mapRef.current?.animateToRegion({
      ...coords,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 800);
  }

  function openSheet(r: Restaurant) {
    setSelected(r);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  }

  function closeSheet() {
    Animated.timing(sheetY, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => setSelected(null));
  }

  const origin = userLocation ?? DEFAULT_ORIGIN;
  const restaurants = buildRestaurants(origin);

  const region = {
    latitude: origin.latitude,
    longitude: origin.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  const filtered = restaurants.filter(r => {
    if (activeCategory === 'trending') return r.hot;
    if (activeCategory !== 'all') return r.category.toLowerCase().replace(' ', '') === activeCategory;
    if (search.trim()) return r.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        customMapStyle={MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPress={closeSheet}
      >
        {/* User location */}
        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={80}
              fillColor="rgba(174,50,0,0.08)"
              strokeColor="rgba(174,50,0,0.2)"
              strokeWidth={1}
            />
            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: 'rgba(174,50,0,0.2)',
                    transform: [{ scale: pingAnim }],
                  }}
                />
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary, borderWidth: 2.5, borderColor: '#fff' }} />
              </View>
            </Marker>
          </>
        )}

        {/* Restaurant markers */}
        {filtered.map(r => {
          const isSelected = selected?.id === r.id;
          const dim = !!selected && !isSelected;
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              onPress={() => openSheet(r)}
            >
              <View style={{ alignItems: 'center', opacity: dim ? 0.4 : 1 }}>
                <View
                  style={{
                    width: isSelected ? 54 : 46,
                    height: isSelected ? 54 : 46,
                    borderRadius: isSelected ? 27 : 23,
                    backgroundColor: isSelected ? C.primary : C.surface,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: C.border,
                    ...(isSelected ? shadow.primary : shadow.sm),
                  }}
                >
                  <MaterialCommunityIcons
                    name={r.icon}
                    size={isSelected ? 26 : 22}
                    color={isSelected ? '#fff' : C.primary}
                  />
                </View>
                <View
                  style={{
                    marginTop: 3,
                    backgroundColor: isSelected ? C.primary : C.surface,
                    borderWidth: 1.5, borderColor: C.border,
                    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
                    flexDirection: 'row', alignItems: 'center', gap: 3,
                  }}
                >
                  <MaterialCommunityIcons name="star" size={9} color={isSelected ? C.secondaryContainer : C.secondary} />
                  <Text style={{ color: isSelected ? '#fff' : C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                    {r.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
              <Callout tooltip><View /></Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Search + chips flotantes ── */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, gap: 8 }}>
        <View style={{ marginHorizontal: 12 }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            variant="floating"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 4, paddingTop: 2, paddingHorizontal: 12 }}
        >
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => { setActiveCategory(cat.id); closeSheet(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
                  borderWidth: 2,
                  borderColor: active ? C.border : C.outlineVariant,
                  backgroundColor: active ? C.primary : C.surface,
                  ...(active ? shadow.primary : shadow.sm),
                }}
              >
                <MaterialCommunityIcons name={cat.icon} size={13} color={active ? '#fff' : C.onSurfaceVariant} />
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: active ? '#fff' : C.onSurface }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── GPS button ── */}
      <Pressable
        onPress={requestLocation}
        style={{
          position: 'absolute',
          right: 14,
          bottom: FLOATING_NAV_H + 16,
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: locLoading ? C.primaryFixed : C.surface,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: C.border,
          ...shadow.md,
        }}
      >
        <MaterialCommunityIcons
          name={locLoading ? 'loading' : 'crosshairs-gps'}
          size={22}
          color={C.primary}
        />
      </Pressable>

      {/* ── Selected card ── */}
      <SelectedCard
        restaurant={selected}
        translateY={sheetY}
        onClose={closeSheet}
        onViewProfile={() => selected && router.push(`/restaurant/${selected.id}`)}
      />
    </View>
  );
}
