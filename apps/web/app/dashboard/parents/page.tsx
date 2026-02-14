"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Eye,
    Trash2,
    Check,
    MoreVertical,
    Loader2,
    Users,
    UserCheck,
    UserX,
    Mail,
    Phone,
    Download,
    FileDown,
} from "lucide-react";
import {
    useParents,
    useDeleteParent,
    useMarkNotificationsByUrl,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DashboardBreadcrumbs,
    PageHeader,
    StatsCard,
    FilterTabs,
    ViewToggle,
    EmptyState,
    BulkActions,
    Pagination,
} from "@/components/dashboard";
import { exportToPDF, exportDataAsCSV } from "@/lib/export-utils";
import { AddParentDialog } from "@/components/dialogs/add-parent-dialog";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name: string) {
    const parts = name.split(" ");
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

// ─── Parent Card ────────────────────────────────────────────

function ParentCard({
    parent,
    isSelected,
    onSelect,
    onView,
    onDelete,
}: {
    parent: any;
    isSelected: boolean;
    onSelect: () => void;
    onView: () => void;
    onDelete: () => void;
}) {
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
                    {/* Selection checkbox */}
                    {isSelected && (
                        <div className="absolute top-3 right-3 size-5 rounded-md bg-brand flex items-center justify-center z-10">
                            <Check className="size-3.5 text-white" strokeWidth={3} />
                        </div>
                    )}

                    {/* Avatar */}
                    <div className="w-full aspect-square rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
                        <span className="text-3xl font-bold text-white">
                            {getInitials(parent.name)}
                        </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-medium text-sm truncate">{parent.name}</h3>

                    {/* Email */}
                    <p className="text-xs text-muted-foreground truncate mt-1">
                        {parent.email}
                    </p>

                    {/* Phone */}
                    {parent.phone && (
                        <p className="text-xs text-muted-foreground mt-1">{parent.phone}</p>
                    )}

                    {/* Children count */}
                    <div className="text-xs text-muted-foreground mt-2">
                        {parent.children?.length || 0} student{parent.children?.length !== 1 ? "s" : ""}
                    </div>

                    {/* Status */}
                    <div className="mt-2">
                        <Badge
                            variant="outline"
                            className={
                                parent.isActive
                                    ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                    : "bg-gray-50 text-gray-700 border-gray-200 text-xs"
                            }
                        >
                            {parent.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Hover actions */}
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
                        View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                        <Trash2 className="size-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </motion.div>
    );
}

// ─── Main Page ───────────────────────────────────────────────

