import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/providers/toaster";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Delivio",
  description: "Order food from your favourite restaurants",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
