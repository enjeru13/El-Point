import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  uploadRestaurantImage,
  uploadRestaurantMenu,
  uploadRestaurantVerification,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useCategories } from "@/lib/queries/categories";
import { useAmenities } from "@/lib/queries/amenities";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import MapView from "react-native-maps";

// Centro por defecto: San Cristóbal, Táchira.
const SAN_CRISTOBAL = { latitude: 7.7669, longitude: -72.2251 };
import { AppText } from "@/components/ui/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";

const STEPS = 4;

export default function RegisterOwnerScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
  const [step, setStep] = useState(0);
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);

  // Step 0 — cuenta
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [rif, setRif] = useState("");

  const [facadeUri, setFacadeUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [menuPdfName, setMenuPdfName] = useState<string | null>(null);
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

  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error("Permiso de ubicación denegado");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
      setCoords({ lat: region.latitude, lng: region.longitude });
      mapRef.current?.animateToRegion(region, 500);
      if (!address.trim()) {
        const [place] = await Location.reverseGeocodeAsync(loc.coords);
        if (place)
          setAddress(
            `${place.street ?? ""} ${place.streetNumber ?? ""}, ${place.city ?? ""}`.trim(),
          );
      }
    } catch {
      toast.error("No pudimos obtener tu ubicación");
    } finally {
      setLocating(false);
    }
  }

  async function pickImage(setter: (uri: string) => void) {
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
      ? emailValid && password.length >= 8 && password === confirm
      : step === 1
        ? !!(name.trim() && selectedCats.size > 0)
        : step === 2
          ? !!(address.trim() && coords)
          : step === 3
            ? !!facadeUri
            : true;

  function handleContinue() {
    if (loading) return;
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }
    handleRegister();
  }

  async function handleRegister() {
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: "restaurant_owner" } },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      Alert.alert(
        "Confirma tu correo",
        "Te enviamos un correo. Al confirmar, inicia sesión y completa el registro de tu local.",
      );
      router.replace("/(auth)/login");
      return;
    }

    const ownerId = data.session.user.id;

    const { data: newId, error: rpcError } = await supabase.rpc(
      "create_owner_restaurant",
      {
        p_name: name.trim(),
        p_description: "",
        p_address: address.trim(),
        p_lat: coords?.lat ?? 0,
        p_lng: coords?.lng ?? 0,
        p_whatsapp: whatsapp.trim(),
        p_instagram: instagram.trim(),
        p_category_ids: Array.from(selectedCats),
        p_rif: rif.trim(),
        p_amenity_ids: Array.from(selectedAmenities),
      },
    );

    if (rpcError || !newId) {
      setLoading(false);
      toast.error(
        "Cuenta creada, pero no pudimos registrar el local. Hazlo desde tu panel.",
      );
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
          keyboardShouldPersistTaps="handled"
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
                {/* Correo */}
                <Field
                  label="Correo electrónico *"
                  icon="email-outline"
                  placeholder="tucorreo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  error={email.trim().length > 0 && !emailValid ? 'Usa solo letras sin tildes ni ñ (ej. dueno@gmail.com).' : null}
                />
                <Field
                  label="Contraseña *"
                  icon="lock-outline"
                  placeholder="••••••••"
                  secure
                  value={password}
                  onChangeText={setPassword}
                  hint="Mínimo 8 caracteres"
                />
                <Field
                  label="Confirmar contraseña *"
                  icon="lock-outline"
                  placeholder="••••••••"
                  secure
                  value={confirm}
                  onChangeText={setConfirm}
                  error={confirm.length > 0 && password !== confirm ? 'Las contraseñas no coinciden.' : null}
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
                    Arranca como "Destacado"
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
                    Mueve el mapa para dejar el pin justo en la entrada de tu local.
                  </AppText>
                  <View
                    style={{
                      height: 220,
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: coords ? C.secondary : C.outlineVariant,
                    }}
                  >
                    <MapView
                      ref={mapRef}
                      style={{ flex: 1 }}
                      initialRegion={{
                        latitude: coords?.lat ?? SAN_CRISTOBAL.latitude,
                        longitude: coords?.lng ?? SAN_CRISTOBAL.longitude,
                        latitudeDelta: coords ? 0.008 : 0.05,
                        longitudeDelta: coords ? 0.008 : 0.05,
                      }}
                      onMapReady={() =>
                        setCoords((c) =>
                          c ?? { lat: SAN_CRISTOBAL.latitude, lng: SAN_CRISTOBAL.longitude },
                        )
                      }
                      onRegionChangeComplete={(r) =>
                        setCoords({ lat: r.latitude, lng: r.longitude })
                      }
                    />
                    {/* Pin fijo en el centro */}
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name="map-marker"
                        size={40}
                        color={C.primary}
                        style={{ marginBottom: 40 }}
                      />
                    </View>
                    {/* Botón: mi ubicación */}
                    <Pressable
                      onPress={detectLocation}
                      disabled={locating}
                      style={{
                        position: "absolute",
                        right: 10,
                        bottom: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 99,
                        backgroundColor: C.surface,
                        borderWidth: 1,
                        borderColor: C.border,
                        ...shadow.sm,
                      }}
                    >
                      <Icon
                        name="crosshairs-gps"
                        size={15}
                        color={C.primary}
                      />
                      <AppText variant="label" color={C.onSurface} style={{ fontSize: 13 }}>
                        {locating ? "Ubicando…" : "Mi ubicación"}
                      </AppText>
                    </Pressable>
                  </View>
                  {coords && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 4 }}>
                      <Icon name="check-circle" size={14} color={C.secondary} />
                      <AppText variant="caption" color={C.secondary}>
                        Punto fijado ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                      </AppText>
                    </View>
                  )}
                </View>

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
              <View style={{ marginBottom: 24 }}>
                <AppText variant="title" style={{ marginBottom: 8 }}>
                  Verificación y fotos
                </AppText>
                <AppText variant="body" color={C.onSurfaceVariant}>
                  Revisamos cada local antes de publicarlo. Suele tardar menos
                  de 24 h; te avisamos cuando quede aprobado.
                </AppText>
                <AppText variant="bodySm" color={C.outline} style={{ marginTop: 8 }}>
                  Solo la foto de la fachada es obligatoria. El logo, la portada y
                  el menú los puedes agregar ahora o después desde tu perfil.
                </AppText>
              </View>

              <View style={{ gap: 20 }}>
                {/* Foto de fachada — verificación */}
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
                      Foto de la fachada *
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
                    El frente del local con el letrero visible. La usamos solo
                    para verificar que el local existe.
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
                            name="storefront-outline"
                            size={36}
                            color={C.primary}
                          />
                        </View>
                        <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                          Subir foto de la fachada
                        </AppText>
                        <AppText variant="bodySm" color={C.outline}>
                          PNG, JPG · máx 10MB
                        </AppText>
                      </View>
                    )}
                  </Pressable>
                </View>

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
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
          label={loading ? "Creando…" : step === STEPS - 1 ? "Registrar mi restaurante" : "Continuar"}
          onPress={handleContinue}
          disabled={!canContinue}
          loading={loading}
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
    </View>
  );
}
