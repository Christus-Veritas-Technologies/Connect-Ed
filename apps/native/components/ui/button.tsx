import * as React from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const buttonVariants = cva(
    'flex-row items-center justify-center rounded-lg',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                destructive: 'bg-destructive',
                outline: 'border border-border bg-background',
                secondary: 'bg-secondary',
                ghost: '',
                link: '',
                brand: 'bg-brand',
            },
            size: {
                default: 'h-12 px-5 py-3',
                sm: 'h-9 px-3',
                lg: 'h-14 px-8',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

const buttonTextVariants = cva('text-center font-semibold', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            destructive: 'text-destructive-foreground',
            outline: 'text-foreground',
            secondary: 'text-secondary-foreground',
            ghost: 'text-foreground',
            link: 'text-primary underline',
            brand: 'text-white',
        },
        size: {
            default: 'text-base',
            sm: 'text-sm',
            lg: 'text-lg',
            icon: 'text-base',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});

interface ButtonProps
    extends PressableProps,
    VariantProps<typeof buttonVariants> {
    label?: string;
    children?: React.ReactNode;
    className?: string;
    textClassName?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
    ({ className, textClassName, variant, size, label, children, disabled, ...props }, ref) => {
        return (
            <Pressable
                ref={ref}
                className={cn(
                    buttonVariants({ variant, size }),
                    disabled && 'opacity-50',
                    className
                )}
                disabled={disabled}
                {...props}
            >
                {children ??
                    (label ? (
                        <Text
                            className={cn(buttonTextVariants({ variant, size }), textClassName)}
                        >
                            {label}
                        </Text>
                    ) : null)}
            </Pressable>
        );
    }
);

Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants, type ButtonProps };
