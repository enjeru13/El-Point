import { Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/lib/ThemeContext';

export function EmptyState({
  icon = 'food-off-outline',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { C } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.surfaceContainerLow,
          borderWidth: 2,
          borderColor: C.outlineVariant,
        }}
      >
        <Icon name={icon} size={30} color={C.outline} />
      </View>
      <Text style={{ color: C.onSurface, fontFamily: 'Outfit_700Bold', fontSize: 18, textAlign: 'center' }}>
        {title}
      </Text>
      {body && (
        <Text
          style={{
            color: C.outline,
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 14,
            textAlign: 'center',
            maxWidth: 260,
            lineHeight: 20,
          }}
        >
          {body}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" fullWidth={false} style={{ marginTop: 6 }} />
      )}
    </View>
  );
}
