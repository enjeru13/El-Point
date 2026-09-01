import { Image } from 'expo-image';
import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/ThemeContext';

export function Avatar({
  uri,
  size = 40,
  icon = 'account',
  bordered = true,
}: {
  uri?: string | null;
  size?: number;
  icon?: string;
  bordered?: boolean;
}) {
  const { C } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: C.primaryFixed,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: bordered ? 2 : 0,
        borderColor: C.border,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <Icon name={icon} size={Math.round(size * 0.55)} color={C.primary} />
      )}
    </View>
  );
}
