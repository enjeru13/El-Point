import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const SUPPORT_KEY = ["admin-support"] as const;
const MY_KEY = ["my-support"] as const;

export type SupportMessage = {
  id: string;
  subject: string;
  body: string;
  email: string | null;
  status: "open" | "closed";
  created_at: string;
  author_name: string;
};

export function useSupportMessages(enabled: boolean, status: "open" | "closed") {
  return useQuery({
    queryKey: [...SUPPORT_KEY, status],
    enabled,
    queryFn: async (): Promise<SupportMessage[]> => {
      const { data, error } = await supabase
        .from("support_messages")
        .select(
          `id, subject, body, email, status, created_at,
           author:profiles!user_id ( username, full_name )`,
        )
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        email: m.email,
        status: m.status,
        created_at: m.created_at,
        author_name: m.author?.username
          ? `@${m.author.username}`
          : (m.author?.full_name ?? "Usuario"),
      }));
    },
  });
}

export function useResolveSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "open" | "closed";
    }) => {
      const { error } = await supabase
        .from("support_messages")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPORT_KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}

/** Número de soporte de El Point (WhatsApp), en formato internacional. */
export const SUPPORT_WHATSAPP = "584149797876";

export type MyTicket = {
  id: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
};

/** Mensajes que el usuario ha enviado a soporte, del más reciente al más viejo. */
export function useMyTickets() {
  return useQuery({
    queryKey: MY_KEY,
    staleTime: 30_000,
    queryFn: async (): Promise<MyTicket[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, subject, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as MyTicket[];
    },
  });
}

/** Correo de la cuenta, para decir a dónde llega la respuesta. */
export function useAccountEmail() {
  return useQuery({
    queryKey: ["account-email"],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.auth.getUser();
      return data.user?.email ?? null;
    },
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_KEY }),
    mutationFn: async ({
      subject,
      body,
      email,
    }: {
      subject: string;
      body: string;
      email?: string;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error("No autenticado");
      const { error } = await supabase.from("support_messages").insert({
        user_id: userData.user.id,
        email: email?.trim() || userData.user.email || null,
        subject: subject.trim(),
        body: body.trim(),
      });
      if (error) throw error;
    },
  });
}
