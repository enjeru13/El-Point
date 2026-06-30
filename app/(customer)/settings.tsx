import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { THEMES, THEME_META, ThemeName } from '@/lib/themes';
import { FLOATING_NAV_H } from '@/lib/theme';

// ─── Dot bicolor ──────────────────────────────────────────────────────────────

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

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  sublabel,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 18,
      }}
    >
      <View
        style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: C.primaryFixed,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: C.border,
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={20} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
          {label}
        </Text>
        {sublabel && (
          <Text style={{ color: C.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 1 }}>
            {sublabel}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
        thumbColor={value ? C.primary : C.outline}
      />
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 24,
        borderWidth: 2, borderColor: C.border,
        overflow: 'hidden',
        ...shadow.sm,
      }}
    >
      {children}
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <Text
      style={{
        color: C.onSurfaceVariant,
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11, letterSpacing: 1.5,
        paddingHorizontal: 4,
        marginBottom: 10,
      }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

const THEME_NAMES = Object.keys(THEME_META) as ThemeName[];

export default function SettingsScreen() {
  const { C, shadow, themeName, setTheme } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [notifRanks,    setNotifRanks]    = useState(true);
  const [notifReplies,  setNotifReplies]  = useState(true);
  const [notifLevelup,  setNotifLevelup]  = useState(true);
  const [notifPromos,   setNotifPromos]   = useState(false);
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const [haptics,       setHaptics]       = useState(true);
  const [compactCards,  setCompactCards]  = useState(false);
  const [showDistance,  setShowDistance]  = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>

      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20, paddingBottom: 14,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderBottomWidth: 2, borderBottomColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: C.border,
            backgroundColor: C.surface,
            ...shadow.sm,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 22, flex: 1 }}>
          Configuración
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 20, gap: 24,
          paddingBottom: FLOATING_NAV_H + 20,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Apariencia ── */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Apariencia" />
          <SectionCard>
            <View style={{ padding: 18, gap: 16 }}>
              <Text style={{ color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
                Tema de color
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {THEME_NAMES.map(name => {
                  const meta   = THEME_META[name];
                  const active = name === themeName;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setTheme(name)}
                      style={{ alignItems: 'center', gap: 6, width: 60 }}
                    >
                      {/* Aro seleccionado */}
                      <View
                        style={{
                          padding: 3, borderRadius: 99,
                          borderWidth: 2.5,
                          borderColor: active ? C.primary : 'transparent',
                        }}
                      >
                        <ThemeDot name={name} size={40} />
                      </View>
                      <Text
                        style={{
                          color: active ? C.primary : C.onSurfaceVariant,
                          fontFamily: active ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_400Regular',
                          fontSize: 10,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <ToggleRow
              icon="view-agenda-outline"
              label="Tarjetas compactas"
              sublabel="Muestra más resultados en pantalla"
              value={compactCards}
              onChange={setCompactCards}
            />
            <Divider />
            <ToggleRow
              icon="map-marker-distance"
              label="Mostrar distancia"
              sublabel="Requiere permisos de ubicación"
              value={showDistance}
              onChange={setShowDistance}
            />
          </SectionCard>
        </View>

        {/* ── Notificaciones ── */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Notificaciones" />
          <SectionCard>
            <ToggleRow
              icon="star-outline"
              label="Reacciones a mis ranks"
              sublabel="Cuando alguien da like a tu reseña"
              value={notifRanks}
              onChange={setNotifRanks}
            />
            <Divider />
            <ToggleRow
              icon="reply-outline"
              label="Respuestas"
              sublabel="Cuando alguien responde tu reseña"
              value={notifReplies}
              onChange={setNotifReplies}
            />
            <Divider />
            <ToggleRow
              icon="trophy-outline"
              label="Subida de nivel"
              sublabel="Cuando alcanzas un nuevo rango"
              value={notifLevelup}
              onChange={setNotifLevelup}
            />
            <Divider />
            <ToggleRow
              icon="tag-outline"
              label="Promos y novedades"
              sublabel="Ofertas de restaurantes cercanos"
              value={notifPromos}
              onChange={setNotifPromos}
            />
          </SectionCard>
        </View>

        {/* ── Sonido & háptica ── */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Sonido y táctil" />
          <SectionCard>
            <ToggleRow
              icon="volume-high"
              label="Sonidos de la app"
              value={soundEnabled}
              onChange={setSoundEnabled}
            />
            <Divider />
            <ToggleRow
              icon="vibrate"
              label="Vibración háptica"
              value={haptics}
              onChange={setHaptics}
            />
          </SectionCard>
        </View>

        {/* ── Cuenta ── */}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Cuenta" />
          <SectionCard>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                <Icon name="lock-outline" size={20} color={C.primary} />
              </View>
              <Text style={{ flex: 1, color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Cambiar contraseña</Text>
              <Icon name="chevron-right" size={20} color={C.outline} />
            </Pressable>
            <Divider />
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                <Icon name="shield-outline" size={20} color={C.primary} />
              </View>
              <Text style={{ flex: 1, color: C.onSurface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Privacidad</Text>
              <Icon name="chevron-right" size={20} color={C.outline} />
            </Pressable>
            <Divider />
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border }}>
                <Icon name="delete-outline" size={20} color={C.error} />
              </View>
              <Text style={{ flex: 1, color: C.error, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Eliminar cuenta</Text>
              <Icon name="chevron-right" size={20} color={C.outline} />
            </Pressable>
          </SectionCard>
        </View>

        {/* ── Version ── */}
        <Text style={{ textAlign: 'center', color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12 }}>
          El Point v0.1.0 · hecho con 🔥
        </Text>

      </ScrollView>
    </View>
  );
}
