import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, shadow } from '@/lib/theme';
import { StarRow } from '@/components/ui/StarRow';

// ─── Mock data ────────────────────────────────────────────────────────────────

const RESTAURANT = {
  id: '1',
  name: 'Ruta 66',
  category: 'Hamburguesas',
  subcategory: 'Americana',
  rating: 4.8,
  reviewCount: 124,
  distance: '1.2 km',
  price: '$$',
  isOpen: true,
  closesAt: '11:00 PM',
  address: 'Av. Principal 123, El Rosal',
  phone: '+58 212 555 0123',
  instagram: '@ruta66_ccs',
  description:
    'Nacimos del amor por las carreteras abiertas y la buena comida. Ruta 66 trae la auténtica experiencia de diner americano directo al barrio. Aplastamos nuestras hamburguesas a diario y creemos que cada comida debe sentirse como una parada en el mejor road trip de tu vida.',
  icon: 'hamburger' as const,
  iconBg: C.primaryFixed,
  menuAvailable: true,
};


const REVIEWS = [
  {
    id: '1',
    username: '@sofia_m',
    rank: 'Comensal Experto',
    rankColor: C.primaryContainer,
    rating: 5,
    comment: 'Las mejores smash burgers del barrio. La salsa secreta es increíble y las papas siempre crujientes. ¡Totalmente recomendado! 🔥',
    helpful: 24,
    date: 'Hace 2 días',
  },
  {
    id: '2',
    username: '@diego_r',
    rank: 'Explorador',
    rankColor: C.primaryFixed,
    rating: 4,
    comment: 'Buenísimo el servicio. La margarita de tamarindo es un must. Le quito una estrella porque había mucha gente, pero vale la pena la espera.',
    helpful: 8,
    date: 'Hace 1 semana',
  },
  {
    id: '3',
    username: '@carla_f',
    rank: 'Novato',
    rankColor: C.surfaceContainerHighest,
    rating: 5,
    comment: 'Primera vez que vengo y ya quiero volver. El ambiente es increíble, muy buena vibra.',
    helpful: 3,
    date: 'Hace 2 semanas',
  },
];

// ─── Componentes ──────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Pressable key={i} onPress={() => onChange(i)}>
          <MaterialCommunityIcons
            name={i <= value ? 'star' : 'star-outline'}
            size={36}
            color={i <= value ? C.secondary : C.outlineVariant}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

const RATING_LABELS = ['', 'Pésimo 😬', 'Regular 😐', 'Bueno 👍', 'Muy bueno 🔥', 'Excelente ⭐'];
const RATING_COLORS = ['', C.error, C.outline, C.secondary, C.primaryContainer, C.secondary];

