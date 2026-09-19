import { QA_MODE } from "@/lib/qa";
import { Pressable, ScrollView, Text, useColorScheme, View } from "react-native";

/**
 * Pantalla de último recurso cuando una pantalla lanza un error de render.
 * Vive por encima de los providers de tema, así que usa solo el esquema del
 * sistema y no depende de fuentes cargadas ni de contexto.
 */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> | void }) {
  const dark = useColorScheme() === "dark";
  const bg = dark ? "#0b0b0d" : "#ffffff";
  const fg = dark ? "#f4f4f5" : "#1c1b1b";
  const soft = dark ? "#b4b4b8" : "#5b4038";
  const accent = dark ? "#ff6a3d" : "#c8451f";

  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
      <Text style={{ color: fg, fontSize: 22, fontWeight: "800", textAlign: "center" }}>Algo salió mal</Text>
      <Text style={{ color: soft, fontSize: 15, textAlign: "center", lineHeight: 22 }}>
        Ocurrió un error inesperado. Puedes intentarlo de nuevo; si sigue pasando, cierra y vuelve a abrir la app.
      </Text>
      {QA_MODE ? (
        <ScrollView style={{ maxHeight: 140, alignSelf: "stretch" }}>
          <Text selectable style={{ color: soft, fontSize: 12, fontFamily: "Courier" }}>
            {error.message}
          </Text>
        </ScrollView>
      ) : null}
      <Pressable
        onPress={() => retry()}
        style={{ backgroundColor: accent, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 99, marginTop: 6 }}
      >
        <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}
