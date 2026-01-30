"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean
}

function Card({ className, hover = false, ...props }: CardProps) {
  return (
    <motion.div
      data-slot="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={hover ? { 
        y: -4, 
        boxShadow: "0 20px 40px -12px rgba(59, 130, 246, 0.15)" 
      } : undefined}
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border-2 border-border p-6 shadow-sm transition-shadow duration-300",
        hover && "cursor-pointer hover:border-brand/20",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-xl font-bold leading-tight tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground font-medium", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center pt-2", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
