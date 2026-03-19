"use client";

import { useEffect } from "react";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useLocationStore } from "@/stores/location-store";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const detectLocation = useLocationStore((s) => s.detectLocation);
  const locationStatus = useLocationStore((s) => s.status);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (locationStatus === "idle") {
      detectLocation();
    }
  }, [locationStatus, detectLocation]);

  return (
    <WSProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </WSProvider>
  );
}
