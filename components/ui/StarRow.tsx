import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { C } from '@/lib/theme';

interface Props {
  rating: number;
  size?: number;
}

export function StarRow({ rating, size = 14 }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={C.secondary}
        />
      ))}
    </View>
  );
}
