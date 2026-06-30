import { Icon } from '@/components/ui/Icon';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  icon?: string;
  label: string;
  action?: ReactNode;
}

export function SectionTitle({ icon, label, action }: Props) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={18} color={C.primary} />}
        <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>
          {label}
        </Text>
      </View>
      {action}
    </View>
  );
}
