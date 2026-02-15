import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing — Transparent Plans for Every School Size",
    description:
        "Choose the Connect-Ed plan that fits your school. From small institutions to large enterprises — transparent per-term pricing with no hidden fees.",
    alternates: { canonical: "/pricing" },
    openGraph: {
        title: "Pricing — Transparent Plans for Every School Size | Connect-Ed",
        description:
            "Affordable school management plans starting at $50/term. Lite, Growth, and Enterprise tiers for schools of all sizes.",
        url: "/pricing",
    },
};

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
