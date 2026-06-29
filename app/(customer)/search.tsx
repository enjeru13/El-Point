import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { SearchBar } from '@/components/ui/SearchBar';

type SortKey = 'rank' | 'near' | null;
type PriceKey = '$' | '$$' | '$$$' | null;

// ─── Types ────────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRENDING: { label: string; count: string }[] = [
  { label: 'Smash burgers',        count: '2.4k búsquedas' },
  { label: 'Pizza artesanal',      count: '1.8k búsquedas' },
  { label: 'Tacos de pastor',      count: '1.2k búsquedas' },
  { label: 'Café de especialidad', count: '980 búsquedas'  },
  { label: 'Ramen',                count: '870 búsquedas'  },
  { label: 'Bowls saludables',     count: '640 búsquedas'  },
  { label: 'Pollo frito',          count: '510 búsquedas'  },
];

type ResultItem = {
  id: string; name: string; category: string; rating: number;
  distance: string; price: string; isOpen: boolean; reviewCount: number;
  quote: string; icon: IconName; iconBg: string; reviewers: string[];
};

// ─── Components ───────────────────────────────────────────────────────────────

function ReviewerStack({ initials, total }: { initials: string[]; total: number }) {
  const { C } = useTheme();
  const shown = initials.slice(0, 3);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {shown.map((init, i) => (
          <View
            key={i}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: i === 0 ? C.primaryFixed : i === 1 ? C.secondaryContainer : C.tertiaryContainer,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: C.surface,
              marginLeft: i > 0 ? -8 : 0,
            }}
          >
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: C.onSurface }}>{init}</Text>
          </View>
        ))}
        {total > 3 && (
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: C.surfaceContainerHighest,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: C.surface,
            marginLeft: -8,
          }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 9, color: C.onSurfaceVariant }}>+{total - 3}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StarBadgeInline({ rating }: { rating: number }) {
  const { C } = useTheme();
  const bg = rating >= 5.0 ? C.secondary : rating >= 4.8 ? C.primaryContainer : C.secondaryContainer;
  const text = rating >= 5.0 ? '#fff' : C.onSurface;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99,
      backgroundColor: bg, borderWidth: 2, borderColor: C.border,
    }}>
      <MaterialCommunityIcons name="star" size={13} color={text} />
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: text }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

// Hero card — mejor coincidencia
function BestMatchCard({ item, onPress }: { item: ResultItem; onPress: () => void }) {
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
      {/* Imagen */}
      <View style={{ height: 200, backgroundColor: item.iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={item.icon} size={100} color={C.onSurface} style={{ opacity: 0.12 }} />

        {/* Abierto/cerrado */}
        <View style={{
          position: 'absolute', top: 14, left: 14,
          flexDirection: 'row', alignItems: 'center', gap: 5,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
          backgroundColor: 'rgba(251,248,255,0.92)', borderWidth: 2, borderColor: C.border,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.isOpen ? '#22c55e' : '#ef4444' }} />
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurface }}>
            {item.isOpen ? 'Abierto' : 'Cerrado'}
          </Text>
        </View>

        {/* Rating */}
        <View style={{ position: 'absolute', top: 14, right: 14 }}>
          <StarBadgeInline rating={item.rating} />
        </View>
      </View>

      {/* Contenido */}
      <View style={{ padding: 18, gap: 12 }}>
        {/* Metadata */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
            backgroundColor: C.surfaceContainerHighest,
          }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
              {item.category}
            </Text>
          </View>
          <Text style={{ color: C.outlineVariant }}>·</Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
            {item.distance}
          </Text>
          <Text style={{ color: C.outlineVariant }}>·</Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
            {item.price}
          </Text>
        </View>

        {/* Nombre */}
        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 26, color: C.onSurface, letterSpacing: -0.5 }}>
          {item.name}
        </Text>

        {/* Quote */}
        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: C.onSurfaceVariant, lineHeight: 21, fontStyle: 'italic' }} numberOfLines={2}>
          "{item.quote}"
        </Text>

        {/* Footer */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant,
        }}>
          <ReviewerStack initials={item.reviewers} total={item.reviewCount} />

          <Pressable
            onPress={onPress}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
              backgroundColor: C.primaryContainer, borderWidth: 2, borderColor: C.border,
            }}
          >
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: C.onSurface }}>Ver lugar</Text>
            <MaterialCommunityIcons name="arrow-right" size={15} color={C.onSurface} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// Card pequeña — grid resultado
