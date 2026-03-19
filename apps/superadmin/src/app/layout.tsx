import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/providers/toaster";
import { QueryProvider } from "@/providers/query-provider";
import { DynamicThemeProvider } from "@delivio/ui";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://delivio-production.up.railway.app"
    : "http://localhost:8080");

export const metadata: Metadata = {
  title: "Delivio Platform Admin",
  description: "Manage the entire Delivio platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <DynamicThemeProvider apiUrl={API_URL} appName="superadmin_web">
              {children}
            </DynamicThemeProvider>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
