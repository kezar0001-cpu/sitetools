/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent webpack from bundling these packages in server routes.
    // pdf-parse loads test fixtures at module init time which breaks when
    // bundled; keeping it as a true Node.js require avoids that issue.
    serverComponentsExternalPackages: ["pdf-parse", "@react-pdf/renderer"],
  },
};

export default nextConfig;