function ResultCard({ item, onPress }: { item: ResultItem; onPress: () => void }) {
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
      {/* Imagen */}
      <View style={{ height: 110, backgroundColor: item.iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={item.icon} size={48} color={C.onSurface} style={{ opacity: 0.18 }} />
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <StarBadgeInline rating={item.rating} />
        </View>
        <View style={{
          position: 'absolute', top: 8, left: 8,
          flexDirection: 'row', alignItems: 'center', gap: 3,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.isOpen ? '#22c55e' : '#ef4444' }} />
        </View>
      </View>

      {/* Info */}
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: C.onSurface }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: C.onSurfaceVariant }}>
          {item.distance} · {item.price}
        </Text>
        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: C.onSurfaceVariant, lineHeight: 17, fontStyle: 'italic' }} numberOfLines={2}>
          "{item.quote}"
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { C, shadow } = useTheme();
  const insets   = useSafeAreaInsets();
  const [query, setQuery]         = useState('');
  const [showResults, setShow]    = useState(false);
  const [filterOpen, setFilter]   = useState(false);
  const [onlyOpen, setOnlyOpen]   = useState(false);
  const [sort, setSort]           = useState<SortKey>(null);
  const [price, setPrice]         = useState<PriceKey>(null);
  const inputRef = useRef<TextInput>(null);
  const router   = useRouter();

  const ALL_RESULTS: ResultItem[] = [
    { id: '1', name: 'Ruta 66',       category: 'Burgers', rating: 4.8, distance: '1.2 km', price: '$$',  isOpen: true,  reviewCount: 42, quote: 'Las mejores smash burgers del barrio. La salsa secreta es increíble y las papas siempre crujientes.', icon: 'hamburger', iconBg: C.primaryFixed,       reviewers: ['AL', 'MR', 'SC'] },
    { id: '2', name: 'Big Kahuna',    category: 'Burgers', rating: 5.0, distance: '1.9 km', price: '$',   isOpen: true,  reviewCount: 28, quote: 'Jugosa y perfecta. La piña le da el toque exacto.',                                                     icon: 'food',      iconBg: C.secondaryContainer, reviewers: ['PG', 'LT'] },
    { id: '3', name: 'The Patty Lab', category: 'Burgers', rating: 4.9, distance: '0.8 km', price: '$$$', isOpen: false, reviewCount: 67, quote: 'Sabores experimentales que funcionan. La mayo trufa es top.',                                             icon: 'chef-hat',  iconBg: C.tertiaryContainer,  reviewers: ['KA', 'BN', 'RP'] },
    { id: '4', name: 'Sizzle & Bun', category: 'Burgers', rating: 4.7, distance: '3.3 km', price: '$',   isOpen: true,  reviewCount: 19, quote: 'Clásica, sin complicaciones. Siempre consistente.',                                                       icon: 'fire',      iconBg: C.primaryContainer,   reviewers: ['JM'] },
  ];

  const hasActiveFilters = onlyOpen || sort !== null || price !== null;

  let results = ALL_RESULTS.filter(r => {
    const matchQuery = !query.trim() || r.name.toLowerCase().includes(query.toLowerCase()) || r.category.toLowerCase().includes(query.toLowerCase());
    const matchOpen  = !onlyOpen || r.isOpen;
    const matchPrice = !price || r.price === price;
    return matchQuery && matchOpen && matchPrice;
  });

  if (sort === 'rank') results = [...results].sort((a, b) => b.rating - a.rating);
  if (sort === 'near') results = [...results].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

  const best = results[0] ?? null;
  const rest = results.slice(1);

  // Agrupar en pares para el grid 2 columnas
  const pairs: ResultItem[][] = [];
  for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));

  function go(label: string) { setQuery(label); setShow(true); }
  function clear() {
    setQuery(''); setShow(false); setFilter(false);
    setOnlyOpen(false); setSort(null); setPrice(null);
  }

  function resetFilters() { setOnlyOpen(false); setSort(null); setPrice(null); }

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

        {/* Botón filtros */}
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
          <MaterialCommunityIcons
            name="tune-variant" size={20}
            color={(filterOpen || hasActiveFilters) ? '#fff' : C.onSurfaceVariant}
          />
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
          {/* Fila 1: Ordenar */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 0.8 }}>
              ORDENAR
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { key: 'rank' as SortKey, label: 'Mejor rank',  icon: 'star-outline'        },
                { key: 'near' as SortKey, label: 'Más cerca',   icon: 'map-marker-outline'  },
              ] as { key: SortKey; label: string; icon: string }[]).map(opt => {
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
                    <MaterialCommunityIcons name={opt.icon as any} size={14} color={active ? '#fff' : C.onSurfaceVariant} />
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: active ? '#fff' : C.onSurfaceVariant }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

          {/* Fila 2: Precio + Abiertos */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 0.8 }}>
                PRECIO
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['$', '$$', '$$$'] as PriceKey[]).map(p => {
                  const active = price === p;
                  return (
                    <Pressable
                      key={p!}
                      onPress={() => setPrice(active ? null : p)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                        backgroundColor: active ? C.primary : C.surface,
                        borderWidth: 2, borderColor: active ? C.border : C.outlineVariant,
                      }}
                    >
                      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: active ? '#fff' : C.onSurfaceVariant }}>
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Toggle Abiertos */}
            <Pressable
              onPress={() => setOnlyOpen(v => !v)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                backgroundColor: onlyOpen ? '#dcfce7' : C.surface,
                borderWidth: 2, borderColor: onlyOpen ? '#16a34a' : C.outlineVariant,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onlyOpen ? '#16a34a' : C.outline }} />
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: onlyOpen ? '#16a34a' : C.onSurfaceVariant }}>
                Abiertos
              </Text>
            </Pressable>
          </View>

          {/* Reset */}
          {hasActiveFilters && (
            <Pressable onPress={resetFilters} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="close-circle-outline" size={14} color={C.outline} />
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: C.outline }}>
                Limpiar filtros
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {showResults ? (

        /* ── Resultados ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 100 }}
        >
          {results.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
              <View style={{
                width: 68, height: 68, borderRadius: 20,
                backgroundColor: C.surfaceContainerLow,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.outlineVariant,
              }}>
                <MaterialCommunityIcons name="food-off-outline" size={32} color={C.outline} />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.onSurface }}>Sin resultados</Text>
              <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, color: C.outline, textAlign: 'center', maxWidth: 240 }}>
                Intenta con otro término
              </Text>
              <Pressable onPress={clear} style={{
                paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99,
                backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border,
              }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: C.primary }}>Ver tendencias</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Mejor coincidencia */}
              {best && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.onSurface }}>
                    Mejor coincidencia
                  </Text>
                  <BestMatchCard item={best} onPress={() => router.push(`/restaurant/${best.id}`)} />
                </View>
              )}

              {/* Grid de resultados */}
              {rest.length > 0 && (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.onSurface }}>
                    Más lugares
                  </Text>
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

        /* ── Landing ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            {/* Título sección */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons name="trending-up" size={18} color={C.primary} />
              <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: C.onSurface, marginLeft: 6 }}>
                Tendencias
              </Text>
            </View>

            {/* Lista */}
            {TRENDING.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => go(item.label)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  borderBottomWidth: i < TRENDING.length - 1 ? 1 : 0,
                  borderBottomColor: C.outlineVariant,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                  {/* Número */}
                  <Text style={{
                    width: 28,
                    fontFamily: 'Outfit_700Bold',
                    fontSize: i < 3 ? 18 : 15,
                    color: i === 0 ? C.primary : i < 3 ? C.onSurface : C.outline,
                  }}>
                    {i + 1}
                  </Text>

                  {/* Nombre + conteo */}
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: i < 3 ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                      fontSize: 15,
                      color: C.onSurface,
                    }}>
                      {item.label}
                    </Text>
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_400Regular',
                      fontSize: 12,
                      color: C.outline,
                      marginTop: 1,
                    }}>
                      {item.count}
                    </Text>
                  </View>

                  {/* Icono */}
                  <MaterialCommunityIcons
                    name={i < 3 ? 'fire' : 'arrow-top-right'}
                    size={i < 3 ? 18 : 15}
                    color={i < 3 ? C.primaryContainer : C.outlineVariant}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
