import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TextInput, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Add01Icon, SentIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';

function getEndpointForRole(role: string) {
    if (role === 'PARENT') return '/announcements/parent';
    if (role === 'STUDENT') return '/announcements/student';
    return '/announcements';
}

function getCommentEndpoint(id: string, role: string) {
    if (role === 'PARENT') return `/announcements/${id}/comments/parent`;
    if (role === 'STUDENT') return `/announcements/${id}/comments/student`;
    return `/announcements/${id}/comments`;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function AnnouncementsScreen() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const role = user?.role || 'STUDENT';
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
    const [commentText, setCommentText] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['announcements', role],
        queryFn: () => api.get<any>(getEndpointForRole(role)),
    });

    const commentMutation = useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) =>
            api.post(getCommentEndpoint(id, role), { content }),
        onSuccess: () => {
            setCommentText('');
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            refetch();
        },
    });

    const announcements = data?.announcements ?? [];

    if (isLoading) return <Loading fullScreen />;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-foreground">Announcements</Text>
                {role === 'ADMIN' && (
                    <Pressable
                        onPress={() => setShowCreate(true)}
                        className="h-9 w-9 rounded-full bg-brand items-center justify-center"
                    >
                        <HugeiconsIcon icon={Add01Icon} size={18} color="#FFF" />
                    </Pressable>
                )}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {announcements.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <Text className="text-base text-muted-foreground">No announcements yet</Text>
                    </View>
                ) : (
                    announcements.map((announcement: any, idx: number) => (
                        <MotiView
                            key={announcement.id}
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 300, delay: idx * 50 }}
                        >
                            <Card className="mb-3">
                                <CardHeader>
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-1 mr-2">
                                            <CardTitle>{announcement.heading}</CardTitle>
                                        </View>
                                        <Badge variant="secondary">
                                            <Text className="text-xs">{timeAgo(announcement.createdAt)}</Text>
                                        </Badge>
                                    </View>
                                    {announcement.createdBy && (
                                        <Text className="text-xs text-muted-foreground mt-1">
                                            By {announcement.createdBy.name}
                                        </Text>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <Text className="text-sm text-foreground leading-5">
                                        {announcement.subheading}
                                    </Text>

                                    {/* Comments preview */}
                                    <Pressable
                                        onPress={() => setSelectedAnnouncement(announcement)}
                                        className="mt-3 pt-3 border-t border-border"
                                    >
                                        <Text className="text-xs text-brand font-medium">
                                            {announcement._count?.comments || announcement.comments?.length || 0} comments · Tap to view
                                        </Text>
                                    </Pressable>
                                </CardContent>
                            </Card>
                        </MotiView>
                    ))
                )}
            </ScrollView>

            {/* Comments Modal */}
            <Modal
                visible={!!selectedAnnouncement}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedAnnouncement(null)}
            >
                <SafeAreaView className="flex-1 bg-background">
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                        <Text className="text-lg font-bold text-foreground flex-1 mr-2" numberOfLines={1}>
                            {selectedAnnouncement?.heading}
                        </Text>
                        <Pressable onPress={() => setSelectedAnnouncement(null)}>
                            <HugeiconsIcon icon={Cancel01Icon} size={24} color="#64748B" />
                        </Pressable>
                    </View>

                    <ScrollView className="flex-1 px-4 pt-4">
                        <Text className="text-sm text-foreground leading-5 mb-4">
                            {selectedAnnouncement?.subheading}
                        </Text>

                        <Text className="text-sm font-semibold text-foreground mb-3">Comments</Text>

                        {selectedAnnouncement?.comments?.map((comment: any) => (
                            <View key={comment.id} className="mb-3 p-3 bg-muted rounded-lg">
                                <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-sm font-medium text-foreground">
                                        {comment.user?.name || comment.parent?.name || `${comment.student?.firstName} ${comment.student?.lastName}` || 'Unknown'}
                                    </Text>
                                    <Text className="text-xs text-muted-foreground">
                                        {timeAgo(comment.createdAt)}
                                    </Text>
                                </View>
                                <Text className="text-sm text-foreground">{comment.content}</Text>
                            </View>
                        ))}

                        {(!selectedAnnouncement?.comments?.length) && (
                            <Text className="text-sm text-muted-foreground text-center py-4">No comments yet</Text>
                        )}
                    </ScrollView>

                    {/* Comment input */}
                    <View className="px-4 py-3 border-t border-border flex-row items-center gap-2">
                        <TextInput
                            className="flex-1 h-10 px-3 bg-muted rounded-lg text-foreground text-sm"
                            placeholder="Write a comment..."
                            placeholderTextColor="#94A3B8"
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline={false}
                        />
                        <Pressable
                            onPress={() => {
                                if (commentText.trim() && selectedAnnouncement) {
                                    commentMutation.mutate({ id: selectedAnnouncement.id, content: commentText.trim() });
                                }
                            }}
                            disabled={!commentText.trim() || commentMutation.isPending}
                            className="h-10 w-10 rounded-full bg-brand items-center justify-center"
                        >
                            <HugeiconsIcon icon={SentIcon} size={18} color="#FFF" />
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Create Announcement Modal (Admin only) */}
            {role === 'ADMIN' && (
                <CreateAnnouncementModal
                    visible={showCreate}
                    onClose={() => setShowCreate(false)}
                    onCreated={() => {
                        setShowCreate(false);
                        refetch();
                    }}
                />
            )}
        </SafeAreaView>
    );
}

