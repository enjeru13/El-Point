import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/AppText';
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
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {body && (
        <AppText variant="bodySm" color={C.outline} align="center" style={{ maxWidth: 260 }}>
          {body}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" fullWidth={false} style={{ marginTop: 6 }} />
      )}
    </View>
  );
}
