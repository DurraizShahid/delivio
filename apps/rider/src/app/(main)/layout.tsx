"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  PackageCheck,
  Bike,
  Clock,
  MessageCircle,
  User,
  MapPin,
  Wallet,
} from "lucide-react";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useRiderAvailabilityLocation } from "@/hooks/use-rider-availability";
import {
  Skeleton,
  cn,
  ThemeToggle,
  PlatformBrandingMark,
  PlatformWordmark,
  usePlatformBranding,
} from "@delivio/ui";

const navItems = [
  { href: "/", label: "Available", icon: PackageCheck },
  { href: "/active", label: "Active", icon: Bike },
  { href: "/geofence", label: "Zone", icon: MapPin },
  { href: "/history", label: "History", icon: Clock },
  { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appName } = usePlatformBranding();
  const pathname = usePathname();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useRiderAvailabilityLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <WSProvider>
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                  <PlatformBrandingMark className="size-9 text-sm" imgClassName="p-1.5" />
                </div>
                <div className="leading-tight">
                  <PlatformWordmark className="text-[15px] font-semibold tracking-tight">
                    {appName}
                  </PlatformWordmark>
                  <div className="text-xs text-muted-foreground">
                    Rider · Fast actions, clear workflow
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link
                  href="/account"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
                    pathname.startsWith("/account") &&
                      "bg-accent text-foreground shadow-sm"
                  )}
                >
                  <User className="size-4" />
                  Account
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 pb-24">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-0.5 px-1 py-1.5 sm:px-3">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl px-1 py-px text-[10px] font-medium transition-all sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-xs",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors sm:size-8",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-[18px] sm:size-4" />
                    </span>
                    <span className="truncate leading-none">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </WSProvider>
  );
}
