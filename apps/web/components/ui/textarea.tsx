"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          // Base styles
          "flex min-h-[100px] w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors duration-150 resize-none",
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
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
