import * as React from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
    ({ className, containerClassName, label, error, ...props }, ref) => {
        return (
            <View className={cn('gap-1.5', containerClassName)}>
                {label && (
                    <Text className="text-sm font-medium text-foreground">{label}</Text>
                )}
                <TextInput
                    ref={ref}
                    className={cn(
                        'h-12 rounded-lg border border-input bg-background px-4 text-base text-foreground',
                        'placeholder:text-muted-foreground',
                        error && 'border-destructive',
                        props.editable === false && 'opacity-50',
                        className
                    )}
                    placeholderTextColor="hsl(215, 16%, 47%)"
                    {...props}
                />
                {error && (
                    <Text className="text-sm text-destructive">{error}</Text>
                )}
            </View>
        );
    }
);

Input.displayName = 'Input';

export { Input, type InputProps };
