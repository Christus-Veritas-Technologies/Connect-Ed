"use client";

import { Trash2, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * BulkActions — a floating bar shown when items are selected.  Provides
 * consistent bulk operations: delete, export, and status change.
 *
 * Usage:
 *   {selectedIds.size > 0 && (
 *     <BulkActions
 *       count={selectedIds.size}
 *       onDelete={() => handleBulkDelete(selectedIds)}
 *       onExport={() => handleBulkExport(selectedIds)}
 *       onClearSelection={() => setSelectedIds(new Set())}
 *       extra={<Button size="sm" variant="outline">Mark Active</Button>}
 *     />
 *   )}
 */

interface BulkActionsProps {
    /** Number of currently‑selected items */
    count: number;
    /** Callback to delete selected items */
    onDelete?: () => void;
    /** Callback to export selected items */
    onExport?: () => void;
    /** Callback to clear the selection */
    onClearSelection: () => void;
    /** Extra action buttons (e.g. status changes) */
    extra?: React.ReactNode;
}

export function BulkActions({
    count,
    onDelete,
    onExport,
    onClearSelection,
    extra,
}: BulkActionsProps) {
    return (
        <div className="sticky bottom-4 z-50 mx-auto w-fit">
            <div className="flex items-center gap-3 bg-card border shadow-lg rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium">
                    {count} selected
                </span>

                <div className="h-4 w-px bg-border" />

                {onExport && (
                    <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
                        <Download className="size-3.5" />
                        Export
                    </Button>
                )}

                {extra}

                {onDelete && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    >
                        <Trash2 className="size-3.5" />
                        Delete
                    </Button>
                )}

                <Button variant="ghost" size="sm" onClick={onClearSelection} className="gap-1.5">
                    <RefreshCw className="size-3.5" />
                    Clear
                </Button>
            </div>
        </div>
    );
}
