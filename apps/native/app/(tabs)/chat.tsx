import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { SentIcon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/secure-store';
import { WS_URL } from '@/lib/constants';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import type { ChatMessage } from '@/lib/types';

// ========================================
// CHAT ROOMS LIST
// ========================================

function ChatRoomsList({ onSelectRoom }: { onSelectRoom: (room: any) => void }) {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['chat', 'rooms'],
        queryFn: () => api.get<any>('/chat/rooms'),
    });

    const rooms = data?.rooms ?? [];

    if (isLoading) return <Loading fullScreen />;

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            {rooms.length === 0 ? (
                <View className="items-center py-20">
                    <Text className="text-sm text-muted-foreground">No chat rooms available</Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                        You'll see your class chat rooms here
                    </Text>
                </View>
            ) : (
                rooms.map((room: any, idx: number) => (
                    <MotiView
                        key={room.classId}
                        from={{ opacity: 0, translateY: 8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 250, delay: idx * 50 }}
                    >
                        <Pressable onPress={() => onSelectRoom(room)}>
                            <Card className="mb-2">
                                <CardContent className="py-3">
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="text-base font-semibold text-foreground">{room.className}</Text>
                                        <Badge variant="secondary">
                                            <Text className="text-xs">{room.studentCount} students</Text>
                                        </Badge>
                                    </View>
                                    {room.lastMessage && (
                                        <View className="flex-row items-center gap-1 mt-1">
                                            <Text className="text-xs text-muted-foreground font-medium" numberOfLines={1}>
                                                {room.lastMessage.senderName}:
                                            </Text>
                                            <Text className="text-xs text-muted-foreground flex-1" numberOfLines={1}>
                                                {room.lastMessage.content}
                                            </Text>
                                        </View>
                                    )}
                                </CardContent>
                            </Card>
                        </Pressable>
                    </MotiView>
                ))
            )}
        </ScrollView>
    );
}

// ========================================
// CHAT ROOM (WebSocket)
// ========================================

function ChatRoom({ room, onBack }: { room: any; onBack: () => void }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Load historical messages
    useEffect(() => {
        const loadMessages = async () => {
            try {
                const data = await api.get<any>(`/chat/rooms/${room.classId}/messages`);
                // Messages come newest first from API, reverse for display
                setMessages((data.messages ?? []).reverse());
            } catch (err) {
                console.error('Failed to load messages:', err);
            } finally {
                setIsLoadingMessages(false);
            }
        };
        loadMessages();
    }, [room.classId]);

    // WebSocket connection
    useEffect(() => {
        let ws: WebSocket | null = null;
        let pingInterval: ReturnType<typeof setInterval>;

        const connect = async () => {
            const token = await getAccessToken();
            if (!token || !WS_URL) return;

            const url = `${WS_URL}/ws/chat?token=${encodeURIComponent(token)}&classId=${encodeURIComponent(room.classId)}`;
            ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                // Send ping every 30 seconds to keep connection alive
                pingInterval = setInterval(() => {
                    if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'pong') return;

                    if (data.type === 'message' && data.message) {
                        setMessages((prev) => [...prev, data.message]);
                    }

                    if (data.type === 'system') {
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `sys-${Date.now()}`,
                                type: 'system',
                                content: data.message,
                                createdAt: data.timestamp || new Date().toISOString(),
                            },
                        ]);
                    }
                } catch (err) {
                    console.error('WS message parse error:', err);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                clearInterval(pingInterval);
            };

            ws.onerror = () => {
                setIsConnected(false);
            };
        };

        connect();

        return () => {
            clearInterval(pingInterval);
            if (ws) {
                ws.close();
                wsRef.current = null;
            }
        };
    }, [room.classId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const sendMessage = useCallback(() => {
        const content = inputText.trim();
        if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        wsRef.current.send(
            JSON.stringify({
                type: 'message',
                content,
                messageType: 'TEXT',
            })
        );
        setInputText('');
    }, [inputText]);

    const isOwnMessage = (msg: any) => {
        return msg.senderId === user?.id;
    };

    if (isLoadingMessages) return <Loading fullScreen />;

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-background"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <SafeAreaView edges={['top']} className="bg-background border-b border-border">
                <View className="flex-row items-center px-4 py-3 gap-3">
                    <Pressable onPress={onBack} hitSlop={8}>
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={24} color="#0F172A" />
                    </Pressable>
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">{room.className}</Text>
                        <Text className="text-xs text-muted-foreground">
                            {isConnected ? '● Connected' : '○ Connecting...'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, idx) => item.id || `msg-${idx}`}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                    <View className="items-center py-20">
                        <Text className="text-sm text-muted-foreground">No messages yet</Text>
                        <Text className="text-xs text-muted-foreground mt-1">Start the conversation!</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    // System messages
                    if (item.type === 'system') {
                        return (
                            <View className="items-center my-2">
                                <Text className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                    {item.content}
                                </Text>
                            </View>
                        );
                    }

                    const own = isOwnMessage(item);

                    return (
                        <View className={`mb-2 max-w-[80%] ${own ? 'self-end' : 'self-start'}`}>
                            {!own && (
                                <Text className="text-xs text-muted-foreground mb-0.5 ml-1">
                                    {item.senderName}
                                </Text>
                            )}
                            <View
                                className={`px-3 py-2 rounded-2xl ${own
                                        ? 'bg-brand rounded-br-sm'
                                        : 'bg-muted rounded-bl-sm'
                                    }`}
                            >
                                <Text className={`text-sm ${own ? 'text-white' : 'text-foreground'}`}>
                                    {item.content}
                                </Text>
                            </View>
                            <Text className={`text-[10px] text-muted-foreground mt-0.5 ${own ? 'text-right mr-1' : 'ml-1'}`}>
                                {formatTime(item.createdAt)}
                            </Text>
                        </View>
                    );
                }}
            />

            {/* Input */}
            <SafeAreaView edges={['bottom']} className="border-t border-border bg-background">
                <View className="flex-row items-center px-4 py-2 gap-2">
                    <TextInput
                        className="flex-1 h-10 px-3 bg-muted rounded-full text-foreground text-sm"
                        placeholder="Type a message..."
                        placeholderTextColor="#94A3B8"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                        editable={isConnected}
                    />
                    <Pressable
                        onPress={sendMessage}
                        disabled={!inputText.trim() || !isConnected}
                        className={`h-10 w-10 rounded-full items-center justify-center ${inputText.trim() && isConnected ? 'bg-brand' : 'bg-muted'
                            }`}
                    >
                        <HugeiconsIcon icon={SentIcon} size={18} color={inputText.trim() && isConnected ? '#FFF' : '#94A3B8'} />
                    </Pressable>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ========================================
// MAIN CHAT SCREEN
// ========================================

export default function ChatScreen() {
    const { user } = useAuth();
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    // For teacher/parent/student with only 1 class, auto-select
    // For admin, show room list

    return (
        <SafeAreaView className="flex-1 bg-background" edges={selectedRoom ? [] : ['top']}>
            {!selectedRoom ? (
                <>
                    <View className="px-4 pt-2 pb-3">
                        <Text className="text-lg font-bold text-foreground">Chats</Text>
                    </View>
                    <ChatRoomsList onSelectRoom={setSelectedRoom} />
                </>
            ) : (
                <ChatRoom room={selectedRoom} onBack={() => setSelectedRoom(null)} />
            )}
        </SafeAreaView>
    );
}
