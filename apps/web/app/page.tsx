"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  School01Icon,
  UserGroupIcon,
  Money01Icon,
  ChartHistogramIcon,
  SentIcon,
  BookOpen01Icon,
  TeacherIcon,
  Notification01Icon,
  FileAttachmentIcon,
  Shield01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmt } from "@/lib/currency";

/* ─────────────── Animations ─────────────── */

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

/* ─────────────── Shared pattern bg ─────────────── */

/** Subtle dot-grid pattern applied to alternating sections */
const patternBg =
  "bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[24px_24px]";

/* ─────────────── Data ─────────────── */

const features = [
  {
    icon: UserGroupIcon,
    title: "Student Management",
    description:
      "Maintain comprehensive student records — admissions, profiles, class assignments, and enrolment history in one place.",
  },
  {
    icon: Money01Icon,
    title: "Fee Collection & Tracking",
    description:
      "Automate fee schedules, send reminders via SMS, email, or WhatsApp, and accept secure online payments.",
  },
  {
    icon: ChartHistogramIcon,
    title: "Financial Reporting",
    description:
      "Generate term-based revenue, expense, and balance reports with exportable PDF summaries for audits and board meetings.",
  },
  {
    icon: BookOpen01Icon,
    title: "Exams & Report Cards",
    description:
      "Configure grading scales, record marks per subject, and distribute polished report cards to parents instantly.",
  },
  {
    icon: SentIcon,
    title: "Class Communication",
    description:
      "Real-time messaging between teachers, parents, and students within class-level channels — no external apps needed.",
  },
  {
    icon: Notification01Icon,
    title: "Announcements",
    description:
      "Publish school-wide or role-targeted announcements with read tracking and threaded comments.",
  },
  {
    icon: FileAttachmentIcon,
    title: "Shared Files",
    description:
      "Share documents, homework, and resources with individuals or roles — with cloud storage included in every plan.",
  },
];

const roleUSPs = [
  {
    role: "Administrators",
    icon: Shield01Icon,
    color: "from-blue-500 to-blue-600",
    accent: "border-blue-200 dark:border-blue-800",
    dotColor: "bg-blue-500",
    ctaBg: "bg-blue-500 hover:bg-blue-600",
    ctaText: "Set Up Your School",
    ctaHref: "/auth/signup",
    points: [
      "Complete oversight of staff, students, and finances",
      "Revenue & expense reports with PDF export",
      "School-wide announcements and notifications",
      "Manage fee structures, academic terms, and holidays",
      "Configure messaging quotas per channel",
    ],
  },
  {
    role: "Teachers",
    icon: TeacherIcon,
    color: "from-emerald-500 to-emerald-600",
    accent: "border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    ctaBg: "bg-emerald-500 hover:bg-emerald-600",
    ctaText: "Access Your Classes",
    ctaHref: "/auth/login",
    points: [
      "View and manage assigned class rosters",
      "Record exam marks and generate report cards",
      "Communicate with parents in class channels",
      "Engage with school announcements",
      "Track student attendance and performance",
    ],
  },
  {
    role: "Parents",
    icon: User02Icon,
    color: "from-violet-500 to-violet-600",
    accent: "border-violet-200 dark:border-violet-800",
    dotColor: "bg-violet-500",
    ctaBg: "bg-violet-500 hover:bg-violet-600",
    ctaText: "Check In on Your Child",
    ctaHref: "/auth/login",
    points: [
      "View your child's academic report cards",
      "Track fee balances and make online payments",
      "Message class teachers directly",
      "Receive announcements and school updates",
      "Real-time notifications on academic progress",
    ],
  },
  {
    role: "Students",
    icon: School01Icon,
    color: "from-amber-500 to-amber-600",
    accent: "border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
    ctaBg: "bg-amber-500 hover:bg-amber-600",
    ctaText: "Join Your Class",
    ctaHref: "/auth/login",
    points: [
      "Access personal academic report cards",
      "Participate in class channels",
      "Stay informed with school announcements",
      "View class schedules and subject information",
      "Engage with teachers and classmates",
    ],
  },
];

/* ─────────────── Navbar ─────────────── */

