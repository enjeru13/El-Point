import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/lib/ThemeContext";
import { View } from "react-native";

function RowSkeleton({ photo }: { photo: boolean }) {
  const { C } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.outlineVariant,
      }}
    >
      <Skeleton width={40} height={40} radius={20} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="45%" height={12} />
        <Skeleton width="25%" height={10} />
        <Skeleton width="95%" height={12} />
        <Skeleton width="70%" height={12} />
        {photo && <Skeleton height={180} radius={16} />}
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View accessibilityLabel="Cargando Comunidad">
      <RowSkeleton photo={false} />
      <RowSkeleton photo />
      <RowSkeleton photo={false} />
    </View>
  );
}
