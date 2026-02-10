"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    Shield01Icon,
    TeacherIcon,
    User02Icon,
    School01Icon,
    ArrowRight01Icon,
    CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar, Footer } from "@/components/marketing-layout";

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

function AnimatedSection({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={staggerContainer}
            className={className}
        >
            {children}
        </motion.div>
    );
}

const patternBg =
    "bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[24px_24px]";

const roles = [
    {
        role: "Administrators",
        tagline: "Complete control over your school — from one dashboard.",
        icon: Shield01Icon,
        color: "from-blue-500 to-blue-600",
        accent: "border-blue-200 dark:border-blue-800",
        checkColor: "text-blue-500",
        taglineColor: "text-blue-600 dark:text-blue-400",
        ctaBg: "bg-blue-500 hover:bg-blue-600",
        description:
            "School administrators get a bird's-eye view of every department. Manage staff, oversee finances, configure academic terms, and communicate school-wide — all without switching tools.",
        highlights: [
            "Full oversight of staff, students, and finances",
            "Revenue & expense reports with PDF export",
            "School-wide announcements and notifications",
            "Manage fee structures, academic terms, and holidays",
            "Configure messaging quotas per channel",
            "Role-based access control for team members",
            "Bulk imports and data management tools",
            "Share files and resources with any role",
        ],
        cta: { text: "Set Up Your School", href: "/auth/signup" },
    },
    {
        role: "Teachers",
        tagline: "Focus on teaching — we handle the paperwork.",
        icon: TeacherIcon,
        color: "from-emerald-500 to-emerald-600",
        accent: "border-emerald-200 dark:border-emerald-800",
        checkColor: "text-emerald-500",
        taglineColor: "text-emerald-600 dark:text-emerald-400",
        ctaBg: "bg-emerald-500 hover:bg-emerald-600",
        description:
            "Teachers access a streamlined portal for managing their classes, recording exam marks, generating report cards, and communicating directly with parents — all from one place.",
        highlights: [
            "View and manage assigned class rosters",
            "Record exam marks and generate report cards",
            "Communicate with parents in class channels",
            "Engage with school announcements",
            "Track student attendance and performance",
            "Share homework and resources with students",
            "Real-time messaging with read receipts",
        ],
        cta: { text: "Access Your Classes", href: "/auth/login" },
    },
    {
        role: "Parents",
        tagline: "Stay informed about your child's education — in real time.",
        icon: User02Icon,
        color: "from-violet-500 to-violet-600",
        accent: "border-violet-200 dark:border-violet-800",
        checkColor: "text-violet-500",
        taglineColor: "text-violet-600 dark:text-violet-400",
        ctaBg: "bg-violet-500 hover:bg-violet-600",
        description:
            "Parents have a dedicated portal to track their child's academic progress, view and pay fees online, message class teachers, and receive school updates instantly.",
        highlights: [
            "View your child's academic report cards",
            "Track fee balances and make online payments",
            "Message class teachers directly",
            "Receive announcements and school updates",
            "Real-time notifications on academic progress",
            "Access shared files from teachers",
            "Multi-child support for families",
        ],
        cta: { text: "Check In on Your Child", href: "/auth/login" },
    },
    {
        role: "Students",
        tagline: "Your school life — connected and accessible.",
        icon: School01Icon,
        color: "from-amber-500 to-amber-600",
        accent: "border-amber-200 dark:border-amber-800",
        checkColor: "text-amber-500",
        taglineColor: "text-amber-600 dark:text-amber-400",
        ctaBg: "bg-amber-500 hover:bg-amber-600",
        description:
            "Students can access their personal academic records, participate in class discussions, stay informed with school announcements, and connect with teachers and classmates.",
        highlights: [
            "Access personal academic report cards",
            "Participate in class channels",
            "Stay informed with school announcements",
            "View class schedules and subject information",
            "Engage with teachers and classmates",
            "Download shared homework and resources",
            "Receive important school notifications",
        ],
        cta: { text: "Join Your Class", href: "/auth/login" },
    },
];

export default function WhoItsForPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Hero */}
            <section className={`pt-32 pb-16 ${patternBg} bg-muted/30`}>
                <div className="mx-auto max-w-6xl px-6 text-center">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                        <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
                            Who It&apos;s For
                        </Badge>
                    </motion.div>
                    <motion.h1
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
                    >
                        Built for Everyone
                        <br />
                        <span className="bg-linear-to-r from-brand to-mid bg-clip-text text-transparent">
                            In Your School
                        </span>
                    </motion.h1>
                    <motion.p
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
                    >
                        Whether you run the school, teach a class, support your child, or
                        attend as a student — Connect-Ed adapts to your role with a
                        tailored experience.
                    </motion.p>
                </div>
            </section>

            {/* Role deep-dives */}
            {roles.map((role, idx) => {
                const isEven = idx % 2 !== 0;
                return (
                    <section
                        key={role.role}
                        className={`py-20 ${isEven ? `${patternBg} bg-muted/30` : ""}`}
                    >
                        <div className="mx-auto max-w-6xl px-6">
                            <AnimatedSection className="grid gap-12 items-center lg:grid-cols-2">
                                <motion.div variants={fadeUp} className={isEven ? "lg:order-2" : ""}>
                                    <div
                                        className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-linear-to-br ${role.color} text-white shadow-sm`}
                                    >
                                        <HugeiconsIcon icon={role.icon} className="size-6" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                                        {role.role}
                                    </h2>
                                    <p className={`${role.taglineColor} font-medium mb-3`}>{role.tagline}</p>
                                    <p className="text-muted-foreground leading-relaxed mb-6">
                                        {role.description}
                                    </p>
                                    <Button className={`${role.ctaBg} text-white`} asChild>
                                        <Link href={role.cta.href}>
                                            {role.cta.text}
                                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
                                        </Link>
                                    </Button>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    custom={1}
                                    className={isEven ? "lg:order-1" : ""}
                                >
                                    <div className={`rounded-2xl border bg-card p-6 ${role.accent}`}>
                                        <h4 className="text-sm font-semibold text-foreground mb-4">
                                            What {role.role} Get
                                        </h4>
                                        <div className="space-y-3">
                                            {role.highlights.map((highlight) => (
                                                <div
                                                    key={highlight}
                                                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                                                >
                                                    <HugeiconsIcon
                                                        icon={CheckmarkCircle02Icon}
                                                        className={`size-4 ${role.checkColor} shrink-0 mt-0.5`}
                                                    />
                                                    <span>{highlight}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatedSection>
                        </div>
                    </section>
                );
            })}

            {/* CTA */}
            <section className="py-20">
                <div className="mx-auto max-w-6xl px-6 text-center">
                    <AnimatedSection>
                        <motion.h2
                            variants={fadeUp}
                            className="text-3xl font-bold tracking-tight text-foreground mb-4"
                        >
                            Ready to Get Started?
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Create your school account or log in to access your personalised
                            dashboard.
                        </motion.p>
                        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
                            <Button size="xl" asChild>
                                <Link href="/auth/signup">
                                    Create Your School
                                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
                                </Link>
                            </Button>
                            <Button size="xl" variant="outline" asChild>
                                <Link href="/auth/login">Log In to Your Account</Link>
                            </Button>
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>

            <Footer />
        </main>
    );
}
