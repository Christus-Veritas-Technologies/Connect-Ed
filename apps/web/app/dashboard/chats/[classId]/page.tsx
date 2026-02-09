"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useChatRooms } from "@/lib/hooks/use-chat";
import { ChatRoom } from "@/components/chat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
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
      {/* Back button (show only if there are multiple rooms or admin) */}
      {(hasMultipleRooms || isAdmin) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/chats")}
          className="text-gray-500 hover:text-gray-700 -ml-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="mr-1" />
          All Chats
        </Button>
      )}

      <ChatRoom
        classId={classId}
        className={room?.className || "Chat"}
      />
    </div>
  );
}
