"use client";

import Link from "next/link";
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
  Settings02Icon,
  Notification01Icon,
  Calendar01Icon,
  Shield01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

/* ─────────────── Data ─────────────── */

const features = [
  {
    icon: UserGroupIcon,
    title: "Student Management",
    description:
      "Enrol, track, and manage students with detailed profiles, class assignments, and admission records.",
  },
  {
    icon: Money01Icon,
    title: "Fee Tracking & Payments",
    description:
      "Record fees, send automated reminders via SMS, email, or WhatsApp, and accept online payments.",
  },
  {
    icon: ChartHistogramIcon,
    title: "Financial Reports",
    description:
      "Generate term-based revenue, expense, and balance reports with exportable PDF summaries.",
  },
  {
    icon: BookOpen01Icon,
    title: "Exam & Report Cards",
    description:
      "Create exam sessions, record marks, and generate printable student report cards instantly.",
  },
  {
    icon: SentIcon,
    title: "Class Chats",
    description:
      "Real-time messaging between teachers, parents, and students within class groups.",
  },
  {
    icon: Notification01Icon,
    title: "Announcements",
    description:
      "Broadcast school-wide or role-specific announcements with comments and engagement tracking.",
  },
];

const roleUSPs = [
  {
    role: "Admins",
    icon: Shield01Icon,
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    textColor: "text-blue-700",
    points: [
      "Full oversight of students, teachers, and finances",
      "Detailed revenue & expense reports with PDF export",
      "School-wide announcements and notifications",
      "Manage fee structures, terms, and holidays",
      "Configure messaging quotas (email, SMS, WhatsApp)",
    ],
  },
  {
    role: "Teachers",
    icon: TeacherIcon,
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    textColor: "text-emerald-700",
    points: [
      "View and manage assigned class rosters",
      "Record exam marks and generate report cards",
      "Chat with parents and students in class groups",
      "Post and engage with school announcements",
      "Track student attendance and performance",
    ],
  },
  {
    role: "Parents",
    icon: User02Icon,
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    textColor: "text-violet-700",
    points: [
      "View your child's academic report cards",
      "Track fee balances and make online payments",
      "Chat directly with class teachers",
      "Receive announcements and school updates",
      "Stay informed with real-time notifications",
    ],
  },
  {
    role: "Students",
    icon: School01Icon,
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    textColor: "text-amber-700",
    points: [
      "View your own academic report card",
      "Participate in class group chats",
      "Stay up to date with school announcements",
      "Access class information and schedules",
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-linear-to-br from-brand to-mid flex items-center justify-center">
            <span className="text-sm font-bold text-white">CE</span>
          </div>
          <span className="text-lg font-semibold text-foreground">
            Connect-Ed
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#roles"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Who It's For
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-10 w-28 rounded-lg bg-muted animate-pulse" />
          ) : isAuthenticated ? (
            <Button size="default" asChild>
              <Link href="/dashboard">
                Dashboard
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4 ml-1"
                />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">
                  Get Started
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-3.5 ml-0.5"
                  />
                </Link>
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
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Gradient background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-125 rounded-full bg-brand/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-100 rounded-full bg-mid/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <Badge variant="secondary" size="lg" className="mb-6 border border-border/60">
            <HugeiconsIcon icon={School01Icon} className="size-3.5" />
            School Management for the 21st Century
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
        >
          Give Your School
          <br />
          <span className="bg-linear-to-r from-brand to-mid bg-clip-text text-transparent">
            Superpowers
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
        >
          Connect-Ed brings admins, teachers, parents, and students together on
          one platform — from fee tracking and report cards to real-time
          messaging and school-wide announcements.
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
              <Link href="/dashboard">
                Go to Dashboard
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="xl" asChild>
                <Link href="/auth/signup">
                  Get Started Free
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/auth/login">Log in</Link>
              </Button>
            </>
          )}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-emerald-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-emerald-500" />
            Set up in minutes
          </span>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <a href="#features" className="inline-flex flex-col items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <span className="text-xs">Scroll to explore</span>
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
    <section id="features" className="py-24 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6">
        <AnimatedSection className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <Badge variant="secondary" size="lg" className="mb-4 border border-border/60">
              Features
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            Everything Your School Needs
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            A comprehensive suite of tools designed to simplify school
            administration and empower every stakeholder.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              custom={i}
              className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors duration-300">
                <HugeiconsIcon icon={feature.icon} className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
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
              Who It's For
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            Built for Everyone in Your School
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            Every role gets a tailored experience — from top-level admin
            oversight to student self-service.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid gap-6 sm:grid-cols-2">
          {roleUSPs.map((item, i) => (
            <motion.div
              key={item.role}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl bg-linear-to-br ${item.color} text-white`}
                >
                  <HugeiconsIcon icon={item.icon} className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.role}
                </h3>
              </div>
              <ul className="space-y-3">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className={`size-4 mt-0.5 shrink-0 ${item.textColor}`}
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ─────────────── Pricing Preview ─────────────── */

function PricingPreview() {
  const plans = [
    {
      name: "Lite",
      price: "$50",
      period: "/term",
      description: "For small schools with up to 500 students",
      features: [
        "Student management",
        "Fee tracking & reminders",
        "Expense tracking",
        "Detailed reports",
        "Email, WhatsApp & SMS messaging",
      ],
    },
    {
      name: "Growth",
      price: "$90",
      period: "/term",
      description: "For schools with 500–1,200 students",
      popular: true,
      features: [
        "Everything in Lite",
        "Teacher portal & management",
        "Class management",
        "Class group chats",
        "Higher messaging quotas",
      ],
    },
    {
      name: "Enterprise",
      price: "$150",
      period: "/term",
      description: "For large schools with 2,000–3,000 students",
      features: [
        "Everything in Growth",
        "Student & Parent portals",
        "Online fee payments",
        "Exam & report card system",
        "24/7 premium support",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-muted/30">
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
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            Choose a plan that fits your school. All plans include a one-time
            setup fee.
          </motion.p>
        </AnimatedSection>

        <AnimatedSection className="grid gap-6 sm:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              custom={i}
              className={`relative rounded-2xl border bg-card p-6 shadow-sm ${plan.popular ? "border-brand shadow-md ring-1 ring-brand/20" : "border-border/60"}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="brand" size="sm">
                    Most Popular
                  </Badge>
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <div className="mt-5 mb-6">
                <span className="text-3xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="size-4 text-emerald-500 shrink-0"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? "default" : "outline"}
                className="w-full"
                asChild
              >
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </motion.div>
          ))}
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

            <h2 className="relative text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to Transform Your School?
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-white/80">
              Join the next generation of school management. Get started in
              minutes — no credit card required.
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
                  <Link href="/dashboard">
                    Go to Dashboard
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="xl"
                  className="bg-white text-brand hover:bg-white/90"
                  asChild
                >
                  <Link href="/auth/signup">
                    Get Started Free
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
                  </Link>
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
    <footer className="border-t border-border/40 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-linear-to-br from-brand to-mid flex items-center justify-center">
              <span className="text-xs font-bold text-white">CE</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Connect-Ed
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#roles" className="hover:text-foreground transition-colors">
              Who It's For
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Connect-Ed. All rights reserved.
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
