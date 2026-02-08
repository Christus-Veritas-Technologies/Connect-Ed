"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Notification01Icon,
  Add01Icon,
  Delete02Icon,
  Cancel01Icon,
  SentIcon,
  TimeQuarterIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function getCommentAuthor(comment: AnnouncementComment) {
  if (comment.user) {
    return { name: comment.user.name, email: comment.user.email, role: comment.user.role };
  }
  if (comment.parent) {
    return { name: comment.parent.name, email: comment.parent.email, role: "PARENT" };
  }
  if (comment.student) {
    return {
      name: `${comment.student.firstName} ${comment.student.lastName}`,
      email: comment.student.email || "",
      role: "STUDENT",
    };
  }
  return { name: "Unknown", email: "", role: "UNKNOWN" };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  RECEPTIONIST: "bg-blue-100 text-blue-700 border-blue-200",
  TEACHER: "bg-purple-100 text-purple-700 border-purple-200",
  PARENT: "bg-green-100 text-green-700 border-green-200",
  STUDENT: "bg-orange-100 text-orange-700 border-orange-200",
};

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});

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
          toast.success("Announcement posted!");
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "Failed to create announcement";
          toast.error(msg);
        },
      }
    );
  };

  const handleComment = (announcementId: string) => {
    const content = commentText[announcementId]?.trim();
    if (!content) return;
    commentMutation.mutate(
      { announcementId, content },
      {
        onSuccess: () => {
          setCommentText((prev) => ({ ...prev, [announcementId]: "" }));
          toast.success("Comment added");
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "Failed to add comment";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <HugeiconsIcon icon={Notification01Icon} size={28} className="text-brand" />
            Announcements
          </h1>
          <p className="text-muted-foreground">
            School-wide announcements and updates
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <HugeiconsIcon icon={Add01Icon} size={20} />
            New Announcement
          </Button>
        )}
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={Notification01Icon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">No announcements</p>
            <p className="text-muted-foreground text-sm">
              {isAdmin ? "Create your first announcement to get started." : "Check back later for updates."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {announcements.map((announcement, index) => {
              const isExpanded = expandedId === announcement.id;
              const timeRemaining = getTimeRemaining(announcement.createdAt, announcement.length);

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden border-2 hover:border-brand/30 transition-colors">
                    {/* Announcement Header */}
                    <div
                      className="p-6 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-bold truncate">{announcement.heading}</h3>
                            <Badge variant="outline" className="shrink-0">
                              <HugeiconsIcon icon={TimeQuarterIcon} size={12} className="mr-1" />
                              {LENGTH_LABELS[announcement.length]}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={
                                timeRemaining === "Expired"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }
                            >
                              {timeRemaining}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {announcement.subheading}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>
                              By <strong>{announcement.createdBy.name}</strong>
                            </span>
                            <span>
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                            <span>{announcement._count.comments} comment{announcement._count.comments !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(announcement.id);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={18} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: Full content + Comments */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 border-t">
                            {/* Full subheading */}
                            <div className="py-4">
                              <p className="text-sm whitespace-pre-wrap">{announcement.subheading}</p>
                            </div>

                            {/* Comments */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-muted-foreground">
                                Comments ({announcement.comments.length})
                              </h4>

                              {announcement.comments.length > 0 && (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                  {announcement.comments.map((comment) => {
                                    const author = getCommentAuthor(comment);
                                    return (
                                      <div
                                        key={comment.id}
                                        className="p-3 rounded-lg bg-muted/50 border"
                                      >
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <div className="size-7 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-white">
                                              {author.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .slice(0, 2)}
                                            </span>
                                          </div>
                                          <span className="text-sm font-semibold">{author.name}</span>
                                          <Badge
                                            variant="outline"
                                            className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[author.role] || ""}`}
                                          >
                                            {author.role}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          {author.email}
                                        </p>
                                        <p className="text-sm">{comment.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                          {new Date(comment.createdAt).toLocaleString()}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Add comment */}
                              <div className="flex gap-2 pt-2">
                                <Input
                                  placeholder="Write a comment..."
                                  value={commentText[announcement.id] || ""}
                                  onChange={(e) =>
                                    setCommentText((prev) => ({
                                      ...prev,
                                      [announcement.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleComment(announcement.id);
                                    }
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleComment(announcement.id)}
                                  disabled={
                                    commentMutation.isPending ||
                                    !commentText[announcement.id]?.trim()
                                  }
                                  className="gap-1.5"
                                >
                                  <HugeiconsIcon icon={SentIcon} size={16} />
                                  Send
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
                  setFormData({ ...formData, heading: e.target.value.slice(0, 32) })
                }
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.heading.length}/32
              </p>
            </div>

            <div className="space-y-2">
              <Label>Subheading / Details</Label>
              <Textarea
                placeholder="Announcement details..."
                value={formData.subheading}
                onChange={(e) => setFormData({ ...formData, subheading: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={formData.length}
                onValueChange={(v) => setFormData({ ...formData, length: v })}
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
                    <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                    Posting...
                  </>
                ) : (
                  "Post Announcement"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
