/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — deployed to AWS Amplify; all data access is client-side
  // Firestore, so there is no server runtime. See ADR-0001 / ADR-0002 in the ais repo.
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
