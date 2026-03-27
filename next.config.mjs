/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent webpack from bundling these packages in server routes.
  // pdf-parse loads test fixtures at module init time which breaks when
  // bundled; keeping it as a true Node.js require avoids that issue.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
