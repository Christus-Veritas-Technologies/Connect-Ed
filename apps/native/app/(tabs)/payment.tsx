import { View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { CreditCardIcon, AlertCircleIcon, School01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Loading } from '@/components/ui/loading';
import { AGENT_URL } from '@/lib/constants';

/**
 * Calculates how many days overdue the school's payment is.
 */
function getDaysOverdue(nextPaymentDate: string | null): number {
    if (!nextPaymentDate) return 0;
    const due = new Date(nextPaymentDate);
    const now = new Date();
    if (now <= due) return 0;
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PaymentScreen() {
    const { user, school, isLoading } = useAuth();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    if (isLoading) {
        return <Loading fullScreen />;
    }

    if (!user || !school) {
        return null;
    }

    const daysOverdue = getDaysOverdue(school.nextPaymentDate);
    const isLocked = daysOverdue > 3;
    const isAdmin = user.role === 'ADMIN';

    // If not locked and not admin, redirect to home
    if (!isLocked && !isAdmin) {
        router.replace('/(tabs)');
        return null;
    }

    const handlePayment = async () => {
        try {
            setIsProcessing(true);

            // For now, using LITE plan and MONTHLY_ONLY as default
            // You can make this configurable later
            const response = await api.post('/payments/create-checkout', {
                planType: school.plan || 'LITE',
                paymentType: 'MONTHLY_ONLY',
                email: user.email,
                returnUrl: 'connect-ed://payment-callback', // Deep link base for native app
            }) as { data: { data: { checkoutUrl: string; intermediatePaymentId: string } } };

            const { checkoutUrl, intermediatePaymentId } = response.data.data;

            if (!checkoutUrl) {
                throw new Error('No checkout URL received');
            }

            // Open the payment URL in the in-app browser
            const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                controlsColor: '#10b981', // brand color
            });

            // When browser is dismissed, check if we need to handle the callback
            if (result.type === 'dismiss' || result.type === 'cancel') {
                // User closed the browser - refresh the page to check payment status
                Alert.alert(
                    'Payment Status',
                    'Please wait while we verify your payment...',
                    [{ text: 'OK' }]
                );
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            Alert.alert(
                'Payment Error',
                error?.response?.data?.error || 'Failed to initiate payment. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // Non-admin user seeing locked screen
    if (!isAdmin && isLocked) {
        return (
            <ScrollView className="flex-1 bg-background">
                <View className="flex-1 p-6 justify-center min-h-screen">
                    <Card className="border-destructive/20">
                        <CardHeader className="items-center pb-2">
                            <View className="mb-4 h-16 w-16 rounded-full bg-destructive/10 items-center justify-center">
                                <HugeiconsIcon icon={School01Icon} size={32} className="text-destructive" />
                            </View>
                            <CardTitle className="text-xl text-center">School Temporarily Unavailable</CardTitle>
                            <CardDescription className="text-center">
                                {school.name || 'Your school'} is currently unavailable
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <View className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                                <View className="flex-row items-start gap-3">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-destructive mt-0.5" />
                                    <View className="flex-1">
                                        <Text className="font-semibold text-destructive mb-1">Access Restricted</Text>
                                        <Text className="text-sm text-destructive/90">
                                            Please contact your school administrator to resolve the outstanding payment.
                                            Access will be restored once the payment is completed.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View className="rounded-lg bg-muted/50 p-4">
                                <Text className="font-medium mb-1">Need help?</Text>
                                <Text className="text-sm text-muted-foreground">
                                    If this issue persists, please contact your school administration or reach out to
                                    support@connect-ed.com
                                </Text>
                            </View>
                        </CardContent>

                        <CardFooter>
                            <Button variant="outline" className="w-full" onPress={() => router.replace('/(tabs)')}>
                                <Text>Go Back</Text>
                            </Button>
                        </CardFooter>
                    </Card>
                </View>
            </ScrollView>
        );
    }

    // Admin user - show payment prompt
    return (
        <ScrollView className="flex-1 bg-background">
            <View className="flex-1 p-6 justify-center min-h-screen">
                <Card className={isLocked ? 'border-amber-200/60' : 'border-border'}>
                    <CardHeader className="items-center pb-2">
                        <View className="mb-4 h-16 w-16 rounded-full bg-amber-100 items-center justify-center">
                            <HugeiconsIcon icon={CreditCardIcon} size={32} className="text-amber-600" />
                        </View>
                        <CardTitle className="text-xl text-center">
                            {isLocked ? 'Payment Required' : 'School Payment'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {isLocked
                                ? "Your school's monthly payment is overdue"
                                : 'Manage your school subscription'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {isLocked ? (
                            <View className="rounded-lg bg-amber-50 border border-amber-300/50 p-4">
                                <View className="flex-row items-start gap-3">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-amber-600 mt-0.5" />
                                    <View className="flex-1">
                                        <Text className="font-semibold text-amber-800 mb-1">Outstanding Payment</Text>
                                        <Text className="text-sm text-amber-700">
                                            Your monthly payment is{' '}
                                            <Text className="font-bold">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''}</Text>{' '}
                                            overdue. Please complete the payment to restore full access for everyone at your
                                            school.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View className="rounded-lg bg-muted/50 p-4">
                                <Text className="text-sm text-muted-foreground">
                                    Your school subscription is active and in good standing.
                                    {school.nextPaymentDate && (
                                        <>
                                            {'\n\n'}Next payment due:{' '}
                                            {new Date(school.nextPaymentDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </>
                                    )}
                                </Text>
                            </View>
                        )}

                        <View className="rounded-lg bg-muted/30 p-4">
                            <Text className="font-medium mb-2">Current Plan</Text>
                            <Text className="text-2xl font-bold text-brand">{school.plan || 'LITE'}</Text>
                            {school.plan && (
                                <Text className="text-sm text-muted-foreground mt-1">
                                    {school.plan === 'LITE' && 'Perfect for small schools'}
                                    {school.plan === 'GROWTH' && 'Great for growing schools'}
                                    {school.plan === 'ENTERPRISE' && 'Best for large schools'}
                                </Text>
                            )}
                        </View>
                    </CardContent>

                    <CardFooter className="flex-col gap-3">
                        <Button
                            className="w-full"
                            size="lg"
                            onPress={handlePayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <Text>Processing...</Text>
                            ) : (
                                <>
                                    <HugeiconsIcon icon={CreditCardIcon} size={16} className="mr-2" />
                                    <Text>Make Payment</Text>
                                </>
                            )}
                        </Button>

                        {!isLocked && (
                            <Button variant="outline" className="w-full" onPress={() => router.back()}>
                                <Text>Go Back</Text>
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </View>
        </ScrollView>
    );
}
