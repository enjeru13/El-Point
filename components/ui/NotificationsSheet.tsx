import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useVisibleNotifications,
  type AppNotification,
} from "@/lib/queries/notifications";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Where a notification takes you when tapped (null = just mark read). */
function notifTarget(notif: AppNotification) {
  const kind = notif.data?.kind;
  if (kind === "review_report") {
    return { pathname: "/admin/reviews" as const };
  }
  if (kind === "restaurant_report") {
    return { pathname: "/admin/restaurant-reports" as const };
  }
  const rid = notif.data?.restaurant_id;
  if (typeof rid === "string" && rid) {
    return { pathname: "/restaurant/[id]" as const, params: { id: rid } };
  }
  return null;
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} ${d === 1 ? "día" : "días"}`;
  return `Hace ${Math.floor(d / 7)} sem`;
}

// ─── Dotted divider ───────────────────────────────────────────────────────────

function DottedDivider({ label }: { label: string }) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginVertical: 14,
      }}
    >
      <View
        style={{
          flex: 1,
          borderTopWidth: 2,
          borderStyle: "dashed",
          borderColor: C.outlineVariant,
        }}
      />
      <AppText variant="overline" color={C.outline}>
        {label}
      </AppText>
      <View
        style={{
          flex: 1,
          borderTopWidth: 2,
          borderStyle: "dashed",
          borderColor: C.outlineVariant,
        }}
      />
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function NotifCard({
  notif,
  onRead,
  onOpen,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
  onOpen: (notif: AppNotification) => void;
}) {
  const { C, shadow } = useTheme();
  const canOpen = notifTarget(notif) !== null;
  const [pressed, setPressed] = useState(false);
  const CONFIG: Record<
    AppNotification["type"],
    { icon: string; bg: string; color: string }
  > = {
    like: { icon: "heart", bg: C.primaryFixed, color: C.primary },
    reply: { icon: "reply", bg: C.secondaryContainer, color: C.secondary },
    review: {
      icon: "comment-text",
      bg: C.secondaryContainer,
      color: C.secondary,
    },
    levelup: { icon: "star-circle", bg: C.primaryContainer, color: "#fff" },
    promo: { icon: "tag", bg: C.primaryContainer, color: "#fff" },
    weekly: { icon: "analytics", bg: C.primaryFixed, color: C.primary },
    moderation: {
      icon: "shield-alert-outline",
      bg: C.error + "22",
      color: C.error,
    },
  };
  const cfg = CONFIG[notif.type] ?? CONFIG.like;

  return (
    <Pressable
      onPress={() => {
        if (!notif.read) onRead(notif.id);
        if (canOpen) onOpen(notif);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          padding: 16,
          borderRadius: 18,
          backgroundColor: notif.read ? C.surfaceContainerLow : C.surface,
          borderWidth: 1,
          borderColor: notif.read ? C.outlineVariant : C.border,
        },
        pressed ? { opacity: 0.7 } : null,
        notif.read ? null : shadow.sm,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 8,
            backgroundColor: cfg.bg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: C.border,
          }}
        >
          <Icon name={cfg.icon} size={12} color={cfg.color} />
        </View>
        <AppText variant="caption" color={C.outline} style={{ flex: 1 }}>
          {timeAgo(notif.created_at)}
        </AppText>
        {!notif.read && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: C.primaryContainer,
              borderWidth: 1.5,
              borderColor: C.border,
            }}
          />
        )}
        {canOpen && (
          <Icon name="chevron-right" size={16} color={C.outline} />
        )}
      </View>

      <AppText
        variant="bodyStrong"
        color={notif.read ? C.onSurfaceVariant : C.onSurface}
        style={{ fontSize: 14, lineHeight: 19, marginBottom: 3 }}
      >
        {notif.title}
      </AppText>
      {notif.body && (
        <AppText variant="bodySm" color={C.onSurfaceVariant}>
          {notif.body}
        </AppText>
      )}
    </Pressable>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export interface NotificationsHandle {
  present: () => void;
  dismiss: () => void;
}

export const NotificationsSheet = forwardRef<NotificationsHandle>((_, ref) => {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);

  const notifsQ = useVisibleNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const handleOpen = useCallback(
    (notif: AppNotification) => {
      const target = notifTarget(notif);
      if (!target) return;
      sheetRef.current?.dismiss();
      router.push(target);
    },
    [router],
  );

  const notifs = notifsQ.visible;
  const unread = notifs.filter((n) => !n.read);
  const read = notifs.filter((n) => n.read);
  const unreadCount = unread.length;

  useImperativeHandle(ref, () => ({
    present: () => {
      notifsQ.refetch();
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
      backgroundStyle={{
        backgroundColor: C.surface,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.outlineVariant,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText variant="heading">Notificaciones</AppText>
          {unreadCount > 0 && (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 1,
                borderRadius: 99,
                backgroundColor: C.primaryContainer,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <AppText variant="caption" color={C.onPrimary} style={{ fontSize: 12 }}>
                {unreadCount}
              </AppText>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
            <AppText variant="label" color={C.primary}>
              Marcar todas
            </AppText>
          </Pressable>
        )}
      </View>

      {/* List */}
      <BottomSheetScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {notifsQ.isLoading ? (
          <View style={{ paddingVertical: 32 }}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : notifs.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
            <Icon name="bell-outline" size={32} color={C.outlineVariant} />
            <AppText variant="bodySm" color={C.outline} align="center">
              No tienes notificaciones todavía.
            </AppText>
          </View>
        ) : (
          <>
            <View style={{ gap: 12 }}>
              {unread.map((n) => (
                <NotifCard
                  key={n.id}
                  notif={n}
                  onRead={(id) => markRead.mutate(id)}
                  onOpen={handleOpen}
                />
              ))}
            </View>
            {unread.length > 0 && read.length > 0 && (
              <DottedDivider label="ANTERIORES" />
            )}
            <View style={{ gap: 12 }}>
              {read.map((n) => (
                <NotifCard
                  key={n.id}
                  notif={n}
                  onRead={(id) => markRead.mutate(id)}
                  onOpen={handleOpen}
                />
              ))}
            </View>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

NotificationsSheet.displayName = "NotificationsSheet";
