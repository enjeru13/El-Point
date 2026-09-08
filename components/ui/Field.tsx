import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { ReactNode, useState } from "react";
import {
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

type FieldProps = {
  label?: string;
  icon?: string;
  error?: string | null;
  hint?: string;
  right?: ReactNode;
  /** password mode — adds a show/hide eye */
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps;

export function Field({
  label,
  icon,
  error,
  hint,
  right,
  secure,
  containerStyle,
  style,
  multiline,
  onFocus,
  onBlur,
  ...ti
}: FieldProps) {
  const { C } = useTheme();
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  const borderColor = error ? C.error : focused ? C.primary : C.outlineVariant;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && (
        <Text
          style={{
            color: C.onSurfaceVariant,
            fontFamily: "PlusJakartaSans_600SemiBold",
            fontSize: 14,
            marginLeft: 4,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor,
          backgroundColor: C.surfaceContainerLow,
          paddingHorizontal: 14,
          minHeight: multiline ? 90 : 54,
          paddingVertical: multiline ? 12 : 0,
        }}
      >
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={focused ? C.primary : C.outline}
            style={{ marginTop: multiline ? 2 : 0 }}
          />
        )}
        <TextInput
          {...ti}
          multiline={multiline}
          secureTextEntry={secure && !show}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={C.outline}
          style={[
            {
              flex: 1,
              paddingVertical: multiline ? 0 : 14,
              fontFamily: "PlusJakartaSans_400Regular",
              fontSize: 15,
              color: C.onSurface,
              textAlignVertical: multiline ? "top" : "center",
              includeFontPadding: false,
            },
            style,
          ]}
        />
        {secure && (
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
            <Icon
              name={show ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={C.outline}
            />
          </Pressable>
        )}
        {right}
      </View>

      {(error || hint) && (
        <Text
          style={{
            color: error ? C.error : C.outline,
            fontFamily: "PlusJakartaSans_400Regular",
            fontSize: 13,
            marginLeft: 4,
          }}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}
