"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Loader2,
    Wifi,
    WifiOff,
    Smartphone,
    QrCode,
    Unplug,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    MessageSquare,
} from "lucide-react";
import {
    useWhatsAppStatus,
    useWhatsAppQR,
    useConnectWhatsApp,
    useDisconnectWhatsApp,
    whatsappKeys,
    type WhatsAppStatus,
} from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DashboardBreadcrumbs, PageHeader } from "@/components/dashboard";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

// ── Status Badge ───────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; variant: "brand" | "success" | "warning" | "destructive" | "default" }> = {
        ready: { label: "Connected", variant: "success" },
        qr: { label: "Waiting for QR Scan", variant: "warning" },
        initializing: { label: "Initializing…", variant: "warning" },
        authenticated: { label: "Authenticating…", variant: "warning" },
        disconnected: { label: "Disconnected", variant: "destructive" },
        destroyed: { label: "Disconnected", variant: "destructive" },
        not_initialized: { label: "Not Connected", variant: "default" },
        unknown: { label: "Unknown", variant: "default" },
    };
    const info = map[status] || map.unknown!;
    return <Badge variant={info.variant}>{info.label}</Badge>;
}

// ── QR Code Panel ──────────────────────────────

function QRCodePanel({ qrCode, status }: { qrCode: string | null; status: string }) {
    if (status === "ready") {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <CheckCircle2 className="size-16 text-green-500" />
                <p className="text-lg font-semibold text-green-700">WhatsApp Connected!</p>
                <p className="text-sm text-muted-foreground">Your school&apos;s WhatsApp is active and ready to send messages.</p>
            </div>
        );
    }

    if (status === "qr" && qrCode) {
        return (
            <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-sm text-muted-foreground">Scan this QR code with your WhatsApp mobile app:</p>
                <div className="rounded-2xl bg-white p-4 shadow-lg border">
                    <QRCodeSVG value={qrCode} size={256} level="M" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">1. Open WhatsApp on your phone</p>
                    <p className="text-xs text-muted-foreground">2. Tap <strong>Menu</strong> or <strong>Settings</strong> → <strong>Linked Devices</strong></p>
                    <p className="text-xs text-muted-foreground">3. Tap <strong>Link a Device</strong> → scan the QR code</p>
                </div>
            </div>
        );
    }

    if (status === "initializing" || status === "authenticated") {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="size-12 animate-spin text-brand" />
                <p className="text-sm text-muted-foreground">
                    {status === "initializing"
                        ? "Starting WhatsApp client… This may take a moment."
                        : "Authenticated! Finishing setup…"}
                </p>
            </div>
        );
    }

    return null;
}

// ── Main Page ──────────────────────────────────

