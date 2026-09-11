import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useToast } from '@/lib/toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBar } from '@/components/ui/SearchBar';
import { useRestaurantSearch, type SearchResult } from '@/lib/queries/search';
import { isBoosted } from '@/lib/queries/restaurants';
import { StarBadge } from '@/components/ui/StarBadge';
import { useCategories } from '@/lib/queries/categories';
import { useAmenities } from '@/lib/queries/amenities';
import { isOpenNow } from '@/lib/hours';
import { distanceKm, fmtKm, type LatLng } from '@/lib/geo';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { TourGuide, type TourStep } from '@/components/tour/TourGuide';
import { capWidth, useIsTablet } from '@/lib/responsive';

type SortKey = 'rank' | 'reviews' | 'near' | null;
type PriceKey = 1 | 2 | 3 | null;

const RECENTS_KEY = 'elpoint_recent_searches';
const RECENTS_MAX = 6;

async function loadRecents(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
async function saveRecents(list: string[]) {
  try {
    await SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(list));
  } catch {}
}

function priceLabel(level: number | null): string {
  return level && level >= 1 ? '$'.repeat(Math.min(level, 3)) : '';
}

// ─── Components ───────────────────────────────────────────────────────────────

function catLabel(item: SearchResult): string {
  return item.categories[0]?.label ?? 'Restaurante';
}
function catIcon(item: SearchResult): string {
  return item.categories[0]?.icon ?? 'silverware-fork-knife';
}

function OpenPill({ hours }: { hours: SearchResult['hours'] }) {
  const { C } = useTheme();
  if (!hours) return null;
  const open = isOpenNow(hours).open;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: open ? C.secondary : C.error }} />
      <AppText variant="caption" color={C.onSurface} style={{ fontSize: 11 }}>{open ? 'Abierto' : 'Cerrado'}</AppText>
    </View>
  );
}

function BoostChip() {
  const { C } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
      backgroundColor: C.primary + '22', borderWidth: 1, borderColor: C.primary + '55',
    }}>
      <Icon name="fire" size={11} color={C.primary} />
      <AppText variant="caption" color={C.primary} style={{ fontSize: 10 }}>Destacado</AppText>
    </View>
  );
}

/** Fila compacta para la lista de resultados (todo lo que no es el destacado). */
function ResultRow({
  item,
  userLoc,
  onPress,
}: {
  item: SearchResult;
  userLoc?: LatLng | null;
  onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  const [pressed, setPressed] = useState(false);
  const price = priceLabel(item.price_level);
  const open = item.hours ? isOpenNow(item.hours).open : null;
  const dist =
    userLoc && item.lat != null && item.lng != null
      ? fmtKm(distanceKm(userLoc, item.lat, item.lng))
      : null;
  const meta = [catLabel(item), price, dist].filter(Boolean).join('  ·  ');

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: C.surface, borderRadius: 16, padding: 10,
          borderWidth: 1, borderColor: C.border,
        },
        { transform: [{ translateY: pressed ? 1 : 0 }] },
        shadow.sm,
      ]}
    >
      <View style={{
        width: 60, height: 60, borderRadius: 13, overflow: 'hidden',
        backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: C.border,
      }}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
        ) : (
          <Icon name={catIcon(item)} size={26} color={C.onSurface} style={{ opacity: 0.5 }} />
        )}
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="heading" style={{ fontSize: 16, lineHeight: 20, flexShrink: 1 }} numberOfLines={1}>
            {item.name}
          </AppText>
          {isBoosted(item) && <BoostChip />}
        </View>
        <AppText variant="caption" color={C.outline} numberOfLines={1}>
          {meta}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {open !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: open ? C.secondary : C.error }} />
              <AppText variant="caption" color={open ? C.secondary : C.error} style={{ fontSize: 11 }}>
                {open ? 'Abierto' : 'Cerrado'}
              </AppText>
            </View>
          )}
          {item.address && (
            <AppText variant="caption" color={C.outline} numberOfLines={1} style={{ flex: 1, fontSize: 11 }}>
              {open !== null ? '· ' : ''}{item.address}
            </AppText>
          )}
        </View>
      </View>

      <StarBadge rating={item.rating_avg} count={item.rating_count} size="sm" />
    </Pressable>
  );
}

