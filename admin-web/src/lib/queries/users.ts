import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type UserFilter = "all" | "banned" | "strikes" | "blocked" | "owners";

export type DirectoryUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string;
  level: number;
  xp: number;
  strikes: number;
  banned_at: string | null;
  created_at: string;
  reviews_count: number;
  blocked_by_count: number;
  restaurants_count: number;
  total_count: number;
};

export const PAGE_SIZE = 25;

export function useUserDirectory(params: { search: string; filter: UserFilter; page: number }) {
  return useQuery({
    queryKey: ["admin-user-directory", params],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ rows: DirectoryUser[]; total: number }> => {
      const { data, error } = await supabase.rpc("admin_user_directory", {
        p_search: params.search.trim() || null,
        p_filter: params.filter,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data ?? []) as DirectoryUser[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
  });
}

export type MostBlocked = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  blocked_by_count: number;
  strikes: number;
  banned_at: string | null;
  last_blocked_at: string;
};

export function useMostBlocked() {
  return useQuery({
    queryKey: ["admin-most-blocked"],
    queryFn: async (): Promise<MostBlocked[]> => {
      const { data, error } = await supabase.rpc("admin_most_blocked", { p_limit: 20 });
      if (error) throw error;
      return (data ?? []) as MostBlocked[];
    },
  });
}

export type RecentBlock = {
  blocker_id: string;
  blocker_username: string | null;
  blocked_id: string;
  blocked_username: string | null;
  created_at: string;
};

export function useRecentBlocks() {
  return useQuery({
    queryKey: ["admin-recent-blocks"],
    queryFn: async (): Promise<RecentBlock[]> => {
      const { data, error } = await supabase.rpc("admin_recent_blocks", { p_limit: 30 });
      if (error) throw error;
      return (data ?? []) as RecentBlock[];
    },
  });
}

export type DeletedAccount = {
  id: string;
  username: string | null;
  role: string | null;
  signed_up_at: string | null;
  deleted_at: string;
  reviews_count: number;
  owned_restaurants: number;
  strikes: number;
  was_banned: boolean;
  total_count: number;
  last_7_days: number;
  last_30_days: number;
};

export function useDeletedAccounts() {
  return useQuery({
    queryKey: ["admin-deleted-accounts"],
    queryFn: async (): Promise<DeletedAccount[]> => {
      const { data, error } = await supabase.rpc("admin_deleted_accounts", { p_limit: 100 });
      if (error) throw error;
      return (data ?? []) as DeletedAccount[];
    },
  });
}

export type UserAction = "ban" | "unban" | "clear_strikes";

/** Banea, reactiva o limpia strikes; queda en el historial de acciones del admin. */
export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, action, note }: { userId: string; action: UserAction; note?: string }) => {
      const { error } = await supabase.rpc("admin_set_user_status", {
        p_user_id: userId,
        p_action: action,
        p_note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-directory"] });
      qc.invalidateQueries({ queryKey: ["admin-most-blocked"] });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}
