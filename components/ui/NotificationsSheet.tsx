import { Icon } from '@/components/ui/Icon';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from '@/lib/queries/notifications';

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return `Hace ${Math.floor(d / 7)} sem`;
}

// ─── Dotted divider ───────────────────────────────────────────────────────────

function DottedDivider({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 }}>
      <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.outlineVariant }} />
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: C.outline, letterSpacing: 1.5 }}>
        {label}
      </Text>
      <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.outlineVariant }} />
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NotifCard({ notif, onRead }: { notif: AppNotification; onRead: (id: string) => void }) {
  const { C, shadow } = useTheme();
  const CONFIG: Record<AppNotification['type'], { icon: string; bg: string; color: string }> = {
    like:         { icon: 'heart',        bg: C.primaryFixed,       color: C.primary },
    reply:        { icon: 'reply',        bg: C.secondaryContainer, color: C.secondary },
    review:       { icon: 'comment-text', bg: C.secondaryContainer, color: C.secondary },
    levelup:      { icon: 'star-circle',  bg: C.primaryContainer,   color: '#fff' },
    levelup_soon: { icon: 'trending-up',  bg: C.tertiaryContainer,  color: C.tertiary },
    promo:        { icon: 'tag',          bg: C.primaryContainer,   color: '#fff' },
  };
  const cfg = CONFIG[notif.type] ?? CONFIG.like;

  return (
    <Pressable
      onPress={() => !notif.read && onRead(notif.id)}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 18,
        backgroundColor: notif.read ? C.surfaceContainerLow : C.surface,
        borderWidth: 2,
        borderColor: notif.read ? C.outlineVariant : C.border,
        opacity: pressed ? 0.7 : 1,
        ...(notif.read ? {} : shadow.sm),
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <View style={{ width: 22, height: 22, borderRadius: 8, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border }}>
          <Icon name={cfg.icon} size={12} color={cfg.color} />
        </View>
        <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: C.outline, flex: 1 }}>
          {timeAgo(notif.created_at)}
        </Text>
        {!notif.read && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primaryContainer, borderWidth: 1.5, borderColor: C.border }} />
        )}
      </View>

      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: notif.read ? C.onSurfaceVariant : C.onSurface, lineHeight: 19, marginBottom: 3 }}>
        {notif.title}
      </Text>
      {notif.body && (
        <Text style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, color: C.onSurfaceVariant, lineHeight: 18 }}>
          {notif.body}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

export interface NotificationsHandle {
  present: () => void;
  dismiss: () => void;
}

export const NotificationsSheet = forwardRef<NotificationsHandle>((_, ref) => {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const notifsQ = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifs = notifsQ.data ?? [];
  const unread = notifs.filter((n) => !n.read);
  const read = notifs.filter((n) => n.read);
  const unreadCount = unread.length;

  const open = useCallback(() => {
    setVisible(true);
    notifsQ.refetch();
    translateY.setValue(-20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: -16, useNativeDriver: true, damping: 18, stiffness: 260 }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, []);

  useImperativeHandle(ref, () => ({ present: open, dismiss: close }));

  if (!visible) return null;

  const TOP = insets.top + 56 + 8;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={{ position: 'absolute', inset: 0 }} />
      </TouchableWithoutFeedback>

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
            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 18, color: C.onSurface }}>Notificaciones</Text>
            {unreadCount > 0 && (
              <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99, backgroundColor: C.primaryContainer, borderWidth: 2, borderColor: C.border }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurface }}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={() => markAll.mutate()}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: C.primary }}>Marcar todas</Text>
            </Pressable>
          )}
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} bounces={false}>
          {notifsQ.isLoading ? (
            <View style={{ paddingVertical: 32 }}><ActivityIndicator color={C.primary} /></View>
          ) : notifs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Icon name="bell-outline" size={32} color={C.outlineVariant} />
              <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, textAlign: 'center' }}>
                No tienes notificaciones todavía.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ gap: 12 }}>
                {unread.map((n) => <NotifCard key={n.id} notif={n} onRead={(id) => markRead.mutate(id)} />)}
              </View>
              {unread.length > 0 && read.length > 0 && <DottedDivider label="ANTERIORES" />}
              <View style={{ gap: 12 }}>
                {read.map((n) => <NotifCard key={n.id} notif={n} onRead={(id) => markRead.mutate(id)} />)}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});
