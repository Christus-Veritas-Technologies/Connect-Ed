import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Connect-Ed | Modern School Management System | connect-ed.co.zw",
  description: "Comprehensive school management system streamlining student tracking, fee management, exams, reports, parent communication, and teacher coordination for schools in Zimbabwe.",
  keywords: ["school management", "student tracking", "fee management", "exam system", "school software", "Zimbabwe", "education", "teacher management", "parent portal"],
  metadataBase: new URL("https://connect-ed.co.zw"),
  canonical: "https://connect-ed.co.zw",
  alternates: {
    canonical: "https://connect-ed.co.zw",
  },
  openGraph: {
    title: "Connect-Ed | Modern School Management System",
    description: "Transform your school operations with Connect-Ed's comprehensive management platform. Student tracking, fees, exams, reports, and seamless communication.",
    url: "https://connect-ed.co.zw",
    siteName: "Connect-Ed",
    images: [
      {
        url: "https://connect-ed.co.zw/og-image.png",
        width: 1200,
        height: 630,
        alt: "Connect-Ed School Management System",
        type: "image/png",
      },
    ],
    type: "website",
    locale: "en_ZW",
  },
  twitter: {
    card: "summary_large_image",
    title: "Connect-Ed | School Management System",
    description: "Comprehensive school management platform for student tracking, fees, exams, and communication.",
    images: ["https://connect-ed.co.zw/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
