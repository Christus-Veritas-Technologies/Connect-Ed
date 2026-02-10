/**
 * Dashboard Design System — composable components.
 *
 * Each component is intentionally a separate file so pages can import only
 * what they need.  This barrel re-exports everything for convenience.
 *
 * Usage:
 *   import { DashboardBreadcrumbs, PageHeader, StatsCard } from "@/components/dashboard";
 */

export { DashboardBreadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
export { PageHeader } from "./page-header";
export { StatsCard } from "./stats-card";
export { FilterTabs } from "./filter-tabs";
export { ViewToggle } from "./view-toggle";
export { EmptyState } from "./empty-state";
export { BulkActions } from "./bulk-actions";
export { Pagination } from "./pagination";
