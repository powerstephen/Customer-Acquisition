// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Throughput Funnel Analysis — Cargo.one",
  description: "Interactive funnel and capacity model identifying growth constraints and performance leverage points.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <header className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
            <Image
              src="/lightning-logo.svg"           // keep your file in /public
              alt="Cargo.one Lightning Logo"
              width={44}                          // bigger logo
              height={44}
              className="rounded drop-shadow-[0_0_8px_rgba(250,204,21,0.55)]"
              priority
            />
            <div className="flex flex-col leading-tight">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                ⚡ Throughput Funnel Analysis
              </h1>
              <p className="text-sm md:text-base text-gray-500">Bottleneck & Benchmark Diagnostics — Cargo.one</p>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
