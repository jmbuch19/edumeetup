import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

        {/* WATI WhatsApp Chat Widget */}
        <Script
          id="wati-widget"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var url = 'https://wati-integration-prod-service.clare.ai/v2/watiWidget.js?24748';
                var s = document.createElement('script');
                s.type = 'text/javascript';
                s.async = true;
                s.src = url;
                var options = {
                  "enabled": true,
                  "chatButtonSetting": {
                    "backgroundColor": "#0026e6",
                    "ctaText": "Chat with us",
                    "borderRadius": "25",
                    "marginLeft": "0",
                    "marginRight": "20",
                    "marginBottom": "20",
                    "ctaIconWATI": false,
                    "position": "right"
                  },
                  "brandSetting": {
                    "brandName": "EdUmeetup",
                    "brandSubTitle": "Typically replies within minutes",
                    "brandImg": "https://edumeetup.com/fulllogo.png",
                    "welcomeText": "Hi there!\nHow can I help you?",
                    "messageText": "Hello, %0A I have a question about https://edumeetup.com",
                    "backgroundColor": "#0026e6",
                    "ctaText": "Chat with us",
                    "borderRadius": "25",
                    "autoShow": false,
                    "phoneNumber": "919825593262"
                  }
                };
                s.onload = function() { CreateWhatsappChatWidget(options); };
                var x = document.getElementsByTagName('script')[0];
                x.parentNode.insertBefore(s, x);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

