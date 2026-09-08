import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";

export function useSendSupportMessage() {
  return useMutation({
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
