import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import { ChatWidget } from "@/components/ai/chat-widget";
import { BugReporter } from "@/components/bug-reporter";
import { ThemeProvider } from "@/components/theme-provider";

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
  maximumScale: 1,
  userScalable: false,
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
      <body className={inter.className}>
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
