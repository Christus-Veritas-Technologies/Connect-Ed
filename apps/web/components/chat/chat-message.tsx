"use client";

import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/lib/hooks/use-chat";

interface ChatMessageBubbleProps {
    message: ChatMessage;
    isOwn: boolean;
    showAvatar: boolean;
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    TEACHER: "bg-blue-100 text-blue-700",
    STUDENT: "bg-emerald-100 text-emerald-700",
    PARENT: "bg-amber-100 text-amber-700",
};

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
    message,
    isOwn,
    showAvatar,
}: ChatMessageBubbleProps) {
    const initials = useMemo(() => {
        return message.senderName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }, [message.senderName]);

    const isSpecial = message.type !== "TEXT";

    return (
        <div className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${showAvatar ? "mt-3" : "mt-0.5"}`}>
            {/* Avatar */}
            <div className="flex-shrink-0 w-8">
                {showAvatar ? (
                    <div
                        className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold ${isOwn ? "bg-brand/20 text-brand" : "bg-gray-200 text-gray-600"
                            }`}
                    >
                        {initials}
                    </div>
                ) : null}
            </div>

            {/* Content */}
            <div className={`max-w-[75%] min-w-0 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                {/* Sender name + role badge */}
                {showAvatar && (
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]">
                            {message.senderName}
                        </span>
                        <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[message.senderRole] || "bg-gray-100 text-gray-600"
                                }`}
                        >
                            {message.senderRole}
                        </span>
                    </div>
                )}

                {/* Message bubble */}
                {isSpecial ? (
                    <PrimitiveCard message={message} isOwn={isOwn} />
                ) : (
                    <div
                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${isOwn
                                ? "bg-brand text-white rounded-tr-md"
                                : "bg-gray-100 text-gray-800 rounded-tl-md"
                            }`}
                    >
                        {message.content}
                    </div>
                )}

                {/* Timestamp */}
                <span
                    className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? "text-right" : "text-left"}`}
                >
                    {formatTime(message.createdAt)}
                </span>
            </div>
        </div>
    );
});

// ─── Primitive Card ──────────────────────────────────────────

function PrimitiveCard({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
    const meta = (message.metadata || {}) as Record<string, string | number | boolean | null>;

    const label =
        message.type === "EXAM_RESULT"
            ? "Exam Result"
            : message.type === "GRADE"
                ? "Grade"
                : "Subject Info";

    const accentColor =
        message.type === "EXAM_RESULT"
            ? "border-l-purple-500"
            : message.type === "GRADE"
                ? "border-l-emerald-500"
                : "border-l-blue-500";

    const badgeVariant =
        message.type === "EXAM_RESULT"
            ? "brand"
            : message.type === "GRADE"
                ? "success"
                : "info";

    return (
        <div
            className={`border rounded-xl overflow-hidden w-64 shadow-sm ${isOwn ? "ml-auto" : ""
                }`}
        >
            {/* Card header */}
            <div className={`border-l-4 ${accentColor} px-3 py-2 bg-gray-50`}>
                <div className="flex items-center justify-between">
                    <Badge size="sm" variant={badgeVariant as "brand" | "success" | "warning"}>
                        {label}
                    </Badge>
                    {message.targetStudentId && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            🔒 Private
                        </span>
                    )}
                </div>
            </div>

            {/* Card body */}
            <div className="px-3 py-2 space-y-1 text-sm">
                {message.content && (
                    <p className="text-gray-700">{message.content}</p>
                )}
                {meta.studentName != null && (
                    <p className="text-xs text-gray-500">Student: {String(meta.studentName)}</p>
                )}
                {meta.subjectName != null && (
                    <p className="text-xs text-gray-500">Subject: {String(meta.subjectName)}</p>
                )}
                {meta.marks != null && (
                    <p className="text-xs text-gray-500">
                        Marks: <span className="font-semibold text-gray-700">{String(meta.marks)}</span>
                        {meta.totalMarks != null ? <span>/{String(meta.totalMarks)}</span> : null}
                    </p>
                )}
                {meta.grade != null && (
                    <p className="text-xs text-gray-500">
                        Grade: <span className="font-bold text-gray-700">{String(meta.grade)}</span>
                    </p>
                )}
                {meta.examName != null && (
                    <p className="text-xs text-gray-500">Exam: {String(meta.examName)}</p>
                )}
            </div>
        </div>
    );
}
