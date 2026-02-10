"use client";

import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * PageHeader — unified header for every dashboard page.
 *
 * Provides a consistent layout:
 *   left side  →  title + subtitle
 *   right side →  optional search bar + optional filter button + primary action
 *
 * Usage:
 *   <PageHeader
 *     title="Students"
 *     subtitle="Manage student records and enrollments"
 *     searchPlaceholder="Search by name or ID..."
 *     search={search}
 *     onSearchChange={setSearch}
 *     action={<Button><Plus /> Add Student</Button>}
 *   />
 */

interface PageHeaderProps {
  /** Page title — bold, text-3xl */
  title: string;
  /** Subtitle — muted description below the title */
  subtitle?: string;

  /** Current search value — when provided, search bar is shown */
  search?: string;
  /** Callback when search input changes */
  onSearchChange?: (value: string) => void;
  /** Placeholder text for the search bar */
  searchPlaceholder?: string;

  /** Show the ghost filter button (default: false) */
  showFilter?: boolean;
  /** Callback when filter button is clicked */
  onFilter?: () => void;

  /** Primary action element (typically a <Button> with icon) */
  action?: React.ReactNode;

  /** Extra elements placed between search and action */
  extra?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  showFilter = false,
  onFilter,
  action,
  extra,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left side — title block */}
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        )}
      </div>

      {/* Right side — search + actions */}
      <div className="flex items-center gap-2">
        {/* Search input — only rendered if onSearchChange is provided */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 sm:flex-initial sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}

        {/* Filter button */}
        {showFilter && (
          <Button variant="ghost" size="icon" onClick={onFilter}>
            <Filter className="size-4" />
          </Button>
        )}

        {/* Extra elements */}
        {extra}

        {/* Primary action */}
        {action}
      </div>
    </div>
  );
}
