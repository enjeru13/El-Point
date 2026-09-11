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
import { signInWithGoogle } from '@/lib/oauth';
import { useToast } from '@/lib/toast';
import { useTheme } from '@/lib/ThemeContext';
import { Button } from '@/components/ui/Button';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { useCategories } from '@/lib/queries/categories';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { capWidth, FORM_MAX_W, useIsTablet } from '@/lib/responsive';

// ─── Constantes ──────────────────────────────────────────────────────────────

const STEPS = 5;

function StepHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  const { C } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginBottom: 28, gap: 10 }}>
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.primaryFixed,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Icon name={icon} size={28} color={C.primary} />
      </View>
      <AppText variant="title" align="center" style={{ fontSize: 23, lineHeight: 28 }}>
        {title}
      </AppText>
      <AppText variant="body" color={C.onSurfaceVariant} align="center" style={{ lineHeight: 21, maxWidth: 300 }}>
        {subtitle}
      </AppText>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
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

  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Google ya trae correo verificado — crea la cuenta y entra directo,
      // sin pasar por el resto del wizard. Categorías/tema/radio quedan con
      // sus valores por defecto y se pueden ajustar luego desde el perfil.
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') {
        toast.error(e?.message ?? 'No se pudo continuar con Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

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
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        search_radius_km: radius,
        favorite_categories: Array.from(selected),
      })
      .eq('id', data.user!.id);

    setLoading(false);
    if (profileErr) {
      toast.error('Cuenta creada, pero no pudimos guardar tus preferencias. Ajústalas en tu perfil.');
    }
    // Pantalla de bienvenida; su CTA entra a /(customer).
    router.replace('/(auth)/welcome');
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
          onPress={() =>
            step > 0
              ? setStep(step - 1)
              : router.canGoBack()
                ? router.back()
                : router.replace('/(auth)/login')
          }
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
            paddingBottom: insets.bottom + (step === 0 ? 172 : 120),
            paddingHorizontal: 20,
            ...capWidth(isTablet, FORM_MAX_W),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ════ STEP 0 — Datos básicos ════ */}
          {step === 0 && (
            <>
              <StepHeader
                icon="account"
                title="Crea tu cuenta"
                subtitle="Elige tu nombre de usuario y el correo con el que vas a entrar."
              />

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

              {/* Divisor + Google */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }} />
                <AppText variant="overline" color={C.outline}>O CONTINÚA CON</AppText>
                <View style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }} />
              </View>
              <Button
                label={googleLoading ? 'Conectando…' : 'Continuar con Google'}
                onPress={handleGoogleRegister}
                loading={googleLoading}
                variant="secondary"
                icon="google"
                style={{ marginTop: 16 }}
              />

              {/* Partner card */}
              <View style={{ marginTop: 36, gap: 8 }}>
                <AppText variant="overline" color={C.outline} style={{ marginLeft: 4 }}>
                  ¿ERES DUEÑO?
                </AppText>
                <Pressable
                  onPress={() => router.push('/(auth)/register-owner')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: 16,
                    borderRadius: 20,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    ...shadow.sm,
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: C.tertiary + '22',
                    }}
                  >
                    <Icon name="storefront-outline" size={22} color={C.tertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">Registra tu restaurante</AppText>
                    <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 2 }}>
                      Menú, analíticas y más comensales.
                    </AppText>
                  </View>
                  <Icon name="chevron-right" size={20} color={C.outline} />
                </Pressable>
              </View>
            </>
          )}

          {/* ════ STEP 1 — Perfil de sabor ════ */}
          {step === 1 && (
            <>
              <StepHeader
                icon="silverware-fork-knife"
                title="Tu perfil de sabor"
                subtitle="Elige tus estilos favoritos y te mostramos primero lo que te gusta."
              />

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
                {!categoriesQ.isLoading && (categoriesQ.data ?? []).length === 0 && (
                  <AppText variant="bodySm" color={C.outline} style={{ width: '100%', paddingVertical: 20 }} align="center">
                    No pudimos cargar las categorías. Puedes elegirlas luego en tu perfil.
                  </AppText>
                )}
                {(categoriesQ.data ?? []).map(cat => {
                  const isSelected = selected.has(cat.id);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => toggleCategory(cat.id)}
                      className="items-center py-5 px-3 rounded-3xl border gap-2"
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
              <StepHeader
                icon="lock-outline"
                title="Crea tu contraseña"
                subtitle="Mínimo 8 caracteres. Que sea memorable pero segura."
              />
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
              <StepHeader
                icon="map-marker"
                title="Tu zona"
                subtitle="Define hasta dónde estás dispuesto a ir por un buen plato."
              />

              {/* Radio visualizado */}
              <View
                className="w-full rounded-[32px] overflow-hidden mb-8 items-center justify-center border"
                style={{
                  height: 230,
                  backgroundColor: C.surfaceContainerHigh,
                  borderColor: C.border,
                  ...shadow.sm,
                }}
              >
                <View
                  className="rounded-full items-center justify-center"
                  style={{
                    width: 80 + radius * 11,
                    height: 80 + radius * 11,
                    backgroundColor: C.primary + '1f',
                    borderWidth: 1,
                    borderColor: C.primary + '44',
                  }}
                >
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 58 + radius * 5,
                      height: 58 + radius * 5,
                      backgroundColor: C.primary + '1a',
                      borderWidth: 1,
                      borderColor: C.primary + '55',
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
                  <View
                    className="absolute top-4 left-4 flex-row items-center gap-2 px-3 py-2 rounded-full"
                    style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
                  >
                    <Icon name="check-circle" size={16} color={C.primary} />
                    <AppText variant="caption" color={C.primary}>Ubicación activa</AppText>
                  </View>
                ) : (
                  <Pressable
                    onPress={requestLocation}
                    className="absolute top-4 left-4 flex-row items-center gap-2 px-3 py-2 rounded-full"
                    style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
                  >
                    <Icon name="crosshairs-gps" size={16} color={C.primary} />
                    <AppText variant="caption" color={C.primary}>Activar ubicación</AppText>
                  </Pressable>
                )}
              </View>

              {/* Radio de búsqueda */}
              <View className="gap-4">
                <View>
                  <AppText variant="subtitle">Radio de búsqueda</AppText>
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>
                    ¿Qué tan lejos irías por comida?
                  </AppText>
                </View>

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
                      className="w-12 h-12 rounded-full items-center justify-center border"
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
                      className="w-12 h-12 rounded-full items-center justify-center border"
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
              <StepHeader
                icon="sun"
                title="Claro u oscuro"
                subtitle="Elige cómo se ve la app. Lo puedes cambiar cuando quieras en Ajustes."
              />
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
              label={loading ? 'Creando cuenta…' : step === 4 ? 'Empezar a explorar' : 'Continuar'}
              onPress={handleContinue}
              disabled={!canContinue}
              loading={loading}
              iconTrailing={step === 4 ? 'check' : 'arrow-right'}
            />
            {step === 0 && (
              <AppText variant="caption" color={C.onSurfaceVariant + '80'} align="center" style={{ marginTop: 10, lineHeight: 18 }}>
                Al crear tu cuenta, aceptas nuestros{' '}
                <AppText
                  variant="caption"
                  color={C.primary}
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => router.push('/legal/terms')}
                >
                  Términos de Servicio
                </AppText>{' '}
                y la{' '}
                <AppText
                  variant="caption"
                  color={C.primary}
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => router.push('/legal/privacy')}
                >
                  Política de Privacidad
                </AppText>
                .
              </AppText>
            )}
          </>
        )}
      </View>
    </View>
  );
}
