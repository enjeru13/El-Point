import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { C } from '@/lib/theme';

const ratingColor = (r: number) =>
  r >= 5.0 ? C.secondary : r >= 4.8 ? C.primaryContainer : C.primaryFixed;

interface Props {
  rating: number;
  size?: 'sm' | 'md';
}

export function StarBadge({ rating, size = 'md' }: Props) {
  const lg = size === 'md';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: lg ? 10 : 7, paddingVertical: lg ? 5 : 3,
      borderRadius: 99, backgroundColor: ratingColor(rating),
      borderWidth: 2, borderColor: C.border,
    }}>
      <MaterialCommunityIcons name="star" size={lg ? 13 : 11} color={C.onSurface} />
      <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: lg ? 13 : 11 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}
