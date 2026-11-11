import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyProfile } from "@/lib/queries/me";
import { useRestaurant } from "@/lib/queries/restaurants";
import { useMyClaim, useSubmitClaim } from "@/lib/queries/claims";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";
import { KEYBOARD_DISMISS } from "@/lib/keyboard";

/** "Reclama tu local": el dueño de un local sin dueño pide que se lo asignen. */
export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
  const restaurantQ = useRestaurant(id);
  const profileQ = useMyProfile();
  const claimQ = useMyClaim(id);
  const submit = useSubmitClaim();

  const [name, setName] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [rif, setRif] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const restaurant = restaurantQ.data;
  const fullName = name ?? profileQ.data?.full_name ?? "";
  const claim = claimQ.data;
  const pending = claim?.status === "pending";
  const canSend = fullName.trim().length >= 2 && whatsapp.replace(/\D/g, "").length >= 7 && !!photo;

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permiso de cámara denegado");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.85 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  }

  async function fromLibrary() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.85 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  }

  function pickPhoto() {
    Alert.alert("Foto de prueba", undefined, [
      { text: "Tomar foto", onPress: fromCamera },
      { text: "Elegir de galería", onPress: fromLibrary },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  function send() {
    if (!canSend || !id || !photo) return;
    submit.mutate(
      { restaurantId: id, fullName, whatsapp, rif, photoUri: photo },
      {
        onSuccess: () => toast.success("Recibimos tu solicitud. Te avisamos cuando la revisemos."),
        onError: (e: any) => toast.error(e?.message ?? "No se pudo enviar. Intenta de nuevo."),
      },
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>
          Reclama tu local
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, FORM_MAX_W) }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode={KEYBOARD_DISMISS}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 6 }}>
          <AppText variant="heading" style={{ fontSize: 20 }}>
            {restaurant ? `¿${restaurant.name} es tuyo?` : "¿Este local es tuyo?"}
          </AppText>
          <AppText variant="body" color={C.onSurfaceVariant}>
            Envíanos una prueba y lo revisamos. Si se confirma, el local pasa a tu cuenta y podrás agregar tu contacto,
            fotos, horario y menú.
          </AppText>
        </View>

        {pending ? (
          <View style={{ gap: 8, padding: 16, borderRadius: 20, backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border }}>
            <Icon name="clock-outline" size={24} color={C.primary} />
            <AppText variant="bodyStrong">Tu solicitud está en revisión</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              Te avisamos apenas la revisemos. Si necesitamos algo más, te escribimos al WhatsApp que nos dejaste.
            </AppText>
          </View>
        ) : restaurant?.owner_id ? (
          <AppText variant="body" color={C.onSurfaceVariant}>
            Este local ya tiene dueño. Si crees que es un error, escríbenos por Soporte.
          </AppText>
        ) : (
          <>
            {claim?.status === "rejected" && (
              <View style={{ gap: 4, padding: 14, borderRadius: 16, backgroundColor: C.surfaceContainerLow, borderWidth: 1, borderColor: C.border }}>
                <AppText variant="bodyStrong">Tu solicitud anterior no se aprobó</AppText>
                {claim.reason && (
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>
                    {claim.reason}
                  </AppText>
                )}
              </View>
            )}

            <Field label="Tu nombre completo *" icon="account-outline" value={fullName} onChangeText={setName} autoCapitalize="words" />
            <Field
              label="WhatsApp *"
              icon="whatsapp"
              placeholder="0414 1234567"
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
              hint="Solo lo usamos para confirmar. No se publica."
            />
            <Field
              label="RIF del local"
              icon="card-account-details-outline"
              placeholder="J-12345678-9"
              autoCapitalize="characters"
              value={rif}
              onChangeText={setRif}
              hint="Opcional, nos ayuda a confirmar más rápido."
            />

            <View style={{ gap: 8 }}>
              <AppText variant="bodyStrong" color={C.onSurfaceVariant} style={{ marginLeft: 4 }}>
                Foto de prueba *
              </AppText>
              <AppText variant="bodySm" color={C.outline} style={{ marginLeft: 4 }}>
                El frente del local con el letrero visible, o una foto tuya dentro del local. No se publica.
              </AppText>
              <Pressable
                onPress={pickPhoto}
                accessibilityRole="button"
                accessibilityLabel={photo ? "Cambiar foto de prueba" : "Subir foto de prueba"}
                style={{
                  height: 180,
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: photo ? C.primary : C.outlineVariant,
                  backgroundColor: photo ? C.primaryFixed + "20" : C.surfaceContainerLow,
                }}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <View style={{ padding: 16, borderRadius: 16, backgroundColor: C.primaryFixed, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
                      <Icon name="storefront-outline" size={36} color={C.primary} />
                    </View>
                    <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                      Subir foto
                    </AppText>
                  </View>
                )}
              </Pressable>
            </View>

            <Button label="Enviar solicitud" onPress={send} loading={submit.isPending} disabled={!canSend} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
