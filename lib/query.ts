import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      // Al volver a la app desde segundo plano se refrescan los datos viejos.
      refetchOnWindowFocus: true,
    },
  },
});

// React Query no sabe qué es "volver a la app" en móvil: se le avisa con AppState.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}
