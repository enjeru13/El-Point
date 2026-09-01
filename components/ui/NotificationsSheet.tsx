import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from "@/lib/queries/notifications";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

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
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
}) {
  const { C, shadow } = useTheme();
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
    levelup_soon: {
      icon: "trending-up",
      bg: C.tertiaryContainer,
      color: C.tertiary,
    },
    promo: { icon: "tag", bg: C.primaryContainer, color: "#fff" },
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
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);

  const notifsQ = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifs = notifsQ.data ?? [];
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
        borderWidth: 2,
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
          borderBottomWidth: 2,
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
                borderWidth: 2,
                borderColor: C.border,
              }}
            >
              <AppText variant="caption" style={{ fontSize: 12 }}>
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
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
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
