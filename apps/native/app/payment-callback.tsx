import { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckmarkCircle02Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

/**
 * Deep link handler for payment callbacks.
 * Called when payment provider redirects back to app.
 *
 * URL format: connect-ed://payment-callback?intermediatePaymentId=xxx&type=MONTHLY_ONLY&status=success
 */
export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refetch: refetchAuth } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { intermediatePaymentId, type, status } = params;

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      setIsVerifying(true);

      if (!intermediatePaymentId) {
        throw new Error('No payment ID provided');
      }

      // Poll the payment status from the server
      const response = await api.get(`/payments/verify/${intermediatePaymentId}`) as { data: { data: { paid: boolean } } };
      const { paid } = response.data.data;

      if (paid) {
        setPaymentSuccess(true);
        // Refetch auth to get updated school data
        await refetchAuth?.();
      } else {
        setPaymentSuccess(false);
        setErrorMessage('Payment is still pending. Please check back later.');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setPaymentSuccess(false);
      setErrorMessage(
        error?.response?.data?.error || 'Failed to verify payment. Please contact support if the issue persists.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    if (paymentSuccess) {
      // Determine where to redirect based on payment type
      if (type === 'SETUP_ONLY' || type === 'FULL') {
        // Setup fee paid, might need onboarding
        router.replace('/(tabs)');
      } else {
        // Monthly payment only
        router.replace('/(tabs)');
      }
    } else {
      // Failed payment - go back to payment screen
      router.replace('/(tabs)/payment');
    }
  };

  if (isVerifying) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Loading />
        <Text className="mt-4 text-center text-muted-foreground">
          Verifying your payment...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <Card className={paymentSuccess ? 'border-green-200/60' : 'border-destructive/20'}>
        <CardHeader className="items-center pb-2">
          <View
            className={`mb-4 h-20 w-20 rounded-full items-center justify-center ${
              paymentSuccess ? 'bg-green-100' : 'bg-destructive/10'
            }`}
          >
            <HugeiconsIcon
              icon={paymentSuccess ? CheckmarkCircle02Icon : CancelCircleIcon}
              size={48}
              className={paymentSuccess ? 'text-green-600' : 'text-destructive'}
            />
          </View>
          <CardTitle className="text-2xl text-center">
            {paymentSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {paymentSuccess
              ? 'Your payment has been processed successfully'
              : 'We were unable to process your payment'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {paymentSuccess ? (
            <View className="rounded-lg bg-green-50 border border-green-200 p-4">
              <Text className="text-sm text-green-800 text-center">
                Thank you! Your school subscription is now active. All users can access the system.
              </Text>
            </View>
          ) : (
            <View className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <Text className="text-sm text-destructive text-center">
                {errorMessage || 'Please try again or contact support if the issue persists.'}
              </Text>
            </View>
          )}

          {intermediatePaymentId && (
            <View className="rounded-lg bg-muted/50 p-3">
              <Text className="text-xs text-muted-foreground text-center">
                Reference: {String(intermediatePaymentId).substring(0, 20)}...
              </Text>
            </View>
          )}
        </CardContent>

        <CardFooter>
          <Button className="w-full" size="lg" onPress={handleContinue}>
            <Text>{paymentSuccess ? 'Continue to App' : 'Try Again'}</Text>
          </Button>
        </CardFooter>
      </Card>
    </View>
  );
}
