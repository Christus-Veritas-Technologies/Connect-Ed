"use client";

import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

/**
 * DashboardBreadcrumbs — renders a breadcrumb trail at the top of every
 * dashboard page.  Accepts an array of items; the last item is shown as
 * the current page (non‑clickable), while earlier items become links.
 *
 * Usage:
 *   <DashboardBreadcrumbs items={[
 *     { label: "Students", href: "/dashboard/students" },
 *     { label: "John Doe" },                              // ← current page
 *   ]} />
 */

export interface BreadcrumbItem {
  /** Visible label */
  label: string;
  /** If provided, this item becomes a link */
  href?: string;
}

interface DashboardBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function DashboardBreadcrumbs({ items }: DashboardBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      {/* Home icon always links to /dashboard */}
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors"
      >
        <Home className="size-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-2">
            <ChevronRight className="size-4" />
            {isLast || !item.href ? (
              <span className="text-foreground font-medium">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
