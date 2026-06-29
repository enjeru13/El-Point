import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function OwnerProfileScreen() {
  const { C, shadow } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 24 }}>
        Mi Perfil
      </Text>
      <Text style={{ color: C.outline, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
        Próximamente...
      </Text>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        style={{
          marginTop: 32,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99,
          backgroundColor: C.surface,
          borderWidth: 2, borderColor: C.border,
          ...shadow.sm,
        }}
      >
        <MaterialCommunityIcons name="logout" size={18} color={C.error} />
        <Text style={{ color: C.error, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
          Cerrar sesión
        </Text>
      </Pressable>
    </View>
  );
}
