import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

// Self-hosted (public/fonts) so builds never depend on Google Fonts uptime
const shippori = localFont({
  src: [
    { path: "../public/fonts/shippori-mincho-500.woff2", weight: "500" },
    { path: "../public/fonts/shippori-mincho-600.woff2", weight: "600" },
    { path: "../public/fonts/shippori-mincho-700.woff2", weight: "700" },
  ],
  variable: "--font-shippori",
  display: "swap",
});
const inter = localFont({
  src: [
    { path: "../public/fonts/inter-400.woff2", weight: "400" },
    { path: "../public/fonts/inter-500.woff2", weight: "500" },
    { path: "../public/fonts/inter-600.woff2", weight: "600" },
  ],
  variable: "--font-inter",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/ibm-plex-mono-500.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seichō OS",
  description:
    "A personal project operating system that preserves the understanding behind long-running projects.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f6f0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${shippori.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
