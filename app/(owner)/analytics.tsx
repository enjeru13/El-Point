import { Text, View } from 'react-native';
import { C } from '@/lib/theme';

export default function AnalyticsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
      <Text style={{ fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.primary }}>Estadísticas</Text>
    </View>
  );
}
