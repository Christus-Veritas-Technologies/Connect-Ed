"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  icon?: React.ReactNode
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <motion.input
          type={type}
          ref={ref}
          data-slot="input"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            // Base styles
            "flex h-12 w-full rounded-md border-2 bg-background px-4 py-3 text-base font-medium transition-all duration-200",
            // Placeholder
            "placeholder:text-muted-foreground placeholder:font-normal",
            // Border colors
            "border-border",
            // Focus state - brand color
            "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10",
            // Error state
            error && "border-destructive focus:border-destructive focus:ring-destructive/10",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
            // File input
            "file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-brand",
            // Icon padding
            icon && "pl-12",
            className
          )}
          animate={{
            borderColor: isFocused ? "var(--brand)" : error ? "var(--destructive)" : "var(--border)",
          }}
          transition={{ duration: 0.2 }}
          {...props}
        />
        {isFocused && (
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              boxShadow: error 
                ? "0 0 0 4px rgba(239, 68, 68, 0.1)" 
                : "0 0 0 4px rgba(59, 130, 246, 0.1)",
            }}
          />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
