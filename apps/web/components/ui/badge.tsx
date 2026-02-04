"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand/10 text-brand border border-brand/20",
        secondary: "bg-secondary text-secondary-foreground border border-border",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20",
        outline: "bg-transparent border-2 border-border text-foreground",
        brand: "bg-brand text-white",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  animated?: boolean
}

function Badge({
  className,
  variant,
  size,
  icon,
  animated = false,
  children,
}: BadgeProps) {
  const animationProps = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: "spring" as const, stiffness: 500, damping: 30 },
  }

  if (animated) {
    return (
      <motion.span
        data-slot="badge"
        className={cn(badgeVariants({ variant, size }), className)}
        {...animationProps}
      >
        {icon && <span className="[&>svg]:size-3">{icon}</span>}
        {children}
      </motion.span>
    )
  }

  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
    >
      {icon && <span className="[&>svg]:size-3">{icon}</span>}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
