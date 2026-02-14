"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const patternBg =
    "bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[24px_24px]";

const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Solutions", href: "/solutions" },
    { label: "Who It's For", href: "/who-its-for" },
    { label: "Pricing", href: "/pricing" },
];

export function Navbar() {
    const { isAuthenticated, isLoading } = useAuth();

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg ${patternBg}`}
        >
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="relative size-9 rounded-xl bg-linear-to-br from-brand to-mid flex items-center justify-center shadow-sm shadow-brand/20">
                        <span className="text-sm font-bold text-white tracking-tight">CE</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-base font-semibold text-foreground tracking-tight">
                            Connect-Ed
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium -mt-0.5 hidden sm:block">
                            School Management
                        </span>
                    </div>
                </Link>

                {/* Nav links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-3">
                    {isLoading ? (
                        <div className="h-10 w-28 rounded-lg bg-muted animate-pulse" />
                    ) : isAuthenticated ? (
                        <Button size="default" asChild>
                            <Link href="/dashboard">Dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/auth/login">Log in</Link>
                            </Button>
                            <Button size="sm" asChild>
                                <Link href="/auth/signup">Get Started</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </motion.nav>
    );
}

export function Footer() {
    return (
        <footer className={`border-t border-border/40 ${patternBg} bg-muted/20`}>
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="grid gap-8 sm:grid-cols-3">
                    {/* Brand column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="relative size-9 rounded-xl bg-linear-to-br from-brand to-mid flex items-center justify-center shadow-sm shadow-brand/20">
                                <span className="text-xs font-bold text-white tracking-tight">
                                    CE
                                </span>
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-sm font-semibold text-foreground tracking-tight">
                                    Connect-Ed
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                                    School Management
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            The unified platform for school administration, finance,
                            academics, and communication.
                        </p>
                    </div>

                    {/* Navigation column */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Platform</h4>
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Contact column */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">
                            Get Started
                        </h4>
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/auth/signup"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                            >
                                Create an Account
                            </Link>
                            <Link
                                href="/auth/login"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                            >
                                Log in
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Connect-Ed. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Built in Zimbabwe 🇿🇼
                    </p>
                </div>
            </div>
        </footer>
    );
}
