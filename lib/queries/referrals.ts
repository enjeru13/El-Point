import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type MyReferralInfo = {
  code: string | null;
  count: number;
};

export function useMyReferralInfo() {
  return useQuery({
    queryKey: ["my-referral-info"],
    queryFn: async (): Promise<MyReferralInfo> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { code: null, count: 0 };

      const [{ data: profile, error: pErr }, { data: count, error: cErr }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", uid).single(),
        (supabase as any).rpc("my_referral_count"),
      ]);
      if (pErr) throw pErr;
      if (cErr) throw cErr;

      return { code: (profile as any)?.referral_code ?? null, count: (count as number) ?? 0 };
    },
  });
}

export const REFERRAL_SHARE_MESSAGE = (code: string) =>
  `Únete a El Point, la app para descubrir dónde comer en San Cristóbal 🍽️. Usa mi código ${code} al registrarte y los dos ganamos XP.\n\nhttps://elpoint-app.netlify.app`;
