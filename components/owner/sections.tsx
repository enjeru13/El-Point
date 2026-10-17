import { EditBar, SectionCard } from "@/components/owner/SectionShell";
import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { TimePickerSheet, type TimePickerHandle } from "@/components/ui/TimePickerSheet";
import { DAY_LABELS, DAY_LABELS_LONG, DEFAULT_HOURS, OPEN_24H, caracasToday, groupDays, is24h, to12h, type Hours } from "@/lib/hours";
import { activePromo, PROMO_DURATIONS, promoEndLabel, promoEndsAt, type PromoDuration } from "@/lib/promo";
import { useAmenities } from "@/lib/queries/amenities";
import {
  useUpdateMyRestaurant,
  useUpdateRestaurantAmenities,
  useUpdateRestaurantPaymentMethods,
  type OwnerRestaurant,
} from "@/lib/queries/owner";
import { usePaymentMethods } from "@/lib/queries/paymentMethods";
import { uploadRestaurantImage } from "@/lib/storage";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";

// ─── Horario ─────────────────────────────────────────────────────────────────

export function HoursSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState<Hours>(restaurant.hours ?? DEFAULT_HOURS);
  const timePickerRef = useRef<TimePickerHandle>(null);
  const closedToday = restaurant.closed_today_date === caracasToday();

  useEffect(() => {
    if (!editing) setHours(restaurant.hours ?? DEFAULT_HOURS);
  }, [restaurant.hours, editing]);

  function setDay(dow: number, patch: Partial<Hours["days"][number]>) {
    setHours((h) => ({ days: h.days.map((d, i) => (i === dow ? { ...d, ...patch } : d)) }));
  }

  /** Copia el horario del lunes a otros días, para no tocar 14 horas una por una. */
  function copyMonday(target: number[]) {
    setHours((h) => {
      const mon = h.days[1];
      return { days: h.days.map((d, i) => (target.includes(i) ? { ...mon } : d)) };
    });
  }

  function openTimePicker(dow: number, which: "open" | "close") {
    const d = hours.days[dow];
    timePickerRef.current?.present({
      title: `${DAY_LABELS_LONG[dow]} · ${which === "open" ? "abre" : "cierra"}`,
      value: d[which],
      onPick: (hhmm) => setDay(dow, { [which]: hhmm }),
    });
  }

  function save() {
    const bad = hours.days.some((d) => !d.closed && (!/^\d{1,2}:\d{2}$/.test(d.open) || !/^\d{1,2}:\d{2}$/.test(d.close)));
    if (bad) return toast.error("Horario inválido. Usa el formato HH:MM (ej. 12:00).");
    updateMut.mutate(
      { hours },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success("Horario guardado");
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  }

  function toggleClosedToday(v: boolean) {
    updateMut.mutate(
      { closed_today_date: v ? caracasToday() : null },
      {
        onSuccess: () => toast.success(v ? "Hoy aparece como cerrado" : "Hoy vuelve a aparecer abierto"),
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  }

  const groups = groupDays(hours);

  return (
    <>
      {/* Hoy no abrimos */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, backgroundColor: closedToday ? C.error + "14" : C.surface, borderWidth: 1, borderColor: closedToday ? C.error + "55" : C.border }}>
        <Icon name={closedToday ? "store-off-outline" : "store-clock-outline"} size={22} color={closedToday ? C.error : C.primary} />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyStrong">Hoy no abrimos</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            {closedToday ? "Hoy aparece como cerrado. Mañana vuelve a su horario solo." : "Para un imprevisto o un feriado. Se desactiva solo a medianoche."}
          </AppText>
        </View>
        <Switch
          value={closedToday}
          onValueChange={toggleClosedToday}
          disabled={updateMut.isPending}
          trackColor={{ false: C.surfaceContainerHighest, true: C.error + "88" }}
          thumbColor={closedToday ? C.error : C.outline}
        />
      </View>

      {/* Semana */}
      {!editing ? (
        <SectionCard title="Horario semanal">
          <View style={{ paddingHorizontal: 18, paddingVertical: 8 }}>
            {groups.map((g, idx) => (
              <View key={g.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.outlineVariant }}>
                <AppText variant="bodyStrong" style={{ width: 72 }}>{g.label}</AppText>
                <AppText variant="body" color={g.range === "Cerrado" ? C.outline : C.onSurface} style={{ flex: 1, textAlign: "right" }}>{g.range}</AppText>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>COPIAR EL HORARIO DEL LUNES</AppText>
            <View style={{ borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {[
                { label: "A lunes–viernes", days: [2, 3, 4, 5] },
                { label: "A toda la semana", days: [0, 2, 3, 4, 5, 6] },
              ].map((a, idx) => (
                <Pressable
                  key={a.label}
                  onPress={() => copyMonday(a.days)}
                  android_ripple={{ color: C.outlineVariant }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.outlineVariant }}
                >
                  <Icon name="content-copy" size={18} color={C.primary} />
                  <AppText variant="body" style={{ flex: 1 }}>{a.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <SectionCard title="Horario semanal">
            <View style={{ padding: 14, gap: 10 }}>
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const d = hours.days[dow];
                const all = is24h(d);
                return (
                  <View key={dow} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AppText variant="label" style={{ width: 38, fontFamily: "PlusJakartaSans_700Bold" }}>{DAY_LABELS[dow]}</AppText>
                    <Switch
                      value={!d.closed}
                      onValueChange={(v) => setDay(dow, { closed: !v })}
                      trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                      thumbColor={!d.closed ? C.primary : C.outline}
                    />
                    {d.closed ? (
                      <AppText variant="bodySm" color={C.outline} style={{ flex: 1 }}>Cerrado</AppText>
                    ) : all ? (
                      <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1 }}>Las 24 horas</AppText>
                    ) : (
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Pressable
                          onPress={() => openTimePicker(dow, "open")}
                          style={{ flex: 1, backgroundColor: C.surfaceContainerLow, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 8, alignItems: "center" }}
                        >
                          <AppText variant="label" style={{ fontSize: 13 }}>{to12h(d.open)}</AppText>
                        </Pressable>
                        <AppText variant="bodySm" color={C.outline}>–</AppText>
                        <Pressable
                          onPress={() => openTimePicker(dow, "close")}
                          style={{ flex: 1, backgroundColor: C.surfaceContainerLow, borderRadius: 10, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 8, alignItems: "center" }}
                        >
                          <AppText variant="label" style={{ fontSize: 13 }}>{to12h(d.close)}</AppText>
                        </Pressable>
                      </View>
                    )}
                    {!d.closed && (
                      <Pressable
                        onPress={() => setDay(dow, all ? { open: "12:00", close: "22:00" } : { ...OPEN_24H })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 99,
                          borderWidth: 1,
                          borderColor: all ? C.primary : C.outlineVariant,
                          backgroundColor: all ? C.primary : C.surface,
                        }}
                      >
                        <AppText variant="caption" color={all ? "#fff" : C.onSurfaceVariant} style={{ fontSize: 12 }}>24 h</AppText>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </SectionCard>
        </>
      )}

      <EditBar editing={editing} saving={updateMut.isPending} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />
      <TimePickerSheet ref={timePickerRef} />
    </>
  );
}

// ─── Promoción ───────────────────────────────────────────────────────────────

export function PromoSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C, shadow } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const active = activePromo(restaurant);
  const [editing, setEditing] = useState(false);
  const [promo, setPromo] = useState("");
  const [duration, setDuration] = useState<PromoDuration | "keep">("7d");

  function startEdit() {
    setPromo(active ?? "");
    // Una promo vigente se deja como está salvo que el dueño elija otra fecha; una nueva dura 1 semana.
    setDuration(active ? "keep" : "7d");
    setEditing(true);
  }

  function save() {
    const text = promo.trim();
    const patch: { promo_text: string | null; promo_ends_at?: string | null } = { promo_text: text || null };
    if (!text) patch.promo_ends_at = null;
    else if (duration !== "keep") patch.promo_ends_at = promoEndsAt(duration);
    updateMut.mutate(patch, {
      onSuccess: () => {
        setEditing(false);
        toast.success(text ? "Promoción publicada" : "Promoción quitada");
      },
      onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
    });
  }

  function remove() {
    Alert.alert("Quitar la promoción", "Dejará de verse ya. No avisamos a nadie por quitarla.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: () =>
          updateMut.mutate(
            { promo_text: null, promo_ends_at: null },
            { onSuccess: () => toast.success("Promoción quitada"), onError: (e: any) => toast.error(e?.message ?? "No se pudo quitar") },
          ),
      },
    ]);
  }

  const shownText = editing ? promo.trim() : active;
  const endLabel = editing ? (duration === "keep" ? promoEndLabel(restaurant.promo_ends_at) : promoEndLabel(promoEndsAt(duration))) : promoEndLabel(restaurant.promo_ends_at);
  const changed = promo.trim() !== (active ?? "");

  const options: { key: PromoDuration | "keep"; label: string; sub?: string }[] = [
    ...(active ? [{ key: "keep" as const, label: "Dejar como está", sub: promoEndLabel(restaurant.promo_ends_at) }] : []),
    ...PROMO_DURATIONS.map((d) => ({ key: d.key, label: d.key === "7d" ? "1 semana" : d.label })),
  ];

  const IDEAS = ["2x1 en …", "10 % de descuento en …", "Combo familiar por …"];

  return (
    <>
      {/* Cómo se ve */}
      <View style={{ gap: 8 }}>
        <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>{editing ? "ASÍ SE VERÁ" : "TU PROMOCIÓN"}</AppText>
        {shownText ? (
          <View
            style={{
              padding: 14,
              borderRadius: 16,
              gap: 4,
              backgroundColor: C.primary + "1f",
              borderWidth: 1,
              borderColor: C.primary + "40",
              borderLeftWidth: 6,
              borderLeftColor: C.primary,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="tag" size={14} color={C.primary} />
              <AppText variant="overline" color={C.primary}>PROMOS</AppText>
            </View>
            <AppText variant="bodyStrong">{shownText}</AppText>
            <AppText variant="caption" color={C.onSurfaceVariant}>{endLabel}</AppText>
          </View>
        ) : (
          <View style={{ padding: 18, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, gap: 4 }}>
            <AppText variant="bodyStrong">Sin promoción activa</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              Una promo sale en tu perfil, en el Inicio y en Buscar, y avisamos a quienes te tienen en favoritos.
            </AppText>
          </View>
        )}
      </View>

      {editing && (
        <>
          <SectionCard title="Texto de la promoción">
            <View style={{ padding: 18, gap: 6 }}>
              <AppTextInput value={promo} onChangeText={(t) => setPromo(t.slice(0, 80))} placeholder="Ej. 2x1 en hamburguesas los martes" maxLength={80} style={{ fontSize: 14 }} />
              <AppText variant="caption" color={C.outline} align="right" style={{ fontSize: 12 }}>{promo.length}/80</AppText>
            </View>
          </SectionCard>

          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>IDEAS PARA EMPEZAR</AppText>
            <View style={{ borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {IDEAS.map((idea, idx) => (
                <Pressable
                  key={idea}
                  onPress={() => setPromo(idea)}
                  android_ripple={{ color: C.outlineVariant }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.outlineVariant }}
                >
                  <Icon name="lightbulb-outline" size={18} color={C.primary} />
                  <AppText variant="body" style={{ flex: 1 }}>{idea}</AppText>
                  <Icon name="plus" size={16} color={C.outline} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>¿HASTA CUÁNDO?</AppText>
            <View style={{ borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...shadow.sm }}>
              {options.map((o, idx) => {
                const on = duration === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => setDuration(o.key)}
                    android_ripple={{ color: C.outlineVariant }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: C.outlineVariant }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.primary : C.outline, alignItems: "center", justifyContent: "center" }}>
                      {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant={on ? "bodyStrong" : "body"}>{o.label}</AppText>
                      {!!o.sub && <AppText variant="caption" color={C.outline}>{o.sub}</AppText>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" color={C.outline}>
              Al llegar la fecha, la promo desaparece sola. Con “Sin fecha” se queda hasta que la quites.
            </AppText>
          </View>

          {(!active || changed) && !!promo.trim() && (
            <AppText variant="caption" color={C.onSurfaceVariant}>
              Al guardar avisamos a las personas que tienen tu local en favoritos.
            </AppText>
          )}
        </>
      )}

      <EditBar editing={editing} saving={updateMut.isPending} onEdit={startEdit} onCancel={() => setEditing(false)} onSave={save} />

      {!editing && !!active && (
        <Pressable onPress={remove} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}>
          <Icon name="delete-outline" size={18} color={C.error} />
          <AppText variant="label" color={C.error}>Quitar la promoción</AppText>
        </Pressable>
      )}
    </>
  );
}

// ─── Pedidos por WhatsApp ────────────────────────────────────────────────────

export function OrdersSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [accepts, setAccepts] = useState(restaurant.accepts_orders);
  const [greeting, setGreeting] = useState(restaurant.order_greeting ?? "");

  useEffect(() => {
    if (!editing) {
      setAccepts(restaurant.accepts_orders);
      setGreeting(restaurant.order_greeting ?? "");
    }
  }, [restaurant.accepts_orders, restaurant.order_greeting, editing]);

  function save() {
    updateMut.mutate(
      { accepts_orders: accepts, order_greeting: greeting.trim() ? greeting.trim().slice(0, 200) : null },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success("Cambios guardados");
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  }

  const defaultMsg = `Hola, quiero hacer un pedido en ${restaurant.name}. Te encontré en El Point.`;

  return (
    <>
      <SectionCard title="Pedidos por WhatsApp">
        <View style={{ padding: 18, gap: 14 }}>
          {restaurant.ghost_kitchen ? (
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              Tu cocina fantasma siempre muestra el botón “Pedir”. Aquí puedes personalizar el saludo.
            </AppText>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Recibo pedidos por WhatsApp</AppText>
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  Tu fila de WhatsApp dice “Pedir por WhatsApp” y abre el chat con el mensaje listo.
                </AppText>
              </View>
              <Switch
                value={accepts}
                disabled={!editing}
                onValueChange={setAccepts}
                trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                thumbColor={accepts ? C.primary : C.outline}
              />
            </View>
          )}

          {(restaurant.ghost_kitchen || accepts) && (
            <View style={{ gap: 6 }}>
              <AppText variant="overline" color={C.outline}>SALUDO DEL MENSAJE</AppText>
              {editing ? (
                <>
                  <AppTextInput
                    value={greeting}
                    onChangeText={(t) => setGreeting(t.slice(0, 200))}
                    placeholder={defaultMsg}
                    multiline
                    style={{
                      fontSize: 14,
                      minHeight: 64,
                      textAlignVertical: "top",
                      backgroundColor: C.surfaceContainerLow,
                      borderWidth: 1,
                      borderColor: C.outlineVariant,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  />
                  <AppText variant="caption" color={C.outline} align="right" style={{ fontSize: 12 }}>
                    {greeting.length}/200 · vacío usa el mensaje por defecto
                  </AppText>
                </>
              ) : (
                <AppText variant="bodySm" color={restaurant.order_greeting ? C.onSurface : C.outline}>
                  {restaurant.order_greeting ?? defaultMsg}
                </AppText>
              )}
            </View>
          )}
        </View>
      </SectionCard>
      <EditBar editing={editing} saving={updateMut.isPending} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />
    </>
  );
}

// ─── Comodidades ─────────────────────────────────────────────────────────────

export function AmenitiesSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const amenitiesQ = useAmenities();
  const saveMut = useUpdateRestaurantAmenities(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [ids, setIds] = useState<Set<number>>(new Set(restaurant.amenities.map((a) => a.id)));

  useEffect(() => {
    if (!editing) setIds(new Set(restaurant.amenities.map((a) => a.id)));
  }, [restaurant.amenities, editing]);

  function toggle(id: number) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    saveMut.mutate(Array.from(ids), {
      onSuccess: () => {
        setEditing(false);
        toast.success("Comodidades guardadas");
      },
      onError: (e: any) => toast.error(e?.message ?? "No se pudieron guardar"),
    });
  }

  return (
    <>
      <SectionCard title="Comodidades">
        <View style={{ padding: 18 }}>
          {editing ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(amenitiesQ.data ?? []).map((am) => (
                <Chip key={am.id} label={am.label} icon={am.icon} tone="secondary" active={ids.has(am.id)} onPress={() => toggle(am.id)} />
              ))}
            </View>
          ) : restaurant.amenities.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {restaurant.amenities.map((a) => (
                <View key={a.slug} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.border }}>
                  <Icon name={a.icon} size={14} color={C.onSurface} />
                  <AppText variant="label">{a.label}</AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="bodySm" color={C.outline}>Aún no marcaste comodidades. Toca “Editar” para agregar.</AppText>
          )}
        </View>
      </SectionCard>
      <EditBar editing={editing} saving={saveMut.isPending} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />
    </>
  );
}

// ─── Métodos de pago ─────────────────────────────────────────────────────────

export function PaymentsSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const catalogQ = usePaymentMethods();
  const saveMut = useUpdateRestaurantPaymentMethods(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [ids, setIds] = useState<Set<number>>(new Set(restaurant.payment_methods.map((p) => p.id)));

  useEffect(() => {
    if (!editing) setIds(new Set(restaurant.payment_methods.map((p) => p.id)));
  }, [restaurant.payment_methods, editing]);

  const allIds = (catalogQ.data ?? []).map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => ids.has(id));

  function toggle(id: number) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    saveMut.mutate(Array.from(ids), {
      onSuccess: () => {
        setEditing(false);
        toast.success("Métodos de pago guardados");
      },
      onError: (e: any) => toast.error(e?.message ?? "No se pudieron guardar"),
    });
  }

  return (
    <>
      <SectionCard title="Métodos de pago">
        <View style={{ padding: 18 }}>
          {editing ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label="Todos" icon="mdi:check-all" tone="secondary" active={allSelected} onPress={() => setIds(allSelected ? new Set() : new Set(allIds))} />
              {(catalogQ.data ?? []).map((pm) => (
                <Chip key={pm.id} label={pm.label} icon={pm.icon} tone="secondary" active={ids.has(pm.id)} onPress={() => toggle(pm.id)} />
              ))}
            </View>
          ) : restaurant.payment_methods.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(allIds.length > 0 && restaurant.payment_methods.length === allIds.length
                ? [{ slug: "all", label: "Todos los métodos de pago", icon: "mdi:check-all" }]
                : restaurant.payment_methods
              ).map((p) => (
                <View key={p.slug} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: C.secondaryContainer, borderWidth: 1, borderColor: C.border }}>
                  <Icon name={p.icon} size={14} color={C.onSurface} />
                  <AppText variant="label">{p.label}</AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="bodySm" color={C.outline}>Aún no indicaste cómo pueden pagarte. Toca “Editar” para agregar.</AppText>
          )}
        </View>
      </SectionCard>
      <EditBar editing={editing} saving={saveMut.isPending} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />
    </>
  );
}

// ─── Fotos y menú en PDF ─────────────────────────────────────────────────────

/** Pregunta cámara o galería (mismo patrón que ReviewSheet.addPhotos). */
function pickImageSource(options: ImagePicker.ImagePickerOptions, onDenied: () => void): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert("Agregar foto", undefined, [
      {
        text: "Tomar foto",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            onDenied();
            resolve(null);
            return;
          }
          const r = await ImagePicker.launchCameraAsync(options);
          resolve(r.canceled ? null : r.assets[0].uri);
        },
      },
      {
        text: "Elegir de galería",
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync(options);
          resolve(r.canceled ? null : r.assets[0].uri);
        },
      },
      { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

export function PhotosSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  async function pickPhoto(kind: "logo" | "cover") {
    const uri = await pickImageSource(
      { mediaTypes: ["images"], allowsEditing: true, aspect: kind === "cover" ? [16, 9] : [1, 1], quality: 0.85 },
      () => toast.error("Permiso de cámara denegado"),
    );
    if (!uri) return;
    setUploading(kind);
    try {
      const url = await uploadRestaurantImage(restaurant.id, kind, uri);
      updateMut.mutate(kind === "logo" ? { logo_url: url } : { cover_url: url });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir la imagen");
    } finally {
      setUploading(null);
    }
  }

  return (
    <SectionCard title="Fotos">
      {/* Portada */}
      <View style={{ padding: 18, gap: 8, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
        <AppText variant="overline" color={C.outline}>FOTO DE PORTADA</AppText>
        <AppText variant="caption" color={C.onSurfaceVariant}>Se muestra grande arriba de tu perfil.</AppText>
        <Pressable
          onPress={() => pickPhoto("cover")}
          disabled={uploading !== null}
          style={{
            marginTop: 4,
            height: 150,
            borderRadius: 14,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: C.border,
            borderStyle: restaurant.cover_url ? "solid" : "dashed",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.surfaceContainerLow,
          }}
        >
          {restaurant.cover_url ? (
            <Image source={{ uri: restaurant.cover_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View style={{ alignItems: "center", gap: 6 }}>
              <Icon name="camera-plus-outline" size={28} color={C.primary} />
              <AppText variant="label" color={C.onSurfaceVariant}>Elegir foto</AppText>
            </View>
          )}
          {restaurant.cover_url && uploading !== "cover" && (
            <View style={{ position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
              <Icon name="camera-plus-outline" size={12} color={C.onSurface} />
              <AppText variant="caption" color={C.onSurface} style={{ fontSize: 11 }}>Cambiar</AppText>
            </View>
          )}
          {uploading === "cover" && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </Pressable>
      </View>

      {/* Logo */}
      <Pressable
        onPress={() => pickPhoto("logo")}
        disabled={uploading !== null}
        style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: C.border,
            borderStyle: restaurant.logo_url ? "solid" : "dashed",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.primaryFixed,
          }}
        >
          {restaurant.logo_url ? (
            <Image source={{ uri: restaurant.logo_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Icon name="image-plus" size={22} color={C.primary} />
          )}
          {uploading === "logo" && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Logo del local</AppText>
          <AppText variant="caption" color={C.outline} style={{ fontSize: 12, marginTop: 1 }}>
            {restaurant.logo_url ? "Toca para cambiarlo" : "Aparece junto a tu nombre"}
          </AppText>
        </View>
        <Icon name="chevron-right" size={18} color={C.outline} />
      </Pressable>
    </SectionCard>
  );
}
