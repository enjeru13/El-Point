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
import { useCategories } from '@/lib/queries/categories';
import { isOpenNow } from '@/lib/hours';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';

type SortKey = 'rank' | 'reviews' | 'near' | null;
type PriceKey = 1 | 2 | 3 | null;

type LatLng = { latitude: number; longitude: number };

function distanceKm(a: LatLng, lat: number, lng: number): number {
  const R = 6371;
  const dLat = ((lat - a.latitude) * Math.PI) / 180;
  const dLng = ((lng - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

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

function StarBadgeInline({ rating, count }: { rating: number; count: number }) {
  const { C } = useTheme();
  if (count === 0) {
    return (
      <View style={{
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99,
        backgroundColor: C.surfaceContainerHighest, borderWidth: 2, borderColor: C.border,
      }}>
        <AppText variant="label" color={C.onSurfaceVariant}>Nuevo</AppText>
      </View>
    );
  }
  const bg = rating >= 5.0 ? C.secondary : rating >= 4.5 ? C.primaryContainer : C.secondaryContainer;
  const text = rating >= 5.0 ? '#fff' : C.onSurface;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99,
      backgroundColor: bg, borderWidth: 2, borderColor: C.border,
    }}>
      <Icon name="star" size={13} color={text} />
      <AppText variant="label" color={text}>{rating.toFixed(1)}</AppText>
    </View>
  );
}

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
      backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 2, borderColor: C.border,
    }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: open ? C.secondary : C.error }} />
      <AppText variant="caption" style={{ fontSize: 11 }}>{open ? 'Abierto' : 'Cerrado'}</AppText>
    </View>
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
  const imgH = featured ? 190 : 132;
  const price = priceLabel(item.price_level);
  const dist =
    userLoc && item.lat != null && item.lng != null
      ? fmtKm(distanceKm(userLoc, item.lat, item.lng))
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: C.surface,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: C.border,
        transform: [{ translateY: pressed ? 2 : 0 }],
        ...(featured ? shadow.md : shadow.sm),
      })}
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
          <StarBadgeInline rating={item.rating_avg} count={item.rating_count} />
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: featured ? 16 : 14, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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

        {featured && (
          <View style={{
            marginTop: 6, alignSelf: 'flex-start',
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
            backgroundColor: C.primaryContainer, borderWidth: 2, borderColor: C.border,
          }}>
            <AppText variant="bodyStrong" style={{ fontSize: 14 }}>Ver restaurante</AppText>
            <Icon name="arrow-right" size={15} color={C.onSurface} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function CardSkeleton({ featured = false }: { featured?: boolean }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 22, overflow: 'hidden',
      borderWidth: 2, borderColor: C.border, ...shadow.sm,
    }}>
      <Skeleton height={featured ? 190 : 132} radius={0} />
      <View style={{ padding: 14, gap: 8 }}>
        <Skeleton width={90} height={16} radius={99} />
        <Skeleton width="75%" height={featured ? 24 : 18} />
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

  const searchQ = useRestaurantSearch();
  const categoriesQ = useCategories();

  const [query, setQuery]       = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [filterOpen, setFilter] = useState(false);
  const [sort, setSort]         = useState<SortKey>(null);
  const [price, setPrice]       = useState<PriceKey>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [recents, setRecents]   = useState<string[]>([]);
  const [userLoc, setUserLoc]   = useState<LatLng | null>(null);
  const [locBusy, setLocBusy]   = useState(false);

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

  const hasActiveFilters = sort !== null || price !== null || onlyOpen;
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
      return matchQuery && matchCat && matchPrice && matchOpen;
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
      list = [...list].sort((a, b) => score(a) - score(b) || b.rating_count - a.rating_count);
    } else {
      // category browse → alphabetical
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    return list;
  }, [all, query, activeCat, price, sort, onlyOpen, userLoc]);

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
  function resetFilters() { setSort(null); setPrice(null); setOnlyOpen(false); }
  function goToPlace(id: string) {
    if (query.trim()) pushRecent(query);
    router.push(`/restaurant/${id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top + 10,
        paddingBottom: 12,
        backgroundColor: C.surface,
        borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
      }}>
        <View style={{
          paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onSubmit={() => { pushRecent(query); inputRef.current?.blur(); }}
              onClear={clear}
              variant="floating"
            />
          </View>

          <Pressable
            onPress={() => setFilter(f => !f)}
            style={{
              width: 48, height: 48, borderRadius: 24,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: (filterOpen || hasActiveFilters) ? C.primary : C.surface,
              borderWidth: 2, borderColor: (filterOpen || hasActiveFilters) ? C.border : C.outlineVariant,
              ...((filterOpen || hasActiveFilters) ? shadow.primary : {}),
            }}
          >
            <Icon name="tune-variant" size={20} color={(filterOpen || hasActiveFilters) ? '#fff' : C.onSurfaceVariant} />
            {hasActiveFilters && !filterOpen && (
              <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: C.primaryContainer, borderWidth: 1.5, borderColor: C.surface }} />
            )}
          </Pressable>
        </View>

        {/* ── Chips de categoría ── */}
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

      {/* ── Panel de filtros ── */}
      {filterOpen && (
        <View style={{
          backgroundColor: C.surface,
          borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
          paddingHorizontal: 16, paddingVertical: 14, gap: 14,
        }}>
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
              borderWidth: 2, borderColor: onlyOpen ? C.border : C.outlineVariant,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onlyOpen ? C.secondary : C.outline }} />
            <AppText variant="label" color={onlyOpen ? C.onSurface : C.onSurfaceVariant}>
              Abiertos ahora
            </AppText>
          </Pressable>

          {hasActiveFilters && (
            <Pressable onPress={resetFilters} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="close-circle-outline" size={14} color={C.outline} />
              <AppText variant="label" color={C.outline}>Limpiar filtros</AppText>
            </Pressable>
          )}
        </View>
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
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}
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
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}
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
    </View>
  );
}
