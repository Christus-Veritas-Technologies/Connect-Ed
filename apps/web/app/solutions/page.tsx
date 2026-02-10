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
    FileAttachmentIcon,
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

const solutions = [
    {
        title: "Administration & Operations",
        description:
            "Centralise every operational workflow — from student admissions and class scheduling to staff management — in one intuitive dashboard.",
        icon: UserGroupIcon,
        benefits: [
            "Single source of truth for student and staff records",
            "Automated admission number generation",
            "Bulk CSV imports for quick onboarding",
            "Academic term and holiday configuration",
            "Role-based access for admins and receptionists",
        ],
    },
    {
        title: "Financial Management",
        description:
            "Replace manual ledgers with automated fee collection, expense tracking, and board-ready financial reporting.",
        icon: Money01Icon,
        benefits: [
            "Automated fee schedule generation per term",
            "Online payment gateway for parents",
            "Expense tracking with categorisation",
            "Overdue balance alerts via SMS, email, and WhatsApp",
            "Exportable PDF financial summaries",
        ],
    },
    {
        title: "Academic Excellence",
        description:
            "Empower teachers with tools for exam management, grading, and instant report card distribution to parents.",
        icon: BookOpen01Icon,
        benefits: [
            "Configurable grading scales per subject",
            "Bulk mark entry with validation",
            "Automated report card generation",
            "Historical academic record tracking",
            "Parent notification on report availability",
        ],
    },
    {
        title: "Communication Hub",
        description:
            "Keep teachers, parents, and students connected with real-time class channels, direct messaging, and school-wide announcements.",
        icon: SentIcon,
        benefits: [
            "Class-based real-time chat channels",
            "Teacher-parent direct messaging",
            "File and image sharing in conversations",
            "Read receipts and online indicators",
            "Message search and conversation history",
        ],
    },
    {
        title: "Reporting & Insights",
        description:
            "Make informed decisions with comprehensive dashboards covering revenue, enrolment trends, and academic performance.",
        icon: ChartHistogramIcon,
        benefits: [
            "Revenue vs expense dashboards",
            "Enrolment trend visualisations",
            "Term-by-term comparative analytics",
            "Balance sheet generation",
            "Board-ready PDF report exports",
        ],
    },
    {
        title: "Announcements & Engagement",
        description:
            "Publish targeted or school-wide announcements and track engagement with read receipts and threaded discussions.",
        icon: Notification01Icon,
        benefits: [
            "School-wide broadcast announcements",
            "Role-targeted messaging",
            "Threaded comment discussions",
            "Configurable expiry durations",
            "Engagement analytics and read tracking",
        ],
    },
    {
        title: "Shared Files & Storage",
        description:
            "Distribute homework, policies, and resources securely. Every plan includes generous cloud storage backed by Cloudflare R2.",
        icon: FileAttachmentIcon,
        benefits: [
            "Share files with individuals or entire roles",
            "Searchable recipient picker",
            "Auto-named uploads with custom titles and subtitles",
            "In-app preview and one-click download",
            "Real-time notifications for new shared files",
        ],
    },
];

export default function SolutionsPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Hero */}
            <section className={`pt-32 pb-16 ${patternBg} bg-muted/30`}>
                <div className="mx-auto max-w-6xl px-6 text-center">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                        <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
                            Solutions
                        </Badge>
                    </motion.div>
                    <motion.h1
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
                    >
                        Solutions That Scale
                        <br />
                        <span className="bg-linear-to-r from-brand to-mid bg-clip-text text-transparent">
                            With Your School
                        </span>
                    </motion.h1>
                    <motion.p
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
                    >
                        From administration and finance to academics and communication —
                        Connect-Ed provides purpose-built solutions for every aspect of
                        school management.
                    </motion.p>
                </div>
            </section>

            {/* Solution sections — alternating */}
            {solutions.map((solution, idx) => {
                const isEven = idx % 2 !== 0;
                return (
                    <section
                        key={solution.title}
                        className={`py-20 ${isEven ? `${patternBg} bg-muted/30` : ""}`}
                    >
                        <div className="mx-auto max-w-6xl px-6">
                            <AnimatedSection className="grid gap-12 items-center lg:grid-cols-2">
                                <motion.div variants={fadeUp} className={isEven ? "lg:order-2" : ""}>
                                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand text-white ring-2 ring-brand/20">
                                        <HugeiconsIcon icon={solution.icon} className="size-6" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
                                        {solution.title}
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed mb-6">
                                        {solution.description}
                                    </p>
                                    <Button asChild>
                                        <Link href="/auth/signup">Get Started</Link>
                                    </Button>
                                </motion.div>

                                <motion.div
                                    variants={fadeUp}
                                    custom={1}
                                    className={isEven ? "lg:order-1" : ""}
                                >
                                    <div className="rounded-2xl border border-border/60 bg-card p-6">
                                        <h4 className="text-sm font-semibold text-foreground mb-4">
                                            Key Capabilities
                                        </h4>
                                        <div className="space-y-3">
                                            {solution.benefits.map((benefit) => (
                                                <div
                                                    key={benefit}
                                                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                                                >
                                                    <HugeiconsIcon
                                                        icon={CheckmarkCircle02Icon}
                                                        className="size-4 text-emerald-500 shrink-0 mt-0.5"
                                                    />
                                                    <span>{benefit}</span>
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
                            See It in Action
                        </motion.h2>
                        <motion.p variants={fadeUp} className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Create an account and explore every solution with no commitment.
                        </motion.p>
                        <motion.div variants={fadeUp}>
                            <Button size="xl" asChild>
                                <Link href="/auth/signup">Get Started</Link>
                            </Button>
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>

            <Footer />
        </main>
    );
}
