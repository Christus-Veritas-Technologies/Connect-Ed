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

// Plan pricing data with multi-currency support
export const PLANS_PRICING = {
  USD: {
    LITE: {
      name: "Lite",
      description: "For schools with up to 300 students starting their digital journey.",
      perTermCost: 150,
      monthlyEstimate: 50,
      firstMonthlyPrice: 42.5,
      annualPrice: 600,
      foundingAnnualPrice: 450,
      studentLimit: 300,
      landingPageFeatures: [
        "Up to 300 students",
        "Student management",
        "Fee tracking & automated reminders",
        "Expense tracking",
        "Report generation in minutes",
        "150 GB cloud storage",
        "Email & WhatsApp messaging",
      ],
    },
    GROWTH: {
      name: "Growth",
      description: "For mid-size schools with up to 800 students.",
      perTermCost: 270,
      monthlyEstimate: 90,
      firstMonthlyPrice: 76.5,
      annualPrice: 1080,
      foundingAnnualPrice: 810,
      studentLimit: 800,
      popular: true,
      includedFrom: "Lite",
      landingPageFeatures: [
        "Up to 800 students",
        "Teacher portal & management",
        "Class management & channels",
        "Shared files & resources",
        "400 GB cloud storage",
        "Premium support",
      ],
    },
    ENTERPRISE: {
      name: "Enterprise",
      description: "For large institutions with 2,000+ students — custom capacity.",
      perTermCost: 450,
      monthlyEstimate: 150,
      firstMonthlyPrice: 127.5,
      annualPrice: 1800,
      foundingAnnualPrice: 1350,
      studentLimit: 0,
      includedFrom: "Growth",
      landingPageFeatures: [
        "2,000+ students (custom)",
        "Student & parent portals",
        "Online fee payments",
        "Exam & report card system",
        "1,000 GB cloud storage",
        "24/7 dedicated support",
      ],
    },
  },
  ZAR: {
    LITE: {
      name: "Lite",
      description: "For schools with up to 300 students starting their digital journey.",
      perTermCost: 3000,
      monthlyEstimate: 800,
      firstMonthlyPrice: 680,
      annualPrice: 9600,
      foundingAnnualPrice: 7200,
      studentLimit: 300,
      landingPageFeatures: [
        "Up to 300 students",
        "Student management",
        "Fee tracking & automated reminders",
        "Expense tracking",
        "Report generation in minutes",
        "150 GB cloud storage",
        "Email & WhatsApp messaging",
      ],
    },
    GROWTH: {
      name: "Growth",
      description: "For mid-size schools with up to 800 students.",
      perTermCost: 4500,
      monthlyEstimate: 1500,
      firstMonthlyPrice: 1275,
      annualPrice: 18000,
      foundingAnnualPrice: 13500,
      studentLimit: 800,
      popular: true,
      includedFrom: "Lite",
      landingPageFeatures: [
        "Up to 800 students",
        "Teacher portal & management",
        "Class management & channels",
        "Shared files & resources",
        "400 GB cloud storage",
        "Premium support",
      ],
    },
    ENTERPRISE: {
      name: "Enterprise",
      description: "For large institutions with 2,000+ students — custom capacity.",
      perTermCost: 7500,
      monthlyEstimate: 2400,
      firstMonthlyPrice: 2040,
      annualPrice: 28800,
      foundingAnnualPrice: 21600,
      studentLimit: 0,
      includedFrom: "Growth",
      landingPageFeatures: [
        "2,000+ students (custom)",
        "Student & parent portals",
        "Online fee payments",
        "Exam & report card system",
        "1,000 GB cloud storage",
        "24/7 dedicated support",
      ],
    },
  },
};

// Get plans for a specific currency
export function getPlansByCurrency(currency: "USD" | "ZAR" = "USD") {
  return PLANS_PRICING[currency];
}

// USD pricing with UI metadata (name, description, features, quotas)
export const PRICING = {
  LITE: {
    name: "Lite",
    description: "Perfect for small schools getting started with digital management",
    perTermCost: 150,
    monthlyEstimate: 50,
    firstMonthlyPrice: 42.5,
    annualPrice: 600,
    foundingAnnualPrice: 450,
    studentLimit: 300,
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
    perTermCost: 270,
    monthlyEstimate: 90,
    firstMonthlyPrice: 76.5,
    annualPrice: 1080,
    foundingAnnualPrice: 810,
    studentLimit: 800,
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
    perTermCost: 450,
    monthlyEstimate: 150,
    firstMonthlyPrice: 127.5,
    annualPrice: 1800,
    foundingAnnualPrice: 1350,
    studentLimit: 0,
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
