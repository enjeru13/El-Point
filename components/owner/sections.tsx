import { EditBar, SectionCard } from "@/components/owner/SectionShell";
import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { TimePickerSheet, type TimePickerHandle } from "@/components/ui/TimePickerSheet";
import { DAY_LABELS, DAY_LABELS_LONG, DEFAULT_HOURS, formatRange, to12h, type Hours } from "@/lib/hours";
import { useAmenities } from "@/lib/queries/amenities";
import {
  useUpdateMyRestaurant,
  useUpdateRestaurantAmenities,
  useUpdateRestaurantPaymentMethods,
  type OwnerRestaurant,
} from "@/lib/queries/owner";
import { usePaymentMethods } from "@/lib/queries/paymentMethods";
import { uploadRestaurantImage, uploadRestaurantMenu } from "@/lib/storage";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import * as DocumentPicker from "expo-document-picker";
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

  useEffect(() => {
    if (!editing) setHours(restaurant.hours ?? DEFAULT_HOURS);
  }, [restaurant.hours, editing]);

  function setDay(dow: number, patch: Partial<Hours["days"][number]>) {
    setHours((h) => ({ days: h.days.map((d, i) => (i === dow ? { ...d, ...patch } : d)) }));
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

  return (
    <>
      <SectionCard title="Horario">
        <View style={{ padding: 14, gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const d = hours.days[dow];
            return (
              <View key={dow} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AppText variant="label" style={{ width: 40, fontFamily: "PlusJakartaSans_700Bold" }}>
                  {DAY_LABELS[dow]}
                </AppText>
                {editing ? (
                  <>
                    <Switch
                      value={!d.closed}
                      onValueChange={(v) => setDay(dow, { closed: !v })}
                      trackColor={{ false: C.surfaceContainerHighest, true: C.primaryContainer }}
                      thumbColor={!d.closed ? C.primary : C.outline}
                    />
                    {d.closed ? (
                      <AppText variant="bodySm" color={C.outline} style={{ flex: 1 }}>Cerrado</AppText>
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
                  </>
                ) : (
                  <AppText variant="label" color={d.closed ? C.outline : C.onSurfaceVariant} style={{ flex: 1 }}>
                    {formatRange(d)}
                  </AppText>
                )}
              </View>
            );
          })}
        </View>
      </SectionCard>
      <EditBar editing={editing} saving={updateMut.isPending} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />
      <TimePickerSheet ref={timePickerRef} />
    </>
  );
}

// ─── Promoción ───────────────────────────────────────────────────────────────

export function PromoSection({ restaurant }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const toast = useToast();
  const updateMut = useUpdateMyRestaurant(restaurant.id);
  const [editing, setEditing] = useState(false);
  const [promo, setPromo] = useState(restaurant.promo_text ?? "");

  useEffect(() => {
    if (!editing) setPromo(restaurant.promo_text ?? "");
  }, [restaurant.promo_text, editing]);

  function save() {
    updateMut.mutate(
      { promo_text: promo.trim() || null },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(promo.trim() ? "Promoción publicada" : "Promoción quitada");
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  }

  return (
    <>
      <SectionCard title="Oferta / promoción">
        <View style={{ padding: 18, gap: 6 }}>
          {editing ? (
            <>
              <AppTextInput value={promo} onChangeText={setPromo} placeholder="Ej. 2x1 en hamburguesas los martes" maxLength={80} style={{ fontSize: 14 }} />
              <AppText variant="caption" color={C.outline} align="right" style={{ fontSize: 12 }}>{promo.length}/80</AppText>
            </>
          ) : restaurant.promo_text ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="tag" size={16} color={C.primary} />
              <AppText variant="bodyStrong" style={{ flex: 1, fontSize: 14 }}>{restaurant.promo_text}</AppText>
            </View>
          ) : (
            <AppText variant="bodySm" color={C.outline}>Sin promoción activa. Toca “Editar” para publicar una.</AppText>
          )}
        </View>
      </SectionCard>
      <AppText variant="caption" color={C.outline}>
        Al publicar o cambiar la promo avisamos a quienes tienen tu local en favoritos.
      </AppText>
      <EditBar editing={editing} saving={updateMut.isPending} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />
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
  const [uploading, setUploading] = useState<"logo" | "cover" | "menu" | null>(null);

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

  async function pickMenu() {
    const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (r.canceled) return;
    setUploading("menu");
    try {
      const url = await uploadRestaurantMenu(restaurant.id, r.assets[0].uri);
      updateMut.mutate({ menu_pdf_url: url });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir el menú");
    } finally {
      setUploading(null);
    }
  }

  return (
    <SectionCard title="Fotos y menú en PDF">
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
        style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}
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

      {/* Menú PDF */}
      <Pressable onPress={pickMenu} disabled={uploading !== null} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: restaurant.menu_pdf_url ? C.primary : C.primaryFixed,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          {uploading === "menu" ? (
            <ActivityIndicator size="small" color={restaurant.menu_pdf_url ? "#fff" : C.primary} />
          ) : (
            <Icon name={restaurant.menu_pdf_url ? "file-check" : "file-pdf-box"} size={24} color={restaurant.menu_pdf_url ? "#fff" : C.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Menú (PDF)</AppText>
          <AppText variant="caption" color={C.outline} style={{ fontSize: 12, marginTop: 1 }}>
            {restaurant.menu_pdf_url ? "Cargado · toca para reemplazar" : "Sube tu carta para los clientes"}
          </AppText>
        </View>
        <Icon name="chevron-right" size={18} color={C.outline} />
      </Pressable>
    </SectionCard>
  );
}
