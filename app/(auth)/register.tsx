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
  View,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Field } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useTheme } from '@/lib/ThemeContext';
import { Button } from '@/components/ui/Button';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { useCategories } from '@/lib/queries/categories';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constantes ──────────────────────────────────────────────────────────────

const STEPS = 5;

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const categoriesQ = useCategories();
  const [step, setStep] = useState(0);

  // Step 0 — datos básicos
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');

  // Step 1 — preferencias (ids de categoría)
  const [selected, setSelected]   = useState<Set<number>>(new Set());

  // Step 2 — contraseña
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');

  // Step 3 — ubicación
  const [radius, setRadius]       = useState(5);
  const [locGranted, setLocGranted] = useState(false);

  // Step 0 — rol (card dueño)
  const [role, setRole]           = useState<'customer' | 'restaurant_owner'>('customer');

  const [loading, setLoading]     = useState(false);

  function toggleCategory(id: number) {
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
      toast.error(error.message);
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
    await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        search_radius_km: radius,
        favorite_categories: Array.from(selected),
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
                <AppText variant="title" align="center" style={{ marginBottom: 8 }}>
                  ¡Cuéntanos quién eres!
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant} align="center">
                  Únete a la comunidad gastronómica más vibrante del barrio.
                </AppText>
              </View>

              <View style={{ gap: 16 }}>
                <Field
                  label="Usuario"
                  icon="account"
                  placeholder="foodie_lover"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_.]/gi, ''))}
                />
                <Field
                  label="Correo electrónico"
                  icon="email-outline"
                  placeholder="mateo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
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
                <AppText variant="subtitle" align="center" style={{ marginBottom: 4 }}>
                  ¿Eres dueño de un restaurante?
                </AppText>
                <AppText variant="bodySm" color={C.onSurfaceVariant} align="center" style={{ marginBottom: 16 }}>
                  Gestiona tu menú, analíticas y llega a más comensales.
                </AppText>
                <Pressable onPress={() => { setRole('restaurant_owner'); router.push('/(auth)/register-owner'); }}>
                  <AppText
                    variant="label"
                    color={C.primary}
                    style={{ borderBottomWidth: 1, borderBottomColor: C.primary + '4d', paddingBottom: 1 }}
                  >
                    Regístrate como socio
                  </AppText>
                </Pressable>
              </View>
            </>
          )}

          {/* ════ STEP 1 — Perfil de sabor ════ */}
          {step === 1 && (
            <>
              <View className="mb-6">
                <AppText variant="title" style={{ marginBottom: 8 }}>
                  Tu perfil de sabor
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Elige tus estilos favoritos para personalizar tu experiencia.
                </AppText>
              </View>

              {/* Grid 2 columnas */}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  rowGap: 12,
                }}
              >
                {categoriesQ.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} width="48%" height={116} radius={24} style={{ marginBottom: 0 }} />
                  ))}
                {(categoriesQ.data ?? []).map(cat => {
                  const isSelected = selected.has(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      className="items-center py-5 px-3 rounded-3xl border-2 gap-2"
                      style={{
                        width: '48%',
                        borderColor: isSelected ? C.secondary : C.outlineVariant,
                        backgroundColor: isSelected ? C.secondaryContainer : C.surface,
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
                      <AppText
                        variant="label"
                        align="center"
                        color={isSelected ? C.secondary : C.onSurface}
                      >
                        {cat.label}
                      </AppText>
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
                <AppText variant="title" align="center" style={{ marginBottom: 8 }}>
                  Crea tu contraseña
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant} align="center">
                  Mínimo 8 caracteres. Hazla memorable pero segura.
                </AppText>
              </View>
              <View style={{ gap: 16 }}>
                <Field
                  label="Contraseña"
                  icon="lock-outline"
                  placeholder="••••••••"
                  secure
                  value={password}
                  onChangeText={setPassword}
                  hint={password.length > 0 && password.length < 8 ? 'Mínimo 8 caracteres' : undefined}
                />
                <Field
                  label="Confirmar contraseña"
                  icon="lock-outline"
                  placeholder="••••••••"
                  secure
                  value={confirm}
                  onChangeText={setConfirm}
                  error={confirm.length > 0 && password !== confirm ? 'Las contraseñas no coinciden.' : null}
                />
              </View>
            </>
          )}

          {/* ════ STEP 3 — Ubicación ════ */}
          {step === 3 && (
            <>
              <View className="mb-6">
                <AppText variant="title" style={{ marginBottom: 8 }}>
                  Encuentra tu barrio
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Define tu radio de búsqueda para descubrir sabores cerca tuyo.
                </AppText>
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
                    <AppText variant="caption" color={C.primary}>Ubicación activa</AppText>
                  </View>
                ) : (
                  <Pressable
                    onPress={requestLocation}
                    className="absolute top-4 left-4 flex-row items-center gap-2 bg-white/80 px-3 py-2 rounded-full"
                  >
                    <Icon name="crosshairs-gps" size={16} color={C.primary} />
                    <AppText variant="caption" color={C.primary}>Activar ubicación</AppText>
                  </Pressable>
                )}
              </View>

              {/* Slider */}
              <View className="gap-4">
                <View className="flex-row justify-between items-end">
                  <View>
                    <AppText variant="subtitle">Radio de búsqueda</AppText>
                    <AppText variant="bodySm" color={C.onSurfaceVariant}>
                      ¿Qué tan lejos irías por comida?
                    </AppText>
                  </View>
                  <View className="items-end">
                    <AppText variant="display" color={C.primary} style={{ fontSize: 30, lineHeight: 34 }}>
                      {radius}
                    </AppText>
                    <AppText variant="label" color={C.primary}>km</AppText>
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
                    <AppText variant="caption" color={C.outline}>1 km</AppText>
                    <AppText variant="caption" color={C.outline}>15 km</AppText>
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
                      <AppText variant="display" color={C.primary} style={{ fontSize: 48, lineHeight: 56 }}>
                        {radius}
                      </AppText>
                      <AppText variant="label" color={C.primary}>km</AppText>
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
                <AppText variant="title" style={{ marginBottom: 8 }}>
                  Tu estilo visual
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Elige el tema que más va contigo. Puedes cambiarlo cuando quieras en tu perfil.
                </AppText>
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
              <View style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, (selected.size / Math.max(1, (categoriesQ.data ?? []).length)) * 100)}%`, backgroundColor: C.primary }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Button label="Omitir" onPress={handleContinue} variant="secondary" fullWidth={false} style={{ flex: 1 }} />
              <Button
                label={selected.size > 0 ? `Continuar (${selected.size})` : 'Continuar'}
                onPress={handleContinue}
                fullWidth={false}
                style={{ flex: 2 }}
              />
            </View>
          </>
        ) : (
          <>
            <Button
              label={loading ? 'Creando cuenta…' : step === 2 ? 'Crear cuenta' : step === 4 ? 'Empezar a explorar' : 'Continuar'}
              onPress={handleContinue}
              disabled={!canContinue}
              loading={loading}
              iconTrailing={step === 2 || step === 4 ? 'check' : 'arrow-right'}
            />
            {step === 0 && (
              <AppText variant="caption" color={C.onSurfaceVariant + '80'} align="center" style={{ marginTop: 10, lineHeight: 18 }}>
                Al continuar, aceptas nuestros <AppText variant="caption" style={{ textDecorationLine: 'underline' }}>Términos de Servicio</AppText> y <AppText variant="caption" style={{ textDecorationLine: 'underline' }}>Política de Privacidad</AppText>.
              </AppText>
            )}
          </>
        )}
      </View>
    </View>
  );
}
