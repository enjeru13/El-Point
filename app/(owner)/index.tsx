import { Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

export default function MyRestaurantScreen() {
  const { C } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
      <Text style={{ fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.primary }}>Mi Local</Text>
    </View>
  );
}
