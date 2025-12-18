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
  title: "LEXA - Luxury Experience Agent",
  description: "I don't give lists. I design the feeling behind the decision.",
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
