"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  icon?: React.ReactNode
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          data-slot="input"
          className={cn(
            // Base styles
            "flex h-10 w-full rounded-lg border bg-background px-3.5 py-2 text-sm transition-colors duration-150",
            // Placeholder
            "placeholder:text-muted-foreground/60",
            // Border colors
            "border-border",
            // Focus state
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15",
            // Error state
            error && "border-destructive focus:border-destructive focus:ring-destructive/15",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
            // File input
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-brand",
            // Icon padding
            icon && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
