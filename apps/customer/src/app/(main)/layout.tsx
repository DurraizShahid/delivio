"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const detectLocation = useLocationStore((s) => s.detectLocation);
  const locationStatus = useLocationStore((s) => s.status);
  const searchParams = useSearchParams();
  const locationRequested = searchParams.get("location") === "true";
  const clearedLocationParamRef = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // When the user clicks "Current location", force a fresh detection.
    if (!locationRequested) return;
    detectLocation();
    if (!clearedLocationParamRef.current) {
      clearedLocationParamRef.current = true;
      // Remove `?location=true` to prevent repeated effects/odd UI states.
      router.replace("/");
    }
  }, [locationRequested, detectLocation, router]);

  useEffect(() => {
    if (locationStatus === "idle" && !locationRequested) {
      detectLocation();
    }
  }, [locationStatus, locationRequested, detectLocation]);

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
