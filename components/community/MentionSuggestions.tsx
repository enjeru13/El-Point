import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { useMentionSuggestions } from "@/lib/queries/publicProfile";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable, View } from "react-native";

/** Lista de usuarios mientras se escribe @algo. `query` null = no se muestra. */
export function MentionSuggestions({
  query,
  postId,
  onPick,
}: {
  query: string | null;
  postId?: string;
  onPick: (username: string) => void;
}) {
  const { C } = useTheme();
  const { data = [] } = useMentionSuggestions(query, postId);
  if (query === null || data.length === 0) return null;
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.outlineVariant,
        backgroundColor: C.surface,
        paddingVertical: 4,
        maxHeight: 220,
        overflow: "hidden",
      }}
    >
      {data.slice(0, 5).map((u) => (
        <Pressable
          key={u.id}
          onPress={() => onPick(u.username)}
          accessibilityRole="button"
          accessibilityLabel={`Mencionar a ${u.username}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Avatar uri={u.avatar_url} size={28} icon="account" bordered={false} />
          <AppText variant="label">@{u.username}</AppText>
        </Pressable>
      ))}
    </View>
  );
}