export default function WhatsAppIntegrationPage() {
    const [isManuallyConnecting, setIsManuallyConnecting] = useState(false);

    // Poll status whenever manually connecting, or when we detect a status check is needed
    const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<WhatsAppStatus>({
        queryKey: whatsappKeys.status(),
        queryFn: () => api.get("/whatsapp-integration/status"),
        refetchInterval: isManuallyConnecting ? 2000 : false, // Poll every 2s while connecting
    });

    const connectMutation = useConnectWhatsApp();
    const disconnectMutation = useDisconnectWhatsApp();

    // Poll QR when in connecting/qr state
    const isConnecting =
        isManuallyConnecting ||
        statusData?.liveStatus === "qr" ||
        statusData?.liveStatus === "initializing" ||
        statusData?.liveStatus === "authenticated";

    const { data: qrData } = useWhatsAppQR(isConnecting);

    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

    // When QR is scanned and agent reports "ready", or when status becomes connected, stop polling
    useEffect(() => {
        if (statusData?.connected && statusData?.liveStatus === "ready") {
            setIsManuallyConnecting(false);
        }
    }, [statusData?.connected, statusData?.liveStatus]);

    const handleConnect = async () => {
        try {
            setIsManuallyConnecting(true);
            await connectMutation.mutateAsync();
            toast.success("WhatsApp client initializing…");
        } catch (err) {
            setIsManuallyConnecting(false);
            const message = err instanceof ApiError ? err.message : "Failed to connect";
            toast.error(message);
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnectMutation.mutateAsync();
            toast.success("WhatsApp disconnected");
            setShowDisconnectDialog(false);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to disconnect";
            toast.error(message);
        }
    };

    const liveStatus = qrData?.status || statusData?.liveStatus || "unknown";
    const qrCode = qrData?.qrCode || statusData?.qrCode || null;
    const isConnected = statusData?.connected && liveStatus === "ready";
    const quotaPercent = statusData ? Math.round((statusData.used / statusData.quota) * 100) : 0;

    return (
        <div className="space-y-6">
            <DashboardBreadcrumbs
                items={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "WhatsApp Integration" },
                ]}
            />
            <PageHeader
                title="WhatsApp Integration"
                subtitle="Connect your school's WhatsApp number to send notifications to parents and staff."
            />

            {statusLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-brand" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* ─── Connection Card ─────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isConnected ? (
                                            <div className="size-10 rounded-xl bg-green-100 flex items-center justify-center">
                                                <Wifi className="size-5 text-green-600" />
                                            </div>
                                        ) : (
                                            <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                                <WifiOff className="size-5 text-gray-500" />
                                            </div>
                                        )}
                                        <div>
                                            <CardTitle>Connection Status</CardTitle>
                                            <CardDescription>
                                                {isConnected
                                                    ? "Your WhatsApp is connected and active"
                                                    : "Connect your school's WhatsApp number"}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <StatusBadge status={liveStatus} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Connected phone */}
                                {isConnected && statusData?.phone && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                                        <Smartphone className="size-5 text-green-600" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Connected Phone</p>
                                            <p className="text-xs text-green-600">+{statusData.phone}</p>
                                        </div>
                                    </div>
                                )}

                                {/* QR Code / Status panel */}
                                <QRCodePanel qrCode={qrCode} status={liveStatus} />

                                {/* Action buttons */}
                                <div className="flex gap-3">
                                    {!isConnected && !isConnecting && (
                                        <Button
                                            onClick={handleConnect}
                                            disabled={connectMutation.isPending}
                                            className="flex-1"
                                        >
                                            {connectMutation.isPending ? (
                                                <Loader2 className="mr-2 size-4 animate-spin" />
                                            ) : (
                                                <QrCode className="mr-2 size-4" />
                                            )}
                                            Connect WhatsApp
                                        </Button>
                                    )}

                                    {isConnecting && (
                                        <Button
                                            variant="outline"
                                            onClick={() => refetchStatus()}
                                            className="flex-1"
                                        >
                                            <RefreshCw className="mr-2 size-4" />
                                            Refresh Status
                                        </Button>
                                    )}

                                    {isConnected && (
                                        <Button
                                            variant="destructive"
                                            onClick={() => setShowDisconnectDialog(true)}
                                            className="flex-1"
                                        >
                                            <Unplug className="mr-2 size-4" />
                                            Disconnect
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* ─── Info & Quota Card ───────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Quota */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-brand/10 flex items-center justify-center">
                                        <MessageSquare className="size-5 text-brand" />
                                    </div>
                                    <div>
                                        <CardTitle>Message Quota</CardTitle>
                                        <CardDescription>Monthly WhatsApp message usage</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Messages Sent</span>
                                    <span className="font-semibold">
                                        {statusData?.used ?? 0} / {statusData?.quota ?? 0}
                                    </span>
                                </div>
                                <Progress value={quotaPercent} className="h-2" />
                                {quotaPercent >= 80 && (
                                    <div className="flex items-center gap-2 text-xs text-amber-600">
                                        <AlertCircle className="size-4" />
                                        <span>You&apos;re running low on your message quota.</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* How it works */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">How it works</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { step: 1, text: 'Click "Connect WhatsApp" to start the pairing process.' },
                                        { step: 2, text: "Scan the QR code using WhatsApp on the school phone." },
                                        { step: 3, text: "Once connected, notifications will be sent from that number." },
                                        { step: 4, text: "Parents and staff can also reply to interact with the AI agent." },
                                    ].map(({ step, text }) => (
                                        <div key={step} className="flex gap-3 items-start">
                                            <div className="size-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-xs font-bold text-brand">{step}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* ─── Disconnect Confirmation Dialog ─────── */}
            <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disconnect WhatsApp?</DialogTitle>
                        <DialogDescription>
                            This will disconnect your school&apos;s WhatsApp number. Notifications will no longer be sent
                            via WhatsApp until you reconnect.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisconnect}
                            disabled={disconnectMutation.isPending}
                        >
                            {disconnectMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Disconnect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
