import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Paquets serveur exclus du bundling : firebase-admin et sa pile gRPC
     utilisent des require() dynamiques que le bundler Next ne doit pas toucher. */
  serverExternalPackages: [
    "firebase-admin",
    "firebase",
    "@firebase/auth",
    "@firebase/firestore",
    "google-gax",
    "grpc",
    "@grpc/grpc-js",
    "@opentelemetry/api",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
