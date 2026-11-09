import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import type { NewPoll, NewPollOption } from "@/lib/queries/community";
import { useTheme } from "@/lib/ThemeContext";
import { Pressable, TextInput, View } from "react-native";

const DAYS: NewPoll["days"][] = [1, 3, 7];

/** Opciones de la encuesta al publicar: 2 a 4, de texto o un local; dura 1, 3 o 7 días. */
export function PollEditor({
  poll,
  onChange,
  onPickRestaurant,
  onRemove,
}: {
  poll: NewPoll;
  onChange: (p: NewPoll) => void;
  /** Abre el buscador de locales para la opción `index`. */
  onPickRestaurant: (index: number) => void;
  onRemove: () => void;
}) {
  const { C } = useTheme();
  const setOption = (i: number, o: NewPollOption) =>
    onChange({ ...poll, options: poll.options.map((x, j) => (j === i ? o : x)) });

  return (
    <View style={{ gap: 8, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: C.outlineVariant }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="mdi:poll" size={16} color={C.primary} />
        <AppText variant="label" style={{ flex: 1 }}>
          Encuesta
        </AppText>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="Quitar encuesta">
          <Icon name="close-circle" size={18} color={C.outline} />
        </Pressable>
      </View>

      {poll.options.map((o, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {"label" in o ? (
            <TextInput
              value={o.label}
              onChangeText={(t) => setOption(i, { label: t.slice(0, 60) })}
              placeholder={`Opción ${i + 1}`}
              placeholderTextColor={C.outline}
              accessibilityLabel={`Opción ${i + 1}`}
              style={{
                flex: 1,
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.outlineVariant,
                color: C.onSurface,
                fontFamily: "PlusJakartaSans_500Medium",
                fontSize: 15,
              }}
            />
          ) : (
            <View
              style={{
                flex: 1,
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.primary,
              }}
            >
              <Icon name="storefront" size={15} color={C.primary} />
              <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                {o.name}
              </AppText>
            </View>
          )}
          <Pressable
            onPress={() => ("label" in o ? onPickRestaurant(i) : setOption(i, { label: "" }))}
            hitSlop={6}
            accessibilityLabel={"label" in o ? "Usar un local" : "Usar texto"}
            style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={"label" in o ? "storefront-outline" : "pencil-outline"} size={18} color={C.onSurfaceVariant} />
          </Pressable>
          {poll.options.length > 2 && (
            <Pressable
              onPress={() => onChange({ ...poll, options: poll.options.filter((_, j) => j !== i) })}
              hitSlop={6}
              accessibilityLabel={`Quitar opción ${i + 1}`}
              style={{ width: 28, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="minus" size={16} color={C.onSurfaceVariant} />
            </Pressable>
          )}
        </View>
      ))}

      {poll.options.length < 4 && (
        <Pressable
          onPress={() => onChange({ ...poll, options: [...poll.options, { label: "" }] })}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
        >
          <Icon name="plus" size={16} color={C.primary} />
          <AppText variant="label" color={C.primary}>
            Agregar opción
          </AppText>
        </Pressable>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText variant="caption" color={C.onSurfaceVariant}>
          Dura
        </AppText>
        {DAYS.map((d) => {
          const on = poll.days === d;
          return (
            <Pressable
              key={d}
              onPress={() => onChange({ ...poll, days: d })}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: on ? C.primary : C.outlineVariant,
                backgroundColor: on ? C.primary + "14" : "transparent",
              }}
            >
              <AppText variant="caption" color={on ? C.primary : C.onSurface}>
                {d} {d === 1 ? "día" : "días"}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** La encuesta está lista: 2 o más opciones y ninguna vacía. */
export function pollReady(p: NewPoll | null): boolean {
  if (!p) return true;
  return p.options.length >= 2 && p.options.every((o) => ("label" in o ? o.label.trim().length > 0 : !!o.restaurantId));
}
