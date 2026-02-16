"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface WhatsAppStatus {
  connected: boolean;
  phone: string | null;
  liveStatus: string; // "not_initialized" | "initializing" | "qr" | "authenticated" | "ready" | "disconnected" | "destroyed"
  qrCode: string | null;
  quota: number;
  used: number;
  notificationsEnabled: boolean;
}

export interface WhatsAppConnectResult {
  status: string;
  qrCode: string | null;
  phone: string | null;
  message: string;
}

export interface WhatsAppQRResult {
  qrCode: string | null;
  status: string;
  phone: string | null;
}

// Query Keys
export const whatsappKeys = {
  all: ["whatsapp"] as const,
  status: () => [...whatsappKeys.all, "status"] as const,
  qr: () => [...whatsappKeys.all, "qr"] as const,
};

// Queries

/** Get the current WhatsApp connection status */
export function useWhatsAppStatus() {
  return useQuery<WhatsAppStatus>({
    queryKey: whatsappKeys.status(),
    queryFn: () => api.get("/whatsapp-integration/status"),
  });
}

/** Poll the QR code for scanning (used during connection) */
export function useWhatsAppQR(enabled: boolean) {
  return useQuery<WhatsAppQRResult>({
    queryKey: whatsappKeys.qr(),
    queryFn: () => api.get("/whatsapp-integration/qr"),
    enabled,
    refetchInterval: enabled ? 3000 : false, // Poll every 3s while waiting for QR
  });
}

// Mutations

/** Start the WhatsApp connection process */
export function useConnectWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<WhatsAppConnectResult>("/whatsapp-integration/connect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.qr() });
    },
  });
}

/** Disconnect WhatsApp */
export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<{ message: string }>("/whatsapp-integration/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.status() });
    },
  });
}