export default function ParentsPage() {
    const router = useRouter();

    // ── State ──
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("table");
    const [filterTab, setFilterTab] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedParent, setSelectedParent] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>();

    // ── Data fetching ──
    const { data, isLoading } = useParents({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
    });
    const deleteMutation = useDeleteParent();
    const markNotificationsByUrl = useMarkNotificationsByUrl();

    // Mark page notifications as read on mount
    useEffect(() => {
        markNotificationsByUrl.mutate("/dashboard/parents");
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced search with cleanup
    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 400);
    }, []);

    // ── Derived data ──
    const allParents = data?.parents || [];
    const pagination = data?.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    };

    // Client‑side filter by status tab
    const filteredParents =
        filterTab === "all"
            ? allParents
            : filterTab === "active"
                ? allParents.filter((p: any) => p.isActive)
                : allParents.filter((p: any) => !p.isActive);

    // Recent 8 parents for the top grid (only when not searching)
    const recentParents = !debouncedSearch ? filteredParents.slice(0, 8) : [];

    // Stats — derived from the full dataset
    const totalParents = pagination.total;
    const activeParents = allParents.filter((p: any) => p.isActive).length;
    const inactiveParents = allParents.filter((p: any) => !p.isActive).length;
    const totalChildren = allParents.reduce(
        (sum: number, p: any) => sum + (p.children?.length || 0),
        0
    );

    // ── Selection helpers ──
    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredParents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredParents.map((p: any) => p.id)));
        }
    };

    // ── Actions ──
    const handleView = (parent: any) => {
        router.push(`/dashboard/parents/${parent.id}`);
    };

    const handleDeleteClick = (parent: any) => {
        setSelectedParent(parent);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedParent) return;
        deleteMutation.mutate(selectedParent.id, {
            onSuccess: () => {
                toast.success("Parent deleted", {
                    description: `${selectedParent.name} has been removed.`,
                });
                setShowDeleteModal(false);
                setSelectedParent(null);
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selectedParent.id);
                    return next;
                });
            },
            onError: (error) => {
                toast.error(
                    error instanceof Error ? error.message : "Failed to delete parent"
                );
            },
        });
    };

    const handleBulkDelete = () => {
        if (
            !confirm(
                `Delete ${selectedIds.size} parent(s)? This cannot be undone.`
            )
        )
            return;
        const ids = Array.from(selectedIds);
        ids.forEach((id) => {
            deleteMutation.mutate(id as string, {
                onSuccess: () => {
                    setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                },
            });
        });
        toast.success(`Deleting ${ids.length} parent(s)...`);
    };

    // Export: uses selected items if any, otherwise all filtered
    const handleExportCSV = () => {
        const toExport =
            selectedIds.size > 0
                ? filteredParents.filter((p: any) => selectedIds.has(p.id))
                : filteredParents;
        if (toExport.length === 0) return;

        exportDataAsCSV(
            toExport.map((p: any) => ({
                Name: p.name,
                Email: p.email,
                Phone: p.phone || "—",
                Students: p.children?.length || 0,
                Status: p.isActive ? "Active" : "Inactive",
            })),
            ["Name", "Email", "Phone", "Students", "Status"],
            `parents-${new Date().toISOString().split("T")[0]}`
        );
    };

    const handleExportPDF = () => {
        const toExport =
            selectedIds.size > 0
                ? filteredParents.filter((p: any) => selectedIds.has(p.id))
                : filteredParents;
        if (toExport.length === 0) return;

        exportToPDF(
            toExport.map((p: any) => ({
                name: p.name,
                email: p.email,
                phone: p.phone || "—",
                students: p.children?.length || 0,
                status: p.isActive ? "Active" : "Inactive",
            })),
            [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "students", label: "Students" },
                { key: "status", label: "Status" },
            ],
            `parents-${new Date().toISOString().split("T")[0]}`,
            "Parents Report"
        );
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <DashboardBreadcrumbs items={[{ label: "Parents" }]} />

            {/* Header */}
            <PageHeader
                title="Parents"
                subtitle="Manage parent accounts and their children"
                search={search}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Search by name or email..."
                showFilter
                action={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleExportCSV}
                            title="Export CSV"
                        >
                            <Download className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleExportPDF}
                            title="Export PDF"
                        >
                            <FileDown className="size-4" />
                        </Button>
                        <Button onClick={() => setShowAddModal(true)}>
                            <Plus className="size-4" />
                            Add Parent
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    label="Total Parents"
                    value={totalParents}
                    icon={<Users className="size-6" />}
                    color="brand"
                />
                <StatsCard
                    label="Active"
                    value={activeParents}
                    icon={<UserCheck className="size-6" />}
                    color="green"
                />
                <StatsCard
                    label="Inactive"
                    value={inactiveParents}
                    icon={<UserX className="size-6" />}
                    color="red"
                />
                <StatsCard
                    label="Children"
                    value={totalChildren}
                    icon={<Users className="size-6" />}
                    color="blue"
                />
            </div>

            {/* Recent grid (only when not searching) */}
            {!debouncedSearch && recentParents.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Recently Added</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AnimatePresence>
                            {recentParents.map((parent) => (
                                <ParentCard
                                    key={parent.id}
                                    parent={parent}
                                    isSelected={selectedIds.has(parent.id)}
                                    onSelect={() => toggleSelection(parent.id)}
                                    onView={() => handleView(parent)}
                                    onDelete={() => handleDeleteClick(parent)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Filter tabs and bulk actions */}
            <div className="flex items-center justify-between">
                <FilterTabs
                    tabs={[
                        { key: "all", label: "All" },
                        { key: "active", label: "Active" },
                        { key: "inactive", label: "Inactive" },
                    ]}
                    active={filterTab}
                    onChange={setFilterTab}
                />
                <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Bulk actions */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <BulkActions
                        count={selectedIds.size}
                        onDelete={handleBulkDelete}
                        onClearSelection={() => setSelectedIds(new Set())}
                    />
                )}
            </AnimatePresence>

            {/* Main content: grid or table view */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-brand" />
                </div>
            ) : filteredParents.length === 0 ? (
                <EmptyState
                    icon={<Users className="size-12" />}
                    title="No parents found"
                    description={
                        debouncedSearch
                            ? "Try adjusting your search terms"
                            : "Get started by adding your first parent"
                    }
                    action={
                        !debouncedSearch && (
                            <Button onClick={() => setShowAddModal(true)}>
                                <Plus className="size-4" />
                                Add Parent
                            </Button>
                        )
                    }
                />
            ) : viewMode === "grid" ? (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">All Parents</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AnimatePresence>
                            {filteredParents.map((parent) => (
                                <ParentCard
                                    key={parent.id}
                                    parent={parent}
                                    isSelected={selectedIds.has(parent.id)}
                                    onSelect={() => toggleSelection(parent.id)}
                                    onView={() => handleView(parent)}
                                    onDelete={() => handleDeleteClick(parent)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                // Table view
                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredParents.length > 0 &&
                                                selectedIds.size === filteredParents.length
                                            }
                                            onChange={selectAll}
                                            className="rounded border-gray-300 text-brand focus:ring-brand"
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-center">Children</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredParents.map((parent) => (
                                        <motion.tr
                                            key={parent.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(parent.id)}
                                                    onChange={() => toggleSelection(parent.id)}
                                                    className="rounded border-gray-300 text-brand focus:ring-brand"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                                        {getInitials(parent.name)}
                                                    </div>
                                                    {parent.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Mail className="size-4" />
                                                    {parent.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {parent.phone ? (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="size-4" />
                                                        {parent.phone}
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">
                                                    {parent.children?.length || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        parent.isActive
                                                            ? "bg-green-50 text-green-700 border-green-200"
                                                            : "bg-gray-50 text-gray-700 border-gray-200"
                                                    }
                                                >
                                                    {parent.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="size-8 p-0"
                                                        >
                                                            <MoreVertical className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => handleView(parent)}
                                                        >
                                                            <Eye className="size-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteClick(parent)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            Delete
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
                </Card>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <Pagination
                    page={page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={setPage}
                    noun="parents"
                />
            )}

            {/* Add Parent Dialog */}
            <AddParentDialog
                open={showAddModal}
                onOpenChange={setShowAddModal}
                onSuccess={() => {
                    setShowAddModal(false);
                    setPage(1);
                    setSearch("");
                    setDebouncedSearch("");
                }}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Parent</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{" "}
                        <span className="font-medium">{selectedParent?.name}</span>? This
                        action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
