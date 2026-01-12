import type { Metadata } from "next";
import "./globals.css";
import BugReportButton from "@/components/bug-report-button";
import ErrorLoggerInit from "@/components/error-logger-init";

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
      <body className="antialiased" suppressHydrationWarning>
        <ErrorLoggerInit />
        {children}
        <BugReportButton />
      </body>
    </html>
  );
}
