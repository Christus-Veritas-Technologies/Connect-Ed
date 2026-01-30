"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  AlertDiamondIcon,
} from "@hugeicons/react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl border-2 p-4 flex items-start gap-4 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-background border-border text-foreground",
        info: "bg-brand/5 border-brand/20 text-brand [&>svg]:text-brand",
        success: "bg-success/5 border-success/20 text-success [&>svg]:text-success",
        warning: "bg-warning/5 border-warning/20 text-warning [&>svg]:text-warning",
        destructive: "bg-destructive/5 border-destructive/20 text-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const iconMap = {
  default: InformationCircleIcon,
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  warning: Alert01Icon,
  destructive: AlertDiamondIcon,
}

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode
}

function Alert({
  className,
  variant = "default",
  icon,
  children,
  ...props
}: AlertProps) {
  const IconComponent = iconMap[variant || "default"]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <div className="shrink-0 mt-0.5">
        {icon || <IconComponent size={20} strokeWidth={2} />}
      </div>
      <div className="flex-1">{children}</div>
    </motion.div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm opacity-90 mt-1 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
