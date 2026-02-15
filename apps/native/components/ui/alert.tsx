import * as React from 'react';
import { View, type ViewProps, Pressable, type PressableProps } from 'react-native';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Alert01Icon, InformationCircleIcon, CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Text } from './text';

type AlertVariant = 'default' | 'destructive' | 'success' | 'warning';

interface AlertProps extends ViewProps {
  variant?: AlertVariant;
  title: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const alertStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: any }> = {
  default: {
    bg: 'bg-accent',
    border: 'border-brand/30',
    text: 'text-accent-foreground',
    icon: InformationCircleIcon,
  },
  destructive: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    text: 'text-destructive',
    icon: Alert01Icon,
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    text: 'text-success',
    icon: CheckmarkCircle02Icon,
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    text: 'text-warning',
    icon: Alert01Icon,
  },
};

function Alert({
  variant = 'default',
  title,
  description,
  dismissible,
  onDismiss,
  className,
  ...props
}: AlertProps) {
  const styles = alertStyles[variant];

  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <View
        className={cn(
          'flex-row items-start gap-3 rounded-xl border p-4',
          styles.bg,
          styles.border,
          className
        )}
        {...props}
      >
        <HugeiconsIcon icon={styles.icon} size={20} color={styles.text.includes('destructive') ? '#EF4444' : styles.text.includes('success') ? '#10B981' : styles.text.includes('warning') ? '#F59E0B' : '#3B82F6'} />
        <View className="flex-1 gap-1">
          <Text className={cn('text-sm font-semibold', styles.text)}>{title}</Text>
          {description && (
            <Text className="text-sm text-muted-foreground">{description}</Text>
          )}
        </View>
        {dismissible && onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={8}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} color="#64748B" />
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}

export { Alert };
