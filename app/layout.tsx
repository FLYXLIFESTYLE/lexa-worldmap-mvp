import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BugReportButton from "@/components/bug-report-button";
import ErrorLoggerInit from "@/components/error-logger-init";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LEXA - Luxury Experience Assistant",
  description: "Emotional Intelligence for Luxury Travel - I anticipate and design the feeling behind your experience.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ErrorLoggerInit />
        {children}
        <BugReportButton />
      </body>
    </html>
  );
}
