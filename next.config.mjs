/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // These are loaded at runtime on the server rather than bundled by webpack.
  // pdf-parse pulls in pdfjs (dynamic worker loading), imapflow opens raw TLS
  // sockets, and mammoth reads its own resources — all of which break when
  // inlined into a bundle.
  serverExternalPackages: ["pdf-parse", "imapflow", "mammoth"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
