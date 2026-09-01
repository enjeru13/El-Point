import { Icon } from '@/components/ui/Icon';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constantes ──────────────────────────────────────────────────────────────

const STEPS = 5;

const CATEGORIES: {
  id: string;
  label: string;
  icon: string;
}[] = [
  { id: 'pizza',      label: 'Pizza',        icon: 'pizza' },
  { id: 'burgers',    label: 'Hamburguesas', icon: 'hamburger' },
  { id: 'sushi',      label: 'Sushi',        icon: 'fish' },
  { id: 'tacos',      label: 'Tacos',        icon: 'taco' },
  { id: 'vegan',      label: 'Vegano',       icon: 'leaf' },
  { id: 'coffee',     label: 'Café',         icon: 'coffee' },
  { id: 'desserts',   label: 'Postres',      icon: 'ice-cream' },
  { id: 'finedining', label: 'Alta Cocina',  icon: 'silverware-fork-knife' },
  { id: 'bbq',        label: 'BBQ',          icon: 'grill' },
  { id: 'pasta',      label: 'Pasta',        icon: 'noodles' },
];

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 — datos básicos
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');

  // Step 1 — preferencias
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  // Step 2 — contraseña
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');

  // Step 3 — ubicación
  const [radius, setRadius]       = useState(5);
  const [locGranted, setLocGranted] = useState(false);

  // Step 0 — rol (card dueño)
  const [role, setRole]           = useState<'customer' | 'restaurant_owner'>('customer');

  const [loading, setLoading]     = useState(false);

  function toggleCategory(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSignUp() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: 'customer', username: username.trim() } },
    });

    if (error) {
      setLoading(false);
      Alert.alert('No se pudo crear la cuenta', error.message);
      return;
    }

    // Confirmación de email activada → todavía sin sesión
    if (!data.session) {
      setLoading(false);
      Alert.alert('Casi listo', 'Te enviamos un correo para confirmar tu cuenta.');
      router.replace('/(auth)/login');
      return;
    }

    // Sesión activa → completar perfil (el trigger ya creó la fila)
    let favoriteCategories: number[] = [];
    if (selected.size > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', Array.from(selected));
      favoriteCategories = (cats ?? []).map((c) => c.id);
    }

    await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        search_radius_km: radius,
        favorite_categories: favoriteCategories,
      })
      .eq('id', data.user!.id);

    setLoading(false);
    // _layout detecta la sesión y redirige a /(customer)
  }

  function handleContinue() {
    if (loading) return;
    if (step === 4) { handleSignUp(); return; }
    if (step < STEPS - 1) setStep(step + 1);
  }

  // GoTrue rechaza correos con caracteres no-ASCII (p. ej. la ñ)
  const emailValid = /^[\x00-\x7F]+@[\x00-\x7F]+\.[\x00-\x7F]{2,}$/.test(email.trim());

  const canContinue =
    step === 0 ? !!(username.trim()) && emailValid :
    step === 1 ? true :
    step === 2 ? password.length >= 8 && password === confirm :
    true; // steps 3 & 4 always ok

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocGranted(status === 'granted');
  }

  return (
    <View className="flex-1" style={{ backgroundColor: C.surface }}>

      {/* ── Header ── */}
      <View
        className="absolute top-0 left-0 right-0 z-50 flex-row items-center justify-between px-5"
        style={{ backgroundColor: C.surface + 'e0', paddingTop: insets.top, height: insets.top + 56 }}
      >
        <Pressable
          onPress={() => step > 0 ? setStep(step - 1) : router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <Icon name="arrow-left" size={24} color={C.onSurfaceVariant} />
        </Pressable>

        {/* Step dots */}
        <View className="flex-row items-center gap-2">
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              className="h-2 rounded-full"
              style={{
                width: i === step ? 28 : 8,
                backgroundColor: i === step ? C.primary : i < step ? C.primary : C.surfaceContainerHighest,
              }}
            />
          ))}
        </View>

        <View className="w-10" />
      </View>

      {/* ── Contenido ── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top + 70,
            paddingBottom: 120,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ════ STEP 0 — Datos básicos ════ */}
          {step === 0 && (
            <>
              <View className="items-center mb-8">
                <View
                  className="p-4 rounded-3xl mb-4"
                  style={{ backgroundColor: C.secondaryContainer + '4d' }}
                >
                  <Icon name="party-popper" size={40} color={C.secondary} />
                </View>
                <Text
                  className="text-2xl text-center mb-2"
                  style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold' }}
                >
                  ¡Cuéntanos quién eres!
                </Text>
                <Text
                  className="text-base text-center"
                  style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  Únete a la comunidad gastronómica más vibrante del barrio.
                </Text>
              </View>

              <View className="gap-5">
                <View className="gap-2">
                  <Text
                    className="text-sm ml-1"
                    style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    Usuario
                  </Text>
                  <View
                    className="flex-row items-center rounded-2xl h-14 px-4 gap-2 border-2"
                    style={{
                      backgroundColor: C.surfaceContainerLow,
                      borderColor: C.border,
                      ...shadow.md,
                    }}
                  >
                    <Text
                      className="text-lg"
                      style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold' }}
                    >
                      @
                    </Text>
                    <AppTextInput
                      className=""
                      placeholder="foodie_lover"
                      placeholderTextColor={C.outline + '66'}
                      autoCapitalize="none"
                      value={username}
                      onChangeText={setUsername}
                    />
                  </View>
                </View>

                <InputField
                  label="Correo electrónico"
                  icon="email-outline"
                  placeholder="mateo@ejemplo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </View>

              {/* Partner card */}
              <View
                className="mt-10 p-6 rounded-3xl items-center border-2"
                style={{
                  backgroundColor: C.surfaceContainerLow,
                  borderColor: C.border,
                  ...shadow.md,
                }}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: C.tertiaryContainer }}
                >
                  <Icon name="storefront-outline" size={24} color="#fff" />
                </View>
                <Text
                  className="text-base text-center mb-1"
                  style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  ¿Eres dueño de un restaurante?
                </Text>
                <Text
                  className="text-sm text-center mb-4"
                  style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  Gestiona tu menú, analíticas y llega a más comensales.
                </Text>
                <Pressable onPress={() => { setRole('restaurant_owner'); router.push('/(auth)/register-owner'); }}>
                  <Text
                    className="text-sm pb-px"
                    style={{
                      color: C.primary,
                      fontFamily: 'PlusJakartaSans_700Bold',
                      borderBottomWidth: 1,
                      borderBottomColor: C.primary + '4d',
                    }}
                  >
                    Regístrate como socio
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ════ STEP 1 — Perfil de sabor ════ */}
          {step === 1 && (
            <>
              <View className="mb-6">
                <Text
                  className="text-2xl mb-2"
                  style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold' }}
                >
                  Tu perfil de sabor
                </Text>
                <Text
                  className="text-base"
                  style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  Elige tus estilos favoritos para personalizar tu experiencia.
                </Text>
              </View>

              {/* Grid 2 columnas */}
              <View className="flex-row flex-wrap gap-3">
                {CATEGORIES.map(cat => {
                  const isSelected = selected.has(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      className="items-center py-5 px-3 rounded-3xl border-2 gap-2"
                      style={{
                        width: '47%',
                        borderColor: isSelected ? C.secondary : C.outlineVariant,
                        backgroundColor: isSelected ? C.secondaryContainer : '#fff',
                        ...(isSelected ? shadow.md : {}),
                      }}
                    >
                      {/* Check badge */}
                      {isSelected && (
                        <View className="absolute top-3 right-3">
                          <Icon name="check-circle" size={18} color={C.secondary} />
                        </View>
                      )}

                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: isSelected ? C.secondary : C.primaryFixed }}
                      >
                        <Icon
                          name={cat.icon}
                          size={26}
                          color={isSelected ? C.onSecondary : C.primary}
                        />
                      </View>
                      <Text
                        className="text-sm text-center"
                        style={{
                          color: isSelected ? C.secondary : C.onSurface,
                          fontFamily: 'PlusJakartaSans_600SemiBold',
                        }}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* ════ STEP 2 — Contraseña ════ */}
          {step === 2 && (
            <>
              <View className="items-center mb-8">
                <View
                  className="p-4 rounded-3xl mb-4"
                  style={{ backgroundColor: C.primaryFixed + '66' }}
                >
                  <Icon name="shield-lock-outline" size={40} color={C.primary} />
                </View>
                <Text
                  className="text-2xl text-center mb-2"
                  style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold' }}
                >
                  Crea tu contraseña
                </Text>
                <Text
                  className="text-base text-center"
                  style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  Mínimo 8 caracteres. Hazla memorable pero segura.
                </Text>
              </View>
              <View className="gap-5">
                <PasswordField
                  label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                />
                <PasswordField
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  value={confirm}
                  onChangeText={setConfirm}
                />
                {confirm.length > 0 && password !== confirm && (
                  <Text
                    className="text-sm ml-1"
                    style={{ color: C.error, fontFamily: 'PlusJakartaSans_400Regular' }}
                  >
                    Las contraseñas no coinciden.
                  </Text>
                )}
              </View>
            </>
          )}

          {/* ════ STEP 3 — Ubicación ════ */}
          {step === 3 && (
            <>
              <View className="mb-6">
                <Text
                  className="text-2xl mb-2"
                  style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold' }}
                >
                  Encuentra tu barrio
                </Text>
                <Text
                  className="text-base"
                  style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  Define tu radio de búsqueda para descubrir sabores cerca tuyo.
                </Text>
              </View>

              {/* Mapa placeholder con círculo animado */}
              <View
                className="w-full rounded-[32px] overflow-hidden mb-8 items-center justify-center border-2"
                style={{
                  height: 280,
                  backgroundColor: C.surfaceContainerHighest,
                  borderColor: C.border,
                  ...shadow.md,
                }}
              >
                {/* Círculo de radio animado */}
                <View
                  className="rounded-full items-center justify-center"
                  style={{
                    width: 80 + radius * 12,
                    height: 80 + radius * 12,
                    backgroundColor: C.primary + '14',
                    borderWidth: 1,
                    borderColor: C.primary + '33',
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 60 + radius * 6,
                      height: 60 + radius * 6,
                      backgroundColor: C.primary + '0f',
                      borderWidth: 1,
                      borderColor: C.primary + '4d',
                    }}
                  >
                    {/* Pin central */}
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: C.primary,
                        ...shadow.primary,
                      }}
                    >
                      <Icon name="map-marker" size={28} color="#fff" />
                    </View>
                  </View>
                </View>

                {/* Badge ubicación */}
                {locGranted ? (
                  <View className="absolute top-4 left-4 flex-row items-center gap-2 bg-white/80 px-3 py-2 rounded-full">
                    <Icon name="check-circle" size={16} color={C.primary} />
                    <Text
                      className="text-xs"
                      style={{ color: C.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      Ubicación activa
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={requestLocation}
                    className="absolute top-4 left-4 flex-row items-center gap-2 bg-white/80 px-3 py-2 rounded-full"
                  >
                    <Icon name="crosshairs-gps" size={16} color={C.primary} />
                    <Text
                      className="text-xs"
                      style={{ color: C.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      Activar ubicación
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Slider */}
              <View className="gap-4">
                <View className="flex-row justify-between items-end">
                  <View>
                    <Text
                      className="text-lg"
                      style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold' }}
                    >
                      Radio de búsqueda
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
                    >
                      ¿Qué tan lejos irías por comida?
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      style={{ color: C.primary, fontSize: 30, fontFamily: 'Outfit_800ExtraBold' }}
                    >
                      {radius}
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: C.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      km
                    </Text>
                  </View>
                </View>

                {/* Slider */}
                <View className="py-2 gap-4">
                  <View className="h-3 rounded-full" style={{ backgroundColor: C.primaryFixed }}>
                    <View
                      className="h-3 rounded-full"
                      style={{
                        width: `${((radius - 1) / 14) * 100}%`,
                        backgroundColor: C.primary,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className="text-xs"
                      style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular' }}
                    >
                      1 km
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular' }}
                    >
                      15 km
                    </Text>
                  </View>
                  {/* Botones de ajuste */}
                  <View className="flex-row items-center justify-center gap-6">
                    <Pressable
                      onPress={() => setRadius(r => Math.max(1, r - 1))}
                      className="w-12 h-12 rounded-full items-center justify-center border-2"
                      style={{ borderColor: C.outlineVariant }}
                    >
                      <Icon name="minus" size={22} color={C.onSurfaceVariant} />
                    </Pressable>
                    <View className="items-center">
                      <Text
                        style={{
                          color: C.primary,
                          fontSize: 48,
                          lineHeight: 56,
                          fontFamily: 'Outfit_800ExtraBold',
                        }}
                      >
                        {radius}
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ color: C.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}
                      >
                        km
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setRadius(r => Math.min(15, r + 1))}
                      className="w-12 h-12 rounded-full items-center justify-center border-2"
                      style={{ borderColor: C.outlineVariant }}
                    >
                      <Icon name="plus" size={22} color={C.onSurfaceVariant} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ════ STEP 4 — Tema ════ */}
          {step === 4 && (
            <>
              <View className="mb-6">
                <Text className="text-2xl mb-2" style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold' }}>
                  Tu estilo visual
                </Text>
                <Text className="text-base" style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}>
                  Elige el tema que más va contigo. Puedes cambiarlo cuando quieras en tu perfil.
                </Text>
              </View>
              <ThemePicker />
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Barra fija inferior ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 16,
        backgroundColor: C.surface + 'f0',
      }}>
        {step === 1 ? (
          <>
            <View style={{ height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: C.surfaceContainerHighest, marginBottom: 12 }}>
              <View style={{ height: '100%', borderRadius: 99, width: `${(selected.size / CATEGORIES.length) * 100}%`, backgroundColor: C.primary }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Pressable onPress={handleContinue} style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>Omitir</Text>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                style={{ flex: 2, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, borderWidth: 2, borderColor: C.border, ...shadow.primary }}
              >
                <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>
                  {selected.size > 0 ? `Continuar (${selected.size})` : 'Continuar'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue || loading}
              style={{
                height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 8,
                backgroundColor: canContinue && !loading ? C.primary : C.surfaceContainerHighest,
                borderWidth: 2, borderColor: C.border,
                ...(canContinue && !loading ? shadow.primary : {}),
              }}
            >
              <Text style={{ color: canContinue && !loading ? '#fff' : C.outline, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>
                {loading ? 'Creando cuenta...' : step === 2 ? 'Crear cuenta' : step === 4 ? 'Empezar a explorar' : 'Continuar'}
              </Text>
              {!loading && <Icon name={step === 4 ? 'check' : step === 2 ? 'check' : 'arrow-right'} size={20} color={canContinue ? '#fff' : C.outline} />}
            </Pressable>
            {step === 0 && (
              <Text style={{ color: C.onSurfaceVariant + '80', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
                Al continuar, aceptas nuestros <Text style={{ textDecorationLine: 'underline' }}>Términos de Servicio</Text> y <Text style={{ textDecorationLine: 'underline' }}>Política de Privacidad</Text>.
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Componentes reutilizables ────────────────────────────────────────────────

function InputField({
  label, icon, placeholder, value, onChangeText, keyboardType = 'default',
}: {
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address';
}) {
  const { C, shadow } = useTheme();
  return (
    <View className="gap-2">
      <Text className="text-sm ml-1" style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
        {label}
      </Text>
      <View className="flex-row items-center rounded-2xl h-14 px-4 gap-3 border-2" style={{ backgroundColor: C.surfaceContainerLow, borderColor: C.border, ...shadow.md }}>
        <Icon name={icon} size={22} color={C.outline} />
        <AppTextInput className="" placeholder={placeholder} placeholderTextColor={C.outline + '66'} autoCapitalize="none" keyboardType={keyboardType} value={value} onChangeText={onChangeText} />
      </View>
    </View>
  );
}

function PasswordField({
  label, placeholder, value, onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  const { C, shadow } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <View className="gap-2">
      <Text
        className="text-sm ml-1"
        style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {label}
      </Text>
      <View
        className="flex-row items-center rounded-2xl h-14 px-4 gap-3 border-2"
        style={{
          backgroundColor: C.surfaceContainerLow,
          borderColor: C.border,
          ...shadow.md,
        }}
      >
        <Icon name="lock-outline" size={22} color={C.outline} />
        <AppTextInput
          className=""
          placeholder={placeholder}
          placeholderTextColor={C.outline + '66'}
          secureTextEntry={!show}
          value={value}
          onChangeText={onChangeText}
        />
        <Pressable onPress={() => setShow(!show)}>
          <Icon
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={C.outline}
          />
        </Pressable>
      </View>
    </View>
  );
}

function RoleCard({
  icon, title, description, selected, onPress,
}: {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 p-5 rounded-3xl border-2"
      style={{
        borderColor: selected ? C.primary : C.outlineVariant,
        backgroundColor: selected ? C.primaryFixed + '33' : C.surfaceContainerLow,
        ...(selected ? shadow.md : {}),
      }}
    >
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center"
        style={{ backgroundColor: selected ? C.primary : C.surfaceContainerHighest }}
      >
        <Icon name={icon} size={28} color={selected ? '#fff' : C.onSurfaceVariant} />
      </View>
      <View className="flex-1">
        <Text
          className="text-base mb-1"
          style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {title}
        </Text>
        <Text
          className="text-sm leading-5"
          style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {description}
        </Text>
      </View>
      {selected && (
        <Icon name="check-circle" size={24} color={C.primary} />
      )}
    </Pressable>
  );
}
