"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar, Footer } from "@/components/marketing-layout";
import { PRICING } from "@/lib/pricing";
import { fmt } from "@/lib/currency";
import type { Plan } from "@repo/db";

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

const planOrder: Plan[] = ["LITE", "GROWTH", "ENTERPRISE"];

const faqs = [
    {
        question: "Is there a one-time setup fee?",
        answer:
            "Yes — each plan has a one-time setup fee that covers full onboarding, data migration, and configuration. You'll see the exact amount during sign-up.",
    },
    {
        question: "Can I switch plans later?",
        answer:
            "Absolutely. You can upgrade or downgrade your plan at any time from the settings page. Changes take effect at the start of the next term.",
    },
    {
        question: "How does cloud storage work?",
        answer:
            "Every plan includes cloud storage for shared files. Files are securely stored on Cloudflare R2 and can be shared with individuals or roles. Storage limits vary by plan.",
    },
    {
        question: "What payment methods do you accept?",
        answer:
            "We accept mobile money, bank transfers, and card payments through our secure payment gateway.",
    },
];

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Hero */}
            <section className={`pt-32 pb-16 ${patternBg} bg-muted/30`}>
                <div className="mx-auto max-w-6xl px-6 text-center">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                        <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
                            Pricing
                        </Badge>
                    </motion.div>
                    <motion.h1
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
                    >
                        Transparent Pricing,
                        <br />
                        <span className="bg-linear-to-r from-brand to-mid bg-clip-text text-transparent">
                            No Surprises
                        </span>
                    </motion.h1>
                    <motion.p
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
                    >
                        Select a plan that matches your institution&apos;s size. All plans
                        include a one-time setup fee and full onboarding support.
                    </motion.p>
                </div>
            </section>

            {/* Pricing cards */}
            <section className="py-20">
                <div className="mx-auto max-w-6xl px-6">
                    <AnimatedSection className="grid gap-6 sm:grid-cols-3 items-start">
                        {planOrder.map((planKey, i) => {
                            const plan = PRICING[planKey];
                            const isPopular = planKey === "GROWTH";
                            const includedFrom = planKey === "GROWTH" ? "Lite" : planKey === "ENTERPRISE" ? "Growth" : null;

                            return (
                                <motion.div
                                    key={planKey}
                                    variants={fadeUp}
                                    custom={i}
                                    className={`relative rounded-2xl border bg-card overflow-hidden ${isPopular
                                        ? "border-brand ring-1 ring-brand/20"
                                        : "border-border/60"
                                        }`}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-px left-1/2 -translate-x-1/2 translate-y-0">
                                            <Badge variant="brand" size="sm" className="rounded-t-none">
                                                Recommended
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="p-6 pb-0">
                                        <h3 className="text-xl font-bold text-foreground">
                                            {plan.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                            {plan.description}
                                        </p>

                                        <div className="mt-6 mb-2">
                                            <div className="flex items-baseline gap-1 justify-center">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {fmt(plan.signupFee, "USD")}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    setup
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-1 justify-center mt-1">
                                                <span className="text-4xl font-bold tracking-tight text-foreground italic">
                                                    {fmt(plan.monthlyEstimate, "USD")}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    /month
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            variant={isPopular ? "default" : "outline"}
                                            className="w-full mt-4"
                                            asChild
                                        >
                                            <Link href="/auth/signup">Get Started</Link>
                                        </Button>
                                    </div>

                                    <div className="p-6 pt-5 mt-5 border-t border-border/40">
                                        <p className="text-sm font-semibold text-foreground mb-4">
                                            {includedFrom
                                                ? `Everything in ${includedFrom}, plus:`
                                                : "What\u2019s included:"}
                                        </p>
                                        <ul className="space-y-2.5">
                                            {plan.features.map((f) => (
                                                <li
                                                    key={f}
                                                    className="flex items-start gap-2 text-sm text-muted-foreground"
                                                >
                                                    <HugeiconsIcon
                                                        icon={CheckmarkCircle02Icon}
                                                        className="size-4 text-brand shrink-0 mt-0.5"
                                                    />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatedSection>
                </div>
            </section>

            {/* FAQ */}
            <section className={`py-20 ${patternBg} bg-muted/30`}>
                <div className="mx-auto max-w-3xl px-6">
                    <AnimatedSection className="text-center mb-12">
                        <motion.h2
                            variants={fadeUp}
                            className="text-3xl font-bold tracking-tight text-foreground"
                        >
                            Frequently Asked Questions
                        </motion.h2>
                    </AnimatedSection>
                    <AnimatedSection className="space-y-6">
                        {faqs.map((faq) => (
                            <motion.div
                                key={faq.question}
                                variants={fadeUp}
                                className="rounded-2xl border border-border/60 bg-card p-6"
                            >
                                <h4 className="text-sm font-semibold text-foreground mb-2">
                                    {faq.question}
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                </p>
                            </motion.div>
                        ))}
                    </AnimatedSection>
                </div>
            </section>

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
                            Create your account today — no credit card required.
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
