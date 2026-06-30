import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { AppLogo } from '@/components/ui/AppLogo';
import { NotificationsSheet } from '@/components/ui/NotificationsSheet';
import { SearchBar } from '@/components/ui/SearchBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionTitle } from '@/components/ui/SectionTitle';

// ─── Datos mock ───────────────────────────────────────────────────────────────

const CATEGORIES: {
  id: string;
  label: string;
  icon: string;
}[] = [
  { id: 'all',      label: 'Todo',      icon: 'silverware-fork-knife' },
  { id: 'burgers',  label: 'Burgers',   icon: 'hamburger' },
  { id: 'pizza',    label: 'Pizza',     icon: 'pizza' },
  { id: 'hotdogs',  label: 'Hot Dogs',  icon: 'food-hot-dog' },
  { id: 'arepas',   label: 'Arepas',    icon: 'corn' },
  { id: 'lunch',    label: 'Almuerzos', icon: 'food-variant' },
  { id: 'coffee',   label: 'Café',      icon: 'coffee' },
  { id: 'desserts', label: 'Postres',   icon: 'ice-cream' },
];

type MockReview = {
  id: string; restaurant: string; category: string; rating: number; quote: string;
  reviewer: string; rank: string; imageBg: string;
  imageIcon: string;
  imageIconColor: string;
};

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ item }: { item: MockReview }) {
  const { C, shadow } = useTheme();
  const rankColors: Record<string, { bg: string; text: string }> = {
    'Novato':       { bg: C.surfaceContainerHighest, text: C.onSurfaceVariant },
    'Explorador':   { bg: C.primaryFixed,            text: C.primary },
    'Local Guide':  { bg: C.secondaryContainer,      text: C.secondary },
    'Master Eater': { bg: C.primary,                  text: '#fff' },
    'Food Legend':  { bg: C.tertiary,                 text: '#fff' },
  };
  const rankStyle = rankColors[item.rank] ?? rankColors['Novato'];
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${item.id}`)}
      style={{
        backgroundColor: C.surface,
        borderRadius: 24, overflow: 'hidden',
        borderWidth: 2, borderColor: C.border,
        ...shadow.md,
        marginBottom: 16,
      }}
    >
      {/* Imagen placeholder con icono */}
      <View
        style={{
          height: 180, width: '100%',
          backgroundColor: item.imageBg,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={item.imageIcon} size={80} color={item.imageIconColor} style={{ opacity: 0.55 }} />

        {/* Rating */}
        <View
          style={{
            position: 'absolute', top: 12, right: 12,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
            backgroundColor: C.secondaryContainer,
            borderWidth: 2, borderColor: C.border,
          }}
        >
          <Icon name="star" size={14} color={C.secondary} />
          <Text style={{ color: C.secondary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
            {item.rating.toFixed(1)}
          </Text>
        </View>

        {/* Categoría */}
        <View
          style={{
            position: 'absolute', top: 12, left: 12,
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
            backgroundColor: C.surface,
            borderWidth: 2, borderColor: C.border,
          }}
        >
          <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
            {item.category}
          </Text>
        </View>
      </View>

      {/* Contenido */}
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>
          {item.restaurant}
        </Text>

        {/* Quote */}
        <View
          style={{
            padding: 12, borderRadius: 12,
            backgroundColor: C.surfaceContainerLow,
            borderLeftWidth: 3, borderLeftColor: C.primary,
          }}
        >
          <Text style={{
            color: C.onSurfaceVariant,
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 15, lineHeight: 22, fontStyle: 'italic',
          }}>
            "{item.quote}"
          </Text>
        </View>

        {/* Reviewer */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTopWidth: 1, borderTopColor: C.outlineVariant,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: C.primaryFixed,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}
            >
              <Icon name="account" size={20} color={C.primary} />
            </View>
            <View>
              <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                {item.reviewer}
              </Text>
              <View
                style={{
                  marginTop: 2, alignSelf: 'flex-start',
                  paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
                  backgroundColor: rankStyle.bg,
                }}
              >
                <Text style={{ color: rankStyle.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                  {item.rank}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
              backgroundColor: C.primaryFixed,
              borderWidth: 2, borderColor: C.border,
            }}
          >
            <Icon name="heart-outline" size={14} color={C.primary} />
            <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
              Me sirve
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { C, shadow } = useTheme();

  const MOCK_REVIEWS: MockReview[] = [
    { id: '1', restaurant: 'La Smasheria',    category: 'Burgers',   rating: 4.8, quote: '¡Las mejores smash burgers de la zona, crujientes por fuera y jugosas por dentro!', reviewer: '@burgerking99',   rank: 'Master Eater', imageBg: C.primaryFixed,       imageIcon: 'hamburger',   imageIconColor: C.primary },
    { id: '2', restaurant: 'Pizza Mágica',    category: 'Pizza',     rating: 4.2, quote: 'Masa fina, ingredientes frescos. Le faltó un poco de salsa pero muy buena.',          reviewer: '@pizzalover_x',  rank: 'Local Guide',  imageBg: C.tertiaryContainer,  imageIcon: 'pizza',       imageIconColor: C.onTertiaryContainer },
    { id: '3', restaurant: 'El Perrero Loco', category: 'Hot Dogs',  rating: 5.0, quote: '¡Una explosión de sabor! El pan es súper suave y las salsas de otro nivel.',         reviewer: '@streetfood_guru', rank: 'Master Eater', imageBg: C.secondaryContainer, imageIcon: 'food-hot-dog', imageIconColor: C.secondary },
    { id: '4', restaurant: 'Arepa & Co.',     category: 'Arepas',   rating: 4.6, quote: 'Las arepas de choclo con queso son pecado. No puedo dejar de pedir.',                 reviewer: '@arepafanatic',  rank: 'Explorador',   imageBg: '#fff3c4',            imageIcon: 'corn',        imageIconColor: '#b45309' },
  ];

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab]           = useState<'ranks' | 'favorites'>('ranks');
  const [search, setSearch]                 = useState('');
  const notifsRef = useRef<{ present: () => void; dismiss: () => void }>(null);

  const categoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';
  const filtered = MOCK_REVIEWS.filter(r =>
    activeCategory === 'all' ||
    r.category.toLowerCase() === categoryLabel.toLowerCase()
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* ── Header ── */}
      <ScreenHeader
        left={<AppLogo />}
        right={
          <Pressable onPress={() => notifsRef.current?.present()} style={{ width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:C.border, backgroundColor:C.surface }}>
            <Icon name="bell-outline" size={22} color={C.onSurface} />
            <View style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:4, backgroundColor:C.primaryContainer, borderWidth:1.5, borderColor:C.surface }} />
          </Pressable>
        }
      />

      <NotificationsSheet ref={notifsRef} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* ── Saludo + búsqueda ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 14 }}>
          <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 26 }}>
            ¡Hola, Comensal! 👋
          </Text>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Encuentra tu próximo antojo..."
            variant="floating"
          />
        </View>

        {/* ── Categorías scroll horizontal ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}
        >
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                  borderWidth: 2,
                  borderColor: active ? C.border : C.outlineVariant,
                  backgroundColor: active ? C.primary : C.surface,
                  ...(active ? shadow.primary : {}),
                }}
              >
                <Icon
                  name={cat.icon}
                  size={16}
                  color={active ? '#fff' : C.onSurfaceVariant}
                />
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15,
                  color: active ? '#fff' : C.onSurface,
                }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Tabs ── */}
        <View
          style={{
            flexDirection: 'row', paddingHorizontal: 20, gap: 24,
            borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
            marginBottom: 16,
          }}
        >
          {([
            { key: 'ranks',     label: 'Últimos Ranks' },
            { key: 'favorites', label: 'Tus Favoritos' },
          ] as const).map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingBottom: 10, paddingTop: 4,
                borderBottomWidth: 3,
                borderBottomColor: activeTab === tab.key ? C.primary : 'transparent',
                marginBottom: -2,
              }}
            >
              <Text style={{
                fontFamily: 'Outfit_700Bold', fontSize: 18,
                color: activeTab === tab.key ? C.primary : C.outline,
              }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Feed ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {activeTab === 'favorites' ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Icon name="heart-outline" size={48} color={C.outline} />
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>
                Sin favoritos aún
              </Text>
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, textAlign: 'center', maxWidth: 240 }}>
                Dale "Me sirve" a las reseñas que más te gusten para guardarlas acá.
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            filtered.map(item => <ReviewCard key={item.id} item={item} />)
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Icon name="food-off-outline" size={48} color={C.outline} />
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                Sin reseñas en esta categoría aún.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
