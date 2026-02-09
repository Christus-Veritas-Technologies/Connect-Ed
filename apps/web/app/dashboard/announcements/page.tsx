"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Trash2,
  Plus,
  Clock,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useCreateAnnouncementComment,
} from "@/lib/hooks/use-announcements";
import type { Announcement, AnnouncementComment } from "@/lib/hooks/use-announcements";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const LENGTH_LABELS: Record<string, string> = {
  ONE_DAY: "1 Day",
  ONE_WEEK: "1 Week",
  ONE_MONTH: "1 Month",
};

function getTimeRemaining(createdAt: string, length: string): string {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  let durationMs = 0;
  switch (length) {
    case "ONE_DAY":
      durationMs = 24 * 60 * 60 * 1000;
      break;
    case "ONE_WEEK":
      durationMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case "ONE_MONTH":
      durationMs = 30 * 24 * 60 * 60 * 1000;
      break;
  }
  const remaining = durationMs - (now - created);
  if (remaining <= 0) return "Expired";
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getCommentAuthor(comment: AnnouncementComment) {
  if (comment.user) {
    return { name: comment.user.name, role: comment.user.role };
  }
  if (comment.parent) {
    return { name: comment.parent.name, role: "PARENT" };
  }
  if (comment.student) {
    return {
      name: `${comment.student.firstName} ${comment.student.lastName}`,
      role: "STUDENT",
    };
  }
  return { name: "Unknown", role: "UNKNOWN" };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-red-600 dark:text-red-400",
  RECEPTIONIST: "text-blue-600 dark:text-blue-400",
  TEACHER: "text-violet-600 dark:text-violet-400",
  PARENT: "text-emerald-600 dark:text-emerald-400",
  STUDENT: "text-amber-600 dark:text-amber-400",
};

const AVATAR_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  RECEPTIONIST: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  TEACHER: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  PARENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  STUDENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

/* ─── Comment Item ─── */
function CommentItem({ comment }: { comment: AnnouncementComment }) {
  const author = getCommentAuthor(comment);
  return (
    <div className="flex gap-3">
      <Avatar className="size-7 shrink-0 mt-0.5">
        <AvatarFallback
          className={`text-[10px] font-semibold ${AVATAR_COLORS[author.role] || "bg-muted text-muted-foreground"}`}
        >
          {getInitials(author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{author.name}</span>
          <span
            className={`text-[11px] font-medium ${ROLE_COLORS[author.role] || "text-muted-foreground"}`}
          >
            {author.role}
          </span>
          <span className="text-xs text-muted-foreground">
            · {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
      </div>
    </div>
  );
}

/* ─── Announcement Card ─── */
function AnnouncementCard({
  announcement,
  isAdmin,
  onDelete,
  onComment,
  commentPending,
}: {
  announcement: Announcement;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onComment: (id: string, content: string) => void;
  commentPending: boolean;
}) {
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyText, setReplyText] = useState("");
  const timeRemaining = getTimeRemaining(
    announcement.createdAt,
    announcement.length
  );
  const isExpired = timeRemaining === "Expired";
  const commentCount = announcement._count.comments;
  const previewComments = announcement.comments.slice(0, 2);
  const hasMoreComments = commentCount > 2;

  const handleSubmitComment = () => {
    const content = replyText.trim();
    if (!content) return;
    onComment(announcement.id, content);
    setReplyText("");
  };

  return (
    <article className="border-b border-border last:border-b-0">
      <div className="px-4 pt-4 pb-3">
        {/* Author row */}
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback
              className={`text-xs font-semibold ${AVATAR_COLORS[announcement.createdBy.role] || "bg-muted text-muted-foreground"}`}
            >
              {getInitials(announcement.createdBy.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate">
                {announcement.createdBy.name}
              </span>
              <span
                className={`text-xs font-medium ${ROLE_COLORS[announcement.createdBy.role] || "text-muted-foreground"}`}
              >
                {announcement.createdBy.role}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formatRelativeTime(announcement.createdAt)}
              </span>
            </div>

            {/* Content */}
            <h3 className="text-[15px] font-bold mt-1.5">
              {announcement.heading}
            </h3>
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
              {announcement.subheading}
            </p>

            {/* Meta badges */}
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant="outline"
                className="text-[11px] gap-1 px-2 py-0.5 font-normal"
              >
                <Clock className="size-3" />
                {LENGTH_LABELS[announcement.length]}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[11px] px-2 py-0.5 font-normal ${isExpired
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  }`}
              >
                {timeRemaining}
              </Badge>
            </div>
          </div>

          {/* Admin delete */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onDelete(announcement.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-6 mt-3 ml-[52px] border-t border-border pt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setShowAllComments(!showAllComments)}
          >
            <MessageCircle className="size-4" />
            <span>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </button>
        </div>

        {/* Reply input — always visible */}
        <div className="flex items-center gap-2 mt-3 ml-[52px]">
          <Input
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            className="flex-1 h-9 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            className="size-9 p-0"
            onClick={handleSubmitComment}
            disabled={commentPending || !replyText.trim()}
          >
            {commentPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        {/* Comments section */}
        {commentCount > 0 && (
          <div className="mt-3 ml-[52px] space-y-3">
            {/* Preview comments (always visible — latest 2) */}
            {!showAllComments && (
              <>
                {previewComments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
                {hasMoreComments && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    onClick={() => setShowAllComments(true)}
                  >
                    <ChevronDown className="size-3" />
                    View all {commentCount} comments
                  </button>
                )}
              </>
            )}

            {/* All comments */}
            <AnimatePresence>
              {showAllComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {announcement.comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))}
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    onClick={() => setShowAllComments(false)}
                  >
                    <ChevronUp className="size-3" />
                    Show less
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </article>
  );
}

/* ─── Main Page ─── */
export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { data, isLoading } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const commentMutation = useCreateAnnouncementComment();

  const announcements = data?.announcements || [];

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    heading: "",
    subheading: "",
    length: "" as string,
  });

  const handleCreate = () => {
    if (!formData.heading || !formData.subheading || !formData.length) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate(
      {
        heading: formData.heading,
        subheading: formData.subheading,
        length: formData.length as "ONE_DAY" | "ONE_WEEK" | "ONE_MONTH",
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setFormData({ heading: "", subheading: "", length: "" });
          toast.success("Announcement published!");
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Failed to create announcement";
          toast.error(msg);
        },
      }
    );
  };

  const handleComment = (announcementId: string, content: string) => {
    commentMutation.mutate(
      { announcementId, content },
      {
        onSuccess: () => toast.success("Comment added"),
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.message : "Failed to add comment";
          toast.error(msg);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Announcement deleted"),
      onError: () => toast.error("Failed to delete announcement"),
    });
  };

  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error?.message;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            School-wide announcements and updates
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-4" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Megaphone className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No announcements yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Create your first announcement to get started."
              : "Check back later for updates."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onComment={handleComment}
              commentPending={commentMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Create Announcement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Heading</Label>
              <Input
                placeholder="Announcement heading..."
                value={formData.heading}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    heading: e.target.value.slice(0, 32),
                  })
                }
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.heading.length}/32
              </p>
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="What's happening at school..."
                value={formData.subheading}
                onChange={(e) =>
                  setFormData({ ...formData, subheading: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={formData.length}
                onValueChange={(v) =>
                  setFormData({ ...formData, length: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long to show..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_DAY">1 Day</SelectItem>
                  <SelectItem value="ONE_WEEK">1 Week</SelectItem>
                  <SelectItem value="ONE_MONTH">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Publishing...
                  </>
                ) : (
                  "Publish Announcement"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
