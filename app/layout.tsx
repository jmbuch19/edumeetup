import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import dynamic from "next/dynamic";
import { BugReporter } from "@/components/bug-reporter";
import { ThemeProvider } from "@/components/theme-provider";

const ChatWidget = dynamic(
  () => import("@/components/ai/chat-widget").then(m => m.ChatWidget),
  { ssr: false }
)

const inter = Inter({ subsets: ["latin"] }); // id: 7

export const metadata: Metadata = {
  title: "edUmeetup",
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
          <Header />
          {/* Beta Banner - Only for Logged In Users */}
          {session && (
            <div className="bg-amber-100 text-amber-900 text-center py-2 text-sm font-medium border-b border-amber-200">
              🚧 Beta Version – Testing Phase. System is active for demonstration.
            </div>
          )}
          <main className="min-h-screen">
            {children}
          </main>
          <ChatWidget />
          <BugReporter />
          <Toaster richColors position="top-center" />
          <Footer />
        </ThemeProvider>
      </body>
    </html >
  );
}
