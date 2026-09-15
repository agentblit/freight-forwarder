import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const display = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HarborLane Freight Forwarder",
  description: "Sample freight forwarder booking workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${geistMono.variable} flex h-dvh overflow-hidden antialiased`}
      >
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