function CreateAnnouncementModal({
    visible,
    onClose,
    onCreated,
}: {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [heading, setHeading] = useState('');
    const [subheading, setSubheading] = useState('');
    const [length, setLength] = useState<'ONE_DAY' | 'ONE_WEEK' | 'ONE_MONTH'>('ONE_WEEK');

    const mutation = useMutation({
        mutationFn: (data: { heading: string; subheading: string; length: string }) =>
            api.post('/announcements', data),
        onSuccess: () => {
            setHeading('');
            setSubheading('');
            setLength('ONE_WEEK');
            onCreated();
        },
    });

    const lengths: { label: string; value: typeof length }[] = [
        { label: '1 Day', value: 'ONE_DAY' },
        { label: '1 Week', value: 'ONE_WEEK' },
        { label: '1 Month', value: 'ONE_MONTH' },
    ];

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                    <Text className="text-lg font-bold text-foreground">New Announcement</Text>
                    <Pressable onPress={onClose}>
                        <HugeiconsIcon icon={Cancel01Icon} size={24} color="#64748B" />
                    </Pressable>
                </View>

                <ScrollView className="flex-1 px-4 pt-4">
                    <Input
                        label="Heading"
                        placeholder="Announcement heading"
                        value={heading}
                        onChangeText={setHeading}
                        maxLength={32}
                    />

                    <View className="mt-4">
                        <Text className="text-sm font-medium text-foreground mb-1.5">Content</Text>
                        <TextInput
                            className="min-h-[120px] p-3 bg-muted rounded-lg text-foreground text-sm"
                            placeholder="Announcement content..."
                            placeholderTextColor="#94A3B8"
                            value={subheading}
                            onChangeText={setSubheading}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-sm font-medium text-foreground mb-1.5">Duration</Text>
                        <View className="flex-row gap-2">
                            {lengths.map((l) => (
                                <Pressable
                                    key={l.value}
                                    onPress={() => setLength(l.value)}
                                    className={`flex-1 py-2.5 rounded-lg items-center border ${length === l.value
                                            ? 'bg-brand border-brand'
                                            : 'bg-muted border-border'
                                        }`}
                                >
                                    <Text
                                        className={`text-sm font-medium ${length === l.value ? 'text-white' : 'text-foreground'
                                            }`}
                                    >
                                        {l.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <Button
                        variant="brand"
                        label={mutation.isPending ? 'Creating...' : 'Create Announcement'}
                        onPress={() => {
                            if (heading.trim() && subheading.trim()) {
                                mutation.mutate({ heading: heading.trim(), subheading: subheading.trim(), length });
                            }
                        }}
                        disabled={!heading.trim() || !subheading.trim() || mutation.isPending}
                        className="mt-6"
                    />

                    {mutation.isError && (
                        <Text className="text-sm text-red-500 text-center mt-2">
                            Failed to create announcement. Try again.
                        </Text>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
