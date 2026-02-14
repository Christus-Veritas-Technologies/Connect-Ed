"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination — consistent pagination controls used by every list page.
 * Shows "Showing X–Y of Z items" on the left, Previous / Next on the right.
 *
 * Usage:
 *   <Pagination
 *     page={page}
 *     totalPages={data.totalPages}
 *     total={data.total}
 *     limit={data.limit}
 *     onPageChange={setPage}
 *     noun="students"
 *   />
 */

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    /** Label for items — e.g. "students", "files" */
    noun?: string;
}

export function Pagination({
    page,
    totalPages,
    total,
    limit,
    onPageChange,
    noun = "items",
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">{from}</span>–
                <span className="font-semibold text-foreground">{to}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> {noun}
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => onPageChange(page - 1)}
                    className="gap-1"
                >
                    <ChevronLeft className="size-4" />
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="gap-1"
                >
                    Next
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
