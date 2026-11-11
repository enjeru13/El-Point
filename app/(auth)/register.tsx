import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Field } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';
import { authErrorEs } from '@/lib/authErrors';
import { signInWithGoogle } from '@/lib/oauth';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import { useToast } from '@/lib/toast';
import { useTheme } from '@/lib/ThemeContext';
import { Button } from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { capWidth, FORM_MAX_W, useIsTablet } from '@/lib/responsive';
import { beginAuthFlow, endAuthFlow } from '@/lib/authFlow';
import { KEYBOARD_DISMISS } from '@/lib/keyboard';

// Registro del comensal en una sola pantalla: usuario, correo y contraseña.
// Antes eran cinco pasos; lo que no hace falta para entrar (categorías favoritas,
// radio, tema) se pregunta después, ya dentro de la app:
//   - categorías: tarjeta "¿Qué te gusta comer?" en el inicio (PreferencesCard);
//   - radio y tema: Ajustes.

// GoTrue rechaza correos con caracteres no-ASCII (p. ej. la ñ).
const EMAIL_RE = /^[\x00-\x7F]+@[\x00-\x7F]+\.[\x00-\x7F]{2,}$/;

export default function RegisterScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = username.trim().length >= 3 && emailValid && password.length >= 8;

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    try {
      // Google ya trae correo verificado: crea la cuenta y entra directo.
      await signInWithGoogle();
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') {
        toast.error(e?.message ?? 'No se pudo continuar con Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignUp() {
    if (loading || !canSubmit) return;
    setLoading(true);
    beginAuthFlow();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: 'customer',
          username: username.trim(),
          ...(referralCode.trim() ? { invited_by_code: referralCode.trim() } : {}),
        },
      },
    });

    if (error) {
      endAuthFlow();
      setLoading(false);
      toast.error(authErrorEs(error.message));
      return;
    }

    // Confirmación de email activada: todavía sin sesión.
    if (!data.session) {
      endAuthFlow();
      setLoading(false);
      Alert.alert('Casi listo', 'Te enviamos un correo para confirmar tu cuenta.');
      router.replace('/(auth)/login');
      return;
    }

    // Sesión activa: el trigger ya creó el perfil con el usuario; se asegura aquí.
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ username: username.trim() || null })
      .eq('id', data.user!.id);

    setLoading(false);
    if (profileErr) {
      toast.error('Cuenta creada, pero no pudimos guardar tu usuario. Puedes cambiarlo en tu perfil.');
    }
    // Pantalla de bienvenida; su CTA entra a /(customer).
    router.replace('/(auth)/welcome?role=customer');
    endAuthFlow();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: C.surface }}>
      {/* ── Encabezado ── */}
      <View
        className="absolute top-0 left-0 right-0 z-50 flex-row items-center justify-between px-5"
        style={{ backgroundColor: C.surface + 'e0', paddingTop: insets.top, height: insets.top + 56 }}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          className="w-10 h-10 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Icon name="arrow-left" size={24} color={C.onSurfaceVariant} />
        </Pressable>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top + 70,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 20,
            ...capWidth(isTablet, FORM_MAX_W),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={KEYBOARD_DISMISS}
        >
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
              <Icon name="account" size={28} color={C.primary} />
            </View>
            <AppText variant="title" align="center" style={{ fontSize: 23, lineHeight: 28 }}>
              Crea tu cuenta
            </AppText>
            <AppText variant="body" color={C.onSurfaceVariant} align="center" style={{ lineHeight: 21, maxWidth: 300 }}>
              Gratis y en menos de un minuto.
            </AppText>
          </View>

          <View style={{ gap: 16 }}>
            <Field
              label="Usuario"
              icon="account"
              placeholder="foodie_lover"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_.]/gi, ''))}
              hint={username.length > 0 && username.trim().length < 3 ? 'Mínimo 3 caracteres' : undefined}
            />
            <Field
              label="Correo electrónico"
              icon="email-outline"
              placeholder="mateo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              error={email.trim().length > 0 && !emailValid ? 'Usa solo letras sin tildes ni ñ (ej. nombre@gmail.com).' : null}
            />
            <Field
              label="Contraseña"
              icon="lock-outline"
              placeholder="Mínimo 8 caracteres"
              secure
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              hint={password.length > 0 && password.length < 8 ? 'Mínimo 8 caracteres' : undefined}
            />

            {/* Código de invitación: opcional y escondido para no estorbar. */}
            {showCode ? (
              <Field
                label="Código de invitación"
                icon="ticket-confirmation-outline"
                placeholder="ABC123"
                autoCapitalize="characters"
                value={referralCode}
                onChangeText={(t) => setReferralCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                hint="Si un amigo te invitó, los dos ganan XP con tu primer rank."
              />
            ) : (
              <Pressable onPress={() => setShowCode(true)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
                <AppText variant="bodyStrong" color={C.primary}>
                  ¿Tienes un código de invitación?
                </AppText>
              </Pressable>
            )}
          </View>

          <Button
            label={loading ? 'Creando cuenta…' : 'Crear cuenta'}
            onPress={handleSignUp}
            disabled={!canSubmit}
            loading={loading}
            iconTrailing="arrow-right"
            style={{ marginTop: 24 }}
          />
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

          {/* Divisor + Google + Apple */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 }}>
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
          <AppleSignInButton style={{ marginTop: 10 }} />

          {/* Dueños */}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
