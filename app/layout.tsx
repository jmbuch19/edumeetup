import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import { ChatWidget } from "@/components/ai/chat-widget";

const inter = Inter({ subsets: ["latin"] }); // id: 7

export const metadata: Metadata = {
  title: "edUmeetup",
  description: "Connect with verified universities and mentors.",
};

export const viewport = {
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
        <Toaster richColors position="top-center" />
        <Footer />
      </body>
    </html >
  );
}
