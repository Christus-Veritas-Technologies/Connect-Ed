"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
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

const plans = [
  {
    name: "Lite",
    description: "Perfect for small schools with less than 500 students.",
    price: 50,
    period: "/term",
    features: [
      "Up to 500 students",
      "Admin & Receptionist access",
      "Student management",
      "Fee tracking & reminders",
      "Expense tracking",
      "Detailed reports (PDF export)",
      "200 emails/month",
      "200 WhatsApp messages/month",
      "100 SMS/month",
      "Basic support",
    ],
  },
  {
    name: "Growth",
    description: "Ideal for mid-size schools with 500 to 1,200 students.",
    price: 90,
    period: "/term",
    popular: true,
    includedFrom: "Lite",
    features: [
      "500–1,200 students",
      "Teacher portal & management",
      "Class management",
      "Class teacher assignments",
      "Class communication channels",
      "500 emails/month",
      "500 WhatsApp messages/month",
      "300 SMS/month",
      "Premium support",
    ],
  },
  {
    name: "Enterprise",
    description: "Built for large institutions with 2,000 to 3,000 students.",
    price: 150,
    period: "/term",
    includedFrom: "Growth",
    features: [
      "2,000–3,000 students",
      "Student & parent portals",
      "Online fee payments for parents",
      "Exam & report card system",
      "1,500 emails/month",
      "1,500 WhatsApp messages/month",
      "750 SMS/month",
      "24/7 dedicated support",
    ],
  },
];

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
    question: "Is there a free trial?",
    answer:
      "Yes — every plan comes with a free trial so you can explore all features before committing.",
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
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                custom={i}
                className={`relative rounded-2xl border bg-card overflow-hidden ${
                  plan.popular
                    ? "border-brand ring-1 ring-brand/20"
                    : "border-border/60"
                }`}
              >
                {plan.popular && (
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

                  <div className="mt-6 mb-6 flex items-baseline gap-1">
                    <span className="text-sm font-medium text-muted-foreground align-super">
                      $
                    </span>
                    <span className="text-5xl font-bold tracking-tight text-foreground italic">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground ml-0.5">
                      {plan.period}
                    </span>
                  </div>

                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                    asChild
                  >
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                </div>

                <div className="p-6 pt-5 mt-5 border-t border-border/40">
                  <p className="text-sm font-semibold text-foreground mb-4">
                    {plan.includedFrom
                      ? `Everything in ${plan.includedFrom}, plus:`
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
            ))}
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
              Create your account and start your free trial today.
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
