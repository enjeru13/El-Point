import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { registerForPush, unregisterPush } from "@/lib/push";

/** Where a tapped push takes you (mirror of NotificationsSheet.notifTarget). */
function targetFor(data: Record<string, any> | undefined) {
  const kind = data?.kind;
  if (kind === "review_report") return "/admin/reviews" as const;
  if (kind === "restaurant_report") return "/admin/restaurant-reports" as const;
  if (kind === "mission" || kind === "streak") return "/(customer)/profile" as const;
  if (kind === "owner_boost") return "/(owner)" as const;
  const rid = data?.restaurant_id;
  if (typeof rid === "string" && rid) return `/restaurant/${rid}` as const;
  return null;
}

/**
 * Registers this device for push whenever a user is signed in, and routes
 * to the right screen when a notification is tapped (cold start or running).
 * Renders nothing; mount once near the root.
 */
export function PushBridge() {
  const router = useRouter();
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null;
      if (uid && uid !== lastUid.current) {
        lastUid.current = uid;
        registerForPush();
      } else if (!uid && lastUid.current) {
        unregisterPush(lastUid.current);
        lastUid.current = null;
      }
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.id !== lastUid.current) {
        lastUid.current = data.user.id;
        registerForPush();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // App running (foreground/background) and the user taps a push.
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const t = targetFor(res.notification.request.content.data as any);
      if (t) router.push(t);
    });
    // Cold start FROM a push.
    Notifications.getLastNotificationResponseAsync().then((res) => {
      if (!res) return;
      const t = targetFor(res.notification.request.content.data as any);
      if (t) setTimeout(() => router.push(t), 400);
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
