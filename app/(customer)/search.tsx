import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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

type SortKey = 'rank' | 'reviews' | null;
type PriceKey = 1 | 2 | 3 | null;

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

function BestMatchCard({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const { C, shadow } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: C.surface,
        borderRadius: 24, overflow: 'hidden',
        borderWidth: 2, borderColor: C.border,
        opacity: pressed ? 0.93 : 1,
        ...shadow.md,
      })}
    >
      <View style={{ height: 180, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <Icon name={catIcon(item)} size={100} color={C.onSurface} style={{ opacity: 0.12 }} />
        )}
        {item.hours && (
          <View style={{
            position: 'absolute', top: 14, left: 14,
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
            backgroundColor: 'rgba(251,248,255,0.92)', borderWidth: 2, borderColor: C.border,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isOpenNow(item.hours).open ? '#22c55e' : '#ef4444' }} />
            <AppText variant="caption" style={{ fontSize: 12 }}>
              {isOpenNow(item.hours).open ? 'Abierto' : 'Cerrado'}
            </AppText>
          </View>
        )}
        <View style={{ position: 'absolute', top: 14, right: 14 }}>
          <StarBadgeInline rating={item.rating_avg} count={item.rating_count} />
        </View>
      </View>

      <View style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: C.surfaceContainerHighest }}>
            <AppText variant="caption" color={C.onSurfaceVariant} style={{ fontSize: 12 }}>
              {catLabel(item)}
            </AppText>
          </View>
          {priceLabel(item.price_level) !== '' && (
            <>
              <AppText variant="caption" color={C.outlineVariant} style={{ fontSize: 12 }}>·</AppText>
              <AppText variant="caption" color={C.onSurfaceVariant} style={{ fontSize: 12 }}>
                {priceLabel(item.price_level)}
              </AppText>
            </>
          )}
        </View>

        <AppText variant="title" style={{ fontSize: 26, lineHeight: 30 }}>
          {item.name}
        </AppText>

        {item.address && (
          <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={2}>
            {item.address}
          </AppText>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
          <AppText variant="label" color={C.outline}>
            {item.rating_count} {item.rating_count === 1 ? 'rank' : 'ranks'}
          </AppText>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
            backgroundColor: C.primaryContainer, borderWidth: 2, borderColor: C.border,
          }}>
            <AppText variant="bodyStrong" style={{ fontSize: 14 }}>Ver lugar</AppText>
            <Icon name="arrow-right" size={15} color={C.onSurface} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ResultCard({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const { C, shadow } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, backgroundColor: C.surface,
        borderRadius: 20, overflow: 'hidden',
        borderWidth: 2, borderColor: C.border,
        opacity: pressed ? 0.88 : 1,
        ...shadow.sm,
      })}
    >
      <View style={{ height: 100, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center' }}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <Icon name={catIcon(item)} size={44} color={C.onSurface} style={{ opacity: 0.18 }} />
        )}
        {item.hours && (
          <View style={{ position: 'absolute', top: 8, left: 8, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff', backgroundColor: isOpenNow(item.hours).open ? '#22c55e' : '#ef4444' }} />
        )}
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <StarBadgeInline rating={item.rating_avg} count={item.rating_count} />
        </View>
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <AppText variant="bodyStrong" style={{ fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="caption" color={C.onSurfaceVariant} style={{ fontSize: 12 }}>
          {[catLabel(item), priceLabel(item.price_level)].filter(Boolean).join(' · ')}
        </AppText>
        {item.address && (
          <AppText variant="caption" color={C.outline} style={{ fontSize: 12 }} numberOfLines={1}>
            {item.address}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

function chunkPairs(list: SearchResult[]): SearchResult[][] {
  const pairs: SearchResult[][] = [];
  for (let i = 0; i < list.length; i += 2) pairs.push(list.slice(i, i + 2));
  return pairs;
}

export default function SearchScreen() {
  const { C, shadow } = useTheme();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const inputRef = useRef<TextInput>(null);

  const searchQ = useRestaurantSearch();
  const categoriesQ = useCategories();

  const [query, setQuery]       = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [filterOpen, setFilter] = useState(false);
  const [sort, setSort]         = useState<SortKey>(null);
  const [price, setPrice]       = useState<PriceKey>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);

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
    if (sort === 'rank') list = [...list].sort((a, b) => b.rating_avg - a.rating_avg);
    if (sort === 'reviews') list = [...list].sort((a, b) => b.rating_count - a.rating_count);
    else list = [...list].sort((a, b) => b.rating_count - a.rating_count);
    return list;
  }, [all, query, activeCat, price, sort, onlyOpen]);

  const popular = useMemo(
    () => [...all].sort((a, b) => b.rating_count - a.rating_count).slice(0, 6),
    [all],
  );

  const best = results[0] ?? null;
  const rest = results.slice(1);
  const pairs = chunkPairs(rest);

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
              onSubmit={() => inputRef.current?.blur()}
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { key: 'rank' as SortKey,    label: 'Mejor rank',   icon: 'star-outline' },
                { key: 'reviews' as SortKey, label: 'Más reseñas',  icon: 'comment-text' },
              ]).map(opt => (
                <Chip
                  key={opt.key!}
                  label={opt.label}
                  icon={opt.icon}
                  active={sort === opt.key}
                  onPress={() => setSort(sort === opt.key ? null : opt.key)}
                />
              ))}
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
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={260} radius={24} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton height={150} radius={20} style={{ flex: 1 }} />
            <Skeleton height={150} radius={20} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton height={150} radius={20} style={{ flex: 1 }} />
            <Skeleton height={150} radius={20} style={{ flex: 1 }} />
          </View>
        </View>
      ) : searching ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 100 }}
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
              {best && (
                <View style={{ gap: 12 }}>
                  <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>Mejor coincidencia</AppText>
                  <BestMatchCard item={best} onPress={() => router.push(`/restaurant/${best.id}`)} />
                </View>
              )}
              {rest.length > 0 && (
                <View style={{ gap: 12 }}>
                  <AppText variant="heading" style={{ fontSize: 20, lineHeight: 25 }}>
                    Más lugares ({rest.length})
                  </AppText>
                  <View style={{ gap: 10 }}>
                    {pairs.map((pair, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                        {pair.map(r => (
                          <ResultCard key={r.id} item={r} onPress={() => router.push(`/restaurant/${r.id}`)} />
                        ))}
                        {pair.length === 1 && <View style={{ flex: 1 }} />}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="trending-up" size={18} color={C.primary} />
            <AppText variant="heading">Populares en San Cristóbal</AppText>
          </View>
          {popular.length === 0 ? (
            <AppText variant="bodySm" color={C.outline}>
              Aún no hay lugares. Vuelve pronto.
            </AppText>
          ) : (
            <View style={{ gap: 10 }}>
              {chunkPairs(popular).map((pair, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  {pair.map(r => (
                    <ResultCard key={r.id} item={r} onPress={() => router.push(`/restaurant/${r.id}`)} />
                  ))}
                  {pair.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
