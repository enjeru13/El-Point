import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { useRestaurantSearch, type SearchResult } from '@/lib/queries/search';

type SortKey = 'rank' | 'reviews' | null;
type PriceKey = 1 | 2 | 3 | null;

const TRENDING: string[] = [
  'Smash burgers',
  'Pizza artesanal',
  'Arepas',
  'Perros calientes',
  'Café',
  'Alta cocina',
];

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
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: C.onSurfaceVariant }}>Nuevo</Text>
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
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: text }}>{rating.toFixed(1)}</Text>
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
        <View style={{ position: 'absolute', top: 14, right: 14 }}>
          <StarBadgeInline rating={item.rating_avg} count={item.rating_count} />
        </View>
      </View>

      <View style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: C.surfaceContainerHighest }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
              {catLabel(item)}
            </Text>
          </View>
          {priceLabel(item.price_level) !== '' && (
            <>
              <Text style={{ color: C.outlineVariant }}>·</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
                {priceLabel(item.price_level)}
              </Text>
            </>
          )}
        </View>

        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 26, color: C.onSurface, letterSpacing: -0.5 }}>
          {item.name}
        </Text>

        {item.address && (
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, lineHeight: 21 }} numberOfLines={2}>
            {item.address}
          </Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: C.outline }}>
            {item.rating_count} {item.rating_count === 1 ? 'rank' : 'ranks'}
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
            backgroundColor: C.primaryContainer, borderWidth: 2, borderColor: C.border,
          }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: C.onSurface }}>Ver lugar</Text>
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
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <StarBadgeInline rating={item.rating_avg} count={item.rating_count} />
        </View>
      </View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: C.onSurface }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
          {[catLabel(item), priceLabel(item.price_level)].filter(Boolean).join(' · ')}
        </Text>
        {item.address && (
          <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: C.outline }} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { C, shadow } = useTheme();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const inputRef = useRef<TextInput>(null);

  const searchQ = useRestaurantSearch();

  const [query, setQuery]       = useState('');
  const [showResults, setShow]  = useState(false);
  const [filterOpen, setFilter] = useState(false);
  const [sort, setSort]         = useState<SortKey>(null);
  const [price, setPrice]       = useState<PriceKey>(null);

  const hasActiveFilters = sort !== null || price !== null;
  const all = searchQ.data ?? [];

  const results = useMemo(() => {
    let list = all.filter(r => {
      const q = query.trim().toLowerCase();
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.categories.some(c => c.label.toLowerCase().includes(q) || c.slug.includes(q)) ||
        (r.address ?? '').toLowerCase().includes(q);
      const matchPrice = !price || r.price_level === price;
      return matchQuery && matchPrice;
    });
    if (sort === 'rank') list = [...list].sort((a, b) => b.rating_avg - a.rating_avg);
    if (sort === 'reviews') list = [...list].sort((a, b) => b.rating_count - a.rating_count);
    return list;
  }, [all, query, price, sort]);

  const best = results[0] ?? null;
  const rest = results.slice(1);
  const pairs: SearchResult[][] = [];
  for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));

  function go(label: string) { setQuery(label); setShow(true); }
  function clear() { setQuery(''); setShow(false); setFilter(false); setSort(null); setPrice(null); }
  function resetFilters() { setSort(null); setPrice(null); }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top + 10,
        paddingHorizontal: 16,
        paddingBottom: 14,
        backgroundColor: C.surface,
        borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <View style={{ flex: 1 }}>
          <SearchBar
            ref={inputRef}
            value={query}
            onChangeText={t => { setQuery(t); if (t.trim()) setShow(true); }}
            onSubmit={() => { if (query.trim()) setShow(true); }}
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

      {/* ── Panel de filtros ── */}
      {filterOpen && (
        <View style={{
          backgroundColor: C.surface,
          borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
          paddingHorizontal: 16, paddingVertical: 14, gap: 14,
        }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 0.8 }}>ORDENAR</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { key: 'rank' as SortKey,    label: 'Mejor rank',   icon: 'star-outline' },
                { key: 'reviews' as SortKey, label: 'Más reseñas',  icon: 'comment-text' },
              ]).map(opt => {
                const active = sort === opt.key;
                return (
                  <Pressable
                    key={opt.key!}
                    onPress={() => setSort(active ? null : opt.key)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                      backgroundColor: active ? C.primary : C.surface,
                      borderWidth: 2, borderColor: active ? C.border : C.outlineVariant,
                    }}
                  >
                    <Icon name={opt.icon} size={14} color={active ? '#fff' : C.onSurfaceVariant} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: active ? '#fff' : C.onSurfaceVariant }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 0.8 }}>PRECIO</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([1, 2, 3] as PriceKey[]).map(p => {
                const active = price === p;
                return (
                  <Pressable
                    key={p!}
                    onPress={() => setPrice(active ? null : p)}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99,
                      backgroundColor: active ? C.primary : C.surface,
                      borderWidth: 2, borderColor: active ? C.border : C.outlineVariant,
                    }}
                  >
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: active ? '#fff' : C.onSurfaceVariant }}>
                      {'$'.repeat(p!)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {hasActiveFilters && (
            <Pressable onPress={resetFilters} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="close-circle-outline" size={14} color={C.outline} />
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: C.outline }}>Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
      )}

      {searchQ.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : showResults ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 100 }}>
          {results.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
              <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.outlineVariant }}>
                <Icon name="food-off-outline" size={32} color={C.outline} />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.onSurface }}>Sin resultados</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: C.outline, textAlign: 'center', maxWidth: 240 }}>
                Prueba con otro término o quita filtros
              </Text>
              <Pressable onPress={clear} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: C.primary }}>Ver tendencias</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {best && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.onSurface }}>Mejor coincidencia</Text>
                  <BestMatchCard item={best} onPress={() => router.push(`/restaurant/${best.id}`)} />
                </View>
              )}
              {rest.length > 0 && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.onSurface }}>Más lugares</Text>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Icon name="trending-up" size={18} color={C.primary} />
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: C.onSurface, marginLeft: 6 }}>Tendencias</Text>
            </View>
            {TRENDING.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => go(label)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  borderBottomWidth: i < TRENDING.length - 1 ? 1 : 0,
                  borderBottomColor: C.outlineVariant,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                  <Text style={{ width: 28, fontFamily: 'Outfit_700Bold', fontSize: i < 3 ? 18 : 15, color: i === 0 ? C.primary : i < 3 ? C.onSurface : C.outline }}>
                    {i + 1}
                  </Text>
                  <Text style={{ flex: 1, fontFamily: i < 3 ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold', fontSize: 15, color: C.onSurface }}>
                    {label}
                  </Text>
                  <Icon name={i < 3 ? 'fire' : 'arrow-right'} size={i < 3 ? 18 : 15} color={i < 3 ? C.primaryContainer : C.outlineVariant} />
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
