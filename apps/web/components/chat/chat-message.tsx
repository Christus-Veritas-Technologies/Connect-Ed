"use client";

import { memo, useMemo, useState } from "react";
import { Download, FileText, FileSpreadsheet, FileImage, File as FileIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/hooks/use-chat";
import { useChatFileDownload } from "@/lib/hooks/use-chat";

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

    const isSpecial = message.type !== "TEXT" && message.type !== "FILE";
    const isFile = message.type === "FILE";

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
                {isFile ? (
                    <FileCard message={message} isOwn={isOwn} />
                ) : isSpecial ? (
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

// ─── File Card ───────────────────────────────────────────────

function getFileIcon(mimeType: string) {
    if (mimeType?.startsWith("image/")) return FileImage;
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType?.includes("csv"))
        return FileSpreadsheet;
    if (
        mimeType?.includes("pdf") ||
        mimeType?.includes("word") ||
        mimeType?.includes("document") ||
        mimeType?.startsWith("text/")
    )
        return FileText;
    return FileIcon;
}

function getFileColor(mimeType: string): string {
    if (mimeType?.startsWith("image/")) return "text-purple-500 bg-purple-50";
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType?.includes("csv"))
        return "text-emerald-500 bg-emerald-50";
    if (mimeType?.includes("pdf")) return "text-red-500 bg-red-50";
    if (mimeType?.includes("word") || mimeType?.includes("document"))
        return "text-blue-500 bg-blue-50";
    return "text-gray-500 bg-gray-50";
}

function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function FileCard({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
    const downloadMutation = useChatFileDownload();
    const [isDownloading, setIsDownloading] = useState(false);
    const Icon = getFileIcon(message.fileMimeType || "");
    const colorClass = getFileColor(message.fileMimeType || "");

    const handleDownload = async () => {
        if (!message.fileId) return;
        setIsDownloading(true);
        try {
            const result = await downloadMutation.mutateAsync(message.fileId);
            // Open the signed download URL
            window.open(result.downloadUrl, "_blank");
        } catch {
            // silently fail
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div
            className={`border rounded-xl overflow-hidden w-64 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${isOwn ? "ml-auto" : ""}`}
            onClick={handleDownload}
        >
            <div className="px-3 py-2.5 flex items-center gap-2.5">
                <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-800">
                        {message.fileName || message.content}
                    </p>
                    <p className="text-xs text-gray-400">
                        {formatFileSize(message.fileSize || 0)}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="flex-shrink-0 text-gray-400 hover:text-brand"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                    }}
                    disabled={isDownloading}
                >
                    {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Download className="size-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
