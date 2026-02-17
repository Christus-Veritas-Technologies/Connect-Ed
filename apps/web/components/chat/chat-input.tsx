"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import {
    SentIcon,
    BookOpen01Icon,
    ChartHistogramIcon,
    School01Icon,
    Attachment01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCEPTED_MIME_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
].join(",");

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

interface ChatInputProps {
    onSend: (data: {
        content: string;
        messageType?: string;
        metadata?: Record<string, unknown>;
        targetStudentId?: string;
    }) => void;
    onFileUpload?: (file: File) => void;
    isUploading?: boolean;
    uploadProgress?: number;
    userRole: string;
    disabled?: boolean;
}

export function ChatInput({ onSend, onFileUpload, isUploading, uploadProgress, userRole, disabled }: ChatInputProps) {
    const [text, setText] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSendPrimitives = userRole === "ADMIN" || userRole === "TEACHER";

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSend({ content: trimmed, messageType: "TEXT" });
        setText("");
        inputRef.current?.focus();
    }, [text, onSend]);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            return; // silently reject too-large files
        }

        setPendingFile(file);
        // Reset file input so re-selecting same file works
        e.target.value = "";
    };

    const sendFile = () => {
        if (!pendingFile || !onFileUpload) return;
        onFileUpload(pendingFile);
        setPendingFile(null);
    };

    const cancelFile = () => {
        setPendingFile(null);
    };

    return (
        <div className="border-t bg-white px-4 py-3">
            {/* Pending file preview */}
            {pendingFile && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
                    <HugeiconsIcon icon={Attachment01Icon} size={16} className="text-brand flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(pendingFile.size)}</p>
                    </div>
                    {isUploading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className="h-full bg-brand rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress || 0}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                        </div>
                    ) : (
                        <>
                            <Button size="icon-sm" variant="ghost" onClick={cancelFile} className="text-muted-foreground hover:text-destructive">
                                <X className="size-4" />
                            </Button>
                            <Button size="sm" onClick={sendFile} className="bg-brand hover:bg-brand/90 text-white text-xs h-7">
                                Send
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Upload progress bar (when uploading and file preview dismissed) */}
            {isUploading && !pendingFile && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
                    <Loader2 className="size-4 animate-spin text-brand flex-shrink-0" />
                    <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                                className="h-full bg-brand rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress || 0}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                </div>
            )}

            <div className="flex items-end gap-2">
                {/* Plus menu: primitives + file attachment */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-400 hover:text-brand flex-shrink-0 mb-0.5"
                            disabled={disabled || isUploading}
                        >
                            <span className="text-lg">+</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top">
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                            <HugeiconsIcon icon={Attachment01Icon} size={16} className="mr-2" />
                            Attach File
                        </DropdownMenuItem>
                        {canSendPrimitives && (
                            <>
                                <DropdownMenuItem
                                    onClick={() =>
                                        onSend({
                                            content: "Shared an exam result",
                                            messageType: "EXAM_RESULT",
                                            metadata: { info: "Select an exam from the exams page to share results" },
                                        })
                                    }
                                >
                                    <HugeiconsIcon icon={BookOpen01Icon} size={16} className="mr-2" />
                                    Share Exam Result
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        onSend({
                                            content: "Shared a grade",
                                            messageType: "GRADE",
                                            metadata: { info: "Grade information" },
                                        })
                                    }
                                >
                                    <HugeiconsIcon icon={ChartHistogramIcon} size={16} className="mr-2" />
                                    Share Grade
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        onSend({
                                            content: "Shared subject information",
                                            messageType: "SUBJECT_INFO",
                                            metadata: { info: "Subject details" },
                                        })
                                    }
                                >
                                    <HugeiconsIcon icon={School01Icon} size={16} className="mr-2" />
                                    Share Subject Info
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_MIME_TYPES}
                    onChange={handleFileSelect}
                />

                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message…"
                        rows={1}
                        disabled={disabled || isUploading}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 placeholder:text-gray-400 disabled:opacity-50"
                        style={{ maxHeight: "120px" }}
                    />
                </div>

                {/* Send */}
                <Button
                    size="icon-sm"
                    className="rounded-xl bg-brand hover:bg-brand/90 text-white flex-shrink-0 mb-0.5"
                    onClick={handleSend}
                    disabled={!text.trim() || disabled || isUploading}
                >
                    <HugeiconsIcon icon={SentIcon} size={16} />
                </Button>
            </div>
        </div>
    );
}
