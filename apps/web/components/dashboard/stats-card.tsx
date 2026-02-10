"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

/**
 * StatsCard — a consistently‑styled stat card used across all dashboard
 * list pages.  Renders a colour‑coded left border, a label / value, and an
 * icon on the right.
 *
 * Usage:
 *   <StatsCard
 *     label="Total Students"
 *     value={42}
 *     icon={<Users className="size-6" />}
 *     color="brand"
 *     delay={0.1}
 *   />
 */

/** Predefined colour tokens so every page stays consistent */
const COLOR_MAP: Record<
  string,
  { border: string; icon: string; value?: string }
> = {
  brand: { border: "border-l-brand", icon: "bg-brand/10 text-brand" },
  green: { border: "border-l-green-500", icon: "bg-green-100 text-green-600", value: "text-green-600" },
  red: { border: "border-l-red-500", icon: "bg-red-100 text-red-600", value: "text-red-600" },
  orange: { border: "border-l-orange-500", icon: "bg-orange-100 text-orange-600", value: "text-orange-600" },
  blue: { border: "border-l-blue-500", icon: "bg-blue-100 text-blue-600", value: "text-blue-600" },
  purple: { border: "border-l-purple-500", icon: "bg-purple-100 text-purple-600", value: "text-purple-600" },
  amber: { border: "border-l-amber-500", icon: "bg-amber-100 text-amber-600", value: "text-amber-600" },
  emerald: { border: "border-l-emerald-500", icon: "bg-emerald-100 text-emerald-600", value: "text-emerald-600" },
};

interface StatsCardProps {
  /** Muted label above the value */
  label: string;
  /** Numeric or string value */
  value: string | number;
  /** Icon element (e.g. lucide or hugeicons) */
  icon: React.ReactNode;
  /** Colour token — picks border + icon background */
  color?: keyof typeof COLOR_MAP;
  /** Optional stagger delay for entry animation */
  delay?: number;
  /** Extra line below the value (e.g. "32% of total") */
  meta?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  color = "brand",
  delay = 0,
  meta,
}: StatsCardProps) {
  const palette = COLOR_MAP[color] ?? COLOR_MAP.brand!;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Card className={`overflow-hidden border-l-4 ${palette.border}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-2xl font-semibold mt-1 ${palette.value ?? ""}`}>
                {value}
              </p>
              {meta && (
                <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${palette.icon}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
