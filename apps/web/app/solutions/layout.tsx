import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Solutions — How Connect-Ed Transforms School Operations",
    description:
        "Discover how Connect-Ed streamlines administration, digitizes fee collection, automates report cards, and improves parent-teacher communication for schools worldwide.",
    alternates: { canonical: "/solutions" },
    openGraph: {
        title: "Solutions — How Connect-Ed Transforms School Operations",
        description:
            "Replace spreadsheets, paper registers, and disconnected apps with one unified school management system.",
        url: "/solutions",
    },
};

export default function SolutionsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
