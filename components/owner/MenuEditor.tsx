import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { ReorderSection } from "@/components/owner/ReorderSection";
import { convertAmount, formatMoney, priceLines, useEffectiveRates } from "@/lib/queries/exchangeRate";
import { useUpdateMyRestaurant, type OwnerRestaurant } from "@/lib/queries/owner";
import {
  CURRENCY_LABEL,
  CURRENCY_ORDER,
  DEFAULT_SECTIONS,
  MENU_LIMIT,
  currencySymbol,
  isSpecialActive,
  menuSettings,
  useConvertMenuPrices,
  useMenu,
  useMenuMutations,
  useReorderMenu,
  type Currency,
  type MenuItem,
} from "@/lib/queries/menu";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { uploadRestaurantMenu } from "@/lib/storage";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useState } from "react";
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

function parseNumber(raw: string, max: number): number | null {
  const n = Number(raw.trim().replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n * 100) / 100;
}

/** Acepta "8,50", "8.50" y "7.500,00": el último separador es el decimal. */
function parsePrice(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized = s;
  if (lastComma > -1 && lastDot > -1) {
    normalized = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = s.replace(",", ".");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 99999999) return null;
  return Math.round(n * 100) / 100;
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

const SHORT: Record<Currency, string> = { usd: "$", bs: "Bs", cop: "COP" };

function RateBlock({
  c,
  base,
  shown,
  custom,
  setCustom,
  text,
  setText,
  autoLabel,
  autoValue,
  unit,
}: {
  c: Currency;
  base: Currency;
  shown: Set<Currency>;
  custom: boolean;
  setCustom: (v: boolean) => void;
  text: string;
  setText: (v: string) => void;
  autoLabel: string;
  autoValue: number | null | undefined;
  unit: string;
}) {
  const { C } = useTheme();
  if (c !== base && !shown.has(c)) return null;
  return (
    <View style={{ gap: 8, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
      <AppText variant="bodyStrong">Tasa en {CURRENCY_LABEL[c].toLowerCase()}</AppText>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={autoLabel} active={!custom} onPress={() => setCustom(false)} />
        <Chip label="Mi tasa" active={custom} onPress={() => setCustom(true)} />
      </View>
      {custom ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AppTextInput
            value={text}
            onChangeText={(v) => setText(v.replace(/[^0-9.,]/g, "").slice(0, 12))}
            placeholder="950"
            keyboardType="decimal-pad"
            style={{ ...inputStyle(C), flex: 1 }}
          />
          <AppText variant="bodySm" color={C.onSurfaceVariant}>{unit}</AppText>
        </View>
      ) : (
        <AppText variant="caption" color={C.outline}>
          {autoValue ? `Hoy: ${autoValue.toLocaleString("es-VE", { maximumFractionDigits: 2 })} ${unit}. Se actualiza sola.` : "Cargando la tasa del día…"}
        </AppText>
      )}
    </View>
  );
}

/** Selector de una opción entre pocas, todas del mismo ancho. */
function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", padding: 4, borderRadius: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.border }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: on ? C.primary : "transparent" }}
          >
            <AppText variant="label" color={on ? "#fff" : C.onSurfaceVariant}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Hoja de monedas y tasas ────────────────────────────────────────────────

function CurrencySheet({
  visible,
  onClose,
  restaurant,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  restaurant: OwnerRestaurant;
  items: MenuItem[];
}) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const updateRestaurant = useUpdateMyRestaurant(restaurant.id);
  const convert = useConvertMenuPrices(restaurant.id);
  const saved = menuSettings(restaurant);

  const [base, setBase] = useState<Currency>(saved.base);
  const [shown, setShown] = useState<Set<Currency>>(new Set(saved.currencies));
  const [bsCustom, setBsCustom] = useState(saved.bsRate != null);
  const [bsText, setBsText] = useState(saved.bsRate != null ? String(saved.bsRate).replace(".", ",") : "");
  const [copCustom, setCopCustom] = useState(saved.copRate != null);
  const [copText, setCopText] = useState(saved.copRate != null ? String(saved.copRate).replace(".", ",") : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBase(saved.base);
    setShown(new Set(saved.currencies));
    setBsCustom(saved.bsRate != null);
    setBsText(saved.bsRate != null ? String(saved.bsRate).replace(".", ",") : "");
    setCopCustom(saved.copRate != null);
    setCopText(saved.copRate != null ? String(saved.copRate).replace(".", ",") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const bsRateDraft = bsCustom ? parseNumber(bsText, 10_000_000) : null;
  const copRateDraft = copCustom ? parseNumber(copText, 10_000_000) : null;
  const { rates, loading } = useEffectiveRates({ bsRate: bsRateDraft, copRate: copRateDraft });

  const currencies = CURRENCY_ORDER.filter((c) => c === base || shown.has(c));
  const ordered = [base, ...currencies.filter((c) => c !== base)];

  // Ejemplo: lo que equivalen 10 dólares, en la moneda base y las demás.
  const sampleBase = convertAmount(10, "usd", base, rates);
  const preview = sampleBase != null ? priceLines(sampleBase, base, ordered, rates).join("  ≈  ") : null;

  function toggleShown(c: Currency) {
    if (c === base) return;
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function persist(convertPrices: boolean) {
    setSaving(true);
    try {
      await updateRestaurant.mutateAsync({
        menu_base_currency: base,
        menu_currencies: ordered,
        menu_bs_rate: bsCustom ? bsRateDraft : null,
        menu_cop_rate: copCustom ? copRateDraft : null,
      });
      if (convertPrices) {
        const updates = items.map((i) => {
          const v = convertAmount(i.price, saved.base, base, rates) ?? i.price;
          const price = base === "cop" ? Math.round(v / 50) * 50 : Math.round(v * 100) / 100;
          return { id: i.id, price };
        });
        try {
          await convert.mutateAsync(updates);
        } catch {
          toast.error("No se pudieron convertir todos los precios. Revísalos uno por uno.");
        }
      }
      toast.success("Monedas y tasas guardadas");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function save() {
    if (bsCustom && bsRateDraft == null) return toast.error("Escribe tu tasa en bolívares por dólar, por ejemplo 950");
    if (copCustom && copRateDraft == null) return toast.error("Escribe tu tasa en pesos por dólar, por ejemplo 3.300");

    if (base !== saved.base && items.length > 0) {
      const canConvert = convertAmount(1, saved.base, base, rates) != null;
      Alert.alert(
        "Cambiaste la moneda base",
        `Tus ${items.length} platos están en ${CURRENCY_LABEL[saved.base].toLowerCase()}. ¿Los convertimos a ${CURRENCY_LABEL[base].toLowerCase()} con estas tasas, o dejamos los números como están?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Dejar los números", onPress: () => persist(false) },
          ...(canConvert ? [{ text: "Convertir precios", onPress: () => persist(true) }] : []),
        ],
      );
      return;
    }
    persist(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 18, paddingTop: Platform.OS === "ios" ? 18 : insets.top + 12 }}>
          <AppText variant="title" style={{ flex: 1, fontSize: 20 }}>Monedas y tasas</AppText>
          <Pressable hitSlop={10} onPress={onClose}>
            <Icon name="close" size={24} color={C.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 18, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.outline}>MIS PRECIOS ESTÁN EN</AppText>
            <Segmented
              value={base}
              onChange={setBase}
              options={[
                { key: "usd", label: "Dólares" },
                { key: "bs", label: "Bolívares" },
                { key: "cop", label: "Pesos" },
              ]}
            />
            <AppText variant="caption" color={C.outline}>
              Es la moneda en la que escribes cada precio. Las demás se calculan a partir de ella.
            </AppText>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.outline}>MOSTRAR TAMBIÉN EN</AppText>
            <View style={{ borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {CURRENCY_ORDER.filter((c) => c !== base).map((c, idx) => (
                <View
                  key={c}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: C.outlineVariant,
                  }}
                >
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>{CURRENCY_LABEL[c]}</AppText>
                  <Switch
                    value={shown.has(c)}
                    onValueChange={() => toggleShown(c)}
                    trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                    thumbColor={shown.has(c) ? C.primary : C.outline}
                  />
                </View>
              ))}
            </View>
          </View>

          {(base === "bs" || shown.has("bs") || base === "cop" || shown.has("cop")) && (
            <View style={{ gap: 8 }}>
              <AppText variant="overline" color={C.outline}>TASAS</AppText>
              <RateBlock c="bs" base={base} shown={shown} custom={bsCustom} setCustom={setBsCustom} text={bsText} setText={setBsText} autoLabel="Tasa BCV" autoValue={rates.bs} unit="Bs por dólar" />
              <RateBlock c="cop" base={base} shown={shown} custom={copCustom} setCustom={setCopCustom} text={copText} setText={setCopText} autoLabel="Tasa del día" autoValue={rates.cop} unit="COP por dólar" />
              <AppText variant="caption" color={C.outline}>
                Si pones tu tasa, tus clientes ven “tasa del local”. Cuando cambie, entra aquí y actualiza solo ese número.
              </AppText>
            </View>
          )}

          <View style={{ gap: 6, padding: 14, borderRadius: 16, backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border }}>
            <AppText variant="overline" color={C.primary}>ASÍ SE VERÁ</AppText>
            <AppText variant="bodyStrong">{loading && preview == null ? "Calculando…" : (preview ?? "Falta una tasa para calcular el ejemplo")}</AppText>
            <AppText variant="caption" color={C.onSurfaceVariant}>Ejemplo con un plato de 10 dólares.</AppText>
          </View>
        </ScrollView>

        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 14, backgroundColor: C.background, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
          <Button label="Guardar" onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Editor del menú ─────────────────────────────────────────────────────────

/** Editor del menú con precios (dueño con plan): lista agrupada, plato del día y moneda/tasas. */
export function MenuEditor({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const menuQ = useMenu(restaurant.id);
  const { add, update, remove } = useMenuMutations(restaurant.id);
  const reorderMut = useReorderMenu(restaurant.id);
  const settings = menuSettings(restaurant);
  const { bsLocal, copLocal } = useEffectiveRates(settings);
  const updateRestaurant = useUpdateMyRestaurant(restaurant.id);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const items = useMemo(() => menuQ.data ?? [], [menuQ.data]);
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
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [reorder, setReorder] = useState(false);
  const saving = add.isPending || update.isPending;

  const summary = [
    `Precios en ${SHORT[settings.base]}`,
    ...settings.currencies
      .filter((c) => c !== settings.base)
      .map((c) => `${SHORT[c]} ${c === "bs" ? (bsLocal ? "a mi tasa" : "a tasa BCV") : copLocal ? "a mi tasa" : "a tasa del día"}`),
  ].join(" · ");

  async function pickPdf() {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (r.canceled) return;
    setUploadingPdf(true);
    try {
      const url = await uploadRestaurantMenu(restaurant.id, r.assets[0].uri);
      await updateRestaurant.mutateAsync({ menu_pdf_url: url });
      toast.success("Menú en PDF guardado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir el menú");
    } finally {
      setUploadingPdf(false);
    }
  }

  function removePdf() {
    Alert.alert("Quitar el PDF", "Los comensales dejarán de ver el enlace al PDF. Tus platos no se tocan.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: () =>
          updateRestaurant.mutate({ menu_pdf_url: null }, { onSuccess: () => toast.success("PDF quitado"), onError: (e) => toast.error((e as Error).message) }),
      },
    ]);
  }

  function openNew() {
    if (items.length >= MENU_LIMIT) return toast.error(`Llegaste al máximo de ${MENU_LIMIT} platos.`);
    setDraft(emptyDraft(sections[sections.length - 1]?.name ?? DEFAULT_SECTIONS[1]));
  }

  function openEdit(i: MenuItem) {
    setDraft({
      id: i.id,
      name: i.name,
      price: String(i.price).replace(".", ","),
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
    if (price === null) return toast.error(`Escribe un precio válido en ${CURRENCY_LABEL[settings.base].toLowerCase()}`);
    if (!section) return toast.error("Elige o escribe una sección");

    const input = {
      section: section.slice(0, 40),
      name: draft.name.trim().slice(0, 80),
      description: draft.description.trim() ? draft.description.trim().slice(0, 200) : null,
      price,
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

  function confirmDelete() {
    if (!draft?.id) return;
    const id = draft.id;
    Alert.alert("Eliminar plato", `Se borrará "${draft.name}". ¿Continuar?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          remove.mutate(id, {
            onSuccess: () => {
              setDraft(null);
              toast.success("Plato eliminado");
            },
            onError: (e) => toast.error((e as Error).message),
          }),
      },
    ]);
  }

  const sectionChoices = Array.from(new Set([...sections.map((s) => s.name), ...DEFAULT_SECTIONS]));

  return (
    <View style={{ gap: 18 }}>
      {/* Monedas y tasas */}
      <Pressable
        onPress={() => setCurrencyOpen(true)}
        android_ripple={{ color: C.outlineVariant }}
        style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
      >
        <Icon name="cash-multiple" size={21} color={C.primary} />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyStrong">Monedas y tasas</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={2}>{summary}</AppText>
        </View>
        <Icon name="chevron-right" size={18} color={C.outline} />
      </Pressable>

      {items.length > 1 && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: -6 }}>
          <AppText variant="overline" color={C.outline}>{reorder ? "MANTÉN PRESIONADO ⋮ Y ARRASTRA" : "TU MENÚ"}</AppText>
          <Pressable onPress={() => setReorder((v) => !v)} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name={reorder ? "check" : "swap-vertical"} size={16} color={C.primary} />
            <AppText variant="label" color={C.primary}>{reorder ? "Listo" : "Ordenar"}</AppText>
          </Pressable>
        </View>
      )}

      {menuQ.isLoading ? (
        <ActivityIndicator color={C.primary} />
      ) : items.length === 0 ? (
        <View style={{ padding: 18, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, gap: 6 }}>
          <AppText variant="bodyStrong">Aún no tienes platos</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            Agrega los principales con su precio y los comensales los ven en tu perfil.
          </AppText>
        </View>
      ) : (
        sections.map((s) =>
          reorder ? (
            <ReorderSection
              key={s.name}
              title={s.name}
              items={s.items}
              base={settings.base}
              onCommit={(ordered) => reorderMut.mutate(ordered, { onError: (e) => toast.error((e as Error).message) })}
            />
          ) : (
          <View key={s.name} style={{ gap: 8 }}>
            <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>{s.name.toUpperCase()}</AppText>
            <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {s.items.map((i, idx) => {
                const special = isSpecialActive(i);
                return (
                  <Pressable
                    key={i.id}
                    onPress={() => openEdit(i)}
                    android_ripple={{ color: C.outlineVariant }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: C.outlineVariant,
                      opacity: i.available ? 1 : 0.6,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyStrong" numberOfLines={1}>{i.name}</AppText>
                      {(special || !i.available) && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          {special && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                              <Icon name="fire" size={12} color={C.primary} />
                              <AppText variant="caption" color={C.primary}>Plato del día</AppText>
                            </View>
                          )}
                          {!i.available && <AppText variant="caption" color={C.outline}>Agotado</AppText>}
                        </View>
                      )}
                      {!!i.description && !special && i.available && (
                        <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={1}>{i.description}</AppText>
                      )}
                    </View>
                    <AppText variant="bodyStrong" color={C.primary}>{formatMoney(i.price, settings.base, true)}</AppText>
                    <Icon name="chevron-right" size={16} color={C.outline} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          ),
        )
      )}

      <Button label="Agregar plato" onPress={openNew} icon="plus" variant="secondary" />
      <AppText variant="caption" color={C.outline} align="center">
        {items.length} de {MENU_LIMIT} platos
      </AppText>

      {/* Menú en PDF */}
      <View style={{ gap: 8 }}>
        <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>MENÚ EN PDF</AppText>
        <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
          <Pressable
            onPress={pickPdf}
            disabled={uploadingPdf}
            android_ripple={{ color: C.outlineVariant }}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 }}
          >
            {uploadingPdf ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Icon name={restaurant.menu_pdf_url ? "file-check" : "file-pdf-box"} size={22} color={C.primary} />
            )}
            <View style={{ flex: 1, gap: 1 }}>
              <AppText variant="bodyStrong">{restaurant.menu_pdf_url ? "Carta en PDF cargada" : "Sube tu carta en PDF"}</AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant}>
                {restaurant.menu_pdf_url ? "Toca para reemplazarla" : "Se muestra como “Ver menú completo” en tu perfil"}
              </AppText>
            </View>
            <Icon name="chevron-right" size={16} color={C.outline} />
          </Pressable>
          {!!restaurant.menu_pdf_url && (
            <Pressable
              onPress={removePdf}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant }}
            >
              <Icon name="delete-outline" size={16} color={C.error} />
              <AppText variant="label" color={C.error}>Quitar el PDF</AppText>
            </Pressable>
          )}
        </View>
      </View>

      <CurrencySheet visible={currencyOpen} onClose={() => setCurrencyOpen(false)} restaurant={restaurant} items={items} />

      {/* Hoja de plato */}
      <Modal visible={!!draft} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18, paddingTop: Platform.OS === "ios" ? 18 : insets.top + 12 }}>
            <AppText variant="title" style={{ flex: 1, fontSize: 20 }}>{draft?.id ? "Editar plato" : "Nuevo plato"}</AppText>
            <Pressable hitSlop={10} onPress={() => setDraft(null)}>
              <Icon name="close" size={24} color={C.onSurfaceVariant} />
            </Pressable>
          </View>

          {draft && (
            <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 6 }}>
                <AppText variant="overline" color={C.outline}>NOMBRE</AppText>
                <AppTextInput value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t.slice(0, 80) })} placeholder="Ej. Pizza margarita" style={inputStyle(C)} />
              </View>

              <View style={{ gap: 6 }}>
                <AppText variant="overline" color={C.outline}>PRECIO EN {CURRENCY_LABEL[settings.base].toUpperCase()}</AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <AppText variant="bodyStrong" color={C.onSurfaceVariant}>{currencySymbol(settings.base).trim()}</AppText>
                  <AppTextInput
                    value={draft.price}
                    onChangeText={(t) => setDraft({ ...draft, price: t.replace(/[^0-9.,]/g, "").slice(0, 12) })}
                    placeholder={settings.base === "usd" ? "8,50" : settings.base === "bs" ? "7.500" : "28.000"}
                    keyboardType="decimal-pad"
                    style={{ ...inputStyle(C), flex: 1 }}
                  />
                </View>
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
                <View style={{ borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
                  {[...sectionChoices, OTHER].map((n, idx) => {
                    const on = draft.section === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setDraft({ ...draft, section: n })}
                        android_ripple={{ color: C.outlineVariant }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.outlineVariant }}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.primary : C.outline, alignItems: "center", justifyContent: "center" }}>
                          {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} />}
                        </View>
                        <AppText variant={on ? "bodyStrong" : "body"} style={{ flex: 1 }}>{n === OTHER ? "Otra sección…" : n}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
                {draft.section === OTHER && (
                  <AppTextInput value={draft.customSection} onChangeText={(t) => setDraft({ ...draft, customSection: t.slice(0, 40) })} placeholder="Nombre de la sección" style={inputStyle(C)} />
                )}
              </View>

              <View style={{ gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">Disponible</AppText>
                    <AppText variant="caption" color={C.outline}>Apágalo cuando se agote.</AppText>
                  </View>
                  <Switch value={draft.available} onValueChange={(v) => setDraft({ ...draft, available: v })} trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }} thumbColor={draft.available ? C.primary : C.outline} />
                </View>

                <View style={{ height: 1, backgroundColor: C.outlineVariant }} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">Plato del día</AppText>
                    <AppText variant="caption" color={C.outline}>Sale destacado arriba y avisamos a quienes te siguen.</AppText>
                  </View>
                  <Switch value={draft.special} onValueChange={(v) => setDraft({ ...draft, special: v })} trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }} thumbColor={draft.special ? C.primary : C.outline} />
                </View>

                {draft.special && (
                  <>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Chip label="Solo hoy" active={!draft.keep} onPress={() => setDraft({ ...draft, keep: false })} />
                      <Chip label="Mantener" active={draft.keep} onPress={() => setDraft({ ...draft, keep: true })} />
                    </View>
                    <AppText variant="caption" color={C.outline}>
                      {draft.keep ? "Se queda como plato del día hasta que lo quites." : "Vence a la medianoche. Mañana lo marcas de nuevo si quieres renovarlo."}
                    </AppText>
                  </>
                )}
              </View>

              {draft.id && (
                <Pressable onPress={confirmDelete} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 }}>
                  <Icon name="delete-outline" size={18} color={C.error} />
                  <AppText variant="label" color={C.error}>Eliminar plato</AppText>
                </Pressable>
              )}
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
