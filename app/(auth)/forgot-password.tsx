import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { AppLogo } from '@/components/ui/AppLogo';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

const emailValid = (e: string) => /^[\x00-\x7F]+@[\x00-\x7F]+\.[\x00-\x7F]{2,}$/.test(e.trim());

export default function ForgotPasswordScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!emailValid(email)) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('No se pudo enviar', error.message);
      return;
    }
    setStep('code');
  }

  async function submitNewPassword() {
    if (code.trim().length < 6) { Alert.alert('Código incompleto'); return; }
    if (password.length < 8) { Alert.alert('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { Alert.alert('Las contraseñas no coinciden'); return; }

    setLoading(true);
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    if (otpError) {
      setLoading(false);
      Alert.alert('Código inválido', otpError.message);
      return;
    }

    const { error: updError } = await supabase.auth.updateUser({ password });
    await supabase.auth.signOut();
    setLoading(false);

    if (updError) {
      Alert.alert('No se pudo actualizar', updError.message);
      return;
    }
    Alert.alert('Listo', 'Tu contraseña fue actualizada. Inicia sesión.');
    router.replace('/(auth)/login');
  }

  const canSend = emailValid(email) && !loading;
  const canSubmit =
    code.trim().length >= 6 && password.length >= 8 && password === confirm && !loading;

  return (
    <View style={{ flex: 1, backgroundColor: C.primary, paddingTop: insets.top }}>
      <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.15)' }} />

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => (step === 'code' ? setStep('email') : router.back())} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <AppLogo size="lg" variant="dark" />
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginTop: 6 }}>
            {step === 'email' ? 'Recupera tu acceso' : 'Revisa tu correo'}
          </Text>
        </View>

        <View style={{
          width: '100%', borderRadius: 32, padding: 24, gap: 18,
          backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, ...shadow.md,
        }}>
          {step === 'email' ? (
            <>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 21 }}>
                Escribe tu correo y te enviaremos un código para crear una contraseña nueva.
              </Text>
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>Correo electrónico</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, height: 56, paddingHorizontal: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.border }}>
                  <Icon name="email-outline" size={22} color={C.outline} />
                  <AppTextInput placeholder="tucorreo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                </View>
              </View>
              <Pressable
                onPress={sendCode}
                disabled={!canSend}
                style={{
                  height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  backgroundColor: canSend ? C.primary : C.surfaceContainerHighest,
                  borderWidth: 2, borderColor: C.border, ...(canSend ? shadow.primary : {}),
                }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Icon name="arrow-right" size={20} color={canSend ? '#fff' : C.outline} />}
                <Text style={{ color: canSend ? '#fff' : C.outline, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                  {loading ? 'Enviando…' : 'Enviar código'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, lineHeight: 21 }}>
                Enviamos un código a <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: C.onSurface }}>{email.trim()}</Text>. Pégalo aquí y elige tu nueva contraseña.
              </Text>

              <View style={{ gap: 8 }}>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>Código</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, height: 56, paddingHorizontal: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.border }}>
                  <Icon name="shield-lock-outline" size={22} color={C.outline} />
                  <AppTextInput placeholder="123456" keyboardType="number-pad" value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 8))} />
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>Nueva contraseña</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, height: 56, paddingHorizontal: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.border }}>
                  <Icon name="lock-outline" size={22} color={C.outline} />
                  <AppTextInput placeholder="••••••••" secureTextEntry={!showPw} value={password} onChangeText={setPassword} />
                  <Pressable onPress={() => setShowPw(v => !v)}>
                    <Icon name={showPw ? 'eye-off-outline' : 'eye-outline'} size={22} color={C.outline} />
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginLeft: 4 }}>Confirmar</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, height: 56, paddingHorizontal: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.border }}>
                  <Icon name="lock-outline" size={22} color={C.outline} />
                  <AppTextInput placeholder="••••••••" secureTextEntry={!showPw} value={confirm} onChangeText={setConfirm} />
                </View>
                {confirm.length > 0 && password !== confirm && (
                  <Text style={{ color: C.error, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15, marginLeft: 4 }}>No coinciden.</Text>
                )}
              </View>

              <Pressable
                onPress={submitNewPassword}
                disabled={!canSubmit}
                style={{
                  height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  backgroundColor: canSubmit ? C.primary : C.surfaceContainerHighest,
                  borderWidth: 2, borderColor: C.border, ...(canSubmit ? shadow.primary : {}),
                }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Icon name="check" size={20} color={canSubmit ? '#fff' : C.outline} />}
                <Text style={{ color: canSubmit ? '#fff' : C.outline, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                  {loading ? 'Guardando…' : 'Cambiar contraseña'}
                </Text>
              </Pressable>

              <Pressable onPress={sendCode} disabled={loading} style={{ alignSelf: 'center' }}>
                <Text style={{ color: C.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Reenviar código</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
