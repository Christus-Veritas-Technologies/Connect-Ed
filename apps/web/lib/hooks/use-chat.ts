"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, getAccessToken } from "../api";

// ─── Types ───────────────────────────────────────────────────

export interface ChatRoom {
  classId: string;
  className: string;
  level: string | null;
  studentCount: number;
  memberCount: number;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  senderType: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  senderAvatar: string | null;
  type: "TEXT" | "EXAM_RESULT" | "GRADE" | "SUBJECT_INFO";
  content: string;
  metadata: Record<string, unknown> | null;
  targetStudentId: string | null;
  createdAt: string;
}

export interface ChatMember {
  id: string;
  memberType: string;
  memberId: string;
  role: string;
  name: string;
  avatar: string | null;
  joinedAt: string;
}

interface SystemMessage {
  type: "system";
  message: string;
  timestamp: string;
}

type WsEvent =
  | { type: "message"; message: ChatMessage }
  | SystemMessage
  | { type: "pong" }
  | { type: "error"; message: string };

// ─── Query Keys ──────────────────────────────────────────────

export const chatKeys = {
  all: ["chat"] as const,
  rooms: () => [...chatKeys.all, "rooms"] as const,
  messages: (classId: string) => [...chatKeys.all, "messages", classId] as const,
  members: (classId: string) => [...chatKeys.all, "members", classId] as const,
};

// ─── REST Hooks ──────────────────────────────────────────────

export function useChatRooms() {
  return useQuery<{ rooms: ChatRoom[] }>({
    queryKey: chatKeys.rooms(),
    queryFn: () => api.get("/chat/rooms"),
    refetchInterval: 30_000, // poll every 30s for unread indicators
  });
}

export function useChatMessages(classId: string) {
  return useInfiniteQuery<{
    messages: ChatMessage[];
    nextCursor: string | null;
  }>({
    queryKey: chatKeys.messages(classId),
    queryFn: ({ pageParam }) =>
      api.get(`/chat/rooms/${classId}/messages${pageParam ? `?cursor=${pageParam}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!classId,
  });
}

export function useChatMembers(classId: string) {
  return useQuery<{ members: ChatMember[] }>({
    queryKey: chatKeys.members(classId),
    queryFn: () => api.get(`/chat/rooms/${classId}/members`),
    enabled: !!classId,
  });
}

export function useSendMessage(classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      content: string;
      messageType?: string;
      metadata?: Record<string, unknown>;
      targetStudentId?: string;
    }) => api.post(`/chat/rooms/${classId}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(classId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
}

export function useSyncChatMembers(classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post(`/chat/rooms/${classId}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.members(classId) });
    },
  });
}

// ─── WebSocket Hook ──────────────────────────────────────────

interface UseChatWebSocketOptions {
  classId: string;
  enabled?: boolean;
  onMessage?: (message: ChatMessage) => void;
  onSystemMessage?: (msg: string) => void;
}

export function useChatWebSocket({
  classId,
  enabled = true,
  onMessage,
  onSystemMessage,
}: UseChatWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled || !classId) return;

    const token = getAccessToken();
    if (!token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const wsBase = apiUrl.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/ws/chat?token=${encodeURIComponent(token)}&classId=${encodeURIComponent(classId)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Start heartbeat
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25_000);
      ws.addEventListener("close", () => clearInterval(interval), { once: true });
    };

    ws.onmessage = (event) => {
      try {
        const data: WsEvent = JSON.parse(event.data);

        if (data.type === "message") {
          onMessage?.(data.message);

          // Prepend new message to the infinite query cache
          queryClient.setQueryData(chatKeys.messages(classId), (old: unknown) => {
            if (!old || typeof old !== "object") return old;
            const cache = old as { pages: Array<{ messages: ChatMessage[]; nextCursor: string | null }>; pageParams: unknown[] };
            if (!cache.pages?.length) return old;
            const firstPage = cache.pages[0]!;
            return {
              ...cache,
              pages: [
                { ...firstPage, messages: [data.message, ...firstPage.messages] },
                ...cache.pages.slice(1),
              ],
            };
          });

          // Also refresh room list for last-message preview
          queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
        }

        if (data.type === "system") {
          onSystemMessage?.(data.message);
        }
      } catch {
        // ignore non-JSON
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Reconnect after a short delay
      if (enabled) {
        reconnectTimerRef.current = setTimeout(() => connect(), 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [classId, enabled, onMessage, onSystemMessage, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (data: { content: string; messageType?: string; metadata?: Record<string, unknown>; targetStudentId?: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "message",
            ...data,
          })
        );
        return true;
      }
      return false;
    },
    []
  );

  return {
    isConnected,
    sendMessage,
    onlineCount,
  };
}
