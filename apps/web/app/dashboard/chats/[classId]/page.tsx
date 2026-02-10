"use client";

import { useParams } from "next/navigation";
import { DashboardBreadcrumbs } from "@/components/dashboard";
import { useAuth } from "@/lib/auth-context";
import { useChatRooms } from "@/lib/hooks/use-chat";
import { ChatRoom } from "@/components/chat";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatRoomPage() {
    const params = useParams();
    const { user } = useAuth();
    const classId = params.classId as string;
    const { data: roomsData, isLoading } = useChatRooms();

    const room = roomsData?.rooms.find((r) => r.classId === classId);
    const hasMultipleRooms = (roomsData?.rooms.length ?? 0) > 1;
    const isAdmin = user?.role === "ADMIN";

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[calc(100vh-8rem)] rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Breadcrumbs */}
            {(hasMultipleRooms || isAdmin) && (
                <DashboardBreadcrumbs
                    items={[
                        { label: "Chats", href: "/dashboard/chats" },
                        { label: room?.className || "Chat" },
                    ]}
                />
            )}

            <ChatRoom
                classId={classId}
                className={room?.className || "Chat"}
            />
        </div>
    );
}
