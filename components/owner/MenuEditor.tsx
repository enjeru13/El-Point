import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { useUpdateMyRestaurant, type OwnerRestaurant } from "@/lib/queries/owner";
import {
  CURRENCY_LABEL,
  CURRENCY_ORDER,
  DEFAULT_SECTIONS,
  MENU_LIMIT,
  isSpecialActive,
  normalizeCurrencies,
  useMenu,
  useMenuMutations,
  type Currency,
  type MenuItem,
} from "@/lib/queries/menu";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OTHER = "__other__";

type Draft = {
  id: string | null;
  name: string;
  price: string;
  description: string;
  section: string;
  customSection: string;
  available: boolean;
  special: boolean;
  keep: boolean;
};

function emptyDraft(section: string): Draft {
  return { id: null, name: "", price: "", description: "", section, customSection: "", available: true, special: false, keep: false };
}

function parsePrice(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 9999) return null;
  return Math.round(n * 100) / 100;
}

function usd(n: number): string {
  return "$" + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Editor del menú con precios (dueño con plan): platos, secciones, plato del día y monedas. */
export function MenuEditor({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const menuQ = useMenu(restaurant.id);
  const { add, update, remove, swap } = useMenuMutations(restaurant.id);
  const updateRestaurant = useUpdateMyRestaurant(restaurant.id);

  const items = useMemo(() => menuQ.data ?? [], [menuQ.data]);
  const currencies = normalizeCurrencies(restaurant.menu_currencies);

  const sections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, MenuItem[]>();
    for (const i of items) {
      if (!map.has(i.section)) {
        map.set(i.section, []);
        order.push(i.section);
      }
      map.get(i.section)!.push(i);
    }
    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [items]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const saving = add.isPending || update.isPending;

  function toggleCurrency(c: Currency) {
    const set = new Set(currencies);
    if (set.has(c)) {
      if (set.size === 1) {
        toast.info("Deja al menos una moneda");
        return;
      }
      set.delete(c);
    } else {
      set.add(c);
    }
    const next = CURRENCY_ORDER.filter((x) => set.has(x));
    updateRestaurant.mutate({ menu_currencies: next }, { onError: () => toast.error("No se pudo guardar la moneda") });
  }

  function openNew() {
    if (items.length >= MENU_LIMIT) {
      toast.error(`Llegaste al máximo de ${MENU_LIMIT} platos.`);
      return;
    }
    setDraft(emptyDraft(sections[sections.length - 1]?.name ?? DEFAULT_SECTIONS[1]));
  }

  function openEdit(i: MenuItem) {
    setDraft({
      id: i.id,
      name: i.name,
      price: String(i.price_usd).replace(".", ","),
      description: i.description ?? "",
      section: i.section,
      customSection: "",
      available: i.available,
      special: isSpecialActive(i),
      keep: i.special_keep,
    });
  }

  function save() {
    if (!draft) return;
    const price = parsePrice(draft.price);
    const section = (draft.section === OTHER ? draft.customSection : draft.section).trim();
    if (!draft.name.trim()) return toast.error("Ponle nombre al plato");
    if (price === null) return toast.error("Escribe un precio válido en dólares, por ejemplo 8,50");
    if (!section) return toast.error("Elige o escribe una sección");

    const input = {
      section: section.slice(0, 40),
      name: draft.name.trim().slice(0, 80),
      description: draft.description.trim() ? draft.description.trim().slice(0, 200) : null,
      price_usd: price,
      available: draft.available,
      is_daily_special: draft.special,
      special_keep: draft.special && draft.keep,
    };
    const done = {
      onSuccess: () => {
        setDraft(null);
        toast.success(draft.id ? "Plato actualizado" : "Plato agregado");
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (draft.id) update.mutate({ id: draft.id, patch: input }, done);
    else add.mutate({ input, position: items.reduce((m, i) => Math.max(m, i.position), 0) + 1 }, done);
  }

  function confirmDelete(i: MenuItem) {
    Alert.alert("Eliminar plato", `Se borrará "${i.name}". ¿Continuar?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => remove.mutate(i.id, { onError: (e) => toast.error((e as Error).message) }),
      },
    ]);
  }

  function move(list: MenuItem[], index: number, dir: -1 | 1) {
    const other = list[index + dir];
    if (!other) return;
    swap.mutate({ a: list[index], b: other }, { onError: (e) => toast.error((e as Error).message) });
  }

  const sectionChoices = Array.from(new Set([...sections.map((s) => s.name), ...DEFAULT_SECTIONS]));

  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
        ...shadow.sm,
      }}
    >
      <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
        <AppText variant="bodyStrong">Menú en la app</AppText>
        <AppText variant="caption" color={C.outline}>
          {items.length} de {MENU_LIMIT} platos · el PDF sigue disponible más abajo
        </AppText>
      </View>

      <View style={{ padding: 18, gap: 16 }}>
        {/* Monedas */}
        <View style={{ gap: 8 }}>
          <AppText variant="overline" color={C.outline}>MOSTRAR PRECIOS EN</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CURRENCY_ORDER.map((c) => (
              <Chip key={c} label={CURRENCY_LABEL[c]} active={currencies.includes(c)} onPress={() => toggleCurrency(c)} />
            ))}
          </View>
          <AppText variant="caption" color={C.outline}>
            Tú escribes el precio en dólares; la app calcula bolívares (tasa BCV) y pesos con la tasa del día.
          </AppText>
        </View>

        {menuQ.isLoading ? (
          <ActivityIndicator color={C.primary} />
        ) : items.length === 0 ? (
          <AppText variant="bodySm" color={C.outline}>
            Aún no tienes platos. Agrega los principales con su precio y los comensales los ven en tu perfil.
          </AppText>
        ) : (
          sections.map((s) => (
            <View key={s.name} style={{ gap: 6 }}>
              <AppText variant="overline" color={C.outline}>{s.name.toUpperCase()}</AppText>
              {s.items.map((i, idx) => (
                <View
                  key={i.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: C.surfaceContainerLow,
                    borderWidth: 1,
                    borderColor: C.outlineVariant,
                    gap: 8,
                    opacity: i.available ? 1 : 0.7,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyStrong">{i.name}</AppText>
                      {!!i.description && (
                        <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={2}>
                          {i.description}
                        </AppText>
                      )}
                      {isSpecialActive(i) && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Icon name="fire" size={12} color={C.primary} />
                          <AppText variant="caption" color={C.primary}>
                            Plato del día{i.special_keep ? " · se mantiene" : " · hasta medianoche"}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="bodyStrong" color={C.primary}>{usd(i.price_usd)}</AppText>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Switch
                      value={i.available}
                      onValueChange={(v) => update.mutate({ id: i.id, patch: { available: v } }, { onError: (e) => toast.error((e as Error).message) })}
                      trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                      thumbColor={i.available ? C.primary : C.outline}
                    />
                    <AppText variant="caption" color={C.onSurfaceVariant} style={{ flex: 1 }}>
                      {i.available ? "Disponible" : "Agotado"}
                    </AppText>
                    <Pressable hitSlop={8} onPress={() => move(s.items, idx, -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}>
                      <Icon name="chevron-up" size={20} color={C.onSurfaceVariant} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => move(s.items, idx, 1)} disabled={idx === s.items.length - 1} style={{ padding: 6, opacity: idx === s.items.length - 1 ? 0.3 : 1 }}>
                      <Icon name="chevron-down" size={20} color={C.onSurfaceVariant} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => openEdit(i)} style={{ padding: 6 }}>
                      <Icon name="pencil-outline" size={19} color={C.secondary} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(i)} style={{ padding: 6 }}>
                      <Icon name="delete-outline" size={20} color={C.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        <Button label="Agregar plato" onPress={openNew} icon="plus" variant="secondary" />
      </View>

      {/* Formulario de plato */}
      <Modal visible={!!draft} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18, paddingTop: Platform.OS === "ios" ? 18 : insets.top + 12 }}>
            <AppText variant="title" style={{ flex: 1, fontSize: 20 }}>
              {draft?.id ? "Editar plato" : "Nuevo plato"}
            </AppText>
            <Pressable hitSlop={10} onPress={() => setDraft(null)}>
              <Icon name="close" size={24} color={C.onSurfaceVariant} />
            </Pressable>
          </View>

          {draft && (
            <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 6 }}>
                <AppText variant="overline" color={C.outline}>NOMBRE</AppText>
                <AppTextInput
                  value={draft.name}
                  onChangeText={(t) => setDraft({ ...draft, name: t.slice(0, 80) })}
                  placeholder="Ej. Pizza margarita"
                  style={inputStyle(C)}
                />
              </View>

              <View style={{ gap: 6 }}>
                <AppText variant="overline" color={C.outline}>PRECIO EN DÓLARES</AppText>
                <AppTextInput
                  value={draft.price}
                  onChangeText={(t) => setDraft({ ...draft, price: t.replace(/[^0-9.,]/g, "").slice(0, 7) })}
                  placeholder="8,50"
                  keyboardType="decimal-pad"
                  style={inputStyle(C)}
                />
              </View>

              <View style={{ gap: 6 }}>
                <AppText variant="overline" color={C.outline}>DESCRIPCIÓN (OPCIONAL)</AppText>
                <AppTextInput
                  value={draft.description}
                  onChangeText={(t) => setDraft({ ...draft, description: t.slice(0, 200) })}
                  placeholder="Ingredientes, tamaño, acompañantes…"
                  multiline
                  style={{ ...inputStyle(C), minHeight: 72, textAlignVertical: "top" }}
                />
                <AppText variant="caption" color={C.outline} align="right">{draft.description.length}/200</AppText>
              </View>

              <View style={{ gap: 8 }}>
                <AppText variant="overline" color={C.outline}>SECCIÓN</AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {sectionChoices.map((n) => (
                    <Chip key={n} label={n} active={draft.section === n} onPress={() => setDraft({ ...draft, section: n })} />
                  ))}
                  <Chip label="Otra…" active={draft.section === OTHER} onPress={() => setDraft({ ...draft, section: OTHER })} />
                </View>
                {draft.section === OTHER && (
                  <AppTextInput
                    value={draft.customSection}
                    onChangeText={(t) => setDraft({ ...draft, customSection: t.slice(0, 40) })}
                    placeholder="Nombre de la sección"
                    style={inputStyle(C)}
                  />
                )}
              </View>

              <View style={{ gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">Disponible</AppText>
                    <AppText variant="caption" color={C.outline}>Apágalo cuando se agote.</AppText>
                  </View>
                  <Switch
                    value={draft.available}
                    onValueChange={(v) => setDraft({ ...draft, available: v })}
                    trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                    thumbColor={draft.available ? C.primary : C.outline}
                  />
                </View>

                <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">Plato del día</AppText>
                    <AppText variant="caption" color={C.outline}>Sale destacado arriba y avisamos a quienes te siguen.</AppText>
                  </View>
                  <Switch
                    value={draft.special}
                    onValueChange={(v) => setDraft({ ...draft, special: v })}
                    trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                    thumbColor={draft.special ? C.primary : C.outline}
                  />
                </View>

                {draft.special && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Chip label="Solo hoy" active={!draft.keep} onPress={() => setDraft({ ...draft, keep: false })} />
                    <Chip label="Mantener" active={draft.keep} onPress={() => setDraft({ ...draft, keep: true })} />
                  </View>
                )}
                {draft.special && (
                  <AppText variant="caption" color={C.outline}>
                    {draft.keep
                      ? "Se queda como plato del día hasta que lo quites."
                      : "Vence a la medianoche. Mañana lo marcas de nuevo si quieres renovarlo."}
                  </AppText>
                )}
              </View>
            </ScrollView>
          )}

          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 14, backgroundColor: C.background, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
            <Button label={draft?.id ? "Guardar cambios" : "Agregar plato"} onPress={save} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function inputStyle(C: ReturnType<typeof useTheme>["C"]) {
  return {
    fontSize: 15,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  } as const;
}
