import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function VerifyEmailScreen() {
    const { user, refreshUser } = useAuth();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    // If already verified, redirect
    if (user?.emailVerified) {
        router.replace("/(tabs)");
        return null;
    }

    const handleVerify = async () => {
        setError("");
        setLoading(true);

        try {
            const response: any = await api.post("/auth/verify-email", { code });
            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                // Refresh user data
                await refreshUser();
                // Redirect after short delay
                setTimeout(() => {
                    router.replace("/(tabs)");
                }, 1500);
            } else {
                setError(data.message || "Invalid verification code");
            }
        } catch (err) {
            setError("Failed to verify email. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setResendSuccess(false);
        setError("");

        try {
            const response: any = await api.post("/auth/resend-verification", {
                email: user?.email
            });

            if (response.ok) {
                setResendSuccess(true);
                setTimeout(() => setResendSuccess(false), 5000);
            } else {
                setError("Failed to resend email. Please try again.");
            }
        } catch (err) {
            setError("Failed to resend email. Please try again.");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-gray-50"
        >
            <ScrollView
                className="flex-1 px-4"
                contentContainerClassName="py-12 justify-center min-h-full"
            >
                <Card className="p-6">
                    {/* Title */}
                    <Text className="text-2xl font-bold text-center mb-2">
                        Verify Your Email
                    </Text>
                    <Text className="text-center text-gray-600 mb-6">
                        We've sent a 6-digit verification code to{" "}
                        <Text className="font-semibold">{user?.email}</Text>
                    </Text>

                    {success ? (
                        <View className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                            <Text className="text-green-800">
                                Email verified successfully! Redirecting...
                            </Text>
                        </View>
                    ) : (
                        <>
                            {error && (
                                <View className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                                    <Text className="text-red-800">{error}</Text>
                                </View>
                            )}

                            {resendSuccess && (
                                <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                                    <Text className="text-blue-800">
                                        Verification code sent! Check your inbox.
                                    </Text>
                                </View>
                            )}

                            {/* Code Input */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">
                                    Verification Code
                                </Text>
                                <Input
                                    placeholder="Enter 6-digit code"
                                    value={code}
                                    onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    className="text-center text-2xl tracking-widest"
                                />
                            </View>

                            {/* Verify Button */}
                            <Button
                                onPress={handleVerify}
                                disabled={loading || code.length !== 6}
                                className="mb-6"
                            >
                                <Text className="text-white font-semibold">
                                    {loading ? "Verifying..." : "Verify Email"}
                                </Text>
                            </Button>

                            {/* Resend Section */}
                            <View className="items-center">
                                <Text className="text-sm text-gray-600 mb-2">
                                    Didn't receive the code?
                                </Text>
                                <Button
                                    variant="outline"
                                    onPress={handleResend}
                                    disabled={resendLoading}
                                >
                                    <Text className="font-semibold">
                                        {resendLoading ? "Sending..." : "Resend Code"}
                                    </Text>
                                </Button>
                            </View>

                            <Text className="mt-6 text-xs text-gray-500 text-center">
                                The code expires in 15 minutes. If it expires, request a new one.
                            </Text>
                        </>
                    )}
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