function Navbar() {
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
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative size-10 transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Connect-Ed Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
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
          {[
            { label: "Features", href: "/features" },
            { label: "Solutions", href: "/solutions" },
            { label: "Who It's For", href: "/who-its-for" },
            { label: "Pricing", href: "/pricing" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
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

/* ─────────────── Hero ─────────────── */

function Hero() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      {/* Gradient background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-125 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-100 rounded-full bg-mid/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 text-center">
        {/* Logo Hero */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="flex justify-center mb-6"
        >
          <div className="relative w-20 h-20 md:w-24 md:h-24">
            <Image
              src="/logo.png"
              alt="Connect-Ed"
              width={96}
              height={96}
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <Badge variant="secondary" size="lg" className="mb-6 border border-border/60 gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Trusted by Schools Worldwide
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
        >
          The Operating System
          <br />
          <span className="bg-linear-to-r from-brand to-mid bg-clip-text text-transparent">
            for Modern Schools
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
        >
          Connect-Ed unifies administration, finance, academics, and
          communication into a single platform — so your team can focus on
          what matters most: delivering quality education.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          {isLoading ? (
            <div className="h-12 w-40 rounded-lg bg-muted animate-pulse" />
          ) : isAuthenticated ? (
            <Button size="xl" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button size="xl" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/auth/login">Log in to Your Account</Link>
              </Button>
            </>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <a
            href="#features"
            className="inline-flex flex-col items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <span className="text-xs">Explore the platform</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
            </motion.div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────── Features ─────────────── */

function Features() {
  return (
    <section id="features" className={`py-24 ${patternBg} bg-muted/30`}>
      <div className="mx-auto max-w-6xl px-6">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
              Platform Capabilities
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            Everything You Need to Run Your School
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            A comprehensive toolkit that replaces spreadsheets, paper registers,
            and disconnected apps with one unified system.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              custom={i}
              className="group relative rounded-2xl border border-brand/30 bg-card p-6 transition-all duration-300 hover:shadow-md overflow-hidden"
            >
              {/* Subtle corner accent */}
              <div className="absolute top-0 right-0 size-20 bg-linear-to-bl from-brand/5 to-transparent rounded-bl-3xl pointer-events-none" />

              <div className="relative">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand text-white ring-1 ring-brand/20 transition-all duration-300">
                  <HugeiconsIcon icon={feature.icon} className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─────────────── Role USPs ─────────────── */

function RoleUSPs() {
  return (
    <section id="roles" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
              Role-Based Solutions
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            A Tailored Experience for Every Stakeholder
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            Whether you manage the school, teach a class, or check your
            child&apos;s report — Connect-Ed adapts to your role.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid gap-6 sm:grid-cols-2">
          {roleUSPs.map((item, i) => (
            <motion.div
              key={item.role}
              variants={fadeUp}
              custom={i}
              className={`group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-md overflow-hidden ${item.accent}`}
            >
              {/* Top gradient strip */}
              <div
                className={`absolute top-0 inset-x-0 h-1 bg-linear-to-r ${item.color} opacity-60 group-hover:opacity-100 transition-opacity`}
              />

              <div className="flex items-center gap-3 mb-5 mt-1">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl bg-linear-to-br ${item.color} text-white shadow-sm`}
                >
                  <HugeiconsIcon icon={item.icon} className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.role}
                </h3>
              </div>
              <ul className="space-y-3">
                {item.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <span
                      className={`size-1.5 rounded-full ${item.dotColor} mt-1.5 shrink-0`}
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Button
                  className={`${item.ctaBg} text-white`}
                  asChild
                >
                  <Link href={item.ctaHref}>{item.ctaText}</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─────────────── Pricing Preview ─────────────── */

function PricingPreview() {
  const [currency, setCurrency] = React.useState<"USD" | "ZAR">("USD");

  const plans = [
    {
      name: "Lite",
      description: "Perfect for small schools with less than 500 students.",
      features: [
        "Up to 500 students",
        "Student management",
        "Fee tracking & reminders",
        "Expense tracking",
        "Financial reports (PDF export)",
        "150 GB cloud storage",
        "Email, WhatsApp & SMS messaging",
      ],
      signupFee: currency === "USD" ? 400 : 4000,
      perTermCost: currency === "USD" ? 240 : 2400,
    },
    {
      name: "Growth",
      description: "Ideal for mid-size schools with 500 to 1,200 students.",
      popular: true,
      includedFrom: "Lite",
      features: [
        "Teacher portal & management",
        "Class management",
        "Class communication channels",
        "Shared files & resources",
        "400 GB cloud storage",
        "Premium support",
      ],
      signupFee: currency === "USD" ? 750 : 15000,
      perTermCost: currency === "USD" ? 225 : 4500,
    },
    {
      name: "Enterprise",
      description: "Built for large institutions with 2,000 to 3,000 students.",
      includedFrom: "Growth",
      features: [
        "Student & parent portals",
        "Online fee payments",
        "Exam & report card system",
        "1,000 GB cloud storage",
        "24/7 dedicated support",
      ],
      signupFee: currency === "USD" ? 1200 : 24000,
      perTermCost: currency === "USD" ? 360 : 7200,
    },
  ];

  return (
    <section id="pricing" className={`py-24 ${patternBg} bg-muted/30`}>
      <div className="mx-auto max-w-6xl px-6">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
              Pricing
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            Transparent Pricing, No Surprises
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            Select a plan that matches your institution&apos;s size. All plans
            include a one-time setup fee and full onboarding support.
          </motion.p>
        </AnimatedSection>

        {/* Currency tabs */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex justify-center mb-10"
        >
          <Tabs value={currency} onValueChange={(v) => setCurrency(v as "USD" | "ZAR")}>
            <TabsList>
              <TabsTrigger value="USD">USD ($)</TabsTrigger>
              <TabsTrigger value="ZAR">Rands (R)</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        <AnimatedSection className="grid gap-6 sm:grid-cols-3 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              custom={i}
              className={`relative rounded-2xl border bg-card overflow-hidden ${plan.popular
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

                <div className="mt-6 mb-6 flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Setup fee (one-time)</p>
                    <div className="text-lg font-semibold text-foreground">
                      {fmt(plan.signupFee, currency)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Then per term</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground italic">
                        {fmt(plan.perTermCost, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                  asChild
                >
                  <a href="/auth/signup">Get Started</a>
                </Button>
              </div>

              <div className="p-6 pt-5 mt-5 border-t border-border/40">
                <p className="text-sm font-semibold text-foreground mb-4">
                  {plan.includedFrom
                    ? `Everything in ${plan.includedFrom}, plus:`
                    : "What's included:"}
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

        <AnimatedSection className="mt-10 text-center">
          <motion.div variants={fadeUp}>
            <Button variant="outline" size="lg" asChild>
              <a href="/pricing">View Full Plan Details</a>
            </Button>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─────────────── CTA ─────────────── */

function CTASection() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <AnimatedSection>
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand to-mid px-8 py-16 text-center text-white sm:px-16"
          >
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 size-60 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-white/10 blur-2xl" />
            {/* Subtle dot pattern overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[20px_20px]" />

            <h2 className="relative text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to Modernize Your School?
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-white/80">
              Join thousands of schools around the world that have streamlined
              their operations with Connect-Ed. Setup takes less than 10 minutes.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
              {isLoading ? (
                <div className="h-12 w-40 rounded-lg bg-white/20 animate-pulse" />
              ) : isAuthenticated ? (
                <Button
                  size="xl"
                  className="bg-white text-brand hover:bg-white/90"
                  asChild
                >
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button
                  size="xl"
                  className="bg-white text-brand hover:bg-white/90"
                  asChild
                >
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */

function Footer() {
  return (
    <footer className={`border-t border-border/40 ${patternBg} bg-muted/20`}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative size-10">
                <Image
                  src="/logo.png"
                  alt="Connect-Ed Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
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
              {[
                { label: "Features", href: "/features" },
                { label: "Solutions", href: "/solutions" },
                { label: "Who It's For", href: "/who-its-for" },
                { label: "Pricing", href: "/pricing" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
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
            Built for schools everywhere 🌍
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────── Page ─────────────── */

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <RoleUSPs />
      <PricingPreview />
      <CTASection />
      <Footer />
    </main>
  );
}
