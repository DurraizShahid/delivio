"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useLocationStore } from "@/stores/location-store";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageAmbient } from "@/components/page-ambient";

function MainLayoutShell({ children }: { children: React.ReactNode }) {
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
    if (!locationRequested) return;
    detectLocation();
    if (!clearedLocationParamRef.current) {
      clearedLocationParamRef.current = true;
      router.replace("/");
    }
  }, [locationRequested, detectLocation, router]);

  useEffect(() => {
    if (locationStatus === "idle" && !locationRequested) {
      detectLocation();
    }
  }, [locationStatus, locationRequested, detectLocation]);

  return (
    <>
      <PageAmbient />
      <div className="relative flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </>
  );
}

function MainLayoutFallback({ children }: { children: React.ReactNode }) {
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
    <>
      <PageAmbient />
      <div className="relative flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WSProvider>
      <Suspense fallback={<MainLayoutFallback>{children}</MainLayoutFallback>}>
        <MainLayoutShell>{children}</MainLayoutShell>
      </Suspense>
    </WSProvider>
  );
}
