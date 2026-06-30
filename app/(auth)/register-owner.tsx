import { Icon } from '@/components/ui/Icon';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  { id: 1,  label: 'Pizza',        icon: 'pizza' },
  { id: 2,  label: 'Hamburguesas', icon: 'hamburger' },
  { id: 3,  label: 'Sushi',        icon: 'fish' },
  { id: 4,  label: 'Tacos',        icon: 'taco' },
  { id: 5,  label: 'Vegano',       icon: 'leaf' },
  { id: 6,  label: 'Café',         icon: 'coffee' },
  { id: 7,  label: 'Postres',      icon: 'ice-cream' },
  { id: 8,  label: 'Alta Cocina',  icon: 'silverware-fork-knife' },
  { id: 9,  label: 'BBQ',          icon: 'grill' },
  { id: 10, label: 'Pasta',        icon: 'noodles' },
  { id: 11, label: 'Mariscos',     icon: 'shaker-outline' },
  { id: 12, label: 'Comida rápida',icon: 'food-variant' },
] as const;

const STEPS = 3;

export default function RegisterOwnerScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName]               = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<number>>(new Set());

  const [address, setAddress]         = useState('');
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [whatsapp, setWhatsapp]       = useState('');
  const [instagram, setInstagram]     = useState('');

  const [logoUri, setLogoUri]         = useState<string | null>(null);
  const [coverUri, setCoverUri]       = useState<string | null>(null);
  const [menuPdfName, setMenuPdfName] = useState<string | null>(null);

  function toggleCat(id: number) {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function detectLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado'); return; }
    const loc = await Location.getCurrentPositionAsync({});
    setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    const [place] = await Location.reverseGeocodeAsync(loc.coords);
    if (place) setAddress(`${place.street ?? ''} ${place.streetNumber ?? ''}, ${place.city ?? ''}`.trim());
  }

  async function pickImage(setter: (uri: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) setMenuPdfName(result.assets[0].name);
  }

  const canContinue =
    step === 0 ? !!(name.trim() && selectedCats.size > 0) :
    step === 1 ? !!(address.trim() && coords) :
    true;

  function handleContinue() {
    if (step < STEPS - 1) { setStep(step + 1); return; }
    // TODO: supabase INSERT restaurants + restaurant_categories + upload media to Storage
    router.replace('/(auth)/welcome?role=owner');
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* Header */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: insets.top, height: insets.top + 56,
          backgroundColor: C.surface + 'e0',
        }}
      >
        <Pressable
          onPress={() => step > 0 ? setStep(step - 1) : router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrow-left" size={24} color={C.onSurfaceVariant} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                height: 8, borderRadius: 99,
                width: i === step ? 28 : 8,
                backgroundColor: i === step ? C.primary : i < step ? C.primary : C.surfaceContainerHighest,
              }}
            />
          ))}
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: 120, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ════ STEP 0 — Datos del restaurante ════ */}
          {step === 0 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View
                    style={{
                      width: 52, height: 52, borderRadius: 16,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: C.primaryFixed,
                      borderWidth: 2, borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon name="storefront-outline" size={28} color={C.primary} />
                  </View>
                  <View>
                    <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>
                      Tu restaurante
                    </Text>
                    <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                      Datos principales
                    </Text>
                  </View>
                </View>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                  Únete a la comunidad gastronómica más vibrante del barrio.
                </Text>
              </View>

              <View style={{ gap: 20 }}>
                {/* Nombre */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    Nombre del restaurante *
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderRadius: 16, height: 56, paddingHorizontal: 16, gap: 12,
                      backgroundColor: C.surfaceContainerLow,
                      borderWidth: 2, borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon name="store-outline" size={22} color={C.outline} />
                    <AppTextInput
                      placeholder="Ej. Flame & Fork Bistro"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                {/* Categorías */}
                <View style={{ gap: 12 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    Categorías *{' '}
                    <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular' }}>
                      ({selectedCats.size} seleccionadas)
                    </Text>
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {CATEGORIES.map(cat => {
                      const sel = selectedCats.has(cat.id);
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => toggleCat(cat.id)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                            borderWidth: 2,
                            borderColor: sel ? C.secondary : C.outlineVariant,
                            backgroundColor: sel ? C.secondaryContainer : C.surface,
                          }}
                        >
                          <Icon
                            name={cat.icon as any}
                            size={16}
                            color={sel ? C.secondary : C.onSurfaceVariant}
                          />
                          <Text style={{
                            fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15,
                            color: sel ? C.secondary : C.onSurfaceVariant,
                          }}>
                            {cat.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Badge gamificación */}
              <View
                style={{
                  marginTop: 32, padding: 20, borderRadius: 20,
                  backgroundColor: C.secondaryContainer,
                  borderWidth: 2, borderColor: C.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icon name="trending-up" size={22} color={C.secondary} />
                  <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, flex: 1 }}>
                    Obtén el badge "Local Heat" 🔥
                  </Text>
                </View>
                <Text style={{ color: C.onSecondaryContainer, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 20, marginBottom: 12 }}>
                  Completa tu perfil hoy y recibe 2 semanas de boost en búsquedas locales.
                </Text>
                <View style={{ height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.12)' }}>
                  <View style={{ height: '100%', borderRadius: 99, width: '35%', backgroundColor: C.secondary }} />
                </View>
                <Text style={{ color: C.secondary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, marginTop: 6, letterSpacing: 1 }}>
                  35% COMPLETADO
                </Text>
              </View>
            </>
          )}

          {/* ════ STEP 1 — Ubicación + contacto ════ */}
          {step === 1 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24, marginBottom: 8 }}>
                  Ubicación y contacto
                </Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                  Ayuda a tus clientes a encontrarte y conectar contigo.
                </Text>
              </View>

              <View style={{ gap: 20 }}>
                {/* Dirección + GPS */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    Dirección *
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderRadius: 16, height: 56, paddingHorizontal: 16, gap: 12,
                      backgroundColor: C.surfaceContainerLow,
                      borderWidth: 2, borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon name="map-marker-outline" size={22} color={C.outline} />
                    <AppTextInput
                      placeholder="Calle y ciudad"
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>
                  <Pressable
                    onPress={detectLocation}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
                      borderWidth: 2, borderStyle: 'dashed',
                      borderColor: coords ? C.secondary : C.outlineVariant,
                      backgroundColor: coords ? C.secondaryContainer + '20' : C.surface,
                    }}
                  >
                    <Icon
                      name={coords ? 'check-circle' : 'crosshairs-gps'}
                      size={20}
                      color={coords ? C.secondary : C.outline}
                    />
                    <Text style={{
                      fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15,
                      color: coords ? C.secondary : C.onSurfaceVariant,
                    }}>
                      {coords
                        ? `GPS capturado (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                        : 'Detectar ubicación GPS automáticamente'}
                    </Text>
                  </Pressable>
                </View>

                {/* WhatsApp */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    WhatsApp{' '}
                    <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular' }}>(opcional)</Text>
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderRadius: 16, height: 56, paddingHorizontal: 16, gap: 12,
                      backgroundColor: C.surfaceContainerLow,
                      borderWidth: 2, borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon name="whatsapp" size={22} color="#25D366" />
                    <AppTextInput
                      placeholder="+1 234 567 8900"
                      keyboardType="phone-pad"
                      value={whatsapp}
                      onChangeText={setWhatsapp}
                    />
                  </View>
                </View>

                {/* Instagram */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    Instagram{' '}
                    <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular' }}>(opcional)</Text>
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderRadius: 16, height: 56, paddingHorizontal: 16, gap: 8,
                      backgroundColor: C.surfaceContainerLow,
                      borderWidth: 2, borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon name="instagram" size={22} color="#E1306C" />
                    <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16 }}>@</Text>
                    <AppTextInput
                      placeholder="tu_restaurante"
                      autoCapitalize="none"
                      value={instagram}
                      onChangeText={setInstagram}
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ════ STEP 2 — Media ════ */}
          {step === 2 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24, marginBottom: 8 }}>
                  Muestra tu cocina ✨
                </Text>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                  Fotos de calidad aumentan el engagement 40%. Todo es opcional pero recomendado.
                </Text>
              </View>

              <View style={{ gap: 20 }}>
                {/* Logo */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    Logo del restaurante
                  </Text>
                  <Pressable
                    onPress={() => pickImage(setLogoUri)}
                    style={{
                      height: 120, borderRadius: 16, overflow: 'hidden',
                      borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
                      borderColor: logoUri ? C.primary : C.outlineVariant,
                      backgroundColor: logoUri ? C.primaryFixed + '20' : C.surfaceContainerLow,
                    }}
                  >
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 8 }}>
                        <View style={{ padding: 12, borderRadius: 16, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
                          <Icon name="image-plus" size={28} color={C.primary} />
                        </View>
                        <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>Subir logo</Text>
                        <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>PNG, JPG · máx 10MB</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Foto de portada */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 4 }}>
                    <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                      Foto de portada
                    </Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.secondary }}>
                      <Text style={{ color: C.secondary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, letterSpacing: 0.5 }}>RECOMENDADO</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => pickImage(setCoverUri)}
                    style={{
                      height: 180, borderRadius: 16, overflow: 'hidden',
                      borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
                      borderColor: coverUri ? C.primary : C.outlineVariant,
                      backgroundColor: coverUri ? C.primaryFixed + '20' : C.surfaceContainerLow,
                    }}
                  >
                    {coverUri ? (
                      <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center', gap: 8 }}>
                        <View style={{ padding: 16, borderRadius: 16, backgroundColor: C.primaryFixed, borderWidth: 2, borderColor: C.border, ...shadow.sm }}>
                          <Icon name="camera-plus-outline" size={36} color={C.primary} />
                        </View>
                        <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>Sube tu mejor foto de plato</Text>
                        <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>PNG, JPG · máx 10MB</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Menú PDF */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>
                    Menú en PDF
                  </Text>
                  <Pressable
                    onPress={pickPdf}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 16,
                      padding: 20, borderRadius: 16,
                      borderWidth: 2, borderStyle: 'dashed',
                      borderColor: menuPdfName ? C.primary : C.outlineVariant,
                      backgroundColor: menuPdfName ? C.primaryFixed + '15' : C.surfaceContainerLow,
                    }}
                  >
                    <View
                      style={{
                        width: 48, height: 48, borderRadius: 16,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: menuPdfName ? C.primary : C.primaryFixed,
                        borderWidth: 2, borderColor: C.border,
                      }}
                    >
                      <Icon
                        name={menuPdfName ? 'file-check' : 'file-pdf-box'}
                        size={26}
                        color={menuPdfName ? '#fff' : C.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                        {menuPdfName ?? 'Subir menú PDF'}
                      </Text>
                      <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, marginTop: 2 }}>
                        {menuPdfName ? 'Toca para cambiar' : 'Tus clientes lo verán en tu perfil'}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Barra fija inferior ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 12,
        paddingBottom: insets.bottom + 16,
        backgroundColor: C.surface + 'f0',
      }}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={{
            height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
            backgroundColor: canContinue ? C.primary : C.surfaceContainerHighest,
            borderWidth: 2, borderColor: canContinue ? C.border : C.outlineVariant,
            ...(canContinue ? shadow.primary : {}),
          }}
        >
          <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: canContinue ? '#fff' : C.outline }}>
            {step === STEPS - 1 ? 'Registrar mi restaurante' : 'Continuar'}
          </Text>
          <Icon name={step === STEPS - 1 ? 'storefront' : 'arrow-right'} size={20} color={canContinue ? '#fff' : C.outline} />
        </Pressable>
        {step === STEPS - 1 && (
          <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
            Al registrarte, aceptas los{' '}
            <Text style={{ textDecorationLine: 'underline', color: C.primary }}>Términos de Socio</Text> de El Point.
          </Text>
        )}
      </View>
    </View>
  );
}
