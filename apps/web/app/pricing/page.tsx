"use client";

import React from "react";
import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar, Footer } from "@/components/marketing-layout";
import { getPlansByCurrency, PRICING } from "@/lib/pricing";
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
        question: "How does billing work?",
        answer:
            "Choose between monthly or annual billing. Monthly plans are charged each month. Annual plans are paid upfront with a 25% founding partner discount — and automatically renew at the standard annual rate.",
    },
    {
        question: "What happens when my annual plan expires?",
        answer:
            "Your plan continues seamlessly. After the founding partner period ends, you'll renew at the standard annual rate. You can also switch to monthly billing at any time from your settings.",
    },
    {
        question: "Can I switch plans later?",
        answer:
            "Absolutely. You can upgrade or downgrade your plan at any time from the settings page. Changes take effect at the start of the next billing period.",
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
    {
        question: "What are student limits?",
        answer:
            "Lite supports up to 300 students, Growth up to 800 students, and Enterprise offers custom capacity for 2,000+ students. Contact us if you need a custom arrangement.",
    },
];

export default function PricingPage() {
    const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");

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
                        include full onboarding support.
                    </motion.p>
                    <motion.p
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={2.5}
                        className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground italic"
                    >
                        Reports that took days now take minutes. Fee tracking that was error-prone is now automated.
                    </motion.p>
                </div>
            </section>

            {/* Billing toggle */}
            <section className="py-6">
                <div className="mx-auto max-w-6xl px-6">
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="flex justify-center"
                    >
                        <Tabs value={billing} onValueChange={(v) => setBilling(v as "monthly" | "annual")}>
                            <TabsList>
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                <TabsTrigger value="annual" className="gap-1.5">
                                    Annual
                                    <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5">
                                        Save 25%
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </motion.div>

                    {billing === "annual" && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mt-6"
                        >
                            <div className="inline-flex items-center gap-2 rounded-full bg-brand/5 border border-brand/20 px-4 py-2 text-sm">
                                <span className="size-2 rounded-full bg-brand animate-pulse" />
                                <span className="text-brand font-medium">
                                    Founding Partner Schools — Exclusive 25% off annual plans. Limited spots available.
                                </span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Pricing cards */}
            <section className="py-14">
                <div className="mx-auto max-w-6xl px-6">
                    <AnimatedSection className="grid gap-6 sm:grid-cols-3 items-start">
                        {planOrder.map((planKey, i) => {
                            const plansData = getPlansByCurrency("USD");
                            const planData = plansData[planKey as keyof typeof plansData];
                            const plan = PRICING[planKey];
                            const isPopular = planKey === "GROWTH";
                            const includedFrom = (planData as any).includedFrom || null;
                            const isFirstPayment = true; // Show first-payment pricing on public page

                            const displayPrice = billing === "annual"
                                ? plan.foundingAnnualPrice
                                : (isFirstPayment ? plan.firstMonthlyPrice : plan.monthlyEstimate);
                            const regularPrice = billing === "annual"
                                ? plan.annualPrice
                                : plan.monthlyEstimate;
                            const effectiveMonthly = billing === "annual"
                                ? Math.round((plan.foundingAnnualPrice / 12) * 100) / 100
                                : (isFirstPayment ? plan.firstMonthlyPrice : plan.monthlyEstimate);
                            const discountPercent = billing === "annual" ? 25 : 15;

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
                                            {billing === "annual" ? (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 justify-center">
                                                        <Badge variant="success" size="sm" className="text-[10px]">
                                                            {discountPercent}% off first year
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 justify-center mt-1">
                                                        <span className="text-4xl font-bold tracking-tight text-foreground italic">
                                                            {fmt(displayPrice, "USD")}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            /year
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-center mt-1">
                                                        {fmt(effectiveMonthly, "USD")}/mo — <span className="line-through">{fmt(regularPrice, "USD")}</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1 justify-center">
                                                        <Badge variant="success" size="sm" className="text-[10px]">
                                                            {discountPercent}% off first month
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 justify-center mt-1">
                                                        <span className="text-4xl font-bold tracking-tight text-foreground italic">
                                                            {fmt(displayPrice, "USD")}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            /month
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-center mt-1">
                                                        Then {fmt(regularPrice, "USD")}/mo
                                                    </p>
                                                </div>
                                            )}
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

                    {/* ROI nudge */}
                    <AnimatedSection className="mt-12">
                        <motion.div
                            variants={fadeUp}
                            className="max-w-2xl mx-auto rounded-2xl border border-brand/20 bg-brand/5 p-6 text-center"
                        >
                            <p className="text-sm text-foreground font-medium mb-2">
                                The real cost of not going digital
                            </p>
                            <p className="text-sm text-muted-foreground">
                                With 400 students each paying $50 per term, you process $20,000 per term.
                                If tracking errors are even 2%, that&apos;s $400 lost.
                                Our system starts at just $40/month.
                            </p>
                        </motion.div>
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
                        <motion.p variants={fadeUp} className="text-muted-foreground mb-3 max-w-md mx-auto">
                            We&apos;re onboarding our first founding partner schools — create your account today.
                        </motion.p>
                        <motion.p variants={fadeUp} className="text-sm text-muted-foreground/70 italic mb-8 max-w-sm mx-auto">
                            &ldquo;Reports generated in minutes instead of days. Fee tracking errors eliminated.&rdquo;
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
