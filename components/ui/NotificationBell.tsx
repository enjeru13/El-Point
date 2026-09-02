import { Icon } from "@/components/ui/Icon";
import {
  NotificationsHandle,
  NotificationsSheet,
} from "@/components/ui/NotificationsSheet";
import { useVisibleNotifications } from "@/lib/queries/notifications";
import { useTheme } from "@/lib/ThemeContext";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";

export function NotificationBell() {
  const { C } = useTheme();
  const ref = useRef<NotificationsHandle>(null);
  const { unread } = useVisibleNotifications();

  return (
    <>
      <Pressable
        onPress={() => ref.current?.present()}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: C.border,
          backgroundColor: C.surface,
        }}
      >
        <Icon name="bell-outline" size={22} color={C.onSurface} />
        {unread > 0 && (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 3,
              borderRadius: 8,
              backgroundColor: C.primaryContainer,
              borderWidth: 1.5,
              borderColor: C.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontFamily: "PlusJakartaSans_700Bold",
                color: C.onSurface,
              }}
            >
              {unread > 9 ? "9+" : unread}
            </Text>
          </View>
        )}
      </Pressable>
      <NotificationsSheet ref={ref} />
    </>
  );
}
