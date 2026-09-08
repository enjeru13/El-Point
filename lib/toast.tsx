import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { notify } from "@/lib/haptics";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastKind = "success" | "error" | "info";
type ToastState = { id: number; kind: ToastKind; message: string } | null;

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const y = useRef(new Animated.Value(-120)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(y, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [y]);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ id: Date.now(), kind, message });
      y.setValue(-120);
      Animated.spring(y, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
      }).start();
      notify(kind === "error" ? "error" : kind === "success" ? "success" : "warning");
      hideTimer.current = setTimeout(dismiss, 3200);
    },
    [y, dismiss],
  );

  const api = useRef<ToastApi>({
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    info: (m) => show("info", m),
  });
  // keep closures fresh
  api.current = {
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    info: (m) => show("info", m),
  };

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const palette: Record<ToastKind, { bg: string; fg: string; icon: string }> = {
    success: {
      bg: C.secondaryContainer,
      fg: C.onSurface,
      icon: "check-circle",
    },
    error: { bg: C.error, fg: "#fff", icon: "close-circle" },
    info: { bg: C.primaryFixed, fg: C.onSurface, icon: "bell-outline" },
  };

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            transform: [{ translateY: y }],
          }}
        >
          <Pressable
            onPress={dismiss}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: palette[toast.kind].bg,
              ...shadow.md,
            }}
          >
            <Icon
              name={palette[toast.kind].icon}
              size={20}
              color={palette[toast.kind].fg}
            />
            <Text
              style={{
                flex: 1,
                color: palette[toast.kind].fg,
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 14,
                lineHeight: 19,
              }}
            >
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
