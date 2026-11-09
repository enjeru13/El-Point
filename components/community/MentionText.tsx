import { AppText } from "@/components/ui/AppText";
import { mentionSegments } from "@/lib/community/mentions";
import { resolveUsername } from "@/lib/queries/publicProfile";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";

/** Texto de Comunidad con las @menciones resaltadas; al tocar una abre su perfil. */
export function MentionText({ body, ...rest }: { body: string } & Omit<ComponentProps<typeof AppText>, "children">) {
  const { C } = useTheme();
  const router = useRouter();
  const parts = mentionSegments(body);
  if (parts.length === 1 && !parts[0].username) return <AppText {...rest}>{body}</AppText>;
  return (
    <AppText {...rest}>
      {parts.map((p, i) =>
        p.username ? (
          <AppText
            key={i}
            {...rest}
            color={C.primary}
            suppressHighlighting
            accessibilityRole="link"
            onPress={async () => {
              const id = await resolveUsername(p.username!);
              if (id) router.push(`/user/${id}` as never);
            }}
          >
            {p.text}
          </AppText>
        ) : (
          p.text
        ),
      )}
    </AppText>
  );
}
