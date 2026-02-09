"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import {
    SentIcon,
    BookOpen01Icon,
    ChartHistogramIcon,
    School01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
    onSend: (data: {
        content: string;
        messageType?: string;
        metadata?: Record<string, unknown>;
        targetStudentId?: string;
    }) => void;
    userRole: string;
    disabled?: boolean;
}

export function ChatInput({ onSend, userRole, disabled }: ChatInputProps) {
    const [text, setText] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

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

    // Auto-resize textarea
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    return (
        <div className="border-t bg-white px-4 py-3">
            <div className="flex items-end gap-2">
                {/* Primitive dropdown for admin/teacher */}
                {canSendPrimitives && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-gray-400 hover:text-brand flex-shrink-0 mb-0.5"
                            >
                                <span className="text-lg">+</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="top">
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message…"
                        rows={1}
                        disabled={disabled}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 placeholder:text-gray-400 disabled:opacity-50"
                        style={{ maxHeight: "120px" }}
                    />
                </div>

                {/* Send */}
                <Button
                    size="icon-sm"
                    className="rounded-xl bg-brand hover:bg-brand/90 text-white flex-shrink-0 mb-0.5"
                    onClick={handleSend}
                    disabled={!text.trim() || disabled}
                >
                    <HugeiconsIcon icon={SentIcon} size={16} />
                </Button>
            </div>
        </div>
    );
}