function ReviewModal({
  visible,
  onClose,
  restaurantName,
}: {
  visible: boolean;
  onClose: () => void;
  restaurantName: string;
}) {
  const insets  = useSafeAreaInsets();
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.94, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const canSubmit = rating > 0 && comment.trim().length >= 10;

  function handleSubmit() {
    // TODO: submit to Supabase
    onClose();
    setRating(0);
    setComment('');
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => { Keyboard.dismiss(); onClose(); }}>
      {/* Backdrop — dismiss teclado primero, cerrar solo si ya estaba cerrado */}
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(28,27,27,0.65)', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); }} />
      </Animated.View>

      {/* KeyboardAvoidingView empuja el panel cuando sube el teclado */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', pointerEvents: 'box-none' }}
        keyboardVerticalOffset={0}
      >
      <Animated.View
        style={{
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View style={{
          backgroundColor: C.surface,
          borderRadius: 28,
          borderWidth: 2, borderColor: C.border,
          overflow: 'hidden',
          ...shadow.md,
        }}>
          {/* Header con color primario */}
          <View style={{
            backgroundColor: C.primaryFixed,
            borderBottomWidth: 2, borderBottomColor: C.border,
            padding: 20,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <View style={{ gap: 2 }}>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, letterSpacing: 1 }}>
                RANKEAR
              </Text>
              <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22 }}>
                {restaurantName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}
            >
              <MaterialCommunityIcons name="close" size={18} color={C.onSurface} />
            </Pressable>
          </View>

          <View style={{ padding: 20, gap: 20 }}>
            {/* Estrellas */}
            <View style={{ alignItems: 'center', gap: 12 }}>
              <StarPicker value={rating} onChange={setRating} />
              {rating > 0 ? (
                <View style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
                  backgroundColor: C.surfaceContainerLow,
                  borderWidth: 2, borderColor: C.outlineVariant,
                }}>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: RATING_COLORS[rating] }}>
                    {RATING_LABELS[rating]}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 }}>
                  ¿Cuántas estrellas le das?
                </Text>
              )}
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

            {/* Comentario */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 1 }}>
                TU EXPERIENCIA
              </Text>
              <TextInput
                value={comment}
                onChangeText={t => setComment(t.slice(0, 500))}
                placeholder="Cuéntale a la comunidad qué tal estuvo..."
                placeholderTextColor={C.outline}
                multiline
                style={{
                  backgroundColor: C.surfaceContainerLow,
                  borderWidth: 2,
                  borderColor: comment.length > 0 ? C.border : C.outlineVariant,
                  borderRadius: 16, padding: 14,
                  fontFamily: 'PlusJakartaSans_400Regular',
                  fontSize: 15, color: C.onSurface,
                  textAlignVertical: 'top', minHeight: 110,
                }}
              />
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, textAlign: 'right' }}>
                {comment.length} / 500
              </Text>
            </View>

            {/* Submit */}
            <Pressable
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={{
                paddingVertical: 15, borderRadius: 99,
                backgroundColor: canSubmit ? C.primary : C.surfaceContainerHighest,
                borderWidth: 2, borderColor: canSubmit ? C.border : C.outlineVariant,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                ...(canSubmit ? shadow.primary : {}),
              }}
            >
              <MaterialCommunityIcons name="fire" size={18} color={canSubmit ? C.onPrimary : C.outline} />
              <Text style={{ color: canSubmit ? C.onPrimary : C.outline, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                Publicar Rank
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function RestaurantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [helpfulMap, setHelpfulMap] = useState<Record<string, boolean>>({});
  const scrollY = useRef(new Animated.Value(0)).current;

  const HERO_H = 320;
  const headerBg = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H - 20], outputRange: ['rgba(251,248,255,0)', 'rgba(251,248,255,1)'], extrapolate: 'clamp' });
  const headerBorder = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H - 20], outputRange: [0, 2], extrapolate: 'clamp' });
  const titleOpacity = scrollY.interpolate({ inputRange: [HERO_H - 60, HERO_H], outputRange: [0, 1], extrapolate: 'clamp' });
  const btnBg = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H - 20], outputRange: ['rgba(252,249,248,0.92)', 'rgba(252,249,248,0)'], extrapolate: 'clamp' });
  const btnBorder = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H - 20], outputRange: [2, 0], extrapolate: 'clamp' });

  const restaurant = RESTAURANT; // TODO: fetch by id

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ── Hero ── */}
        <View
          style={{
            height: 320,
            backgroundColor: restaurant.iconBg,
            alignItems: 'center', justifyContent: 'center',
            borderBottomWidth: 2, borderBottomColor: C.border,
          }}
        >
          <MaterialCommunityIcons name={restaurant.icon} size={120} color={C.onSurface} style={{ opacity: 0.2 }} />

          {/* Gradient overlay bottom */}
          <View
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 160,
              // simulate gradient with solid bottom
            }}
          />

          {/* Info overlay */}
          <View
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: 20, gap: 8,
              backgroundColor: 'rgba(28,27,27,0.6)',
            }}
          >
            {/* Chips */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[restaurant.category, restaurant.subcategory].map(c => (
                <View
                  key={c}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
                    backgroundColor: C.secondaryContainer,
                    borderWidth: 2, borderColor: C.border,
                  }}
                >
                  <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                    {c.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={{ color: '#fff', fontFamily: 'Outfit_800ExtraBold', fontSize: 36, lineHeight: 40 }}>
              {restaurant.name}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="star" size={16} color={C.secondaryContainer} />
                <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                  {restaurant.rating} ({restaurant.reviewCount})
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="map-marker" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                  {restaurant.distance} • {restaurant.price}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Contenido ── */}
        <View style={{ padding: 16, gap: 20 }}>

          {/* ── Acciones ── */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Rankear — CTA principal */}
            <Pressable
              onPress={() => setReviewModalOpen(true)}
              style={{
                flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 99,
                backgroundColor: C.primary,
                borderWidth: 2, borderColor: C.border,
                ...shadow.primary,
              }}
            >
              <MaterialCommunityIcons name="fire" size={20} color={C.onPrimary} />
              <Text style={{ color: C.onPrimary, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                Rankear
              </Text>
            </Pressable>

            {/* Ir */}
            <Pressable
              onPress={() => Linking.openURL(`maps://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                paddingVertical: 14, borderRadius: 99,
                backgroundColor: C.surface,
                borderWidth: 2, borderColor: C.border,
                ...shadow.sm,
              }}
            >
              <MaterialCommunityIcons name="navigation-variant" size={18} color={C.secondary} />
              <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>
                Ir
              </Text>
            </Pressable>

          </View>

          {/* ── Info ── */}
          <View
            style={{
              backgroundColor: C.surface, borderRadius: 20,
              borderWidth: 2, borderColor: C.border,
              overflow: 'hidden',
              ...shadow.sm,
            }}
          >
            {/* Horario */}
            <Pressable
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16,
                borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: restaurant.isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(186,26,26,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={restaurant.isOpen ? '#16a34a' : C.error}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: restaurant.isOpen ? '#16a34a' : C.error, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                  {restaurant.isOpen ? 'Abierto ahora' : 'Cerrado'}
                </Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                  Cierra a las {restaurant.closesAt}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={C.outline} />
            </Pressable>

            {/* Dirección */}
            <Pressable
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16,
                borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: C.primaryFixed,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                  {restaurant.address}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={C.outline} />
            </Pressable>

            {/* Teléfono */}
            <Pressable
              onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16,
                borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: C.secondaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="phone-outline" size={18} color={C.secondary} />
              </View>
              <Text style={{ flex: 1, color: C.secondary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                {restaurant.phone}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={C.outline} />
            </Pressable>

            {/* Instagram */}
            <Pressable
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 16,
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: C.tertiaryContainer,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="instagram" size={18} color={C.tertiary} />
              </View>
              <Text style={{ flex: 1, color: C.tertiary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                {restaurant.instagram}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={C.outline} />
            </Pressable>
          </View>

          {/* ── Menú PDF ── */}
          {restaurant.menuAvailable && (
            <Pressable
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 18, borderRadius: 20,
                backgroundColor: C.primaryFixed,
                borderWidth: 2, borderColor: C.border,
                ...shadow.md,
              }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: C.primaryContainer,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: C.border,
              }}>
                <MaterialCommunityIcons name="file-pdf-box" size={26} color={C.onSurface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>
                  Ver menú completo
                </Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 2 }}>
                  Descarga el menú en PDF
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={C.primary} />
            </Pressable>
          )}

          {/* ── Historia ── */}
          <View
            style={{
              backgroundColor: C.tertiaryContainer,
              borderRadius: 20, padding: 18, gap: 8,
              borderWidth: 2, borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="book-open-outline" size={18} color={C.tertiary} />
              <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>
                Nuestra historia
              </Text>
            </View>
            <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 22, opacity: 0.85 }}>
              {restaurant.description}
            </Text>
          </View>

          {/* ── Comunidad / Reviews ── */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="comment-text-multiple" size={20} color={C.primary} />
                <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>
                  Comunidad
                </Text>
              </View>
              <Pressable>
                <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                  Ver todos
                </Text>
              </Pressable>
            </View>

            {/* Rating summary */}
            <View
              style={{
                backgroundColor: C.surface, borderRadius: 20,
                borderWidth: 2, borderColor: C.border,
                padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16,
                ...shadow.sm,
              }}
            >
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ color: C.primary, fontFamily: 'Outfit_800ExtraBold', fontSize: 48, lineHeight: 52 }}>
                  {restaurant.rating}
                </Text>
                <StarRow rating={Math.round(restaurant.rating)} size={14} />
                <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                  {restaurant.reviewCount} ranks
                </Text>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                {[5, 4, 3, 2, 1].map(star => {
                  const pct = star === 5 ? 0.65 : star === 4 ? 0.22 : star === 3 ? 0.08 : star === 2 ? 0.03 : 0.02;
                  return (
                    <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, width: 8 }}>
                        {star}
                      </Text>
                      <MaterialCommunityIcons name="star" size={10} color={C.secondary} />
                      <View style={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: C.surfaceContainerHigh, overflow: 'hidden' }}>
                        <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 99, backgroundColor: C.secondary }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* CTA nueva reseña */}
            <Pressable
              onPress={() => setReviewModalOpen(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 14, borderRadius: 16,
                backgroundColor: C.surfaceContainerLow,
                borderWidth: 2, borderColor: C.outlineVariant,
                borderStyle: 'dashed',
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: C.primaryFixed,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: C.border,
                }}
              >
                <MaterialCommunityIcons name="account" size={20} color={C.primary} />
              </View>
              <Text style={{ flex: 1, color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                ¿Qué tal estuvo? Deja tu rank...
              </Text>
              <MaterialCommunityIcons name="fire" size={20} color={C.primary} />
            </Pressable>

            {/* Lista reviews */}
            {REVIEWS.map(r => (
              <View
                key={r.id}
                style={{
                  backgroundColor: C.surface, borderRadius: 20, padding: 16, gap: 12,
                  borderWidth: 2, borderColor: C.border,
                  ...shadow.sm,
                }}
              >
                {/* Header reviewer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: C.primaryFixed,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: C.border,
                    }}
                  >
                    <MaterialCommunityIcons name="account" size={22} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                      {r.username}
                    </Text>
                    <View
                      style={{
                        alignSelf: 'flex-start', marginTop: 2,
                        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
                        backgroundColor: r.rankColor,
                        borderWidth: 1, borderColor: C.border,
                      }}
                    >
                      <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                        {r.rank}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <StarRow rating={r.rating} size={12} />
                    <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                      {r.date}
                    </Text>
                  </View>
                </View>

                {/* Comment */}
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 21 }}>
                  {r.comment}
                </Text>

                {/* Helpful */}
                <Pressable
                  onPress={() => setHelpfulMap(m => ({ ...m, [r.id]: !m[r.id] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                >
                  <MaterialCommunityIcons
                    name={helpfulMap[r.id] ? 'thumb-up' : 'thumb-up-outline'}
                    size={16}
                    color={helpfulMap[r.id] ? C.secondary : C.outline}
                  />
                  <Text style={{ color: helpfulMap[r.id] ? C.secondary : C.outline, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                    {r.helpful + (helpfulMap[r.id] ? 1 : 0)} útil
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── Header animado ── */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingTop: insets.top,
        paddingHorizontal: 16, paddingBottom: 8,
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: headerBg,
        borderBottomWidth: headerBorder,
        borderBottomColor: C.outlineVariant,
      }}>
        {/* Back */}
        <Animated.View style={{ backgroundColor: btnBg, borderRadius: 20, borderWidth: btnBorder, borderColor: C.border }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.onSurface} />
          </Pressable>
        </Animated.View>

        {/* Título aparece al scrollear */}
        <Animated.Text style={{
          flex: 1, textAlign: 'center',
          fontFamily: 'Outfit_700Bold', fontSize: 18, color: C.onSurface,
          opacity: titleOpacity,
          marginHorizontal: 8,
        }} numberOfLines={1}>
          {restaurant.name}
        </Animated.Text>

        {/* Acciones derechas */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Animated.View style={{ backgroundColor: btnBg, borderRadius: 20, borderWidth: btnBorder, borderColor: C.border }}>
            <Pressable
              onPress={() => setSaved(s => !s)}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons
                name={saved ? 'star' : 'star-outline'}
                size={20}
                color={saved ? C.secondary : C.onSurface}
              />
            </Pressable>
          </Animated.View>

          <Animated.View style={{ backgroundColor: btnBg, borderRadius: 20, borderWidth: btnBorder, borderColor: C.border }}>
            <Pressable
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={C.onSurface} />
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>

      {/* ── Review Modal ── */}
      <ReviewModal
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        restaurantName={restaurant.name}
      />
    </View>
  );
}
