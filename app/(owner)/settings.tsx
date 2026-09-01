import { Icon } from '@/components/ui/Icon';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useMyProfile, useUpdateSettings } from '@/lib/queries/me';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { THEMES, THEME_META, ThemeName } from '@/lib/themes';
import { FLOATING_NAV_H } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const THEME_NAMES = Object.keys(THEME_META) as ThemeName[];

function ThemeDot({ name, size = 44 }: { name: ThemeName; size?: number }) {
  const palette = THEMES[name];
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: r, borderWidth: 2, borderColor: '#1c1b1b' }}>
      <View style={{ flex: 1, borderRadius: r - 2, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: (size - 4) / 2, height: size - 4, backgroundColor: palette.primary }} />
        <View style={{ width: (size - 4) / 2, height: size - 4, backgroundColor: palette.secondary }} />
      </View>
    </View>
  );
}

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 24, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow.sm }}>
      {children}
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 1.5, paddingHorizontal: 4, marginBottom: 10 }}>
      {label.toUpperCase()}
    </Text>
  );
}

function ToggleRow({ icon, label, sublabel, value, onChange }: { icon: string; label: string; sublabel?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
        <Icon name={icon} size={20} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>{label}</Text>
        {sublabel && <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 1 }}>{sublabel}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }} thumbColor={value ? C.primary : C.outline} />
    </View>
  );
}

const OWNER_SETTING_DEFAULTS: Record<string, boolean> = {
  notifReviews: true,
  notifReplies: true,
  notifWeekly: true,
  haptics: true,
};

export default function OwnerSettingsScreen() {
  const { C, shadow, themeName, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const profileQ = useMyProfile();
  const updateSettings = useUpdateSettings();
  const saved = profileQ.data?.settings ?? {};
  const s = (key: string) => saved[key] ?? OWNER_SETTING_DEFAULTS[key] ?? false;
  const set = (key: string) => (v: boolean) => updateSettings.mutate({ [key]: v });

  const notifReviews = s('notifReviews');
  const notifReplies = s('notifReplies');
  const notifWeekly  = s('notifWeekly');
  const haptics       = s('haptics');
  const setNotifReviews = set('notifReviews');
  const setNotifReplies = set('notifReplies');
  const setNotifWeekly  = set('notifWeekly');
  const setHaptics      = set('haptics');

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20 }}>
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>Ajustes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 24, paddingBottom: FLOATING_NAV_H + 20 }}>

        {/* Apariencia */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Apariencia" />
          <SectionCard>
            <View style={{ padding: 18, gap: 16 }}>
              <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Tema de color</Text>
              <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {THEME_NAMES.map(name => {
                  const active = name === themeName;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setTheme(name)}
                      style={({ pressed }) => ({
                        alignItems: 'center', justifyContent: 'center',
                        width: '30%', padding: 10,
                        borderRadius: 20,
                        backgroundColor: active ? C.primaryFixed : 'transparent',
                        borderWidth: 2, borderColor: active ? C.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                        ...(active ? shadow.sm : {}),
                      })}
                    >
                      <View>
                        <ThemeDot name={name} size={48} />
                        {active && (
                          <View style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, borderWidth: 2, borderColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="check-circle" size={10} color="#fff" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </SectionCard>
        </View>

        {/* Notificaciones */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Notificaciones" />
          <SectionCard>
            <ToggleRow icon="star"         label="Nuevas reseñas"   sublabel="Cuando alguien califique tu local"   value={notifReviews}  onChange={setNotifReviews} />
            <Divider />
            <ToggleRow icon="reply"        label="Respuestas"       sublabel="Cuando respondan tus comentarios"    value={notifReplies}  onChange={setNotifReplies} />
            <Divider />
            <ToggleRow icon="analytics"    label="Reporte semanal"  sublabel="Resumen de métricas cada semana"     value={notifWeekly}   onChange={setNotifWeekly} />
          </SectionCard>
        </View>

        {/* Sonido */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Sonido y táctil" />
          <SectionCard>
            <ToggleRow icon="vibrate" label="Vibración" value={haptics} onChange={setHaptics} />
          </SectionCard>
        </View>

        {/* Cerrar sesión */}
        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 14, borderRadius: 99,
            backgroundColor: C.surface, borderWidth: 2, borderColor: C.border,
          }}
        >
          <Icon name="logout" size={18} color={C.error} />
          <Text style={{ color: C.error, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Cerrar sesión</Text>
        </Pressable>

        <Text style={{ textAlign: 'center', color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12 }}>
          El Point v0.1.0 · hecho con 🔥
        </Text>

      </ScrollView>
    </View>
  );
}
