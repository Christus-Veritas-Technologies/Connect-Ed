"use client";

import { Button } from "@/components/ui/button";

/**
 * FilterTabs — a row of tab‑like buttons for quick filtering.
 *
 * Usage:
 *   <FilterTabs
 *     tabs={[
 *       { key: "all", label: "All" },
 *       { key: "active", label: "Active" },
 *       { key: "inactive", label: "Inactive" },
 *     ]}
 *     active={filterTab}
 *     onChange={setFilterTab}
 *   />
 */

interface Tab {
  /** Unique key for this tab */
  key: string;
  /** Display label */
  label: string;
  /** Optional count badge */
  count?: number;
}

interface FilterTabsProps {
  tabs: Tab[];
  /** Currently‑active tab key */
  active: string;
  /** Callback when a tab is clicked */
  onChange: (key: string) => void;
}

export function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          variant={active === tab.key ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(tab.key)}
          className="gap-1.5"
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`text-xs ${
                active === tab.key
                  ? "text-white/70"
                  : "text-muted-foreground"
              }`}
            >
              ({tab.count})
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
