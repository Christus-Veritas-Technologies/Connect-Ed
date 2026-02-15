import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Stack.Screen options={{ title: 'Not Found' }} />
      <Text className="text-4xl font-bold text-brand mb-2">404</Text>
      <Text className="text-lg font-semibold text-foreground mb-1">Page not found</Text>
      <Text className="text-sm text-muted-foreground text-center mb-6">
        The screen you're looking for doesn't exist.
      </Text>
      <Link href="/" className="px-6 py-3 bg-brand rounded-lg">
        <Text className="text-sm font-medium text-white">Go Home</Text>
      </Link>
    </View>
  );
}
