import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Who It's For — Built for Admins, Teachers, Parents & Students",
    description:
        "Connect-Ed adapts to every stakeholder: administrators get oversight, teachers manage classes, parents track progress, and students stay connected.",
    alternates: { canonical: "/who-its-for" },
    openGraph: {
        title: "Who It's For — Built for Every School Stakeholder | Connect-Ed",
        description:
            "Role-based dashboards for school administrators, teachers, parents, and students — each tailored to their needs.",
        url: "/who-its-for",
    },
};

export default function WhoItsForLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
