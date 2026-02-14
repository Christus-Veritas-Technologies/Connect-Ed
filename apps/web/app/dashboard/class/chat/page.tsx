"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardBreadcrumbs } from "@/components/dashboard";
import { useAuth } from "@/lib/auth-context";
import { useChatRooms } from "@/lib/hooks/use-chat";
import { ChatRoom } from "@/components/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard";
import { MessageCircle } from "lucide-react";

export default function ClassChatPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { data: roomsData, isLoading, error } = useChatRooms();

    const rooms = roomsData?.rooms || [];
    const room = rooms[0]; // Teachers/students should only have one room

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[calc(100vh-8rem)] rounded-2xl" />
            </div>
        );
    }

    // Error loading chat rooms
    if (error) {
        return (
            <div className="space-y-6">
                <DashboardBreadcrumbs items={[{ label: "My Class", href: "/dashboard/class" }, { label: "Class Chat" }]} />
                <EmptyState
                    icon={<MessageCircle className="size-12" />}
                    title="Error Loading Chat"
                    description="Unable to load your class chat. Please try refreshing the page."
                />
            </div>
        );
    }

    // No class assigned
    if (rooms.length === 0) {
        return (
            <div className="space-y-6">
                <DashboardBreadcrumbs items={[{ label: "My Class", href: "/dashboard/class" }, { label: "Class Chat" }]} />
                <EmptyState
                    icon={<MessageCircle className="size-12" />}
                    title="No Class Chat Available"
                    description={
                        user?.role === "TEACHER"
                            ? "You'll see your class chat here once you're assigned as a class teacher."
                            : "You'll see your class chat here once you're assigned to a class."
                    }
                />
            </div>
        );
    }

    // Safety check - should not happen but TypeScript needs it
    if (!room) {
        return null;
    }

    return (
        <div className="space-y-3">
            <DashboardBreadcrumbs
                items={[
                    { label: "My Class", href: "/dashboard/class" },
                    { label: "Class Chat" },
                ]}
            />

            <ChatRoom
                classId={room.classId}
                className={room.className || "Class Chat"}
            />
        </div>
    );
}
