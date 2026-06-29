import { MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, shadow } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'like' | 'reply' | 'levelup' | 'levelup_soon';

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK: Notif[] = [
  {
    id: '1', type: 'like', read: false,
    title: 'A @burgerking99 le gustó tu reseña',
    body: 'Tu review de La Smasheria recibió 8 likes.',
    time: 'Hace 1 hora',
  },
  {
    id: '2', type: 'reply', read: false,
    title: '@pizzalover_x respondió tu reseña',
    body: '"Totalmente de acuerdo con la salsa secreta 🔥"',
    time: 'Hace 3 horas',
  },
  {
    id: '3', type: 'levelup_soon', read: false,
    title: 'Casi subes de nivel',
    body: 'Te faltan 2 ranks para ser Crítico Local. ¡Sigue comiendo!',
    time: 'Hace 5 horas',
  },
  {
    id: '4', type: 'levelup', read: true,
    title: '¡Subiste de nivel!',
    body: 'Ahora eres Comensal Experto. Nuevos perks desbloqueados.',
    time: 'Ayer',
  },
  {
    id: '5', type: 'like', read: true,
    title: 'A @foodie_mx le gustó tu reseña',
    body: 'Tu review de Pizza Mágica recibió 3 likes.',
    time: 'Hace 2 días',
  },
];

const NOTIF_CONFIG: Record<NotifType, {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  bg: string;
  color: string;
}> = {
  like:         { icon: 'heart',           bg: C.primaryFixed,       color: C.primary },
  reply:        { icon: 'reply',           bg: C.secondaryContainer, color: C.secondary },
  levelup:      { icon: 'star-circle',     bg: C.primaryContainer,   color: '#fff' },
  levelup_soon: { icon: 'trending-up',     bg: C.tertiaryContainer,  color: C.tertiary },
};

// ─── Dotted divider ───────────────────────────────────────────────────────────

function DottedDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 }}>
      <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.outlineVariant }} />
      <Text style={{
        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10,
        color: C.outline, letterSpacing: 1.5,
      }}>
        {label}
      </Text>
      <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.outlineVariant }} />
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NotifCard({ notif, onRead }: { notif: Notif; onRead: (id: string) => void }) {
  const cfg = NOTIF_CONFIG[notif.type];

  return (
    <Pressable
      onPress={() => onRead(notif.id)}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 18,
        marginBottom: 0,
        backgroundColor: notif.read ? C.surfaceContainerLow : C.surface,
        borderWidth: 2,
        borderColor: notif.read ? C.outlineVariant : C.border,
        opacity: pressed ? 0.7 : 1,
        ...(notif.read ? {} : shadow.sm),
      })}
    >
      {/* Tipo + tiempo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <View style={{
          width: 22, height: 22, borderRadius: 8,
          backgroundColor: cfg.bg,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.5, borderColor: C.border,
        }}>
          <MaterialCommunityIcons name={cfg.icon} size={12} color={cfg.color} />
        </View>
        <Text style={{
          fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11,
          color: C.outline, flex: 1,
        }}>
          {notif.time}
        </Text>
        {!notif.read && (
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: C.primaryContainer,
            borderWidth: 1.5, borderColor: C.border,
          }} />
        )}
      </View>

      {/* Texto */}
      <Text style={{
        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14,
        color: notif.read ? C.onSurfaceVariant : C.onSurface,
        lineHeight: 19, marginBottom: 3,
      }}>
        {notif.title}
      </Text>
      <Text style={{
        fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13,
        color: C.onSurfaceVariant, lineHeight: 18,
      }}>
        {notif.body}
      </Text>
    </Pressable>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

export interface NotificationsHandle {
  present: () => void;
  dismiss: () => void;
}

export const NotificationsSheet = forwardRef<NotificationsHandle>((_, ref) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [notifs, setNotifs] = useState(MOCK);
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  const unreadCount = notifs.filter(n => !n.read).length;

  const open = useCallback(() => {
    setVisible(true);
    translateY.setValue(-20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: -16, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacity,    { toValue: 0,  duration: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, []);

  useImperativeHandle(ref, () => ({ present: open, dismiss: close }));

  const markRead = useCallback((id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  if (!visible) return null;

  const TOP = insets.top + 56 + 8; // debajo del header

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <View style={{ position: 'absolute', inset: 0 }} />
      </TouchableWithoutFeedback>

      {/* Dropdown panel */}
      <Animated.View
        style={{
          position: 'absolute',
          top: TOP,
          left: 16, right: 16,
          maxHeight: 480,
          backgroundColor: C.surface,
          borderRadius: 24,
          borderWidth: 2, borderColor: C.border,
          transform: [{ translateY }],
          opacity,
          overflow: 'hidden',
          ...shadow.md,
        }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 2, borderBottomColor: C.outlineVariant,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: C.onSurface }}>
              Notificaciones
            </Text>
            {unreadCount > 0 && (
              <View style={{
                paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99,
                backgroundColor: C.primaryContainer,
                borderWidth: 2, borderColor: C.border,
              }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurface }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={markAllRead}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: C.primary }}>
                Marcar todas
              </Text>
            </Pressable>
          )}
        </View>

        {/* List */}
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={{ gap: 12 }}>
            {notifs.filter(n => !n.read).map(n => (
              <NotifCard key={n.id} notif={n} onRead={markRead} />
            ))}
          </View>

          {notifs.filter(n => !n.read).length > 0 && notifs.filter(n => n.read).length > 0 && (
            <DottedDivider label="ANTERIORES" />
          )}

          <View style={{ gap: 12 }}>
            {notifs.filter(n => n.read).map(n => (
              <NotifCard key={n.id} notif={n} onRead={markRead} />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});
