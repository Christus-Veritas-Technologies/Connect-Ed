"use client";

import { Button } from "@/components/ui/button";

/**
 * EmptyState — a centred placeholder for pages / sections with no data.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Users className="size-12" />}
 *     title="No students yet"
 *     description="Add your first student to get started"
 *     action={<Button>Add Student</Button>}
 *   />
 */

interface EmptyStateProps {
    /** Large icon displayed at the top */
    icon: React.ReactNode;
    /** Main heading */
    title: string;
    /** Muted supporting text */
    description?: string;
    /** CTA button or element */
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <div className="mx-auto text-muted-foreground/40">{icon}</div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
