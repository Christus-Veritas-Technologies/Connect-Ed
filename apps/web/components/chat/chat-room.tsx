"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SentIcon,
    ArrowDown01Icon,
    WifiConnected01Icon,
    WifiDisconnected01Icon,
    UserGroupIcon,
    MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useChatMessages,
    useChatMembers,
    useChatWebSocket,
    useSendMessage,
    useChatFileUpload,
    type ChatMessage,
} from "@/lib/hooks/use-chat";
import { useAuth } from "@/lib/auth-context";
import { ChatMessageBubble } from "./chat-message";
import { ChatInput } from "./chat-input";
import { MembersSheet } from "./members-sheet";

interface ChatRoomProps {
    classId: string;
    className: string;
}

export function ChatRoom({ classId, className }: ChatRoomProps) {
    const { user } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [systemMessages, setSystemMessages] = useState<string[]>([]);

    // Data hooks
    const {
        data: messagesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: messagesLoading,
    } = useChatMessages(classId);

    const { data: membersData } = useChatMembers(classId);
    const sendMessageMutation = useSendMessage(classId);
    const { mutateAsync: uploadFile, isPending: isUploading, uploadProgress } = useChatFileUpload(classId);

    // All messages across pages (reversed so newest are at bottom)
    const allMessages = useMemo(() => {
        if (!messagesData?.pages) return [];
        const msgs: ChatMessage[] = [];
        // pages are returned in desc order. Flatten all and reverse for chronological.
        for (const page of messagesData.pages) {
            msgs.push(...page.messages);
        }
        msgs.reverse();
        return msgs;
    }, [messagesData]);

    // WebSocket
    const { isConnected, sendMessage: wsSend } = useChatWebSocket({
        classId,
        enabled: false,  // Disabled due to reconnection issues - using REST fallback
        onSystemMessage: (msg) => {
            // Filter out join/leave messages to prevent spam during reconnections
            const shouldDisplay = !msg.includes("joined the chat") && !msg.includes("left the chat");
            if (shouldDisplay) {
                setSystemMessages((prev) => [...prev.slice(-4), msg]);
                // Auto-dismiss after 5s
                setTimeout(() => setSystemMessages((prev) => prev.slice(1)), 5000);
            }
        },
    });

    // Determine current user identity for message alignment
    const currentUserId = user?.id || "";
    const currentRole = user?.role || "";

    // Scroll to bottom on new messages
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const el = scrollContainerRef.current;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (isNearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [allMessages.length]);

    // Initial scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }, [messagesLoading]);

    // Scroll handler for "scroll down" button & load more
    const handleScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollDown(distFromBottom > 300);
        // Load more when near top
        if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Send handler
    const handleSend = useCallback(
        (data: {
            content: string;
            messageType?: string;
            metadata?: Record<string, unknown>;
            targetStudentId?: string;
        }) => {
            // Try WebSocket first, fallback to REST
            const sent = wsSend(data);
            if (!sent) {
                sendMessageMutation.mutate({
                    content: data.content,
                    messageType: data.messageType,
                    metadata: data.metadata,
                    targetStudentId: data.targetStudentId,
                });
            }
        },
        [wsSend, sendMessageMutation]
    );

    // File upload handler
    const handleFileUpload = useCallback(
        async (file: File) => {
            try {
                await uploadFile(file);
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            } catch {
                // error handled by mutation
            }
        },
        [uploadFile]
    );

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-white to-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-brand/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand">
                            {className.slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">{className}</h2>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <HugeiconsIcon
                                icon={isConnected ? WifiConnected01Icon : WifiDisconnected01Icon}
                                size={12}
                                className={isConnected ? "text-emerald-500" : "text-red-400"}
                            />
                            <span>{isConnected ? "Connected" : "Reconnecting…"}</span>
                            {membersData?.members && (
                                <>
                                    <span>·</span>
                                    <span>{membersData.members.length} members</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMembersOpen(true)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <HugeiconsIcon icon={UserGroupIcon} size={18} />
                </Button>
            </div>

            {/* Messages area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth"
            >
                {/* Load more indicator */}
                {isFetchingNextPage && (
                    <div className="flex justify-center py-2">
                        <div className="h-5 w-5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
                    </div>
                )}

                {messagesLoading ? (
                    <div className="space-y-4 pt-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "justify-end"}`}>
                                <Skeleton className="size-8 rounded-full" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-10 w-48 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <HugeiconsIcon icon={SentIcon} size={28} className="text-gray-300" />
                        </div>
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm">Be the first to say something!</p>
                    </div>
                ) : (
                    <>
                        {allMessages.map((msg, idx) => {
                            const prevMsg = idx > 0 ? allMessages[idx - 1] : null;
                            const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.senderType !== msg.senderType;
                            const isOwn =
                                msg.senderId === currentUserId &&
                                ((msg.senderType === "USER" && ["ADMIN", "TEACHER", "RECEPTIONIST"].includes(currentRole)) ||
                                    (msg.senderType === "STUDENT" && currentRole === "STUDENT") ||
                                    (msg.senderType === "PARENT" && currentRole === "PARENT"));

                            return (
                                <ChatMessageBubble
                                    key={msg.id}
                                    message={msg}
                                    isOwn={isOwn}
                                    showAvatar={showAvatar}
                                />
                            );
                        })}
                    </>
                )}

                {/* System messages */}
                <AnimatePresence>
                    {systemMessages.map((msg, i) => (
                        <motion.div
                            key={`sys-${i}-${msg}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex justify-center"
                        >
                            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                                {msg}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>

            {/* Scroll-to-bottom FAB */}
            <AnimatePresence>
                {showScrollDown && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute bottom-24 right-8"
                    >
                        <Button
                            size="icon-sm"
                            variant="outline"
                            className="rounded-full shadow-lg bg-white"
                            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                        >
                            <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input */}
            <ChatInput
                onSend={handleSend}
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                userRole={currentRole}
                disabled={!isConnected && !sendMessageMutation}
            />

            {/* Members sheet */}
            <MembersSheet
                open={membersOpen}
                onOpenChange={setMembersOpen}
                members={membersData?.members || []}
            />
        </div>
    );
}
