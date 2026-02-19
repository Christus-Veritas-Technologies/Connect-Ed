"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    Search,
    LayoutGrid,
    List,
    Download,
    Eye,
    Trash2,
    Share2,
    FileText,
    FileSpreadsheet,
    FileImage,
    File as FileIcon,
    Plus,
    X,
    Loader2,
    Users,
    Folder,
    Check,
    ChevronRight,
    Home,
    MoreVertical,
    Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
    useSharedFiles,
    useUploadFile,
    useDeleteFile,
    useShareFile,
    useSearchUsers,
    useFileDownloadUrl,
    useFileViewUrl,
    type SharedFile,
    type ShareRecipient,
} from "@/lib/hooks/use-shared-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        const hour12 = hours % 12 || 12;
        return `Today, ${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    } else if (diffDays < 30) {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
        return FileSpreadsheet;
    if (
        mimeType.includes("pdf") ||
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType.startsWith("text/")
    )
        return FileText;
    return FileIcon;
}

function getFileColor(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "text-purple-500 bg-purple-50";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
        return "text-emerald-500 bg-emerald-50";
    if (mimeType.includes("pdf")) return "text-red-500 bg-red-50";
    if (mimeType.includes("word") || mimeType.includes("document"))
        return "text-blue-500 bg-blue-50";
    return "text-gray-500 bg-gray-50";
}

function getUploaderName(file: SharedFile): string {
    if (file.uploadedByUser) return file.uploadedByUser.name || "Staff";
    if (file.uploadedByStudent)
        return `${file.uploadedByStudent.firstName} ${file.uploadedByStudent.lastName}`;
    if (file.uploadedByParent) return file.uploadedByParent.name;
    return "Unknown";
}

const ROLE_OPTIONS = [
    { value: "ADMIN", label: "All Admins" },
    { value: "RECEPTIONIST", label: "All Receptionists" },
    { value: "TEACHER", label: "All Teachers" },
    { value: "PARENT", label: "All Parents" },
    { value: "STUDENT", label: "All Students" },
];

// ─── File validation constants ───────────────────────────────

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const ALLOWED_EXTENSIONS = new Set([
    // Images
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
    // Documents
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
]);

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

function isAllowedFile(file: File): string | null {
    const ext = ("." + (file.name.split(".").pop() || "")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return "File type not allowed. Please upload an image or document.";
    }
    if (file.size > MAX_FILE_SIZE) {
        return `File too large. Maximum size is 500 MB.`;
    }
    return null;
}

// ─── Upload Dialog ───────────────────────────────────────────

function UploadDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [fileError, setFileError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { mutateAsync, isPending, uploadProgress } = useUploadFile();
    const { data: searchResults } = useSearchUsers(recipientSearch);

    const validateAndSetFile = (file: File) => {
        const error = isAllowedFile(file);
        if (error) {
            setFileError(error);
            setSelectedFile(null);
            return;
        }
        setFileError(null);
        setSelectedFile(file);
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) validateAndSetFile(file);
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) validateAndSetFile(file);
    }, [title]);

    const handleUpload = async () => {
        if (!selectedFile || !title.trim()) return;

        try {
            await mutateAsync({
                file: selectedFile,
                title: title.trim(),
                description: description.trim() || undefined,
                recipients: recipients.length > 0 ? recipients : undefined,
            });
            toast.success("File uploaded successfully");
            onOpenChange(false);
            resetForm();
        } catch {
            toast.error("Failed to upload file");
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setTitle("");
        setDescription("");
        setRecipients([]);
        setRecipientSearch("");
        setFileError(null);
    };

    const addRoleRecipient = (role: string) => {
        if (!recipients.find((r) => r.type === "ROLE" && r.role === role)) {
            setRecipients([...recipients, { type: "ROLE", role }]);
        }
    };

    const addUserRecipient = (type: "USER" | "STUDENT" | "PARENT", id: string) => {
        if (!recipients.find((r) => r.type === type && r.id === id)) {
            setRecipients([...recipients, { type, id }]);
        }
        setRecipientSearch("");
    };

    const removeRecipient = (index: number) => {
        setRecipients(recipients.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Upload File</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Drag & Drop File Input */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging
                                ? "border-brand bg-brand/10"
                                : fileError
                                    ? "border-destructive/50 bg-destructive/5"
                                    : "hover:border-brand/50 hover:bg-brand/5"
                            }`}
                    >
                        {selectedFile ? (
                            <div className="space-y-1">
                                {(() => {
                                    const Icon = getFileIcon(selectedFile.type);
                                    return <Icon className="mx-auto size-8 text-brand" />;
                                })()}
                                <p className="font-medium text-sm">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFile(null);
                                        setFileError(null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive mt-1 underline"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Upload className={`mx-auto size-8 ${isDragging ? "text-brand" : "text-muted-foreground"}`} />
                                <p className="text-sm text-muted-foreground">
                                    {isDragging ? "Drop your file here" : "Click or drag & drop a file"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Images & documents only · Max 500 MB
                                </p>
                                <p className="text-[10px] text-muted-foreground/60">
                                    JPG, PNG, GIF, WebP, SVG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
                                </p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={ACCEPTED_MIME_TYPES}
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* File error */}
                    {fileError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <X className="size-3" /> {fileError}
                        </p>
                    )}

                    {/* Upload Progress */}
                    {isPending && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Uploading…</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full bg-brand rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ ease: "easeOut", duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="File title"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this file"
                            rows={2}
                        />
                    </div>

                    {/* Recipients */}
                    <div className="space-y-1.5">
                        <Label>Share with (optional)</Label>

                        {/* Role shortcuts */}
                        <div className="flex flex-wrap gap-1.5">
                            {ROLE_OPTIONS.map((r) => (
                                <Button
                                    key={r.value}
                                    variant={recipients.find((rec) => rec.type === "ROLE" && rec.role === r.value) ? "brand" : "outline"}
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => addRoleRecipient(r.value)}
                                >
                                    {r.label}
                                </Button>
                            ))}
                        </div>

                        {/* Individual search */}
                        <Input
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            placeholder="Search for a person..."
                            className="mt-2"
                        />
                        {searchResults?.results && searchResults.results.length > 0 && (
                            <div className="border rounded-lg max-h-32 overflow-y-auto">
                                {searchResults.results.map((result) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => addUserRecipient(result.type, result.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                                    >
                                        <span>{result.label}</span>
                                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected recipients */}
                        {recipients.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {recipients.map((r, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                        {r.type === "ROLE" ? `All ${r.role}s` : r.id?.slice(0, 8)}
                                        <button onClick={() => removeRecipient(i)} className="hover:text-destructive">
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || !title.trim() || isPending}
                        className="w-full"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Uploading… {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <Upload className="size-4" />
                                Upload File
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Share Dialog ────────────────────────────────────────────

function ShareDialog({
    file,
    open,
    onOpenChange,
}: {
    file: SharedFile | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
    const [recipientSearch, setRecipientSearch] = useState("");
    const shareMutation = useShareFile();
    const { data: searchResults } = useSearchUsers(recipientSearch);

    const handleShare = async () => {
        if (!file || recipients.length === 0) return;

        try {
            await shareMutation.mutateAsync({ fileId: file.id, recipients });
            toast.success("File shared successfully");
            onOpenChange(false);
            setRecipients([]);
        } catch {
            toast.error("Failed to share file");
        }
    };

    const addRoleRecipient = (role: string) => {
        if (!recipients.find((r) => r.type === "ROLE" && r.role === role)) {
            setRecipients([...recipients, { type: "ROLE", role }]);
        }
    };

    const addUserRecipient = (type: "USER" | "STUDENT" | "PARENT", id: string) => {
        if (!recipients.find((r) => r.type === type && r.id === id)) {
            setRecipients([...recipients, { type, id }]);
        }
        setRecipientSearch("");
    };

    const removeRecipient = (index: number) => {
        setRecipients(recipients.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Share &quot;{file?.title}&quot;</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Role shortcuts */}
                    <div>
                        <Label className="mb-2 block">Share with a role</Label>
                        <div className="flex flex-wrap gap-1.5">
                            {ROLE_OPTIONS.map((r) => (
                                <Button
                                    key={r.value}
                                    variant={recipients.find((rec) => rec.type === "ROLE" && rec.role === r.value) ? "brand" : "outline"}
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => addRoleRecipient(r.value)}
                                >
                                    {r.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Individual search */}
                    <div>
                        <Label className="mb-2 block">Share with a person</Label>
                        <Input
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            placeholder="Search by name..."
                        />
                        {searchResults?.results && searchResults.results.length > 0 && (
                            <div className="border rounded-lg max-h-32 overflow-y-auto mt-1">
                                {searchResults.results.map((result) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => addUserRecipient(result.type, result.id)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                                    >
                                        <span>{result.label}</span>
                                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected recipients */}
                    {recipients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {recipients.map((r, i) => (
                                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                    {r.type === "ROLE" ? `All ${r.role}s` : r.id?.slice(0, 8)}
                                    <button onClick={() => removeRecipient(i)} className="hover:text-destructive">
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={handleShare}
                        disabled={recipients.length === 0 || shareMutation.isPending}
                        className="w-full"
                    >
                        {shareMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <>
                                <Share2 className="size-4" />
                                Share
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── File Card ───────────────────────────────────────────────

function FileCard({
    file,
    onView,
    onDownload,
    onShare,
    onDelete,
    canDelete,
    isSelected,
    onSelect,
    variant = "default",
}: {
    file: SharedFile;
    onView: () => void;
    onDownload: () => void;
    onShare: () => void;
    onDelete: () => void;
    canDelete: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    variant?: "default" | "compact";
}) {
    const Icon = getFileIcon(file.mimeType);
    const colorClasses = getFileColor(file.mimeType);
    const uploaderName = getUploaderName(file);
    const avatars = file.recipients
        ?.slice(0, 3)
        .map((r) => {
            if (r.recipientType === "ROLE") return { name: r.recipientRole || "?" };
            if (r.recipientUser) return { name: r.recipientUser.name };
            if (r.recipientStudent)
                return { name: `${r.recipientStudent.firstName} ${r.recipientStudent.lastName}` };
            if (r.recipientParent) return { name: r.recipientParent.name };
            return { name: "?" };
        }) || [];

    if (variant === "compact") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className="relative group"
            >
                <Card
                    hover
                    className={`h-full cursor-pointer transition-all ${isSelected ? "ring-2 ring-brand shadow-lg" : ""
                        }`}
                    onClick={onSelect}
                >
                    <CardContent className="p-4">
                        {/* Selection Checkbox */}
                        {isSelected && (
                            <div className="absolute top-3 right-3 size-5 rounded-md bg-brand flex items-center justify-center z-10">
                                <Check className="size-3.5 text-white" strokeWidth={3} />
                            </div>
                        )}

                        {/* Icon */}
                        <div className={`w-full aspect-square rounded-lg ${colorClasses} flex items-center justify-center mb-3`}>
                            <Icon className="size-12" />
                        </div>

                        {/* Title */}
                        <h3 className="font-medium text-sm truncate mb-1">{file.title}</h3>

                        {/* Meta */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span>{formatFileSize(file.size)}</span>
                            <span>·</span>
                            <span>{file.recipients?.length || 0} Members</span>
                        </div>

                        {/* Avatars */}
                        <div className="flex items-center gap-1">
                            {avatars.map((avatar, i) => (
                                <div
                                    key={i}
                                    className="size-6 rounded-full bg-brand/10 flex items-center justify-center text-[10px] font-medium text-brand border-2 border-white"
                                    style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: avatars.length - i }}
                                >
                                    {avatar.name.charAt(0).toUpperCase()}
                                </div>
                            ))}
                            {(file.recipients?.length || 0) > 3 && (
                                <div
                                    className="size-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-600 border-2 border-white"
                                    style={{ marginLeft: "-8px" }}
                                >
                                    +{(file.recipients?.length || 0) - 3}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Actions Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-3 right-3 size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onView}>
                            <Eye className="size-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDownload}>
                            <Download className="size-4" />
                            Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onShare}>
                            <Share2 className="size-4" />
                            Share
                        </DropdownMenuItem>
                        {canDelete && (
                            <DropdownMenuItem onClick={onDelete} className="text-destructive">
                                <Trash2 className="size-4" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
        >
            <Card hover className="h-full">
                <CardContent className="p-4 space-y-3">
                    {/* Icon + Meta */}
                    <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${colorClasses}`}>
                            <Icon className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{file.title}</h3>
                            {file.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {file.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* File info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>·</span>
                        <span>{formatDate(file.createdAt)}</span>
                    </div>

                    {/* Uploader */}
                    <div className="text-xs text-muted-foreground">by {uploaderName}</div>

                    {/* Recipients badges */}
                    {file.recipients && file.recipients.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {file.recipients.slice(0, 3).map((r) => (
                                <Badge key={r.id} variant="secondary" className="text-[10px] h-5">
                                    {r.recipientType === "ROLE"
                                        ? `${r.recipientRole}s`
                                        : r.recipientUser?.name ||
                                        (r.recipientStudent
                                            ? `${r.recipientStudent.firstName} ${r.recipientStudent.lastName}`
                                            : r.recipientParent?.name || "?")}
                                </Badge>
                            ))}
                            {file.recipients.length > 3 && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                    +{file.recipients.length - 3} more
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={onView}>
                            <Eye className="size-3.5" />
                            View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={onDownload}>
                            <Download className="size-3.5" />
                            Download
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="size-8 p-0">
                                    <span className="text-base leading-none">⋯</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onShare}>
                                    <Share2 className="size-4" />
                                    Share
                                </DropdownMenuItem>
                                {canDelete && (
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                                        <Trash2 className="size-4" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ─── Main Page ───────────────────────────────────────────────

export default function SharedFilesPage() {
    const { user } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [uploadOpen, setUploadOpen] = useState(false);
    const [shareFile, setShareFile] = useState<SharedFile | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [filterTab, setFilterTab] = useState<"all" | "folders" | "files">("all");
    const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    const { data, isLoading } = useSharedFiles(page, debouncedSearch);
    const deleteMutation = useDeleteFile();
    const downloadMutation = useFileDownloadUrl();
    const viewMutation = useFileViewUrl();

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 400);
    }, []);

    const handleView = async (file: SharedFile) => {
        try {
            const result = await viewMutation.mutateAsync(file.id);
            window.open(result.viewUrl, "_blank");
        } catch {
            toast.error("Failed to open file");
        }
    };

    const handleDownload = async (file: SharedFile) => {
        try {
            const result = await downloadMutation.mutateAsync(file.id);
            const a = document.createElement("a");
            a.href = result.downloadUrl;
            a.download = result.fileName;
            a.click();
        } catch {
            toast.error("Failed to download file");
        }
    };

    const handleDelete = async (file: SharedFile) => {
        if (!confirm(`Delete "${file.title}"? This cannot be undone.`)) return;
        try {
            await deleteMutation.mutateAsync(file.id);
            toast.success("File deleted");
        } catch {
            toast.error("Failed to delete file");
        }
    };

    const canDelete = (file: SharedFile) => {
        return user?.role === "ADMIN" || file.uploadedByUser?.id === user?.id;
    };

    const toggleFileSelection = (fileId: string) => {
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    const files = data?.files || [];
    const pagination = data?.pagination;
    const recentFiles = files.slice(0, 8);
    const allFiles = files;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="size-4" />
                <ChevronRight className="size-4" />
                <span className="text-foreground font-medium">Shared Files</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Shared</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage and share files across your school
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-initial sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search in Shared Files"
                            className="pl-9"
                        />
                    </div>
                    <Button variant="ghost" size="icon">
                        <Filter className="size-4" />
                    </Button>
                    <Button onClick={() => setUploadOpen(true)}>
                        <Plus className="size-4" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Recent Items */}
            {!isLoading && recentFiles.length > 0 && !debouncedSearch && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Recent Items</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {recentFiles.map((file) => (
                            <FileCard
                                key={file.id}
                                file={file}
                                onView={() => handleView(file)}
                                onDownload={() => handleDownload(file)}
                                onShare={() => setShareFile(file)}
                                onDelete={() => handleDelete(file)}
                                canDelete={canDelete(file)}
                                variant="compact"
                                isSelected={selectedFiles.has(file.id)}
                                onSelect={() => toggleFileSelection(file.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Shared Items Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Shared Items</h2>
                </div>

                {/* Filters and Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={filterTab === "all" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilterTab("all")}
                        >
                            All
                        </Button>
                        <Button
                            variant={filterTab === "folders" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilterTab("folders")}
                        >
                            Folders
                        </Button>
                        <Button
                            variant={filterTab === "files" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setFilterTab("files")}
                        >
                            Files
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Sort by:</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSortBy(sortBy === "date" ? "name" : "date")}
                                className="h-8"
                            >
                                {sortBy === "date" ? "Date" : "Name"}
                                <ChevronRight className="size-3 ml-1" />
                            </Button>
                        </div>
                        <div className="flex items-center border rounded-lg">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-l-lg transition-colors ${viewMode === "grid"
                                    ? "bg-brand text-white"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <LayoutGrid className="size-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`p-2 rounded-r-lg transition-colors ${viewMode === "table"
                                    ? "bg-brand text-white"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <List className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="size-8 animate-spin text-brand" />
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && files.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl">
                        <FileIcon className="mx-auto size-12 text-muted-foreground/40" />
                        <h3 className="mt-4 font-semibold">No files yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload your first file to get started
                        </p>
                        <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                            <Upload className="size-4" />
                            Upload File
                        </Button>
                    </div>
                )}

                {/* Grid View */}
                {!isLoading && files.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <AnimatePresence mode="popLayout">
                            {allFiles.map((file) => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    onView={() => handleView(file)}
                                    onDownload={() => handleDownload(file)}
                                    onShare={() => setShareFile(file)}
                                    onDelete={() => handleDelete(file)}
                                    canDelete={canDelete(file)}
                                    variant="compact"
                                    isSelected={selectedFiles.has(file.id)}
                                    onSelect={() => toggleFileSelection(file.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Table View */}
                {!isLoading && files.length > 0 && viewMode === "table" && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Shared With</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map((file) => {
                                const Icon = getFileIcon(file.mimeType);
                                const colorClasses = getFileColor(file.mimeType);

                                return (
                                    <TableRow key={file.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${colorClasses}`}>
                                                    <Icon className="size-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{file.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {file.originalName}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{formatFileSize(file.size)}</TableCell>
                                        <TableCell className="text-sm">{getUploaderName(file)}</TableCell>
                                        <TableCell className="text-sm">{formatDate(file.createdAt)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {file.recipients?.slice(0, 2).map((r) => (
                                                    <Badge key={r.id} variant="secondary" className="text-[10px] h-5">
                                                        {r.recipientType === "ROLE"
                                                            ? `${r.recipientRole}s`
                                                            : r.recipientUser?.name ||
                                                            (r.recipientStudent
                                                                ? `${r.recipientStudent.firstName}`
                                                                : r.recipientParent?.name || "?")}
                                                    </Badge>
                                                ))}
                                                {(file.recipients?.length || 0) > 2 && (
                                                    <Badge variant="secondary" className="text-[10px] h-5">
                                                        +{(file.recipients?.length || 0) - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => handleView(file)}
                                                >
                                                    <Eye className="size-3.5" />
                                                    View
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => handleDownload(file)}
                                                >
                                                    <Download className="size-3.5" />
                                                    Download
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="size-7 p-0">
                                                            <span className="text-sm leading-none">⋯</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setShareFile(file)}>
                                                            <Share2 className="size-4" />
                                                            Share
                                                        </DropdownMenuItem>
                                                        {canDelete(file) && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(file)}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="size-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-muted-foreground">
                            Showing {(pagination.page - 1) * pagination.limit + 1}–
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                            {pagination.total} files
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === pagination.totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
            <ShareDialog
                file={shareFile}
                open={!!shareFile}
                onOpenChange={(open) => !open && setShareFile(null)}
            />
        </div>
    );
}
