/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true
    },
    // SEO: Generate clean, consistent URLs
    trailingSlash: false,
    // SEO: Powered-by header leak is unnecessary
    poweredByHeader: false,
    // SEO: Optimize images for all devices
    images: {
        formats: ["image/avif", "image/webp"],
    },
    // SEO: Security headers & caching
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                ],
            },
        ];
    },
};

export default nextConfig;
