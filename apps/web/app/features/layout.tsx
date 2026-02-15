import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Features — All-in-One School Management Tools",
    description:
        "Explore Connect-Ed's complete feature set: student management, fee tracking, exam & report cards, real-time messaging, announcements, shared files, and financial reporting.",
    alternates: { canonical: "/features" },
    openGraph: {
        title: "Features — All-in-One School Management Tools | Connect-Ed",
        description:
            "Student management, fee collection, exams, report cards, messaging, and more — everything your school needs in one platform.",
        url: "/features",
    },
};

export default function FeaturesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
