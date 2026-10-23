import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type BlockedUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
};

const BLOCKS_KEY = ["my-blocks"] as const;

/**
 * Ids de las personas que bloqueaste. Si la consulta falla (por ejemplo, la
 * base de datos aún no tiene la tabla) devuelve vacío: bloquear nunca debe
 * romper la lectura de reseñas.
 */
export async function fetchBlockedIds(viewerId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", viewerId);
    if (error) return new Set();
    return new Set((data ?? []).map((r) => r.blocked_id));
  } catch {
    return new Set();
  }
}

export function useMyBlocks() {
  return useQuery({
    queryKey: BLOCKS_KEY,
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("user_blocks")
        .select("created_at, blocked:profiles!blocked_id ( id, username, full_name, avatar_url )")
        .eq("blocker_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          id: r.blocked?.id as string,
          username: (r.blocked?.username ?? null) as string | null,
          full_name: (r.blocked?.full_name ?? null) as string | null,
          avatar_url: (r.blocked?.avatar_url ?? null) as string | null,
          blocked_at: r.created_at as string,
        }))
        .filter((u) => !!u.id);
    },
  });
}

function useInvalidateBlocks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: BLOCKS_KEY });
    qc.invalidateQueries({ queryKey: ["reviews"] });
  };
}

export function useBlockUser() {
  const refresh = useInvalidateBlocks();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Inicia sesión para bloquear");
      const { error } = await supabase
        .from("user_blocks")
        .upsert({ blocker_id: uid, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useUnblockUser() {
  const refresh = useInvalidateBlocks();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Inicia sesión");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", uid)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}
