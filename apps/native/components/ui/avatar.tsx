import * as React from 'react';
import { View, type ViewProps, Image, type ImageProps } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

interface AvatarProps extends ViewProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
};

const Avatar = React.forwardRef<View, AvatarProps>(
    ({ className, size = 'md', ...props }, ref) => (
        <View
            ref={ref}
            className={cn(
                'relative overflow-hidden rounded-full bg-muted',
                avatarSizes[size],
                className
            )}
            {...props}
        />
    )
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends Omit<ImageProps, 'source'> {
    src?: string;
}

const AvatarImage = React.forwardRef<Image, AvatarImageProps>(
    ({ className, src, ...props }, ref) => {
        if (!src) return null;
        return (
            <Image
                ref={ref}
                source={{ uri: src }}
                className={cn('h-full w-full rounded-full', className)}
                {...props}
            />
        );
    }
);
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends ViewProps {
    label: string;
}

const AvatarFallback = React.forwardRef<View, AvatarFallbackProps>(
    ({ className, label, ...props }, ref) => (
        <View
            ref={ref}
            className={cn(
                'flex h-full w-full items-center justify-center rounded-full bg-brand/20',
                className
            )}
            {...props}
        >
            <Text className="text-sm font-semibold text-brand">
                {label
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
            </Text>
        </View>
    )
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
