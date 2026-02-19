import type { Plan } from "@repo/db";

// Re-export pricing data and utilities from shared package
export {
  PRICING_USD,
  PRICING_ZAR,
  PRICING_ZIG,
  getPlanAmounts,
  calculateSignupTotal,
  calculateMonthlyPayment,
} from "@repo/payments";

// Re-export PRICING_USD as PRICING for simpler usage
import { PRICING_USD } from "@repo/payments";

// USD pricing with UI metadata (name, description, features, quotas)
export const PRICING = {
  LITE: {
    name: "Lite",
    description: "Perfect for small schools getting started with digital management",
    ...PRICING_USD.LITE,
    features: [
      "Up to 300 students",
      "Admin & Receptionist access",
      "Student management",
      "Fee tracking & automated reminders",
      "Expense tracking",
      "Report generation in minutes",
      "150 GB cloud storage",
      "200 emails/month",
      "200 WhatsApp messages/month",
      "Basic support",
    ],
    quotas: {
      email: 200,
      whatsapp: 200,
      storageGb: 150,
    },
  },
  GROWTH: {
    name: "Growth",
    description: "For growing schools that need teacher portals and class management",
    ...PRICING_USD.GROWTH,
    features: [
      "Up to 800 students",
      "Admin, Receptionist & Teacher access",
      "Everything in Lite",
      "Class management",
      "Teacher portal",
      "Class teacher assignments",
      "Shared files & resources",
      "400 GB cloud storage",
      "500 emails/month",
      "500 WhatsApp messages/month",
      "Premium support",
    ],
    quotas: {
      email: 500,
      whatsapp: 500,
      storageGb: 400,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "For large institutions — custom student capacity, full platform access",
    ...PRICING_USD.ENTERPRISE,
    features: [
      "2,000+ students (custom capacity)",
      "Full access for all roles",
      "Everything in Growth",
      "Student & parent portals",
      "Online fee payments for parents",
      "Exam & report card system",
      "1,000 GB cloud storage",
      "1,500 emails/month",
      "1,500 WhatsApp messages/month",
      "24/7 dedicated support",
    ],
    quotas: {
      email: 1500,
      whatsapp: 1500,
      storageGb: 1000,
    },
  },
} as const;

export type PlanPricing = (typeof PRICING)[Plan];

export function getPlanPricing(plan: Plan): PlanPricing {
  return PRICING[plan];
}
