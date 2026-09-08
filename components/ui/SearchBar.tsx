import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { forwardRef } from "react";
import { Pressable, TextInput, View } from "react-native";

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  variant?: "default" | "floating"; // ambos renderizan igual ahora
}

export const SearchBar = forwardRef<TextInput, Props>(
  (
    {
      value,
      onChangeText,
      onSubmit,
      onClear,
      placeholder = "Buscar restaurantes, platos...",
      variant = "default",
    },
    ref,
  ) => {
    const { C, shadow } = useTheme();
    const isFloating = variant === "floating";
    const hasValue = value.length > 0;

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 48,
          borderRadius: 24,
          paddingHorizontal: 14,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: hasValue ? C.border : C.outlineVariant,
          ...shadow.sm,
        }}
      >
        <Icon name="magnify" size={20} color={C.outline} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.outline}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          style={{
            flex: 1,
            fontFamily: "PlusJakartaSans_400Regular",
            fontSize: 15,
            color: C.onSurface,
            padding: 0,
            includeFontPadding: false,
          }}
        />
        {hasValue && (
          <Pressable
            onPress={() => {
              onChangeText("");
              onClear?.();
            }}
            hitSlop={8}
          >
            <Icon name="close-circle" size={18} color={C.outline} />
          </Pressable>
        )}
      </View>
    );
  },
);
