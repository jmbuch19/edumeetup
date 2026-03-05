import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PublicShell } from "@/components/layout/public-shell";
import { Toaster } from "sonner";
import dynamic from "next/dynamic";
import { BugReporter } from "@/components/bug-reporter";
import { ThemeProvider } from "@/components/theme-provider";

const ChatWidget = dynamic(
  () => import("@/components/ai/chat-widget").then(m => m.ChatWidget),
  { ssr: false }
)

const SessionGuard = dynamic(
  () => import("@/components/session-guard").then(m => m.SessionGuard),
  { ssr: false }
)

const inter = Inter({ subsets: ["latin"] }); // id: 7

export const metadata: Metadata = {
  title: "EdUmeetup",
  description: "Connect universities and students seamlessly.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1B5E7E",
  width: "device-width",
  initialScale: 1,
  // NOTE: userScalable/maximumScale intentionally omitted — blocking pinch-zoom
  // is a WCAG 2.1 AA violation (SC 1.4.4). iOS zoom on inputs is handled by
  // the font-size: 16px rule in globals.css instead.
};

import { auth } from "@/lib/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider>
          <PublicShell isLoggedIn={!!session}>
            {children}
          </PublicShell>
          <ChatWidget />
          <SessionGuard />
          <BugReporter />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
