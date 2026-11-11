import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  uploadRestaurantImage,
  uploadRestaurantMenu,
  uploadRestaurantVerification,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { authErrorEs } from "@/lib/authErrors";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useCategories } from "@/lib/queries/categories";
import { useAmenities } from "@/lib/queries/amenities";
import { findClaimableMatches, submitClaim, type ClaimMatch } from "@/lib/queries/claims";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import MapView, { Marker } from "react-native-maps";

// Centro por defecto: San Cristóbal, Táchira.
import { AppText } from "@/components/ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";
import { beginAuthFlow, endAuthFlow } from "@/lib/authFlow";
import { KEYBOARD_DISMISS } from "@/lib/keyboard";

const STEPS = 4;

export default function RegisterOwnerScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
  const [step, setStep] = useState(0);

  // Step 0 — cuenta
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [selectedCats, setSelectedCats] = useState<Set<number>>(new Set());
  const categoriesQ = useCategories();
  const [selectedAmenities, setSelectedAmenities] = useState<Set<number>>(new Set());
  const amenitiesQ = useAmenities();

  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [ghostKitchen, setGhostKitchen] = useState(false);
  const [zoneLabel, setZoneLabel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [rif, setRif] = useState("");

  const [facadeUri, setFacadeUri] = useState<string | null>(null);

  // Locales sin dueño que se parecen al que está registrando. Si elige uno,
  // en vez de crear un local nuevo se envía un reclamo de ese.
  const [matches, setMatches] = useState<ClaimMatch[] | null>(null);
  const [checkedKey, setCheckedKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [claimTarget, setClaimTarget] = useState<ClaimMatch | null>(null);
  const [fullName, setFullName] = useState("");
  const [pickingMap, setPickingMap] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [menuPdfName, setMenuPdfName] = useState<string | null>(null);
  // Logo, portada y menú son opcionales: van plegados para que el paso se vea corto.
  const [showExtras, setShowExtras] = useState(false);
  const [menuPdfUri, setMenuPdfUri] = useState<string | null>(null);

  function toggleCat(id: number) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAmenity(id: number) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function reverseFillAddress(c: Location.LocationObjectCoords) {
    if (address.trim()) return;
    try {
      const [place] = await Location.reverseGeocodeAsync(c);
      if (place)
        setAddress(`${place.street ?? ""} ${place.streetNumber ?? ""}, ${place.city ?? ""}`.trim());
    } catch {
      // sin dirección sugerida
    }
  }

  function pickImage(setter: (uri: string) => void) {
    Alert.alert("Agregar foto", undefined, [
      { text: "Tomar foto", onPress: () => pickImageFromCamera(setter) },
      { text: "Elegir de galería", onPress: () => pickImageFromLibrary(setter) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function pickImageFromCamera(setter: (uri: string) => void) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permiso de cámara denegado");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  }

  async function pickImageFromLibrary(setter: (uri: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });
    if (!result.canceled) {
      setMenuPdfName(result.assets[0].name);
      setMenuPdfUri(result.assets[0].uri);
    }
  }

  // GoTrue rechaza correos con caracteres no-ASCII (p. ej. la ñ)
  const emailValid = /^[\x00-\x7F]+@[\x00-\x7F]+\.[\x00-\x7F]{2,}$/.test(
    email.trim(),
  );

  const canContinue =
    step === 0
      ? fullName.trim().length >= 2 && emailValid && password.length >= 8
      : step === 1
        ? !!(name.trim() && selectedCats.size > 0)
        : step === 2
          ? ghostKitchen
            ? !!zoneLabel.trim()
            : !!(address.trim() && coords)
          : step === 3
            ? !!facadeUri &&
              (!claimTarget || (fullName.trim().length >= 2 && whatsapp.replace(/\D/g, "").length >= 7))
            : true;

  async function handleContinue() {
    if (loading || checking) return;
    if (step === 2 && !ghostKitchen && coords) {
      const key = `${name.trim()}|${coords.lat}|${coords.lng}`;
      if (key !== checkedKey) {
        setChecking(true);
        const found = await findClaimableMatches(name.trim(), coords.lat, coords.lng);
        setChecking(false);
        setCheckedKey(key);
        setClaimTarget(null);
        if (found.length > 0) {
          setMatches(found);
          return;
        }
      }
    }
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }
    handleRegister();
  }

  async function handleRegister() {
    setLoading(true);
    beginAuthFlow();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: "restaurant_owner", full_name: fullName.trim() } },
    });

    if (error) {
      endAuthFlow();
      setLoading(false);
      toast.error(authErrorEs(error.message));
      return;
    }

    if (!data.session) {
      endAuthFlow();
      setLoading(false);
      Alert.alert(
        "Confirma tu correo",
        claimTarget
          ? `Te enviamos un correo. Al confirmar, inicia sesión y escríbenos por Soporte para terminar de reclamar ${claimTarget.name}.`
          : "Te enviamos un correo. Al confirmar, inicia sesión y completa el registro de tu local.",
      );
      router.replace("/(auth)/login");
      return;
    }

    const ownerId = data.session.user.id;

    if (claimTarget && facadeUri) {
      try {
        await submitClaim({
          restaurantId: claimTarget.id,
          fullName,
          whatsapp,
          rif,
          photoUri: facadeUri,
        });
        toast.success("Recibimos tu solicitud. Te avisamos cuando la revisemos.");
      } catch (e: any) {
        toast.error(e?.message ?? "Cuenta creada, pero no pudimos enviar la solicitud. Escríbenos por Soporte.");
      }
      setLoading(false);
      router.replace("/(owner)");
      endAuthFlow();
      return;
    }

    // p_lat/p_lng ahora aceptan null (cocina fantasma) y p_ghost_kitchen/
    // p_zone_label son parámetros nuevos -- database.types.ts todavía tiene
    // la firma vieja hasta que se regeneren los tipos contra la migración
    // ya pusheada.
    const { data: newId, error: rpcError } = await supabase.rpc(
      "create_owner_restaurant" as any,
      {
        p_name: name.trim(),
        p_description: "",
        p_address: ghostKitchen ? "" : address.trim(),
        p_lat: ghostKitchen ? null : (coords?.lat ?? null),
        p_lng: ghostKitchen ? null : (coords?.lng ?? null),
        p_whatsapp: whatsapp.trim(),
        p_instagram: instagram.trim(),
        p_category_ids: Array.from(selectedCats),
        p_rif: rif.trim(),
        p_amenity_ids: Array.from(selectedAmenities),
        p_ghost_kitchen: ghostKitchen,
        p_zone_label: ghostKitchen ? zoneLabel.trim() : "",
      },
    ) as any;

    if (rpcError || !newId) {
      endAuthFlow();
      setLoading(false);
      toast.error(
        "Cuenta creada, pero no pudimos registrar el local. Hazlo desde tu panel.",
      );
      router.replace("/(owner)");
      return;
    }

    // Foto de fachada — obligatoria para la verificación.
    try {
      if (facadeUri) {
        const path = await uploadRestaurantVerification(
          ownerId,
          newId,
          facadeUri,
        );
        await supabase
          .from("restaurants")
          .update({ verification_photo_path: path })
          .eq("id", newId);
      }
    } catch {
      // el dueño puede volver a subirla desde su perfil
    }

    // Media de marketing (best-effort; no bloquea el registro)
    try {
      const patch: {
        logo_url?: string;
        cover_url?: string;
        menu_pdf_url?: string;
      } = {};
      if (logoUri)
        patch.logo_url = await uploadRestaurantImage(newId, "logo", logoUri);
      if (coverUri)
        patch.cover_url = await uploadRestaurantImage(newId, "cover", coverUri);
      if (menuPdfUri)
        patch.menu_pdf_url = await uploadRestaurantMenu(newId, menuPdfUri);
      if (Object.keys(patch).length > 0) {
        await supabase.from("restaurants").update(patch).eq("id", newId);
      }
    } catch {
      // se puede reintentar desde el panel
    }

    setLoading(false);
    // Pantalla de bienvenida para dueños; su CTA entra a /(owner).
    router.replace("/(auth)/welcome?role=owner");
    endAuthFlow();
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: insets.top,
          height: insets.top + 56,
          backgroundColor: C.surface + "e0",
        }}
      >
        <Pressable
          onPress={() =>
            step > 0
              ? setStep(step - 1)
              : router.canGoBack()
                ? router.back()
                : router.replace("/(auth)/login")
          }
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="arrow-left" size={24} color={C.onSurfaceVariant} />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                height: 8,
                borderRadius: 99,
                width: i === step ? 28 : 8,
                backgroundColor:
                  i === step
                    ? C.primary
                    : i < step
                      ? C.primary
                      : C.surfaceContainerHighest,
              }}
            />
          ))}
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 70,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 20,
            ...capWidth(isTablet, FORM_MAX_W),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" keyboardDismissMode={KEYBOARD_DISMISS}
        >
          {/* ════ STEP 0 — Tu cuenta ════ */}
          {step === 0 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: C.primaryFixed,
                      borderWidth: 1,
                      borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon name="account" size={28} color={C.primary} />
                  </View>
                  <View>
                    <AppText variant="title">Tu cuenta</AppText>
                    <AppText variant="body" color={C.onSurfaceVariant}>
                      Para administrar tu local
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={{ gap: 20 }}>
                <Field
                  label="Tu nombre o apodo *"
                  icon="account"
                  placeholder="Ej. Carlos Pérez o El Chamo"
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={(t) => setFullName(t.slice(0, 60))}
                  hint="Así te verán en Comunidad cuando respondas como dueño"
                />
                {/* Correo */}
                <Field
                  label="Correo electrónico *"
                  icon="email-outline"
                  placeholder="tucorreo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  error={email.trim().length > 0 && !emailValid ? 'Usa solo letras sin tildes ni ñ (ej. dueno@gmail.com).' : null}
                />
                <Field
                  label="Contraseña *"
                  icon="lock-outline"
                  placeholder="••••••••"
                  secure
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                  hint="Mínimo 8 caracteres"
                />
              </View>
            </>
          )}

          {/* ════ STEP 1 — Datos del restaurante ════ */}
          {step === 1 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: C.primaryFixed,
                      borderWidth: 1,
                      borderColor: C.border,
                      ...shadow.sm,
                    }}
                  >
                    <Icon
                      name="storefront-outline"
                      size={28}
                      color={C.primary}
                    />
                  </View>
                  <View>
                    <AppText variant="title">Tu restaurante</AppText>
                    <AppText variant="body" color={C.onSurfaceVariant}>
                      Datos principales
                    </AppText>
                  </View>
                </View>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Únete a la comunidad gastronómica más vibrante del barrio.
                </AppText>
              </View>

              <View style={{ gap: 20 }}>
                <Field
                  label="Nombre del restaurante *"
                  icon="store-outline"
                  placeholder="Ej. Flame & Fork Bistro"
                  value={name}
                  onChangeText={setName}
                />

                {/* Categorías */}
                <View style={{ gap: 12 }}>
                  <AppText variant="bodyStrong" color={C.onSurfaceVariant} style={{ marginLeft: 4 }}>
                    Categorías *{" "}
                    <AppText variant="body" color={C.outline}>
                      ({selectedCats.size} seleccionadas)
                    </AppText>
                  </AppText>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {(categoriesQ.data ?? []).map((cat) => (
                      <Chip
                        key={cat.id}
                        label={cat.label}
                        icon={cat.icon}
                        tone="secondary"
                        active={selectedCats.has(cat.id)}
                        onPress={() => toggleCat(cat.id)}
                      />
                    ))}
                  </View>
                </View>

                {/* Comodidades */}
                <View style={{ gap: 12 }}>
                  <AppText variant="bodyStrong" color={C.onSurfaceVariant} style={{ marginLeft: 4 }}>
                    Comodidades{" "}
                    <AppText variant="body" color={C.outline}>
                      (opcional)
                    </AppText>
                  </AppText>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {(amenitiesQ.data ?? []).map((am) => (
                      <Chip
                        key={am.id}
                        label={am.label}
                        icon={am.icon}
                        tone="secondary"
                        active={selectedAmenities.has(am.id)}
                        onPress={() => toggleAmenity(am.id)}
                      />
                    ))}
                  </View>
                </View>
              </View>

              {/* Beneficio al aprobar */}
              <View
                style={{
                  marginTop: 32,
                  padding: 20,
                  borderRadius: 20,
                  backgroundColor: C.secondaryContainer,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <Icon name="fire" size={22} color={C.secondary} />
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    Arranca como &quot;Destacado&quot;
                  </AppText>
                </View>
                <AppText variant="body" color={C.onSecondaryContainer}>
                  Apenas aprobemos tu local, sale con la etiqueta Destacado y de
                  primero en las búsquedas y el mapa durante 14 días. Sin costo.
                </AppText>
              </View>
            </>
          )}

          {/* ════ STEP 2 — Ubicación + contacto ════ */}
          {step === 2 && (
            <>
              <View style={{ marginBottom: 24 }}>
                <AppText variant="title" style={{ marginBottom: 8 }}>
                  Ubicación y contacto
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Ayuda a tus clientes a encontrarte y conectar contigo.
                </AppText>
              </View>

              <View style={{ gap: 20 }}>
                {/* Cocina fantasma */}
                <Pressable
                  onPress={() => setGhostKitchen((v) => !v)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 14,
                    padding: 14, borderRadius: 16,
                    backgroundColor: ghostKitchen ? C.primaryFixed : C.surface,
                    borderWidth: 1, borderColor: ghostKitchen ? C.primary : C.outlineVariant,
                  }}
                >
                  <Icon name="mdi:ghost" size={22} color={ghostKitchen ? C.primary : C.onSurfaceVariant} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">Soy cocina fantasma</AppText>
                    <AppText variant="bodySm" color={C.onSurfaceVariant}>
                      Solo delivery o pickup, sin local al que llegar
                    </AppText>
                  </View>
                  <Icon
                    name={ghostKitchen ? "check-circle" : "checkbox-blank-circle-outline"}
                    size={22}
                    color={ghostKitchen ? C.primary : C.outlineVariant}
                  />
                </Pressable>

                {ghostKitchen ? (
                  <Field
                    label="Zona / sector *"
                    icon="mdi:map-marker-radius-outline"
                    placeholder="Ej. Barrio Obrero"
                    value={zoneLabel}
                    onChangeText={setZoneLabel}
                    hint="No hace falta la dirección exacta ni marcar el mapa"
                  />
                ) : (
                  <>
                    {/* Dirección */}
                    <Field
                      label="Dirección *"
                      icon="map-marker-outline"
                      placeholder="Calle, sector y ciudad"
                      value={address}
                      onChangeText={setAddress}
                    />

                    {/* Punto en el mapa */}
                    <View style={{ gap: 8 }}>
                  <AppText variant="overline" color={C.outline} style={{ marginLeft: 4 }}>
                    UBICACIÓN EN EL MAPA *
                  </AppText>
                  <AppText variant="bodySm" color={C.outline} style={{ marginLeft: 4 }}>
                    Toca el mapa y deja el pin justo en la entrada de tu local.
                  </AppText>
                  <Pressable
                    onPress={() => setPickingMap(true)}
                    accessibilityRole="button"
                    accessibilityLabel={coords ? "Cambiar la ubicación en el mapa" : "Elegir la ubicación en el mapa"}
                    style={{
                      height: 170,
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: coords ? 1 : 1.5,
                      borderStyle: coords ? "solid" : "dashed",
                      borderColor: coords ? C.secondary : C.primary,
                      backgroundColor: C.surfaceContainer,
                    }}
                  >
                    {coords ? (
                      <>
                        <MapView
                          key={`${coords.lat},${coords.lng}`}
                          style={{ flex: 1 }}
                          pointerEvents="none"
                          scrollEnabled={false}
                          zoomEnabled={false}
                          rotateEnabled={false}
                          pitchEnabled={false}
                          liteMode
                          initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
                        >
                          <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor={C.primary} />
                        </MapView>
                        <View
                          style={{
                            position: "absolute",
                            right: 10,
                            bottom: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 99,
                            backgroundColor: C.surface,
                            borderWidth: 1,
                            borderColor: C.border,
                          }}
                        >
                          <AppText variant="label" color={C.primary}>Cambiar</AppText>
                        </View>
                      </>
                    ) : (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Icon name="map-marker" size={30} color={C.primary} />
                        <AppText variant="bodyStrong" color={C.primary}>Elegir en el mapa</AppText>
                      </View>
                    )}
                  </Pressable>
                  {coords && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 4 }}>
                      <Icon name="check-circle" size={14} color={C.secondary} />
                      <AppText variant="caption" color={C.secondary}>
                        Ubicación marcada
                      </AppText>
                    </View>
                  )}
                </View>
                  </>
                )}

                <Field
                  label="WhatsApp (opcional)"
                  icon="whatsapp"
                  placeholder="+58 412 000 0000"
                  keyboardType="phone-pad"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                />

                <Field
                  label="Instagram (opcional)"
                  icon="instagram"
                  placeholder="tu_restaurante"
                  autoCapitalize="none"
                  value={instagram}
                  onChangeText={(t) => setInstagram(t.replace(/^@/, ''))}
                />

                <Field
                  label="RIF (opcional)"
                  icon="shield-outline"
                  placeholder="J-12345678-9"
                  autoCapitalize="characters"
                  value={rif}
                  onChangeText={setRif}
                  hint="Acelera la verificación de tu local"
                />
              </View>
            </>
          )}

          {/* ════ STEP 3 — Media ════ */}
          {step === 3 && (
            <>
              {claimTarget ? (
              <View style={{ marginBottom: 24, gap: 8 }}>
                <AppText variant="title">Reclama {claimTarget.name}</AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Ya está en El Point. Revisamos tu prueba y, si se confirma, el local pasa a tu cuenta con
                  todo lo que ya tiene.
                </AppText>
                <Pressable onPress={() => setClaimTarget(null)} hitSlop={8}>
                  <AppText variant="bodySm" color={C.primary} style={{ textDecorationLine: "underline" }}>
                    No es mi local, registrarlo como nuevo
                  </AppText>
                </Pressable>
              </View>
              ) : (
              <View style={{ marginBottom: 24 }}>
                <AppText variant="title" style={{ marginBottom: 8 }}>
                  Verificación y fotos
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Revisamos cada local antes de publicarlo. Suele tardar menos
                  de 24 h; te avisamos cuando quede aprobado.
                </AppText>
                <AppText variant="bodySm" color={C.outline} style={{ marginTop: 8 }}>
                  Solo la foto de {ghostKitchen ? "tu cocina" : "la fachada"} es
                  obligatoria. El logo, la portada y el menú los puedes agregar
                  ahora o después desde tu perfil.
                </AppText>
              </View>
              )}

              <View style={{ gap: 20 }}>
                {claimTarget && (
                  <>
                    <Field
                      label="Tu nombre completo *"
                      icon="account-outline"
                      autoCapitalize="words"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                    <Field
                      label="WhatsApp *"
                      icon="whatsapp"
                      placeholder="+58 412 000 0000"
                      keyboardType="phone-pad"
                      value={whatsapp}
                      onChangeText={setWhatsapp}
                      hint="Solo lo usamos para confirmar contigo."
                    />
                  </>
                )}

                {/* Foto de fachada — verificación (o de la cocina, si es
                    cocina fantasma: no hay fachada que fotografiar) */}
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginLeft: 4,
                    }}
                  >
                    <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                      Foto de {ghostKitchen ? "tu cocina" : "la fachada"} *
                    </AppText>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 99,
                        backgroundColor: C.primaryFixed,
                        borderWidth: 1,
                        borderColor: C.primary,
                      }}
                    >
                      <AppText variant="caption" color={C.primary}>
                        OBLIGATORIA
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="bodySm" color={C.outline} style={{ marginLeft: 4 }}>
                    {ghostKitchen
                      ? "Tu espacio de trabajo o lo que preparas. La usamos solo para verificar que el local existe."
                      : "El frente del local con el letrero visible. La usamos solo para verificar que el local existe."}
                  </AppText>
                  <Pressable
                    onPress={() => pickImage(setFacadeUri)}
                    style={{
                      height: 180,
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                      borderColor: facadeUri ? C.primary : C.outlineVariant,
                      backgroundColor: facadeUri
                        ? C.primaryFixed + "20"
                        : C.surfaceContainerLow,
                    }}
                  >
                    {facadeUri ? (
                      <Image
                        source={{ uri: facadeUri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ alignItems: "center", gap: 8 }}>
                        <View
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            backgroundColor: C.primaryFixed,
                            borderWidth: 1,
                            borderColor: C.border,
                            ...shadow.sm,
                          }}
                        >
                          <Icon
                            name={ghostKitchen ? "mdi:pot-steam-outline" : "storefront-outline"}
                            size={36}
                            color={C.primary}
                          />
                        </View>
                        <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                          Subir foto de {ghostKitchen ? "tu cocina" : "la fachada"}
                        </AppText>
                        <AppText variant="bodySm" color={C.outline}>
                          PNG, JPG · máx 10MB
                        </AppText>
                      </View>
                    )}
                  </Pressable>
                </View>

                {!claimTarget && (
                  <>
                    {!showExtras ? (
                      <Pressable
                        onPress={() => setShowExtras(true)}
                        accessibilityRole="button"
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          padding: 16,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: C.outlineVariant,
                          backgroundColor: C.surface,
                        }}
                      >
                        <Icon name="image-plus" size={22} color={C.primary} />
                        <View style={{ flex: 1 }}>
                          <AppText variant="bodyStrong">Agregar logo, portada y menú</AppText>
                          <AppText variant="bodySm" color={C.onSurfaceVariant}>
                            Opcional. Puedes hacerlo ahora o después desde tu perfil.
                          </AppText>
                        </View>
                        <Icon name="chevron-down" size={18} color={C.outline} />
                      </Pressable>
                    ) : (
                      <>

                {/* Logo */}
                <View style={{ gap: 8 }}>
                  <AppText variant="bodyStrong" color={C.onSurfaceVariant} style={{ marginLeft: 4 }}>
                    Logo del restaurante
                  </AppText>
                  <AppText variant="bodySm" color={C.outline} style={{ marginLeft: 4 }}>
                    Imagen cuadrada. Aparece junto al nombre de tu local en las
                    búsquedas.
                  </AppText>
                  <Pressable
                    onPress={() => pickImage(setLogoUri)}
                    style={{
                      height: 120,
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                      borderColor: logoUri ? C.primary : C.outlineVariant,
                      backgroundColor: logoUri
                        ? C.primaryFixed + "20"
                        : C.surfaceContainerLow,
                    }}
                  >
                    {logoUri ? (
                      <Image
                        source={{ uri: logoUri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ alignItems: "center", gap: 8 }}>
                        <View
                          style={{
                            padding: 12,
                            borderRadius: 16,
                            backgroundColor: C.primaryFixed,
                            borderWidth: 1,
                            borderColor: C.border,
                            ...shadow.sm,
                          }}
                        >
                          <Icon name="image-plus" size={28} color={C.primary} />
                        </View>
                        <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                          Subir logo
                        </AppText>
                        <AppText variant="bodySm" color={C.outline}>
                          PNG, JPG · máx 10MB
                        </AppText>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Foto de portada */}
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginLeft: 4,
                    }}
                  >
                    <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                      Foto de portada
                    </AppText>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 99,
                        backgroundColor: C.secondaryContainer,
                        borderWidth: 1,
                        borderColor: C.secondary,
                      }}
                    >
                      <AppText variant="caption" color={C.secondary}>
                        RECOMENDADO
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="bodySm" color={C.outline} style={{ marginLeft: 4 }}>
                    Imagen horizontal. Es la foto grande que se ve arriba de tu
                    perfil. Usa tu mejor plato o el ambiente del local.
                  </AppText>
                  <Pressable
                    onPress={() => pickImage(setCoverUri)}
                    style={{
                      height: 180,
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                      borderColor: coverUri ? C.primary : C.outlineVariant,
                      backgroundColor: coverUri
                        ? C.primaryFixed + "20"
                        : C.surfaceContainerLow,
                    }}
                  >
                    {coverUri ? (
                      <Image
                        source={{ uri: coverUri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ alignItems: "center", gap: 8 }}>
                        <View
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            backgroundColor: C.primaryFixed,
                            borderWidth: 1,
                            borderColor: C.border,
                            ...shadow.sm,
                          }}
                        >
                          <Icon
                            name="camera-plus-outline"
                            size={36}
                            color={C.primary}
                          />
                        </View>
                        <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                          Sube tu mejor foto de plato
                        </AppText>
                        <AppText variant="bodySm" color={C.outline}>
                          PNG, JPG · máx 10MB
                        </AppText>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* Menú PDF */}
                <View style={{ gap: 8 }}>
                  <AppText variant="bodyStrong" color={C.onSurfaceVariant} style={{ marginLeft: 4 }}>
                    Menú en PDF
                  </AppText>
                  <Pressable
                    onPress={pickPdf}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                      padding: 20,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: menuPdfName ? C.primary : C.outlineVariant,
                      backgroundColor: menuPdfName
                        ? C.primaryFixed + "15"
                        : C.surfaceContainerLow,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: menuPdfName
                          ? C.primary
                          : C.primaryFixed,
                        borderWidth: 1,
                        borderColor: C.border,
                      }}
                    >
                      <Icon
                        name={menuPdfName ? "file-check" : "file-pdf-box"}
                        size={26}
                        color={menuPdfName ? "#fff" : C.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">
                        {menuPdfName ?? "Subir menú PDF"}
                      </AppText>
                      <AppText variant="bodySm" color={C.outline} style={{ marginTop: 2 }}>
                        {menuPdfName
                          ? "Toca para cambiar"
                          : "Tus clientes lo verán en tu perfil"}
                      </AppText>
                    </View>
                  </Pressable>
                </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── ¿Ya está en El Point? ── */}
      <Modal visible={!!matches} transparent animationType="fade" onRequestClose={() => setMatches(null)}>
        <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              gap: 14,
            }}
          >
            <AppText variant="title">¿Es alguno de estos tu local?</AppText>
            <AppText variant="body" color={C.onSurfaceVariant}>
              Ya aparecen en El Point cerca del punto que marcaste. Si es tuyo, reclámalo y conserva lo que ya tiene.
            </AppText>
            {(matches ?? []).map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  setClaimTarget(m);
                  setMatches(null);
                  setStep(3);
                }}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.surfaceContainerLow,
                }}
              >
                <Icon name="storefront-outline" size={22} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{m.name}</AppText>
                  <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={2}>
                    {[m.address, `a ${Math.round(m.distance_m)} m`].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
                <AppText variant="bodySm" color={C.primary}>
                  Sí, es este
                </AppText>
              </Pressable>
            ))}
            <Button
              label="No, el mío es otro"
              variant="secondary"
              onPress={() => {
                setMatches(null);
                setStep(3);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Barra fija inferior ── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          backgroundColor: C.surface + "f0",
        }}
      >
        <Button
          label={
            loading
              ? "Creando…"
              : step === STEPS - 1
                ? claimTarget
                  ? "Enviar solicitud"
                  : "Registrar mi restaurante"
                : "Continuar"
          }
          onPress={handleContinue}
          disabled={!canContinue}
          loading={loading || checking}
          iconTrailing={step === STEPS - 1 ? "store-outline" : "arrow-right"}
        />
        {step === STEPS - 1 && (
          <AppText variant="caption" color={C.outline} align="center" style={{ marginTop: 10, lineHeight: 18 }}>
            Al registrar tu local, aceptas los{" "}
            <AppText
              variant="caption"
              color={C.primary}
              style={{ textDecorationLine: "underline" }}
              onPress={() => router.push("/legal/terms")}
            >
              Términos de Servicio
            </AppText>{" "}
            y la{" "}
            <AppText
              variant="caption"
              color={C.primary}
              style={{ textDecorationLine: "underline" }}
              onPress={() => router.push("/legal/privacy")}
            >
              Política de Privacidad
            </AppText>
            .
          </AppText>
        )}
      </View>
      <LocationPickerModal
        visible={pickingMap}
        initial={coords}
        title="¿Dónde queda tu local?"
        subtitle="Mueve el mapa hasta dejar el pin en la entrada."
        confirmLabel="Usar esta ubicación"
        onClose={() => setPickingMap(false)}
        onConfirm={(p) => {
          setCoords(p);
          setPickingMap(false);
          reverseFillAddress({ latitude: p.lat, longitude: p.lng } as Location.LocationObjectCoords);
        }}
      />
    </View>
  );
}
