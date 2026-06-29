import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { C } from '@/lib/theme';

interface Props {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  action?: ReactNode;
}

export function SectionTitle({ icon, label, action }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <MaterialCommunityIcons name={icon} size={18} color={C.primary} />}
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>
          {label}
        </Text>
      </View>
      {action}
    </View>
  );
}
