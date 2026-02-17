import '../global.css';

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import { PaymentGuard } from '@/lib/payment-guard';
import { Loading } from '@/components/ui/loading';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <PaymentGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="payment-callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </PaymentGuard>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AuthGate />
        <PortalHost />
      </AuthProvider>
    </QueryProvider>
  );
}
