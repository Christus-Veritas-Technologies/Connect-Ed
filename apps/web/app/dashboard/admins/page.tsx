"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Loader2,
    Users,
    UserCheck,
    UserX,
    Mail,
    Phone,
    Trash2,
    MoreVertical,
    Check,
    Shield,
} from "lucide-react";
import {
    useMarkNotificationsByUrl,
    useAdmins,
    useCreateAdmin,
    useDeleteAdmin,
} from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DashboardBreadcrumbs,
    PageHeader,
    StatsCard,
    FilterTabs,
    ViewToggle,
    EmptyState,
} from "@/components/dashboard";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────

interface Admin {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
}

// ─── Admin Card ──────────────────────────────────────────────

function AdminCard({
    admin,
    isSelected,
    isSelf,
    canDelete,
    onSelect,
    onDelete,
}: {
    admin: Admin;
    isSelected: boolean;
    isSelf: boolean;
    canDelete: boolean;
    onSelect: (id: string) => void;
    onDelete: (a: Admin) => void;
}) {
    const initials = admin.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2);

    return (
        <Card hover className="relative group">
            {/* Selection checkbox */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(admin.id);
                }}
                className={`absolute top-3 left-3 z-10 size-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                    ? "bg-brand border-brand text-white"
                    : "border-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:border-brand"
                    }`}
            >
                {isSelected && <Check className="size-3" />}
            </button>

            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="size-10 rounded-full bg-linear-to-br from-purple-600 to-brand flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <h3 className="font-semibold text-sm truncate">
                                    {admin.name}
                                </h3>
                                {isSelf && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                        You
                                    </Badge>
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 opacity-0 group-hover:opacity-100"
                                    >
                                        <MoreVertical className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        disabled={!canDelete || isSelf}
                                        onClick={() => canDelete && !isSelf && onDelete(admin)}
                                    >
                                        <Trash2 className="size-4" />
                                        {isSelf ? "Can't remove yourself" : !canDelete ? "Only primary admin can remove" : "Remove"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Mail className="size-3" />
                            <span className="truncate">{admin.email}</span>
                        </div>

                        {admin.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Phone className="size-3" />
                                <span className="truncate">{admin.phone}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                            <Badge
                                variant={admin.isActive ? "default" : "secondary"}
                                className="text-xs"
                            >
                                {admin.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                                {new Date(admin.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Page ───────────────────────────────────────────────

export default function AdminsPage() {
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [view, setView] = useState<"grid" | "table" | "list">("grid");
    const [showAddModal, setShowAddModal] = useState(false);
    const [formError, setFormError] = useState("");
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
    });

    const markNotificationsByUrl = useMarkNotificationsByUrl();

    // ── Data fetching ──
    const { data: adminsData, isLoading } = useAdmins();
    const createMutation = useCreateAdmin();
    const deleteMutation = useDeleteAdmin();

    const admins: Admin[] = adminsData?.admins || [];
    const isFirstAdmin = !!user && user.id === adminsData?.firstAdminId;

    // Mark notifications as read on page load
    useEffect(() => {
        markNotificationsByUrl.mutate("/dashboard/admins");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Derived data ──
    const activeCount = admins.filter((a) => a.isActive).length;
    const inactiveCount = admins.filter((a) => !a.isActive).length;

    // Client-side filtering: status + search
    const filteredAdmins = admins.filter((a) => {
        if (filter === "active" && !a.isActive) return false;
        if (filter === "inactive" && a.isActive) return false;

        if (search) {
            return (
                a.name.toLowerCase().includes(search.toLowerCase()) ||
                a.email.toLowerCase().includes(search.toLowerCase())
            );
        }
        return true;
    });

    // ── Selection handlers ──
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAdmins.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAdmins.map((a) => a.id)));
        }
    };

    // ── CRUD ──
    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        createMutation.mutate(
            {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone || undefined,
            },
            {
                onSuccess: () => {
                    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
                    setShowAddModal(false);
                    toast.success("Admin added successfully!", {
                        description:
                            "Login credentials have been sent via enabled channels.",
                    });
                },
                onError: (err) => {
                    const error =
                        err instanceof ApiError ? err.message : "Failed to add admin";
                    setFormError(error);
                    toast.error(error);
                },
            }
        );
    };

    const handleDeleteAdmin = (admin: Admin) => {
        setSelectedAdmin(admin);
        setShowDeleteModal(true);
    };

    const confirmDeleteAdmin = async () => {
        if (!selectedAdmin) return;

        deleteMutation.mutate(selectedAdmin.id, {
            onSuccess: () => {
                toast.success("Admin removed successfully", {
                    description: `${selectedAdmin.name} has been removed.`,
                });
                setShowDeleteModal(false);
                setSelectedAdmin(null);
            },
            onError: (error) => {
                const err =
                    error instanceof ApiError
                        ? error.message
                        : "Failed to remove admin";
                toast.error(err);
            },
        });
    };

    // ── Bulk delete ──
    const handleBulkDelete = () => {
        // Filter out self from bulk delete
        const idsToDelete = Array.from(selectedIds).filter(
            (id) => id !== user?.id
        );
        if (idsToDelete.length === 0) {
            toast.error("You cannot remove yourself.");
            return;
        }
        const count = idsToDelete.length;
        Promise.all(
            idsToDelete.map((id) => deleteMutation.mutateAsync(id))
        ).then(() => {
            toast.success(`Removed ${count} admin${count !== 1 ? "s" : ""}`);
            setSelectedIds(new Set());
        });
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <DashboardBreadcrumbs items={[{ label: "Admins" }]} />

            {/* Header */}
            <PageHeader
                title="Admins"
                subtitle="Manage administrator accounts for your school"
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by name or email..."
                action={
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="size-4" />
                        Add Admin
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard
                    label="Total Admins"
                    value={admins.length}
                    icon={<Shield className="size-6" />}
                    color="brand"
                    delay={0.1}
                />
                <StatsCard
                    label="Active"
                    value={activeCount}
                    icon={<UserCheck className="size-6" />}
                    color="green"
                    delay={0.2}
                />
                <StatsCard
                    label="Inactive"
                    value={inactiveCount}
                    icon={<UserX className="size-6" />}
                    color="orange"
                    delay={0.3}
                />
            </div>

            {/* Filter Tabs + View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <FilterTabs
                    tabs={[
                        { key: "all", label: "All", count: admins.length },
                        { key: "active", label: "Active", count: activeCount },
                        { key: "inactive", label: "Inactive", count: inactiveCount },
                    ]}
                    active={filter}
                    onChange={(key) => {
                        setFilter(key);
                        setSelectedIds(new Set());
                    }}
                />
                <ViewToggle view={view} onViewChange={setView} />
            </div>

            {/* Bulk actions bar */}
            {isFirstAdmin && selectedIds.size > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-4 py-2 bg-muted rounded-lg"
                >
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size} selected
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                    >
                        <Trash2 className="size-4" />
                        Remove Selected
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        Clear
                    </Button>
                </motion.div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-brand" />
                </div>
            ) : filteredAdmins.length === 0 ? (
                <EmptyState
                    icon={<Shield className="size-12" />}
                    title={search ? "No admins found" : "No admins yet"}
                    description={
                        search
                            ? "Try a different search term."
                            : "Add an administrator to help manage your school."
                    }
                    action={
                        !search ? (
                            <Button onClick={() => setShowAddModal(true)}>
                                <Plus className="size-4" />
                                Add Admin
                            </Button>
                        ) : undefined
                    }
                />
            ) : view === "grid" ? (
                // ── Grid view ──
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {filteredAdmins.map((a, index) => (
                            <motion.div
                                key={a.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <AdminCard
                                    admin={a}
                                    isSelected={selectedIds.has(a.id)}
                                    isSelf={a.id === user?.id}
                                    canDelete={isFirstAdmin}
                                    onSelect={toggleSelect}
                                    onDelete={handleDeleteAdmin}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : view === "list" ? (
                // ── List view ──
                <div className="space-y-2">
                    <AnimatePresence>
                        {filteredAdmins.map((a, index) => (
                            <motion.div
                                key={a.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <Card hover className="relative group">
                                    <CardContent className="p-3 flex items-center gap-4">
                                        {/* Selection */}
                                        <button
                                            onClick={() => toggleSelect(a.id)}
                                            className={`size-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${selectedIds.has(a.id)
                                                ? "bg-brand border-brand text-white"
                                                : "border-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:border-brand"
                                                }`}
                                        >
                                            {selectedIds.has(a.id) && <Check className="size-3" />}
                                        </button>

                                        {/* Avatar */}
                                        <div className="size-9 rounded-full bg-linear-to-br from-purple-600 to-brand flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                            {a.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .slice(0, 2)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex items-center gap-6">
                                            <div className="flex items-center gap-2 w-40">
                                                <span className="font-medium text-sm truncate">
                                                    {a.name}
                                                </span>
                                                {a.id === user?.id && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] shrink-0"
                                                    >
                                                        You
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted-foreground truncate hidden sm:block">
                                                {a.email}
                                            </span>
                                        </div>

                                        <Badge
                                            variant={a.isActive ? "default" : "secondary"}
                                            className="text-xs shrink-0"
                                        >
                                            {a.isActive ? "Active" : "Inactive"}
                                        </Badge>

                                        <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                                            {new Date(a.createdAt).toLocaleDateString()}
                                        </span>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 shrink-0"
                                                >
                                                    <MoreVertical className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    disabled={!isFirstAdmin || a.id === user?.id}
                                                    onClick={() =>
                                                        isFirstAdmin && a.id !== user?.id && handleDeleteAdmin(a)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                    {a.id === user?.id
                                                        ? "Can't remove yourself"
                                                        : !isFirstAdmin
                                                            ? "Only primary admin can remove"
                                                            : "Remove"}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                // ── Table view ──
                <div className="border rounded-xl overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <button
                                        onClick={toggleSelectAll}
                                        className={`size-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === filteredAdmins.length &&
                                            filteredAdmins.length > 0
                                            ? "bg-brand border-brand text-white"
                                            : "border-muted-foreground/30 hover:border-brand"
                                            }`}
                                    >
                                        {selectedIds.size === filteredAdmins.length &&
                                            filteredAdmins.length > 0 && (
                                                <Check className="size-3" />
                                            )}
                                    </button>
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Added</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {filteredAdmins.map((a, index) => (
                                    <motion.tr
                                        key={a.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="group hover:bg-muted/50"
                                    >
                                        <TableCell>
                                            <button
                                                onClick={() => toggleSelect(a.id)}
                                                className={`size-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(a.id)
                                                    ? "bg-brand border-brand text-white"
                                                    : "border-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:border-brand"
                                                    }`}
                                            >
                                                {selectedIds.has(a.id) && (
                                                    <Check className="size-3" />
                                                )}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-linear-to-br from-purple-600 to-brand flex items-center justify-center text-white font-semibold text-sm">
                                                    {a.name
                                                        .split(" ")
                                                        .map((n) => n[0])
                                                        .join("")
                                                        .slice(0, 2)}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{a.name}</span>
                                                    {a.id === user?.id && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            You
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Mail className="size-3.5" />
                                                {a.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {a.phone ? (
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Phone className="size-3.5" />
                                                    {a.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/50">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={a.isActive ? "default" : "secondary"}
                                            >
                                                {a.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(a.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7"
                                                    >
                                                        <MoreVertical className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        disabled={!isFirstAdmin || a.id === user?.id}
                                                        onClick={() =>
                                                            isFirstAdmin && a.id !== user?.id && handleDeleteAdmin(a)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                        {a.id === user?.id
                                                            ? "Can't remove yourself"
                                                            : !isFirstAdmin
                                                                ? "Only primary admin can remove"
                                                                : "Remove"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Add Admin Dialog */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="size-5 text-brand" />
                            Add Admin
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAdmin} className="space-y-4">
                        {formError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
                            >
                                {formError}
                            </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    placeholder="e.g., John"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, firstName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    placeholder="e.g., Smith"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, lastName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="e.g., john.smith@school.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (optional)</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="e.g., +263 71 234 5678"
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData({ ...formData, phone: e.target.value })
                                }
                            />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            A password will be auto-generated and sent via all enabled
                            notification channels (email, WhatsApp, SMS).
                        </p>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setFormError("");
                                    setFormData({
                                        firstName: "",
                                        lastName: "",
                                        email: "",
                                        phone: "",
                                    });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? "Adding..." : "Add Admin"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="size-5" />
                            Remove Admin
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-muted-foreground">
                            Are you sure you want to remove{" "}
                            <strong className="text-foreground">
                                {selectedAdmin?.name}
                            </strong>
                            ? This action cannot be undone and they will lose admin access to
                            the system.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedAdmin(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={confirmDeleteAdmin}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? "Removing..." : "Remove"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
