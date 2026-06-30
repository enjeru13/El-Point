import { Icon } from '@/components/ui/Icon';
import { View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  rating: number;
  size?: number;
}

export function StarRow({ rating, size = 14 }: Props) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon
          key={i}
          name="star"
          size={size}
          color={C.secondary}
          fill={i <= rating ? C.secondary : undefined}
        />
      ))}
    </View>
  );
}
