import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { MotiView } from 'moti';
import { cn } from '@/lib/utils';

interface SkeletonProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    circle?: boolean;
}

function Skeleton({ className, width, height, circle, style, ...props }: SkeletonProps) {
    return (
        <MotiView
            from={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{
                type: 'timing',
                duration: 800,
                loop: true,
            }}
            className={cn(
                'bg-muted rounded-lg',
                circle && 'rounded-full',
                className
            )}
            style={[
                width !== undefined && { width: width as number },
                height !== undefined && { height: height as number },
                style,
            ]}
            {...props}
        />
    );
}

export { Skeleton };
