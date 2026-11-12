import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { useCategories } from "@/lib/queries/categories";
import { useMyProfile, useUpdateMyProfile } from "@/lib/queries/me";
import { useIsGuest } from "@/lib/session";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

const DISMISSED_KEY = "elpoint.prefsCardDismissed";
const ROWS = 3;

/** Reparte la lista en `rows` filas seguidas, conservando el orden. */
function chunkRows<T>(items: T[], rows: number): T[][] {
  const size = Math.ceil(items.length / rows);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * "¿Qué te gusta comer?" en el inicio, para quien creó su cuenta sin elegir
 * categorías (el registro ya no las pregunta). Aparece una sola vez: se guarda o
 * se descarta con "Ahora no", y entonces no vuelve. Se pueden cambiar en el perfil.
 */
export function PreferencesCard() {
  const { C } = useTheme();
  const toast = useToast();
  const isGuest = useIsGuest();
  const profileQ = useMyProfile();
  const categoriesQ = useCategories();
  const update = useUpdateMyProfile();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then(
      (v) => setDismissed(v === "1"),
      () => setDismissed(true),
    );
  }, []);

  const categories = categoriesQ.data ?? [];
  const hasPrefs = (profileQ.data?.favorite_categories?.length ?? 0) > 0;
  if (isGuest || dismissed !== false || !profileQ.data || hasPrefs || categories.length === 0) return null;

  function dismiss() {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "1").catch(() => {});
  }

  function save() {
    update.mutate(
      { favorite_categories: Array.from(picked) },
      {
        onSuccess: () => {
          dismiss();
          toast.success("Listo, lo tendremos en cuenta");
        },
        onError: () => toast.error("No pudimos guardar tus gustos. Inténtalo de nuevo."),
      },
    );
  }

  return (
    <View
      style={{
        padding: 16,
        gap: 12,
        borderRadius: 20,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
          <Icon name="silverware-fork-knife" size={18} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">¿Qué te gusta comer?</AppText>
          <AppText variant="caption" color={C.onSurfaceVariant}>
            Elige tus favoritas y te mostramos esos locales primero.
          </AppText>
        </View>
        <Pressable onPress={dismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Ahora no">
          <Icon name="close" size={20} color={C.outline} />
        </Pressable>
      </View>

      {/* Tres filas que se deslizan de lado: con todas las categorías en
          bloque la tarjeta ocupaba la pantalla entera. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ flexDirection: "column", paddingHorizontal: 16, gap: 8 }}
      >
        {chunkRows(categories, ROWS).map((row, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                icon={c.icon}
                active={picked.has(c.id)}
                onPress={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(c.id)) next.add(c.id);
                    return next;
                  })
                }
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <Button
        label={picked.size > 0 ? `Guardar (${picked.size})` : "Guardar"}
        onPress={save}
        disabled={picked.size === 0}
        loading={update.isPending}
        size="sm"
      />
    </View>
  );
}
