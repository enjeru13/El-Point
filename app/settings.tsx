import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/lib/push';
import { useTheme } from '@/lib/ThemeContext';
import { THEME_MODE_META } from '@/lib/themes';
import { useMyProfile, useUpdateSettings } from '@/lib/queries/me';
import { SETTING_DEFAULTS } from '@/lib/settings';
import { resetAllTours } from '@/lib/tour';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

function SectionLabel({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <AppText variant="overline" color={C.onSurfaceVariant} style={{ paddingHorizontal: 4, marginBottom: 10 }}>
      {label.toUpperCase()}
    </AppText>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
      {children}
    </View>
  );
}

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

function ToggleRow({ icon, label, sublabel, value, onChange }: {
  icon: string; label: string; sublabel?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
        <Icon name={icon} size={20} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {sublabel && <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 1 }}>{sublabel}</AppText>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }} thumbColor={value ? C.primary : C.outline} />
    </View>
  );
}

export default function SettingsScreen() {
  const { C, shadow, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profileQ = useMyProfile();
  const updateSettings = useUpdateSettings();
  const isOwner = profileQ.data?.role === 'restaurant_owner';
  const saved = profileQ.data?.settings ?? {};
  const s = (k: keyof typeof SETTING_DEFAULTS) => saved[k] ?? SETTING_DEFAULTS[k];
  const set = (k: string) => (v: boolean) => updateSettings.mutate({ [k]: v });

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.background,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, ...shadow.sm }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>Ajustes</AppText>
      </View>

      {profileQ.isLoading ? (
        <View style={{ padding: 20, gap: 16 }}>
          <Skeleton width={100} height={14} />
          <Skeleton height={120} radius={24} />
          <Skeleton height={180} radius={24} />
          <Skeleton height={140} radius={24} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

          {/* Apariencia */}
          <View style={{ gap: 10 }}>
            <SectionLabel label="Apariencia" />
            <SectionCard>
              <View style={{ padding: 18, gap: 12 }}>
                <AppText variant="bodyStrong">Modo</AppText>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {THEME_MODE_META.map(({ mode: m, label, icon }) => {
                    const active = mode === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setMode(m)}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          gap: 6,
                          paddingVertical: 14,
                          borderRadius: 16,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? C.primary : C.border,
                          backgroundColor: active ? C.primaryFixed : C.surface,
                        }}
                      >
                        <Icon name={icon} size={22} color={active ? C.primary : C.onSurfaceVariant} />
                        <AppText variant="label" color={active ? C.primary : C.onSurfaceVariant}>
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </SectionCard>

            {!isOwner && (
              <SectionCard>
                <ToggleRow icon="view-agenda-outline" label="Tarjetas compactas" sublabel="Más resultados en pantalla" value={s('compactCards')} onChange={set('compactCards')} />
                <Divider />
                <ToggleRow icon="map-marker-distance" label="Mostrar distancia" sublabel="Requiere permiso de ubicación" value={s('showDistance')} onChange={set('showDistance')} />
              </SectionCard>
            )}
          </View>

          {/* Notificaciones */}
          <View style={{ gap: 10 }}>
            <SectionLabel label="Notificaciones" />
            <SectionCard>
              {isOwner ? (
                <>
                  <ToggleRow icon="star" label="Nuevas reseñas" sublabel="Cuando alguien califica tu local" value={s('notifReviews')} onChange={set('notifReviews')} />
                  <Divider />
                  <ToggleRow icon="analytics" label="Reporte semanal" sublabel="Resumen de métricas cada semana" value={s('notifWeekly')} onChange={set('notifWeekly')} />
                </>
              ) : (
                <>
                  <ToggleRow icon="star-outline" label="Reacciones a mis ranks" sublabel="Cuando marcan tu reseña como útil" value={s('notifRanks')} onChange={set('notifRanks')} />
                  <Divider />
                  <ToggleRow icon="reply-outline" label="Respuestas" sublabel="Cuando responden tu reseña" value={s('notifReplies')} onChange={set('notifReplies')} />
                  <Divider />
                  <ToggleRow icon="trophy-outline" label="Subida de nivel" sublabel="Cuando alcanzas un nuevo nivel" value={s('notifLevelup')} onChange={set('notifLevelup')} />
                  <Divider />
                  <ToggleRow icon="tag-outline" label="Promos y novedades" sublabel="Ofertas de locales cercanos" value={s('notifPromos')} onChange={set('notifPromos')} />
                </>
              )}
            </SectionCard>
          </View>

          {/* Táctil */}
          <View style={{ gap: 10 }}>
            <SectionLabel label="Táctil" />
            <SectionCard>
              <ToggleRow icon="vibrate" label="Vibración háptica" sublabel="Al tocar botones y acciones" value={s('haptics')} onChange={set('haptics')} />
            </SectionCard>
          </View>

          {/* Cuenta */}
          <View style={{ gap: 10 }}>
            <SectionLabel label="Cuenta" />
            <SectionCard>
              <Pressable
                onPress={() => router.push('/change-password')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="lock-outline" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Cambiar contraseña</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>

              {profileQ.data?.is_admin && (
                <>
                  <Divider />
                  <Pressable
                    onPress={() => router.push('/admin')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.error + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                      <Icon name="shield-alert-outline" size={20} color={C.error} />
                    </View>
                    <AppText variant="bodyStrong" style={{ flex: 1 }}>Panel de moderación</AppText>
                    <Icon name="chevron-right" size={20} color={C.outline} />
                  </Pressable>
                </>
              )}
            </SectionCard>
          </View>

          {/* Más */}
          <View style={{ gap: 10 }}>
            <SectionLabel label="Más" />
            <SectionCard>
              <Pressable
                onPress={() => router.push('/support')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="comment-text" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Contacto y soporte</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>

              <Divider />
              <Pressable
                onPress={async () => { await resetAllTours(); router.back(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="gesture-tap" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Ver tutorial otra vez</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>

              <Divider />
              <Pressable
                onPress={() => router.push('/changelog')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="party-popper" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Novedades</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>
              <Divider />
              <Pressable
                onPress={() => router.push('/donate')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="heart" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Apoya el proyecto</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>
            </SectionCard>
          </View>

          {/* Legal */}
          <View style={{ gap: 10 }}>
            <SectionLabel label="Legal" />
            <SectionCard>
              <Pressable
                onPress={() => router.push('/legal/terms')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="file-check" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Términos de Servicio</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>
              <Divider />
              <Pressable
                onPress={() => router.push('/legal/privacy')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Icon name="shield-lock-outline" size={20} color={C.primary} />
                </View>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>Política de Privacidad</AppText>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </Pressable>
            </SectionCard>
          </View>

          <Button
            label="Cerrar sesión"
            onPress={async () => {
              const { data } = await supabase.auth.getUser();
              if (data.user) await unregisterPush(data.user.id);
              await supabase.auth.signOut();
            }}
            variant="danger"
            icon="logout"
          />

          <Pressable
            onPress={() => router.push('/delete-account')}
            style={{ alignSelf: 'center', paddingVertical: 8 }}
          >
            <AppText variant="bodySm" color={C.error}>
              Eliminar mi cuenta
            </AppText>
          </Pressable>

          {__DEV__ && (
            <Pressable
              onPress={async () => {
                await SecureStore.deleteItemAsync('elpoint_onboarding_seen');
                router.replace('/onboarding');
              }}
              style={{ alignSelf: 'center', paddingVertical: 6 }}
            >
              <AppText variant="caption" color={C.outline}>
                DEV · Ver onboarding
              </AppText>
            </Pressable>
          )}

          <AppText variant="bodySm" color={C.outline} align="center">
            El Point v0.1.0
          </AppText>
        </ScrollView>
      )}
    </View>
  );
}
