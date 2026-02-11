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
  Trash2,
  MoreVertical,
  LayoutGrid,
  List,
  Table as TableIcon,
  Check,
} from "lucide-react";
import {
  useMarkNotificationsByUrl,
  useReceptionists,
  useCreateReceptionist,
  useDeleteReceptionist,
} from "@/lib/hooks";
import { ApiError } from "@/lib/api";
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
  Pagination,
} from "@/components/dashboard";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────

interface Receptionist {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Receptionist Card ───────────────────────────────────────

function ReceptionistCard({
  receptionist,
  isSelected,
  onSelect,
  onDelete,
}: {
  receptionist: Receptionist;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (r: Receptionist) => void;
}) {
  const initials = receptionist.name
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
          onSelect(receptionist.id);
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
          <div className="size-10 rounded-full bg-linear-to-br from-brand to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm truncate">
                {receptionist.name}
              </h3>
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
                    onClick={() => onDelete(receptionist)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Mail className="size-3" />
              <span className="truncate">{receptionist.email}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <Badge
                variant={receptionist.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {receptionist.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {new Date(receptionist.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function ReceptionistsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"grid" | "table" | "list">("grid");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedReceptionist, setSelectedReceptionist] =
    useState<Receptionist | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const markNotificationsByUrl = useMarkNotificationsByUrl();

  // ── Data fetching ──
  const { data: receptionistsData, isLoading } = useReceptionists();
  const createMutation = useCreateReceptionist();
  const deleteMutation = useDeleteReceptionist();

  const receptionists: Receptionist[] =
    receptionistsData?.receptionists || [];

  // Mark notifications as read on page load
  useEffect(() => {
    markNotificationsByUrl.mutate("/dashboard/receptionists");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived data ──
  const activeCount = receptionists.filter((r) => r.isActive).length;
  const inactiveCount = receptionists.filter((r) => !r.isActive).length;

  // Client-side filtering: status + search
  const filteredReceptionists = receptionists.filter((r) => {
    // Status filter
    if (filter === "active" && !r.isActive) return false;
    if (filter === "inactive" && r.isActive) return false;

    // Search
    if (search) {
      return (
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
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
    if (selectedIds.size === filteredReceptionists.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReceptionists.map((r) => r.id)));
    }
  };

  // ── CRUD ──
  const handleAddReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    createMutation.mutate(
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      },
      {
        onSuccess: () => {
          setFormData({ firstName: "", lastName: "", email: "" });
          setShowAddModal(false);
          toast.success("Receptionist added successfully!", {
            description:
              "Welcome email with login credentials has been sent.",
          });
        },
        onError: (err) => {
          const error =
            err instanceof ApiError
              ? err.message
              : "Failed to add receptionist";
          setFormError(error);
          toast.error(error);
        },
      }
    );
  };

  const handleDeleteReceptionist = (receptionist: Receptionist) => {
    setSelectedReceptionist(receptionist);
    setShowDeleteModal(true);
  };

  const confirmDeleteReceptionist = async () => {
    if (!selectedReceptionist) return;

    deleteMutation.mutate(selectedReceptionist.id, {
      onSuccess: () => {
        toast.success("Receptionist removed successfully", {
          description: `${selectedReceptionist.name} has been removed.`,
        });
        setShowDeleteModal(false);
        setSelectedReceptionist(null);
      },
      onError: (error) => {
        const err =
          error instanceof ApiError
            ? error.message
            : "Failed to remove receptionist";
        toast.error(err);
      },
    });
  };



  // ── Bulk delete ──
  const handleBulkDelete = () => {
    const count = selectedIds.size;
    Promise.all(
      Array.from(selectedIds).map((id) => deleteMutation.mutateAsync(id))
    ).then(() => {
      toast.success(`Removed ${count} receptionist${count !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Receptionists" }]} />

      {/* Header */}
      <PageHeader
        title="Receptionists"
        subtitle="Manage receptionist accounts for your school"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email..."
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="size-4" />
            Add Receptionist
          </Button>
        }
      />
      Add Receptionist
    </Button>


      {/* Stats */ }
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <StatsCard
      label="Total Receptionists"
      value={receptionists.length}
      icon={<Users className="size-6" />}
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

  {/* Filter Tabs + View Toggle */ }
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <FilterTabs
      tabs={[
        { key: "all", label: "All", count: receptionists.length },
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

  {/* Content */ }
  {
    isLoading ? (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    ) : filteredReceptionists.length === 0 ? (
      <EmptyState
        icon={Users}
        title={search ? "No receptionists found" : "No receptionists yet"}
        description={
          search
            ? "Try a different search term."
            : "Add your first receptionist to help manage your school."
        }
        action={
          !search ? (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Add Receptionist
            </Button>
          ) : undefined
        }
      />
    ) : view === "grid" ? (
      // ── Grid view ──
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredReceptionists.map((r, index) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03 }}
            >
              <ReceptionistCard
                receptionist={r}
                isSelected={selectedIds.has(r.id)}
                onSelect={toggleSelect}
                onDelete={handleDeleteReceptionist}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    ) : view === "list" ? (
      // ── List view ──
      <div className="space-y-2">
        <AnimatePresence>
          {filteredReceptionists.map((r, index) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
                hover
                className="relative group"
              >
                <CardContent className="p-3 flex items-center gap-4">
                  {/* Selection */}
                  <button
                    onClick={() => toggleSelect(r.id)}
                    className={`size-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${selectedIds.has(r.id)
                      ? "bg-brand border-brand text-white"
                      : "border-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:border-brand"
                      }`}
                  >
                    {selectedIds.has(r.id) && <Check className="size-3" />}
                  </button>

                  {/* Avatar */}
                  <div className="size-9 rounded-full bg-linear-to-br from-brand to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {r.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex items-center gap-6">
                    <span className="font-medium text-sm w-40 truncate">
                      {r.name}
                    </span>
                    <span className="text-sm text-muted-foreground truncate hidden sm:block">
                      {r.email}
                    </span>
                  </div>

                  <Badge
                    variant={r.isActive ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {r.isActive ? "Active" : "Inactive"}
                  </Badge>

                  <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                    {new Date(r.createdAt).toLocaleDateString()}
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
                        onClick={() => handleDeleteReceptionist(r)}
                      >
                        <Trash2 className="size-4" />
                        Remove
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
                  className={`size-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.size === filteredReceptionists.length &&
                    filteredReceptionists.length > 0
                    ? "bg-brand border-brand text-white"
                    : "border-muted-foreground/30 hover:border-brand"
                    }`}
                >
                  {selectedIds.size === filteredReceptionists.length &&
                    filteredReceptionists.length > 0 && (
                      <Check className="size-3" />
                    )}
                </button>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredReceptionists.map((r, index) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  className="group hover:bg-muted/50"
                >
                  <TableCell>
                    <button
                      onClick={() => toggleSelect(r.id)}
                      className={`size-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(r.id)
                        ? "bg-brand border-brand text-white"
                        : "border-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:border-brand"
                        }`}
                    >
                      {selectedIds.has(r.id) && (
                        <Check className="size-3" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-linear-to-br from-brand to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {r.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5" />
                      {r.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.isActive ? "default" : "secondary"}
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
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
                          onClick={() => handleDeleteReceptionist(r)}
                        >
                          <Trash2 className="size-4" />
                          Remove
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
    )
  }



  {/* Add Receptionist Dialog */ }
  <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus className="size-5 text-brand" />
          Add Receptionist
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleAddReceptionist} className="space-y-4">
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
              placeholder="e.g., Jane"
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
              placeholder="e.g., Doe"
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
            placeholder="e.g., jane.doe@school.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          <p className="text-xs text-muted-foreground">
            A password will be auto-generated and sent via email along with
            login instructions.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowAddModal(false);
              setFormError("");
              setFormData({ firstName: "", lastName: "", email: "" });
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Receptionist"}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  {/* Delete Confirmation Dialog */ }
  <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="size-5" />
          Remove Receptionist
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Are you sure you want to remove{" "}
          <strong className="text-foreground">
            {selectedReceptionist?.name}
          </strong>
          ? This action cannot be undone and they will lose access to the
          system.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedReceptionist(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={confirmDeleteReceptionist}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
    </div >
  );
}
