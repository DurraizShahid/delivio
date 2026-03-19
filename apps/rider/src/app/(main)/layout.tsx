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
} from "lucide-react";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useRiderAvailabilityLocation } from "@/hooks/use-rider-availability";
import { Skeleton, cn, ThemeToggle } from "@delivio/ui";

const navItems = [
  { href: "/", label: "Available", icon: PackageCheck },
  { href: "/active", label: "Active", icon: Bike },
  { href: "/geofence", label: "Zone", icon: MapPin },
  { href: "/history", label: "History", icon: Clock },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
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
      <div className="min-h-screen bg-muted/25">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-lg">
            <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Bike className="size-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">
                    Rider
                  </div>
                  <div className="text-xs text-muted-foreground/90">
                    Fast actions, clear workflow
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
            <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
              {children}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 px-2 py-2 sm:px-4">
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
                      "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
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
