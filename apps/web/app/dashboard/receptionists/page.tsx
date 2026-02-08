"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserGroupIcon,
  Search01Icon,
  Add01Icon,
  UserCheck01Icon,
  Cancel01Icon,
  Delete02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMarkNotificationsByUrl, useReceptionists, useCreateReceptionist, useDeleteReceptionist } from "@/lib/hooks";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Receptionist {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function ReceptionistsPage() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedReceptionist, setSelectedReceptionist] = useState<Receptionist | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const markNotificationsByUrl = useMarkNotificationsByUrl();

  // TanStack Query hooks
  const { data: receptionistsData, isLoading } = useReceptionists();
  const createMutation = useCreateReceptionist();
  const deleteMutation = useDeleteReceptionist();

  const receptionists: Receptionist[] = receptionistsData?.receptionists || [];

  // Mark notifications as read when page loads
  useEffect(() => {
    markNotificationsByUrl.mutate("/dashboard/receptionists");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            description: "Welcome email with login credentials has been sent.",
          });
        },
        onError: (err) => {
          const error = err instanceof ApiError ? err.message : "Failed to add receptionist";
          setFormError(error);
          toast.error(error);
        },
      }
    );
  };

  const handleDeleteReceptionist = (receptionist: Receptionist, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        const err = error instanceof ApiError ? error.message : "Failed to remove receptionist";
        toast.error(err);
      },
    });
  };

  // Filter receptionists
  const filteredReceptionists = receptionists.filter((r) => {
    if (!search) return true;
    return (
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Stats
  const activeCount = receptionists.filter((r) => r.isActive).length;
  const inactiveCount = receptionists.filter((r) => !r.isActive).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <HugeiconsIcon icon={UserGroupIcon} size={28} className="text-brand" />
            Receptionists
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage receptionist accounts for your school
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto">
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Receptionist
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-brand">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Receptionists</p>
                  <p className="text-2xl font-bold mt-1">{receptionists.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand/10">
                  <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-brand" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{activeCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <HugeiconsIcon icon={UserCheck01Icon} size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">{inactiveCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-100">
                  <HugeiconsIcon icon={Cancel01Icon} size={24} className="text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
        ) : filteredReceptionists.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <HugeiconsIcon icon={UserGroupIcon} size={48} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {search ? "No receptionists found" : "No receptionists yet"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {search
                  ? "Try a different search term."
                  : "Add your first receptionist to help manage your school."}
              </p>
              {!search && (
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <HugeiconsIcon icon={Add01Icon} size={20} />
                  Add Receptionist
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredReceptionists.map((receptionist, index) => (
                    <motion.tr
                      key={receptionist.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-sm">
                            {receptionist.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="font-medium">{receptionist.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <HugeiconsIcon icon={Mail01Icon} size={14} />
                          {receptionist.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={receptionist.isActive ? "default" : "secondary"}>
                          {receptionist.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(receptionist.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteReceptionist(receptionist, e)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={18} />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </Card>
        )}
      </motion.div>

      {/* Add Receptionist Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Add01Icon} size={20} className="text-brand" />
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
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="e.g., Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                A password will be auto-generated and sent via email along with login instructions.
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <HugeiconsIcon icon={Delete02Icon} size={20} />
              Remove Receptionist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{selectedReceptionist?.name}</strong>?
              This action cannot be undone and they will lose access to the system.
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
    </div>
  );
}
