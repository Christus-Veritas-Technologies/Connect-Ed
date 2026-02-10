"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle, School, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useChatRooms, type ChatRoom } from "@/lib/hooks/use-chat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBreadcrumbs, EmptyState } from "@/components/dashboard";

export default function ChatsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { data, isLoading } = useChatRooms();

    const rooms = data?.rooms || [];

    // For non-admin roles with a single room, redirect straight to the chat
    useEffect(() => {
        if (!isLoading && rooms.length === 1 && user?.role !== "ADMIN") {
            router.replace(`/dashboard/chats/${rooms[0]!.classId}`);
        }
    }, [isLoading, rooms, user?.role, router]);

    // If we're about to redirect, show nothing
    if (!isLoading && rooms.length === 1 && user?.role !== "ADMIN") {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <DashboardBreadcrumbs items={[{ label: "Chats" }]} />

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Class Chats</h1>
                <p className="text-muted-foreground mt-1">
                    {user?.role === "ADMIN"
                        ? "View and manage all class chat rooms"
                        : "Your class conversations"}
                </p>
            </div>

            {/* Room list */}
            {isLoading ? (
                <div className="grid gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <EmptyState
                    icon={MessageCircle}
                    title="No chat rooms yet"
                    description={
                        user?.role === "ADMIN"
                            ? "Create a class to start chatting. Chat rooms are automatically created for each class."
                            : "You'll see your class chat here once you're assigned to a class."
                    }
                />
            ) : (
                <div className="grid gap-3">
                    {rooms.map((room, index) => (
                        <RoomCard key={room.classId} room={room} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RoomCard({ room, index }: { room: ChatRoom; index: number }) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
        >
            <Card
                hover
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/chats/${room.classId}`)}
            >
                <CardContent className="p-4 flex items-center gap-4">
                    {/* Class avatar */}
                    <div className="size-12 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <School className="size-5 text-brand" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{room.className}</h3>
                            {room.level && (
                                <Badge size="sm" variant="outline">
                                    {room.level}
                                </Badge>
                            )}
                        </div>
                        {room.lastMessage ? (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                                <span className="font-medium">
                                    {room.lastMessage.senderName}:
                                </span>{" "}
                                {room.lastMessage.content}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground/60 mt-0.5">
                                No messages yet
                            </p>
                        )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {room.lastMessage && (
                            <span className="text-[10px] text-muted-foreground">
                                {formatRelative(room.lastMessage.createdAt)}
                            </span>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="size-3" />
                            <span>{room.memberCount}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function formatRelative(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
