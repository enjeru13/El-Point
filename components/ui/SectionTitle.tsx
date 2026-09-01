import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { ReactNode } from "react";
import { View } from "react-native";

interface Props {
  icon?: string;
  label: string;
  action?: ReactNode;
}

export function SectionTitle({ icon, label, action }: Props) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon && <Icon name={icon} size={18} color={C.primary} />}
        <AppText variant="heading">{label}</AppText>
      </View>
      {action}
    </View>
  );
}
