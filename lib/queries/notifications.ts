import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSettings, type SettingKey } from "@/lib/settings";

export type AppNotification = {
  id: string;
  type: "like" | "reply" | "levelup" | "levelup_soon" | "promo" | "review" | "weekly";
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
};

const KEY = ["notifications"] as const;

// Which settings toggle mutes which notification type.
const TYPE_SETTING: Record<AppNotification["type"], SettingKey> = {
  like: "notifRanks",
  reply: "notifReplies",
  review: "notifReviews",
  levelup: "notifLevelup",
  levelup_soon: "notifLevelup",
  promo: "notifPromos",
  weekly: "notifWeekly",
};

async function fetchNotifications(): Promise<AppNotification[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, data, read, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchNotifications,
    staleTime: 20_000,
  });
}

/**
 * Notifications the user hasn't muted via settings, plus the unread count
 * over that visible set. Use this for the bell badge and the sheet list.
 */
export function useVisibleNotifications() {
  const q = useNotifications();
  const settings = useSettings();
  const all = q.data ?? [];
  const visible = all.filter((n) => settings[TYPE_SETTING[n.type]] !== false);
  return {
    ...q,
    all,
    visible,
    unread: visible.filter((n) => !n.read).length,
  };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<AppNotification[]>(KEY);
      qc.setQueryData<AppNotification[]>(KEY, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", userData.user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<AppNotification[]>(KEY);
      qc.setQueryData<AppNotification[]>(KEY, (old) =>
        (old ?? []).map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
