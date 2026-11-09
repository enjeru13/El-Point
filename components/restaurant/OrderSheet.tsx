import { DeliveryLocationModal } from "@/components/restaurant/DeliveryLocationModal";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { whatsappUrl } from "@/lib/contact";
import { convertAmount, formatMoney, type Cur, type Rates } from "@/lib/money";
import {
  buildOrderMessage,
  canSend,
  cartCount,
  cartTotal,
  fulfillmentOptions,
  pruneCart,
  type Delivery,
  type Fulfillment,
  type LatLng,
  type MenuLine,
} from "@/lib/order";
import { useCart, useLastDelivery } from "@/lib/orderCart";
import { useTheme } from "@/lib/ThemeContext";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { useToast } from "@/lib/toast";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface OrderSheetHandle {
  present: () => void;
}

type Props = {
  restaurantId: string;
  restaurantName: string;
  greeting: string | null;
  whatsapp: string | null;
  base: Cur;
  shown: Cur[];
  rates: Rates;
  currency: Cur;
  menu: MenuLine[];
  delivery: Delivery | null;
  hasDelivery: boolean;
  hasTakeaway: boolean;
  /** Abre el enlace de WhatsApp y registra el evento "order". */
  onSend: (url: string) => void;
};

/** Hoja del pedido: platos, entrega, ubicación, nota, total y "Enviar pedido por WhatsApp". */
export const OrderSheet = forwardRef<OrderSheetHandle, Props>((p, ref) => {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const cart = useCart(p.restaurantId);
  const last = useLastDelivery();
  const toast = useToast();

  const options = fulfillmentOptions(p.hasDelivery, p.hasTakeaway);
  const [chosen, setChosen] = useState<Fulfillment>(null);
  const fulfillment: Fulfillment = options.length === 1 ? options[0] : chosen;
  const [location, setLocation] = useState<LatLng | null>(null);
  const [references, setReferences] = useState("");
  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);

  // El último punto y las referencias del teléfono, una sola vez al cargar.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !last.value) return;
    seeded.current = true;
    setLocation({ lat: last.value.lat, lng: last.value.lng });
    setReferences(last.value.references);
  }, [last.value]);

  useImperativeHandle(ref, () => ({ present: () => sheetRef.current?.present() }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const items = useMemo(() => pruneCart(cart.items, p.menu), [cart.items, p.menu]);
  const byId = useMemo(() => new Map(p.menu.map((m) => [m.id, m])), [p.menu]);
  const total = cartTotal(items, p.menu, p.delivery, fulfillment);
  const inCurrency = (v: number) => {
    const c = convertAmount(v, p.base, p.currency, p.rates);
    return c == null ? formatMoney(v, p.base, true) : formatMoney(c, p.currency, p.currency === p.base);
  };
  // Equivalencias del total en las demás monedas (la base va exacta).
  const eqParts = [p.base, ...p.shown]
    .filter((c, i, all) => all.indexOf(c) === i && c !== p.currency)
    .map((c) => {
      const v = convertAmount(total, p.base, c, p.rates);
      return v == null ? null : formatMoney(v, c, c === p.base);
    })
    .filter((x): x is string => !!x);
  const eq = eqParts.length ? `≈ ${eqParts.join(" · ")}` : "";

  const sendable = canSend({ cartCount: cartCount(items), options, chosen: fulfillment, location });
  const fee = p.delivery?.mode === "fixed" && p.delivery.fee ? p.delivery.fee : null;

  function send() {
    const text = buildOrderMessage({
      restaurantName: p.restaurantName,
      greeting: p.greeting,
      base: p.base,
      shown: p.shown,
      rates: p.rates,
      cart: items,
      menu: p.menu,
      delivery: p.delivery,
      fulfillment,
      location: fulfillment === "delivery" ? location : null,
      references,
      note,
    });
    const url = whatsappUrl(p.whatsapp, text);
    if (!url) {
      toast.error("El WhatsApp de este local no es válido.");
      return;
    }
    if (fulfillment === "delivery" && location) last.save({ ...location, references: references.trim() });
    sheetRef.current?.dismiss();
    p.onSend(url);
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    color: C.onSurface,
  } as const;

  const stepBtn = {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: C.primaryContainer,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <>
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        handleIndicatorStyle={{ backgroundColor: C.outlineVariant, width: 44 }}
        backgroundStyle={{ backgroundColor: C.surface, borderRadius: 28, borderWidth: 1, borderColor: C.border }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 16 }}>
          <AppText variant="heading">Tu pedido · {p.restaurantName}</AppText>

          {items.length === 0 ? (
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              Tu pedido está vacío. Agrega platos desde el menú.
            </AppText>
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((c) => {
                const m = byId.get(c.id)!;
                return (
                  <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable onPress={() => cart.remove(c.id)} hitSlop={6} accessibilityLabel={`Quitar uno de ${m.name}`} style={stepBtn}>
                        <Icon name="minus" size={14} color={C.primaryContainer} />
                      </Pressable>
                      <AppText variant="bodyStrong" style={{ minWidth: 14, textAlign: "center" }}>
                        {c.qty}
                      </AppText>
                      <Pressable onPress={() => cart.add(c.id)} hitSlop={6} accessibilityLabel={`Agregar otro ${m.name}`} style={stepBtn}>
                        <Icon name="plus" size={14} color={C.primaryContainer} />
                      </Pressable>
                    </View>
                    <AppText variant="body" style={{ flex: 1 }} numberOfLines={2}>
                      {m.name}
                    </AppText>
                    <AppText variant="bodyStrong">{inCurrency(m.price * c.qty)}</AppText>
                  </View>
                );
              })}
            </View>
          )}

          {options.length === 2 && (
            <View style={{ gap: 8 }}>
              <AppText variant="overline" color={C.outline}>
                ¿CÓMO LO QUIERES?
              </AppText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {options.map((o) => {
                  const on = chosen === o;
                  return (
                    <Pressable
                      key={o}
                      onPress={() => setChosen(o)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        paddingVertical: 12,
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: on ? C.primary : C.outlineVariant,
                        backgroundColor: on ? C.primary + "14" : "transparent",
                      }}
                    >
                      <Icon name={o === "delivery" ? "bike" : "shopping-bag"} size={16} color={on ? C.primary : C.onSurfaceVariant} />
                      <AppText variant="bodyStrong" color={on ? C.primary : C.onSurface}>
                        {o === "delivery" ? "Delivery" : "Paso a buscarlo"}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          {options.length === 1 && (
            <AppText variant="bodyStrong">Entrega: {options[0] === "delivery" ? "Delivery" : "Paso a buscarlo"}</AppText>
          )}

          {fulfillment === "delivery" && (
            <View style={{ gap: 10 }}>
              {location ? (
                <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.outlineVariant }}>
                  <MapView
                    key={`${location.lat},${location.lng}`}
                    style={{ height: 120 }}
                    pointerEvents="none"
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    liteMode
                    initialRegion={{ latitude: location.lat, longitude: location.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
                  >
                    <Marker coordinate={{ latitude: location.lat, longitude: location.lng }} pinColor={C.primary} />
                  </MapView>
                  <Pressable
                    onPress={() => {
                    Keyboard.dismiss();
                    setPicking(true);
                  }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: C.surfaceContainerLow }}
                  >
                    <Icon name="map-marker" size={16} color={C.primary} />
                    <AppText variant="bodyStrong" style={{ flex: 1 }}>
                      Ubicación de entrega
                    </AppText>
                    <AppText variant="bodyStrong" color={C.primary}>
                      Cambiar
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setPicking(true);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: C.primary,
                  }}
                >
                  <Icon name="map-marker" size={18} color={C.primary} />
                  <AppText variant="bodyStrong" color={C.primary}>
                    Elegir ubicación de entrega
                  </AppText>
                </Pressable>
              )}
              <BottomSheetTextInput
                value={references}
                onChangeText={setReferences}
                placeholder="Referencias: casa azul, al lado de la panadería, piso 2"
                placeholderTextColor={C.outline + "99"}
                maxLength={160}
                style={inputStyle}
              />
              <AppText variant="bodySm" color={C.onSurfaceVariant}>
                {fee ? `Delivery ${inCurrency(fee)}` : "+ delivery según tu zona, el local te confirma"}
              </AppText>
            </View>
          )}

          <BottomSheetTextInput
            value={note}
            onChangeText={setNote}
            placeholder="Nota para el local (opcional)"
            placeholderTextColor={C.outline + "99"}
            maxLength={300}
            multiline
            style={[inputStyle, { minHeight: 48 }]}
          />

          <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: C.outlineVariant, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <AppText variant="heading" style={{ flex: 1 }}>
                Total
              </AppText>
              <AppText variant="heading">{inCurrency(total)}</AppText>
            </View>
            {!!eq && (
              <AppText variant="caption" color={C.onSurfaceVariant} style={{ textAlign: "right" }}>
                {eq}
              </AppText>
            )}
          </View>

          <Pressable
            onPress={send}
            disabled={!sendable}
            accessibilityRole="button"
            accessibilityState={{ disabled: !sendable }}
            style={{
              height: 54,
              borderRadius: 16,
              backgroundColor: sendable ? "#1fa855" : C.surfaceContainerHigh,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="whatsapp" size={20} color={sendable ? "#fff" : C.outline} />
            <AppText variant="bodyStrong" color={sendable ? "#fff" : C.outline}>
              Enviar pedido por WhatsApp
            </AppText>
          </Pressable>
          {!sendable && items.length > 0 && (
            <AppText variant="caption" color={C.onSurfaceVariant} style={{ textAlign: "center" }}>
              {options.length === 2 && !chosen
                ? "Elige si pasas a buscarlo o es delivery."
                : "Elige la ubicación de entrega."}
            </AppText>
          )}

          {items.length > 0 && (
            <Pressable onPress={cart.clear} hitSlop={8} style={{ alignSelf: "center" }}>
              <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                Vaciar pedido
              </AppText>
            </Pressable>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <DeliveryLocationModal
        visible={picking}
        initial={location}
        onClose={() => setPicking(false)}
        onConfirm={(pt) => {
          setLocation(pt);
          setPicking(false);
        }}
      />
    </>
  );
});
OrderSheet.displayName = "OrderSheet";