function PlaceCard({
  item,
  featured = false,
  userLoc,
  onPress,
}: {
  item: SearchResult;
  featured?: boolean;
  userLoc?: LatLng | null;
  onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  const [pressed, setPressed] = useState(false);

  if (!featured) {
    return <ResultRow item={item} userLoc={userLoc} onPress={onPress} />;
  }

  const imgH = 190;
  const price = priceLabel(item.price_level);
  const dist =
    userLoc && item.lat != null && item.lng != null
      ? fmtKm(distanceKm(userLoc, item.lat, item.lng))
      : null;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: 22,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: C.border,
        },
        { transform: [{ translateY: pressed ? 2 : 0 }] },
        featured ? shadow.md : shadow.sm,
      ]}
    >
      {/* Cover */}
      <View style={{ height: imgH, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <Icon name={catIcon(item)} size={featured ? 88 : 56} color={C.onSurface} style={{ opacity: 0.14 }} />
        )}

        {/* bottom scrim so any future overlay text reads */}
        <View pointerEvents="none" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 56,
          backgroundColor: 'rgba(28,27,27,0.18)',
        }} />

        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <OpenPill hours={item.hours} />
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <StarBadge rating={item.rating_avg} count={item.rating_count} size={featured ? 'md' : 'sm'} />
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: featured ? 16 : 14, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isBoosted(item) && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99,
              backgroundColor: C.primary + '22', borderWidth: 1, borderColor: C.primary + '55',
            }}>
              <Icon name="fire" size={12} color={C.primary} />
              <AppText variant="caption" color={C.primary} style={{ fontSize: 11 }}>Destacado</AppText>
            </View>
          )}
          <View style={{
            paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99,
            backgroundColor: C.secondaryContainer, borderWidth: 1.5, borderColor: C.border,
          }}>
            <AppText variant="caption" color={C.onSurface} style={{ fontSize: 11 }}>
              {catLabel(item)}
            </AppText>
          </View>
          {!!price && (
            <AppText variant="caption" color={C.outline}>{price}</AppText>
          )}
          <AppText variant="caption" color={C.outline}>
            {item.rating_count > 0
              ? `${item.rating_count} ${item.rating_count === 1 ? 'rank' : 'ranks'}`
              : 'Nuevo'}
          </AppText>
          {dist && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="map-marker-distance" size={12} color={C.primary} />
              <AppText variant="caption" color={C.primary}>{dist}</AppText>
            </View>
          )}
        </View>

        <AppText
          variant={featured ? 'title' : 'heading'}
          style={featured ? { fontSize: 24, lineHeight: 28 } : { fontSize: 18, lineHeight: 22 }}
          numberOfLines={2}
        >
          {item.name}
        </AppText>

        {item.address && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="map-marker-outline" size={13} color={C.outline} />
            <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={1} style={{ flex: 1 }}>
              {item.address}
            </AppText>
          </View>
        )}

        {item.amenities.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {item.amenities.slice(0, 3).map((a) => (
              <View
                key={a.slug}
                style={{
                  width: 26, height: 26, borderRadius: 8,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: C.surfaceContainerHighest,
                }}
              >
                <Icon name={a.icon} size={14} color={C.onSurfaceVariant} />
              </View>
            ))}
          </View>
        )}

        {featured && (
          <View style={{
            marginTop: 6, alignSelf: 'flex-start',
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
            backgroundColor: C.primaryContainer, borderWidth: 1, borderColor: C.border,
          }}>
            <AppText variant="bodyStrong" color={C.onPrimary} style={{ fontSize: 14 }}>Ver restaurante</AppText>
            <Icon name="arrow-right" size={15} color={C.onPrimary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function CardSkeleton({ featured = false }: { featured?: boolean }) {
  const { C, shadow } = useTheme();
  if (!featured) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.surface, borderRadius: 16, padding: 10,
        borderWidth: 1, borderColor: C.border, ...shadow.sm,
      }}>
        <Skeleton width={60} height={60} radius={13} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} />
          <Skeleton width="55%" height={12} />
        </View>
      </View>
    );
  }
  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 22, overflow: 'hidden',
      borderWidth: 1, borderColor: C.border, ...shadow.sm,
    }}>
      <Skeleton height={190} radius={0} />
      <View style={{ padding: 14, gap: 8 }}>
        <Skeleton width={90} height={16} radius={99} />
        <Skeleton width="75%" height={24} />
        <Skeleton width="55%" height={13} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { C, shadow } = useTheme();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const toast    = useToast();
  const inputRef = useRef<TextInput>(null);
  const isTablet = useIsTablet();

  const searchQ = useRestaurantSearch();
  const categoriesQ = useCategories();
  const amenitiesQ = useAmenities();

  const [query, setQuery]       = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [filterOpen, setFilter] = useState(false);
  const [sort, setSort]         = useState<SortKey>(null);
  const [price, setPrice]       = useState<PriceKey>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [amenitySlugs, setAmenitySlugs] = useState<Set<string>>(new Set());
  const [recents, setRecents]   = useState<string[]>([]);
  const [userLoc, setUserLoc]   = useState<LatLng | null>(null);
  const [locBusy, setLocBusy]   = useState(false);

  // Coach-mark targets for the first-use tour.
  const tourSearchRef = useRef<View>(null);
  const tourFilterRef = useRef<View>(null);
  const tourChipsRef  = useRef<View>(null);
  const tourSteps: TourStep[] = [
    { ref: tourSearchRef, icon: 'magnify', title: 'Busca por nombre o plato', text: 'Escribe y filtra en tiempo real entre todos los locales registrados.' },
    { ref: tourFilterRef, icon: 'tune-variant', title: 'Filtros a fondo', text: 'Precio, comodidades, si está abierto ahora o el más cercano a ti.' },
    { ref: tourChipsRef, icon: 'silverware-fork-knife', title: 'O navega por categoría', text: 'Toca un chip para saltar directo a esa comida.' },
  ];

  useEffect(() => { loadRecents().then(setRecents); }, []);

  async function enableNear() {
    if (userLoc) { setSort(s => (s === 'near' ? null : 'near')); return; }
    setLocBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Activa el permiso de ubicación para ordenar por cercanía.');
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setSort('near');
    } catch {
      toast.error('No pudimos obtener tu ubicación.');
    } finally {
      setLocBusy(false);
    }
  }

  function pushRecent(raw: string) {
    const q = raw.trim();
    if (q.length < 2) return;
    setRecents((prev) => {
      const next = [q, ...prev.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENTS_MAX);
      saveRecents(next);
      return next;
    });
  }
  function clearRecents() {
    setRecents([]);
    saveRecents([]);
  }

  const hasActiveFilters = sort !== null || price !== null || onlyOpen || amenitySlugs.size > 0;

  function toggleAmenity(slug: string) {
    setAmenitySlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }
  const all = searchQ.data ?? [];
  const searching = !!query.trim() || !!activeCat || hasActiveFilters;

  const results = useMemo(() => {
    let list = all.filter(r => {
      const q = query.trim().toLowerCase();
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.categories.some(c => c.label.toLowerCase().includes(q) || c.slug.includes(q)) ||
        (r.address ?? '').toLowerCase().includes(q);
      const matchCat = !activeCat || r.categories.some(c => c.slug === activeCat);
      const matchPrice = !price || r.price_level === price;
      const matchOpen = !onlyOpen || isOpenNow(r.hours).open;
      const matchAmenities =
        amenitySlugs.size === 0 ||
        [...amenitySlugs].every(s => r.amenities.some(a => a.slug === s));
      return matchQuery && matchCat && matchPrice && matchOpen && matchAmenities;
    });
    if (sort === 'near' && userLoc) {
      const d = (r: SearchResult) =>
        r.lat != null && r.lng != null ? distanceKm(userLoc, r.lat, r.lng) : Infinity;
      list = [...list].sort((a, b) => d(a) - d(b));
    } else if (sort === 'rank') {
      // rated places first, by average then by how many ranks back it up
      list = [...list].sort(
        (a, b) =>
          (b.rating_count > 0 ? 1 : 0) - (a.rating_count > 0 ? 1 : 0) ||
          b.rating_avg - a.rating_avg ||
          b.rating_count - a.rating_count,
      );
    } else if (sort === 'reviews') {
      list = [...list].sort((a, b) => b.rating_count - a.rating_count || b.rating_avg - a.rating_avg);
    } else if (query.trim()) {
      // no explicit sort + text query → relevance
      const q = query.trim().toLowerCase();
      const score = (r: SearchResult) => {
        const n = r.name.toLowerCase();
        if (n === q) return 0;
        if (n.startsWith(q)) return 1;
        if (n.includes(q)) return 2;
        if (r.categories.some(c => c.label.toLowerCase().includes(q))) return 3;
        return 4;
      };
      list = [...list].sort(
        (a, b) =>
          score(a) - score(b) ||
          (isBoosted(b) ? 1 : 0) - (isBoosted(a) ? 1 : 0) ||
          b.rating_count - a.rating_count,
      );
    } else {
      // category browse → destacados primero, luego alfabético
      list = [...list].sort(
        (a, b) =>
          (isBoosted(b) ? 1 : 0) - (isBoosted(a) ? 1 : 0) ||
          a.name.localeCompare(b.name, 'es'),
      );
    }
    return list;
  }, [all, query, activeCat, price, sort, onlyOpen, amenitySlugs, userLoc]);

  const popular = useMemo(
    () => [...all].sort((a, b) => b.rating_count - a.rating_count).slice(0, 8),
    [all],
  );

  const hasQuery = !!query.trim();
  const best = hasQuery ? (results[0] ?? null) : null;
  const rest = best ? results.slice(1) : results;

  function clear() {
    setQuery('');
    setActiveCat(null);
    setFilter(false);
    setSort(null);
    setPrice(null);
    setOnlyOpen(false);
    inputRef.current?.blur();
  }
  function resetFilters() { setSort(null); setPrice(null); setOnlyOpen(false); setAmenitySlugs(new Set()); }
  function goToPlace(id: string) {
    if (query.trim()) pushRecent(query);
    router.push(`/restaurant/${id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top + 10,
        paddingBottom: 12,
        backgroundColor: C.background,
        borderBottomWidth: 1, borderBottomColor: C.outlineVariant,
      }}>
        <View style={capWidth(isTablet)}>
        <View style={{
          paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <View ref={tourSearchRef} collapsable={false} style={{ flex: 1 }}>
            <SearchBar
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onSubmit={() => { pushRecent(query); inputRef.current?.blur(); }}
              onClear={clear}
              variant="floating"
            />
          </View>

          <View ref={tourFilterRef} collapsable={false}>
            <Pressable
              onPress={() => setFilter(f => !f)}
              style={{
                width: 48, height: 48, borderRadius: 24,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: (filterOpen || hasActiveFilters) ? C.primary : C.surface,
                borderWidth: 1, borderColor: (filterOpen || hasActiveFilters) ? C.border : C.outlineVariant,
                ...((filterOpen || hasActiveFilters) ? shadow.primary : {}),
              }}
            >
              <Icon name="tune-variant" size={20} color={(filterOpen || hasActiveFilters) ? '#fff' : C.onSurfaceVariant} />
              {hasActiveFilters && !filterOpen && (
                <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: C.primaryContainer, borderWidth: 1.5, borderColor: C.surface }} />
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Chips de categoría ── */}
        <View ref={tourChipsRef} collapsable={false}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
            style={{ marginTop: 12, height: 44 }}
          >
            <Chip label="Todo" active={!activeCat} onPress={() => setActiveCat(null)} />
            {(categoriesQ.data ?? []).map(cat => (
              <Chip
                key={cat.slug}
                label={cat.label}
                icon={cat.icon}
                active={activeCat === cat.slug}
                onPress={() => setActiveCat(activeCat === cat.slug ? null : cat.slug)}
              />
            ))}
          </ScrollView>
        </View>
        </View>
      </View>

      {/* ── Panel de filtros ── */}
      {filterOpen && (
        <ScrollView
          style={{
            maxHeight: 340,
            backgroundColor: C.background,
            borderBottomWidth: 1,
            borderBottomColor: C.outlineVariant,
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 14, ...capWidth(isTablet) }}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.onSurfaceVariant}>ORDENAR</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip
                label={locBusy ? 'Ubicando…' : 'Cerca de mí'}
                icon="crosshairs-gps"
                active={sort === 'near'}
                onPress={enableNear}
              />
              <Chip
                label="Mejor rank"
                icon="star-outline"
                active={sort === 'rank'}
                onPress={() => setSort(sort === 'rank' ? null : 'rank')}
              />
              <Chip
                label="Más reseñas"
                icon="comment-text"
                active={sort === 'reviews'}
                onPress={() => setSort(sort === 'reviews' ? null : 'reviews')}
              />
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.onSurfaceVariant}>PRECIO</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([1, 2, 3] as PriceKey[]).map(p => (
                <Chip
                  key={p!}
                  label={'$'.repeat(p!)}
                  active={price === p}
                  onPress={() => setPrice(price === p ? null : p)}
                />
              ))}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

          <Pressable
            onPress={() => setOnlyOpen(v => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
              backgroundColor: onlyOpen ? C.secondaryContainer : C.surface,
              borderWidth: 1, borderColor: onlyOpen ? C.border : C.outlineVariant,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onlyOpen ? C.secondary : C.outline }} />
            <AppText variant="label" color={onlyOpen ? C.onSurface : C.onSurfaceVariant}>
              Abiertos ahora
            </AppText>
          </Pressable>

          {(amenitiesQ.data ?? []).length > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: C.outlineVariant }} />
              <View style={{ gap: 8 }}>
                <AppText variant="overline" color={C.onSurfaceVariant}>COMODIDADES</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(amenitiesQ.data ?? []).map(am => (
                    <Chip
                      key={am.slug}
                      label={am.label}
                      icon={am.icon}
                      active={amenitySlugs.has(am.slug)}
                      onPress={() => toggleAmenity(am.slug)}
                    />
                  ))}
                </View>
              </View>
            </>
          )}

          {hasActiveFilters && (
            <Pressable onPress={resetFilters} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="close-circle-outline" size={14} color={C.outline} />
              <AppText variant="label" color={C.outline}>Limpiar filtros</AppText>
            </Pressable>
          )}
        </ScrollView>
      )}

      {searchQ.isLoading ? (
        <View style={{ padding: 16, gap: 14 }}>
          <CardSkeleton featured />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : searching ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 96, ...capWidth(isTablet) }}
        >
          {results.length === 0 ? (
            <EmptyState
              icon="food-off-outline"
              title="Sin resultados"
              body="Prueba con otro término o quita filtros"
              actionLabel="Limpiar"
              onAction={clear}
            />
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <AppText variant="overline" color={C.outline}>
                  {best ? 'MEJOR COINCIDENCIA' : `${results.length} ${results.length === 1 ? 'LUGAR' : 'LUGARES'}`}
                </AppText>
                {sort && (
                  <AppText variant="caption" color={C.primary}>
                    {sort === 'rank' ? 'Mejor rank' : sort === 'reviews' ? 'Más reseñas' : 'Cerca de mí'}
                  </AppText>
                )}
              </View>
              {best && (
                <PlaceCard featured userLoc={userLoc} item={best} onPress={() => goToPlace(best.id)} />
              )}
              {rest.length > 0 && best && (
                <AppText variant="overline" color={C.outline} style={{ marginTop: 6 }}>
                  MÁS LUGARES ({rest.length})
                </AppText>
              )}
              {rest.map(r => (
                <PlaceCard key={r.id} userLoc={userLoc} item={r} onPress={() => goToPlace(r.id)} />
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 14, ...capWidth(isTablet) }}
        >
          {recents.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="overline" color={C.outline}>RECIENTES</AppText>
                <Pressable onPress={clearRecents} hitSlop={8}>
                  <AppText variant="caption" color={C.primary}>Borrar</AppText>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {recents.map(term => (
                  <Chip
                    key={term}
                    label={term}
                    icon="magnify"
                    active={false}
                    onPress={() => { setQuery(term); inputRef.current?.blur(); }}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Icon name="trending-up" size={18} color={C.primary} />
            <AppText variant="heading">Populares en San Cristóbal</AppText>
          </View>
          {popular.length === 0 ? (
            <AppText variant="bodySm" color={C.outline}>
              Aún no hay lugares. Vuelve pronto.
            </AppText>
          ) : (
            popular.map((r, i) => (
              <PlaceCard
                key={r.id}
                featured={i === 0}
                userLoc={userLoc}
                item={r}
                onPress={() => goToPlace(r.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      <TourGuide tourKey="search" ready={!searchQ.isLoading} steps={tourSteps} />
    </View>
  );
}
