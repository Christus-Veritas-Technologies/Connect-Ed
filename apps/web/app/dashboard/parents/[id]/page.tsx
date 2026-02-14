"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Mail,
    Phone,
    Users,
    Calendar,
    AlertCircle,
    Loader2,
    Download,
    FileDown,
    Edit2,
    Trash2,
} from "lucide-react";
import { useParent, useDeleteParent, useUpdateParent } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import {
    DashboardBreadcrumbs,
    PageHeader,
} from "@/components/dashboard";
import { toast } from "sonner";
import { exportToPDF, exportDataAsCSV } from "@/lib/export-utils";

function getInitials(name: string) {
    const parts = name.split(" ");
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

export default function ParentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const parentId = params.id as string;

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const { data, isLoading } = useParent(parentId);
    const deleteMutation = useDeleteParent();

    const parent = data?.parent;

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        deleteMutation.mutate(parentId, {
            onSuccess: () => {
                toast.success("Parent deleted", {
                    description: `${parent?.name} has been removed.`,
                });
                router.push("/dashboard/parents");
            },
            onError: (error) => {
                toast.error(
                    error instanceof Error ? error.message : "Failed to delete parent"
                );
            },
        });
    };

    const handleExportCSV = () => {
        if (!parent) return;

        const childrenData = parent.children?.map((child: any) => ({
            "Student Name": `${child.firstName} ${child.lastName}`,
            "Student ID": child.admissionNumber,
            Class: child.class?.name || "—",
        })) || [];

        if (childrenData.length === 0) return;

        exportDataAsCSV(
            childrenData,
            ["Student Name", "Student ID", "Class"],
            `parent-${parent.name.replace(/\s+/g, "-")}-students-${new Date().toISOString().split("T")[0]}`
        );
    };

    const handleExportPDF = () => {
        if (!parent) return;

        const childrenData = parent.children?.map((child: any) => ({
            name: `${child.firstName} ${child.lastName}`,
            studentId: child.admissionNumber,
            class: child.class?.name || "—",
        })) || [];

        if (childrenData.length === 0) return;

        exportToPDF(
            childrenData,
            [
                { key: "name", label: "Student Name" },
                { key: "studentId", label: "Student ID" },
                { key: "class", label: "Class" },
            ],
            `parent-${parent.name.replace(/\s+/g, "-")}-students-${new Date().toISOString().split("T")[0]}`,
            `Students of ${parent.name}`
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="size-8 animate-spin text-brand" />
            </div>
        );
    }

    if (!parent) {
        return (
            <div className="space-y-6">
                <DashboardBreadcrumbs
                    items={[
                        { label: "Parents", href: "/dashboard/parents" },
                        { label: "Not Found" },
                    ]}
                />
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>Parent not found</AlertDescription>
                </Alert>
                <Button onClick={() => router.push("/dashboard/parents")}>
                    Back to Parents
                </Button>
            </div>
        );
    }

    const childrenCount = parent.children?.length || 0;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <DashboardBreadcrumbs
                items={[
                    { label: "Parents", href: "/dashboard/parents" },
                    { label: parent.name },
                ]}
            />

            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push("/dashboard/parents")}
                >
                    <ArrowLeft className="size-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{parent.name}</h1>
                    <p className="text-sm text-muted-foreground">{parent.email}</p>
                </div>
            </div>

            {/* Parent info card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
                {/* Main info */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Parent Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Avatar and basic info */}
                        <div className="flex items-start gap-4">
                            <div className="size-20 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                {getInitials(parent.name)}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold">{parent.name}</h2>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Mail className="size-4" />
                                    {parent.email}
                                </div>
                                {parent.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        <Phone className="size-4" />
                                        {parent.phone}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-3">
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
                                </div>
                            </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Email
                                </p>
                                <p className="text-sm font-medium mt-1">{parent.email}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Phone
                                </p>
                                <p className="text-sm font-medium mt-1">
                                    {parent.phone || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Students
                                </p>
                                <p className="text-sm font-medium mt-1">{childrenCount}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Status
                                </p>
                                <p className="text-sm font-medium mt-1">
                                    {parent.isActive ? "Active" : "Inactive"}
                                </p>
                            </div>
                        </div>

                        {/* Created date */}
                        {parent.createdAt && (
                            <div className="pt-4 border-t">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="size-4" />
                                    <span>
                                        Member since{" "}
                                        {new Date(parent.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleExportCSV}
                            disabled={childrenCount === 0}
                        >
                            <Download className="size-4" />
                            Export as CSV
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleExportPDF}
                            disabled={childrenCount === 0}
                        >
                            <FileDown className="size-4" />
                            Export as PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="size-4" />
                            Delete Parent
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Children table */}
            {childrenCount > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5" />
                            Children ({childrenCount})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Admission Number</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parent.children?.map((child: any) => (
                                        <TableRow
                                            key={child.id}
                                            className="hover:bg-muted/50 cursor-pointer"
                                            onClick={() =>
                                                router.push(`/dashboard/students/${child.id}`)
                                            }
                                        >
                                            <TableCell className="font-medium">
                                                {child.firstName} {child.lastName}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground font-mono">
                                                {child.admissionNumber}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {child.class?.name || "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Active
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-8">
                            <Users className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground">No children linked to this parent</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Parent</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{" "}
                        <span className="font-medium">{parent.name}</span>? This action
                        cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
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
