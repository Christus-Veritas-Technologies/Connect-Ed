import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            await login(email.trim(), password);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 justify-center px-6 py-12">
                    {/* Logo */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'timing', duration: 500 }}
                        className="items-center mb-10"
                    >
                        <View className="h-20 w-20 rounded-2xl bg-brand items-center justify-center mb-4 shadow-lg">
                            <Text className="text-3xl font-bold text-white">CE</Text>
                        </View>
                        <Text className="text-2xl font-bold text-foreground">Connect-Ed</Text>
                        <Text className="text-sm text-muted-foreground mt-1">
                            School Management
                        </Text>
                    </MotiView>

                    {/* Form */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400, delay: 200 }}
                        className="gap-4"
                    >
                        <Text className="text-xl font-semibold text-foreground text-center mb-2">
                            Sign in to your account
                        </Text>

                        {error && (
                            <Alert
                                variant="destructive"
                                title="Sign in failed"
                                description={error}
                                dismissible
                                onDismiss={() => setError(null)}
                            />
                        )}

                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            editable={!isLoading}
                        />

                        <View className="gap-1.5">
                            <Text className="text-sm font-medium text-foreground">Password</Text>
                            <View className="relative">
                                <Input
                                    placeholder="Enter your password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoComplete="password"
                                    editable={!isLoading}
                                    onSubmitEditing={handleLogin}
                                    returnKeyType="go"
                                />
                                <Pressable
                                    onPress={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3"
                                    hitSlop={8}
                                >
                                    <HugeiconsIcon
                                        icon={showPassword ? ViewOffIcon : ViewIcon}
                                        size={20}
                                        color="#64748B"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        <Button
                            variant="brand"
                            label={isLoading ? 'Signing in...' : 'Sign In'}
                            onPress={handleLogin}
                            disabled={isLoading}
                            className="mt-4"
                        />

                        <Text className="text-xs text-muted-foreground text-center mt-6">
                            Don't have an account? Ask your school administrator{'\n'}
                            to create one for you via the web portal.
                        </Text>
                    </MotiView>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
