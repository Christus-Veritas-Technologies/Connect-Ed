import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/lib/utils';

interface TextProps extends RNTextProps {
  variant?: 'default' | 'heading' | 'subheading' | 'caption' | 'muted';
}

const textVariants: Record<string, string> = {
  default: 'text-base text-foreground',
  heading: 'text-2xl font-bold text-foreground',
  subheading: 'text-lg font-semibold text-foreground',
  caption: 'text-sm text-muted-foreground',
  muted: 'text-base text-muted-foreground',
};

const Text = React.forwardRef<RNText, TextProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(textVariants[variant], className)}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text, type TextProps };
