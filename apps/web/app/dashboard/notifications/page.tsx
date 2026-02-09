"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle,
  AlertCircle,
  UserPlus,
  CreditCard,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  type Notification,
} from "@/lib/hooks/use-notifications";

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(type: string): string {
  switch (type) {
    case "PAYMENT_SUCCESS":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "PAYMENT_FAILED":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    case "STUDENT_ADDED":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    case "TEACHER_ADDED":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400";
    case "SYSTEM_ALERT":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "PAYMENT_SUCCESS":
      return <CreditCard className="size-3.5" />;
    case "PAYMENT_FAILED":
      return <AlertCircle className="size-3.5" />;
    case "STUDENT_ADDED":
    case "TEACHER_ADDED":
      return <UserPlus className="size-3.5" />;
    case "SYSTEM_ALERT":
      return <Info className="size-3.5" />;
    default:
      return <Bell className="size-3.5" />;
  }
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "PAYMENT_SUCCESS":
      return "Payment";
    case "PAYMENT_FAILED":
      return "Payment";
    case "STUDENT_ADDED":
      return "Student";
    case "TEACHER_ADDED":
      return "Staff";
    case "SYSTEM_ALERT":
      return "System";
    default:
      return "Update";
  }
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex items-start gap-3 p-4 transition-colors cursor-pointer hover:bg-muted/50 ${!notification.isRead ? "bg-primary/[0.03]" : ""
        }`}
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification.id);
        if (notification.actionUrl) onNavigate(notification.actionUrl);
      }}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
      )}

      {/* Avatar */}
      <Avatar className="size-9 shrink-0">
        <AvatarFallback
          className={`text-xs font-semibold ${getAvatarColor(notification.type)}`}
        >
          {notification.actorName
            ? getInitials(notification.actorName)
            : getTypeIcon(notification.type)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {notification.actorName && (
              <span className="text-sm font-semibold text-foreground">
                {notification.actorName}
              </span>
            )}
            <p
              className={`text-sm leading-snug ${!notification.isRead
                ? "text-foreground font-medium"
                : "text-muted-foreground"
                }`}
            >
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">
            {getTypeLabel(notification.type)}
          </span>
        </div>
      </div>

      {/* Actions (appear on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Mark as read"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <CheckCircle className="size-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No notifications</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const { unread, read } = useMemo(() => {
    const unread: Notification[] = [];
    const read: Notification[] = [];
    for (const n of notifications) {
      if (n.isRead) read.push(n);
      else unread.push(n);
    }
    return { unread, read };
  }, [notifications]);

  const handleMarkRead = (id: string) => markAsRead.mutate(id);
  const handleDelete = (id: string) => deleteNotification.mutate(id);
  const handleNavigate = (url: string) => router.push(url);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList variant="line" className="w-full justify-start mb-1">
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                {notifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <span className="ml-1.5 text-xs tabular-nums rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {notifications.length === 0 ? (
            <EmptyState message="We'll notify you when something important happens" />
          ) : (
            <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread">
          {unread.length === 0 ? (
            <EmptyState message="No unread notifications — you're all caught up!" />
          ) : (
            <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
              <AnimatePresence mode="popLayout">
                {unread.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="read">
          {read.length === 0 ? (
            <EmptyState message="No read notifications yet" />
          ) : (
            <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
              <AnimatePresence mode="popLayout">
                {read.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
