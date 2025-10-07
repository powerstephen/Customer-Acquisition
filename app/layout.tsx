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
        {/* No header — page owns its own title */}
        <main>{children}</main>
      </body>
    </html>
  );
}
