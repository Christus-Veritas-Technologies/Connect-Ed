import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const badgeVariants = cva(
    'flex-row items-center rounded-full px-2.5 py-0.5',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                secondary: 'bg-secondary',
                destructive: 'bg-destructive',
                outline: 'border border-border',
                brand: 'bg-brand',
                success: 'bg-success',
                warning: 'bg-warning',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const badgeTextVariants = cva('text-xs font-semibold', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            secondary: 'text-secondary-foreground',
            destructive: 'text-destructive-foreground',
            outline: 'text-foreground',
            brand: 'text-white',
            success: 'text-white',
            warning: 'text-white',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
    label: string;
    textClassName?: string;
}

const Badge = React.forwardRef<View, BadgeProps>(
    ({ className, textClassName, variant, label, ...props }, ref) => (
        <View ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
            <Text className={cn(badgeTextVariants({ variant }), textClassName)}>
                {label}
            </Text>
        </View>
    )
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants, type BadgeProps };
