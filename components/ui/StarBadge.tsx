import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  rating: number;
  size?: 'sm' | 'md';
}

export function StarBadge({ rating, size = 'md' }: Props) {
  const { C } = useTheme();
  const lg = size === 'md';
  const bg = rating >= 5.0 ? C.secondary : rating >= 4.8 ? C.primaryContainer : C.primaryFixed;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: lg ? 10 : 7, paddingVertical: lg ? 5 : 3,
      borderRadius: 99, backgroundColor: bg,
      borderWidth: 2, borderColor: C.border,
    }}>
      <MaterialCommunityIcons name="star" size={lg ? 13 : 11} color={C.onSurface} />
      <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: lg ? 13 : 11 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}
