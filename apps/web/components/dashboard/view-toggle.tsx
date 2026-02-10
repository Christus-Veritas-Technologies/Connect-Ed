"use client";

import { LayoutGrid, List, Rows3 } from "lucide-react";

/**
 * ViewToggle — a pill‑shaped toggle to switch between view modes.
 * Supports "grid", "table", and optionally "list".
 *
 * Usage:
 *   <ViewToggle mode={viewMode} onChange={setViewMode} />
 *   <ViewToggle mode={viewMode} onChange={setViewMode} showList />
 */

type ViewMode = "grid" | "table" | "list";

interface ViewToggleProps {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
    /** Show the third "list" button (default: false) */
    showList?: boolean;
}

export function ViewToggle({ mode, onChange, showList = false }: ViewToggleProps) {
    const items: { key: ViewMode; icon: React.ReactNode; position: string }[] = [
        {
            key: "grid",
            icon: <LayoutGrid className="size-4" />,
            position: showList ? "rounded-l-lg" : "rounded-l-lg",
        },
        {
            key: "table",
            icon: <Rows3 className="size-4" />,
            position: showList ? "" : "rounded-r-lg",
        },
    ];

    if (showList) {
        items.push({
            key: "list",
            icon: <List className="size-4" />,
            position: "rounded-r-lg",
        });
    }

    return (
        <div className="flex items-center border rounded-lg">
            {items.map((item, index) => (
                <button
                    key={item.key}
                    onClick={() => onChange(item.key)}
                    className={`p-2 transition-colors ${index === 0 ? "rounded-l-lg" : ""} ${index === items.length - 1 ? "rounded-r-lg" : ""} ${mode === item.key
                            ? "bg-brand text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    {item.icon}
                </button>
            ))}
        </div>
    );
}
