"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 
          "bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-md shadow-destructive/25 hover:bg-destructive/90 hover:shadow-lg active:scale-[0.98]",
        outline:
          "border-2 border-border bg-background text-foreground hover:bg-accent hover:border-brand hover:text-brand active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-brand underline-offset-4 hover:underline",
        success:
          "bg-success text-white shadow-md shadow-success/25 hover:bg-success/90 hover:shadow-lg active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        xs: "h-7 gap-1.5 rounded-lg px-3 text-xs",
        sm: "h-9 rounded-lg gap-2 px-4 text-sm",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "size-11 rounded-md",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-12 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Motion button component with animations
const MotionButton = motion.button

interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  children?: React.ReactNode
  loading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
      >
        {children}
      </Slot>
    )
  }

  return (
    <MotionButton
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {loading ? (
        <>
          <motion.span
            className="size-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </MotionButton>
  )
}

export { Button, buttonVariants }
