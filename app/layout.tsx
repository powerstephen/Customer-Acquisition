// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Throughput Funnel Analysis — Cargo.one",
  description: "Identify bottlenecks, benchmarks, and throughput impact.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <header className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <h1 className="text-2xl md:text-4xl font-semibold text-gray-900 tracking-tight">
              ⚡ Throughput Funnel Analysis
            </h1>
            {/* Removed the subheading line entirely per request */}
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
