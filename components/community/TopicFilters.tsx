import { Chip } from "@/components/ui/Chip";
import { ChipRow } from "@/components/ui/ChipRow";
import { TOPICS, type TopicKey } from "@/lib/community/topics";
import { useCategories } from "@/lib/queries/categories";
import { View } from "react-native";

/** Arriba del feed: una fila de temas y otra de categorías de comida. */
export function TopicFilters({
  topic,
  categoryId,
  onTopic,
  onCategory,
}: {
  topic: TopicKey | undefined;
  categoryId: number | undefined;
  onTopic: (t: TopicKey | undefined) => void;
  onCategory: (c: number | undefined) => void;
}) {
  const { data: categories = [] } = useCategories();
  return (
    <View>
      <ChipRow padY={8}>
        <Chip label="Todo" active={!topic} onPress={() => onTopic(undefined)} flat />
        {TOPICS.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={topic === t.key}
            onPress={() => onTopic(topic === t.key ? undefined : t.key)}
            flat
          />
        ))}
      </ChipRow>
      <ChipRow padY={4}>
        <Chip label="Toda la comida" active={!categoryId} onPress={() => onCategory(undefined)} tone="secondary" flat />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            active={categoryId === c.id}
            onPress={() => onCategory(categoryId === c.id ? undefined : c.id)}
            tone="secondary"
            flat
          />
        ))}
      </ChipRow>
    </View>
  );
}
