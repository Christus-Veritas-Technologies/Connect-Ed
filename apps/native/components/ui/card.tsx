import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

const Card = React.forwardRef<View, ViewProps>(
    ({ className, ...props }, ref) => (
        <View
            ref={ref}
            className={cn(
                'rounded-2xl border border-border bg-card p-4 shadow-sm',
                className
            )}
            {...props}
        />
    )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<View, ViewProps>(
    ({ className, ...props }, ref) => (
        <View ref={ref} className={cn('pb-3', className)} {...props} />
    )
);
CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.ComponentProps<typeof Text> { }

const CardTitle = React.forwardRef<React.ElementRef<typeof Text>, CardTitleProps>(
    ({ className, ...props }, ref) => (
        <Text
            ref={ref}
            className={cn('text-lg font-semibold text-card-foreground', className)}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.ComponentProps<typeof Text> { }

const CardDescription = React.forwardRef<
    React.ElementRef<typeof Text>,
    CardDescriptionProps
>(({ className, ...props }, ref) => (
    <Text
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<View, ViewProps>(
    ({ className, ...props }, ref) => (
        <View ref={ref} className={cn('py-2', className)} {...props} />
    )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<View, ViewProps>(
    ({ className, ...props }, ref) => (
        <View
            ref={ref}
            className={cn('flex-row items-center pt-3', className)}
            {...props}
        />
    )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
