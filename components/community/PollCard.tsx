import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { impact } from "@/lib/haptics";
import { useAuthGate } from "@/components/AuthGate";
import { errorCode, useVotePoll, type PollState } from "@/lib/queries/community";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.floor(ms / 3600000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `Cierra en ${d} ${d === 1 ? "día" : "días"}`;
  }
  if (h >= 1) return `Cierra en ${h} h`;
  return `Cierra en ${Math.max(1, Math.floor(ms / 60000))} min`;
}

/**
 * Encuesta de un post. Sin votar se ven las opciones como botones; después de
 * votar (o al cerrar) se ven barras con porcentaje. El voto se puede cambiar
 * mientras está abierta.
 */
export function PollCard({ postId, poll, disabled }: { postId: string; poll: PollState; disabled?: boolean }) {
  const { C } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const vote = useVotePoll();
  const { requireAuth } = useAuthGate();
  const showResults = poll.closed || !!poll.my_option;
  const max = Math.max(0, ...poll.options.map((o) => o.votes ?? 0));
  const winner = poll.closed && poll.total > 0 ? poll.options.find((o) => (o.votes ?? 0) === max) : undefined;

  const onVote = (optionId: string) => {
    if (poll.closed || disabled || vote.isPending || optionId === poll.my_option) return;
    if (!requireAuth("vote")) return;
    impact("light");
    vote.mutate(
      { postId, optionId },
      {
        onError: (e) =>
          toast.error(errorCode(e).includes("poll_closed") ? "Esta encuesta ya cerró." : "No pudimos registrar tu voto."),
      },
    );
  };

  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      {poll.options.map((o) => {
        const pct = showResults && poll.total > 0 ? Math.round((100 * (o.votes ?? 0)) / poll.total) : 0;
        const mine = o.id === poll.my_option;
        const isWinner = o.id === winner?.id;
        const label = o.label ?? o.restaurant?.name ?? "—";
        return (
          <Pressable
            key={o.id}
            onPress={() => onVote(o.id)}
            disabled={poll.closed || disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: mine }}
            accessibilityLabel={showResults ? `${label}, ${pct}%` : `Votar ${label}`}
            style={{
              minHeight: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: mine ? C.primary : C.outlineVariant,
              overflow: "hidden",
              justifyContent: "center",
            }}
          >
            {showResults && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: (isWinner || mine ? C.primary : C.onSurfaceVariant) + "22",
                }}
              />
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
              {o.restaurant && <Icon name="storefront" size={15} color={C.primary} />}
              <AppText variant="label" style={{ flex: 1 }} numberOfLines={2}>
                {label}
              </AppText>
              {mine && <Icon name="check-circle" size={16} color={C.primary} />}
              {showResults && (
                <AppText variant="label" color={isWinner ? C.primary : C.onSurfaceVariant}>
                  {pct}%
                </AppText>
              )}
              {o.restaurant && !showResults && (
                <Pressable
                  onPress={() => router.push(`/restaurant/${o.restaurant!.id}` as never)}
                  hitSlop={8}
                  accessibilityLabel={`Ver ${o.restaurant.name}`}
                >
                  <Icon name="chevron-right" size={16} color={C.onSurfaceVariant} />
                </Pressable>
              )}
            </View>
          </Pressable>
        );
      })}
      <AppText variant="caption" color={C.onSurfaceVariant}>
        {poll.total} {poll.total === 1 ? "voto" : "votos"} ·{" "}
        {poll.closed
          ? winner
            ? `Encuesta cerrada · ganó ${winner.label ?? winner.restaurant?.name ?? ""}`
            : "Encuesta cerrada"
          : timeLeft(poll.closes_at)}
      </AppText>
    </View>
  );
}
