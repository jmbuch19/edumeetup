import type { Metadata, Viewport } from "next";

import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PublicShell } from "@/components/layout/public-shell";
import { Toaster } from "sonner";
import { BugReporter } from "@/components/bug-reporter";
import { ThemeProvider } from "@/components/theme-provider";
import { ClientOnlyWidgets } from "@/components/layout/client-only-widgets";
import { SentryUserProvider } from "@/components/sentry-user-provider";
import { WatiWidget } from "@/components/layout/wati-widget";


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

  const banner = session ? (
    <div className="bg-amber-100 text-amber-900 text-center py-2 text-sm font-medium border-b border-amber-200">
      🚧 Beta Version – Testing Phase. System is active for demonstration.
    </div>
  ) : undefined;

  return (
    <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider>
          {/*
            PublicShell is a 'use client' component that reads usePathname().
            Header/Footer are passed as server-rendered ReactNode props so they
            never get bundled into the client (avoids nodemailer / fs / net / dns errors).
          */}
          <PublicShell
            header={<Header />}
            footer={<Footer />}
            banner={banner}
          >
            {children}
          </PublicShell>
          <SentryUserProvider
            userId={session?.user?.id}
            email={session?.user?.email}
            role={(session?.user as any)?.role}
          />
          <ClientOnlyWidgets />
          <BugReporter />
          <Toaster richColors position="top-center" />
        </ThemeProvider>

        {/* WhatsApp widget — public visitors only, hidden inside all dashboards */}
        {!session && <WatiWidget />}
      </body>
    </html>
  );
}

