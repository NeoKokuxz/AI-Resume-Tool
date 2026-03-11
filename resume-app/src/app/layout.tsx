import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Job Agent — Resume & Application Tracker",
  description:
    "AI-powered job application automation: ATS scoring, resume tailoring, and application tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden bg-gray-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
