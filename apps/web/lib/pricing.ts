import type { Plan } from "@repo/db";

export const PRICING = {
  LITE: {
    name: "Lite",
    description: "Perfect for small schools with less than 500 students",
    signupFee: 400,
    perTermCost: 50,
    monthlyEstimate: 40,
    features: [
      "Up to 500 students",
      "Admin & Receptionist access",
      "Student management",
      "Fee tracking & reminders",
      "Expense tracking",
      "Detailed reports",
      "200 emails/month",
      "200 WhatsApp messages/month",
      "100 SMS/month",
      "Basic support",
    ],
    quotas: {
      email: 200,
      whatsapp: 200,
      sms: 100,
    },
  },
  GROWTH: {
    name: "Growth",
    description: "Perfect for schools with 500-1200 students",
    signupFee: 750,
    perTermCost: 90,
    monthlyEstimate: 75,
    features: [
      "500-1200 students",
      "Admin, Receptionist & Teacher access",
      "Everything in Lite",
      "Class management",
      "Teacher portal",
      "Class teacher assignments",
      "500 emails/month",
      "500 WhatsApp messages/month",
      "300 SMS/month",
      "Premium support",
    ],
    quotas: {
      email: 500,
      whatsapp: 500,
      sms: 300,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "For large schools with 2000-3000 students",
    signupFee: 1200,
    perTermCost: 150,
    monthlyEstimate: 120,
    features: [
      "2000-3000 students",
      "Full access for all roles",
      "Everything in Growth",
      "Student portal",
      "Parent portal",
      "Online fee payment for parents",
      "1500 emails/month",
      "1500 WhatsApp messages/month",
      "750 SMS/month",
      "24/7 Ultimate support",
    ],
    quotas: {
      email: 1500,
      whatsapp: 1500,
      sms: 750,
    },
  },
} as const;

export type PlanPricing = (typeof PRICING)[Plan];

export function getPlanPricing(plan: Plan): PlanPricing {
  return PRICING[plan];
}

export function calculateSignupTotal(plan: Plan): number {
  const pricing = PRICING[plan];
  // Signup fee + first month
  return pricing.signupFee + pricing.monthlyEstimate;
}

export function calculateMonthlyPayment(plan: Plan): number {
  return PRICING[plan].monthlyEstimate;
}
