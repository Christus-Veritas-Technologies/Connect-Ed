"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function VerifyEmailPage() {
    const { user, refreshUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    // If already verified, redirect
    if (user?.emailVerified) {
        router.push("/dashboard");
        return null;
    }

    // Handle token-based verification (from email link)
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) return;

            setLoading(true);
            try {
                const response = await fetch(`/api/auth/verify-email-link/${token}`);

                if (response.ok) {
                    setSuccess(true);
                    await refreshUser();
                    setTimeout(() => {
                        router.push("/dashboard");
                    }, 1500);
                } else {
                    const data = await response.json();
                    setError(data.message || "Verification link is invalid or expired");
                }
            } catch (err) {
                setError("Failed to verify email. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token, refreshUser, router]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response: any = await api.post("/auth/verify-email", { code });

            if (response.ok) {
                setSuccess(true);
                // Refresh user data
                await refreshUser();
                // Redirect after short delay
                setTimeout(() => {
                    router.push("/dashboard");
                }, 1500);
            } else {
                const data = await response.json();
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-blue-100 p-3">
                            <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                    <CardDescription>
                        {token ? "Verifying your email..." : `We've sent a verification link to ${user?.email}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Email verified successfully! Redirecting...
                            </AlertDescription>
                        </Alert>
                    ) : loading && token ? (
                        <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                            <p className="text-sm text-gray-600">Verifying your email...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {resendSuccess && (
                                <Alert className="bg-blue-50 border-blue-200 mb-4">
                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-800">
                                        Verification link sent! Check your inbox.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleVerify} className="space-y-4">
                                <div>
                                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                                        Verification Code
                                    </label>
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        maxLength={6}
                                        className="text-center text-2xl tracking-widest"
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify Email"
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-600 mb-2">
                                    Didn't receive the link?
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    className="w-full"
                                >
                                    {resendLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        "Resend Link"
                                    )}
                                </Button>
                            </div>

                            <p className="mt-6 text-xs text-gray-500 text-center">
                                The verification link expires in 24 hours. If it expires, request a new one.
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
