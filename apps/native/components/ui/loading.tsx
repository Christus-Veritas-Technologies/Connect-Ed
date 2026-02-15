import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { MotiView } from 'moti';
import { cn } from '@/lib/utils';
import { Text } from './text';

interface LoadingProps {
    className?: string;
    message?: string;
    size?: 'small' | 'large';
    fullScreen?: boolean;
}

function Loading({ className, message, size = 'large', fullScreen }: LoadingProps) {
    const content = (
        <View className={cn('items-center justify-center gap-3', className)}>
            <MotiView
                from={{ rotate: '0deg' }}
                animate={{ rotate: '360deg' }}
                transition={{ type: 'timing', duration: 1000, loop: true }}
            >
                <ActivityIndicator size={size} color="#3B82F6" />
            </MotiView>
            {message && (
                <Text className="text-sm text-muted-foreground">{message}</Text>
            )}
        </View>
    );

    if (fullScreen) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                {content}
            </View>
        );
    }

    return content;
}

export { Loading };
