"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    UserGroupIcon,
    Money01Icon,
    ChartHistogramIcon,
    SentIcon,
    BookOpen01Icon,
    Notification01Icon,
    ArrowRight01Icon,
    CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

const features = [
    {
        icon: UserGroupIcon,
        title: "Student Management",
        description:
            "Maintain comprehensive student records — admissions, profiles, class assignments, and enrolment history in one place.",
        details: [
            "Bulk student imports via CSV",
            "Detailed student profiles with photos and documents",
            "Class assignment and transfers",
            "Admission number generation",
            "Enrolment history tracking",
            "Parent-student linking",
        ],
    },
    {
        icon: Money01Icon,
        title: "Fee Collection & Tracking",
        description:
            "Automate fee schedules, send reminders via SMS, email, or WhatsApp, and accept secure online payments.",
        details: [
            "Automated fee generation per term",
            "Payment tracking with receipt generation",
            "SMS, email, and WhatsApp reminders",
            "Online payment integration",
            "Overdue fee monitoring",
            "Payment history and audit trails",
        ],
    },
    {
        icon: ChartHistogramIcon,
        title: "Financial Reporting",
        description:
            "Generate term-based revenue, expense, and balance reports with exportable PDF summaries for audits and board meetings.",
        details: [
            "Revenue vs expense dashboards",
            "Term-based financial summaries",
            "Exportable PDF reports",
            "Expense categorisation and tracking",
            "Balance sheet generation",
            "Board-ready financial overviews",
        ],
    },
    {
        icon: BookOpen01Icon,
        title: "Exams & Report Cards",
        description:
            "Configure grading scales, record marks per subject, and distribute polished report cards to parents instantly.",
        details: [
            "Custom grading scales per subject",
            "Exam session management",
            "Bulk mark entry",
            "Automated report card generation",
            "Parent notification on report availability",
            "Historical academic records",
        ],
    },
    {
        icon: SentIcon,
        title: "Class Communication",
        description:
            "Real-time messaging between teachers, parents, and students within class-level channels — no external apps needed.",
        details: [
            "Class-based chat channels",
            "Real-time WebSocket messaging",
            "File and image sharing",
            "Read receipts and online indicators",
            "Teacher-parent direct messaging",
            "Message history and search",
        ],
    },
    {
        icon: Notification01Icon,
        title: "Announcements",
        description:
            "Publish school-wide or role-targeted announcements with read tracking and threaded comments.",
        details: [
            "School-wide broadcast announcements",
            "Role-targeted announcements",
            "Threaded comment discussions",
            "Configurable expiry durations",
            "Rich text formatting",
            "Engagement analytics",
        ],
    },
];

export default function FeaturesPage() {
    return (
        <main className="min-h-screen bg-background">
            {/* Hero */}
            <section className={`pt-32 pb-16 ${patternBg} bg-muted/30`}>
                <div className="mx-auto max-w-6xl px-6 text-center">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                        <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
                            Platform Capabilities
                        </Badge>
                    </motion.div>
                    <motion.h1
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
                    >
                        Everything You Need to
                        <br />
                        <span className="bg-linear-to-r from-brand to-mid bg-clip-text text-transparent">
                            Run Your School
                        </span>
                    </motion.h1>
                    <motion.p
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
                    >
                        A comprehensive toolkit that replaces spreadsheets, paper registers,
                        and disconnected apps with one unified system.
                    </motion.p>
                </div>
            </section>

            {/* Feature deep-dives */}
            {features.map((feature, idx) => (
                <section
                    key={feature.title}
                    className={`py-20 ${idx % 2 === 0 ? "" : `${patternBg} bg-muted/30`}`}
                >
                    <div className="mx-auto max-w-6xl px-6">
                        <AnimatedSection
                            className={`grid gap-12 items-center lg:grid-cols-2 ${idx % 2 !== 0 ? "lg:direction-rtl" : ""}`}
                        >
                            <motion.div variants={fadeUp}>
                                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand text-white ring-2 ring-brand/20">
                                    <HugeiconsIcon icon={feature.icon} className="size-6" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                                    {feature.title}
                                </h2>
                                <p className="text-muted-foreground leading-relaxed mb-6">
                                    {feature.description}
                                </p>
                                <Button asChild>
                                    <Link href="/auth/signup">Start Free Trial</Link>
                                </Button>
                            </motion.div>

                            <motion.div variants={fadeUp} custom={1}>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {feature.details.map((detail) => (
                                        <div
                                            key={detail}
                                            className="flex items-start gap-2.5 text-sm text-muted-foreground"
                                        >
                                            <HugeiconsIcon
                                                icon={CheckmarkCircle02Icon}
                                                className="size-4 text-emerald-500 shrink-0 mt-0.5"
                                            />
                                            <span>{detail}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatedSection>
                    </div>
                </section>
            ))}

            {/* CTA */}
            <section className="py-20">
                <div className="mx-auto max-w-6xl px-6 text-center">
                    <AnimatedSection>
                        <motion.h2
                            variants={fadeUp}
                            className="text-3xl font-bold tracking-tight text-foreground mb-4"
                        >
                            Ready to get started?
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Create your account and explore every feature with a free trial.
                        </motion.p>
                        <motion.div variants={fadeUp}>
                            <Button size="xl" asChild>
                                <Link href="/auth/signup">
                                    Start Free Trial
                                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
                                </Link>
                            </Button>
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>
        </main>
    );
}
