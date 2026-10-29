import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { EarnKaroHeader } from "@/components/EarnKaroHeader";
import { EarnKaroBottomNav } from "@/components/EarnKaroBottomNav";
import { EarnKaroFooter } from "@/components/EarnKaroFooter";
import { MakeLinkModal } from "@/components/MakeLinkModal";
import { QueryProvider } from "@/components/QueryProvider";
import { getAuthUser } from "@/lib/auth";
import { getBalances } from "@/lib/ledger";
import "./globals.css";

export const metadata: Metadata = {
  title: "EarnKaro: Turn Every Share into Real Cash",
  description: "India's #1 Deal-Sharing App. Share Flipkart, Amazon, Myntra & Ajio deals and earn guaranteed cash directly to your bank account.",
};

export const viewport: Viewport = { themeColor: "#134024", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthUser();
  let available: number = 0;
  let totalProfit: number = 0;

  if (auth) {
    try {
      const b = await getBalances(auth.id);
      available = b.available;
      totalProfit = b.lifetime;
    } catch {
      /* Graceful fallback */
    }
  }

  return (
    <html lang="en">
      <body className="bg-canvas min-h-screen text-ink antialiased flex flex-col justify-between">
        <QueryProvider>
          {/* Top Forest Green Header */}
          <EarnKaroHeader totalProfitPaise={totalProfit} availablePaise={available} />

          {/* Main App Canvas */}
          <main className="mx-auto w-full max-w-lg px-3.5 pt-2 pb-20 md:max-w-2xl lg:max-w-4xl flex-1">
            {children}
          </main>

          {/* Expandable Accordion Footer */}
          <EarnKaroFooter />

          {/* 5-Item Fixed Bottom Bar */}
          <EarnKaroBottomNav />

          {/* Global Quick Make Link Modal */}
          <MakeLinkModal />
        </QueryProvider>
      </body>
    </html>
  );
}
