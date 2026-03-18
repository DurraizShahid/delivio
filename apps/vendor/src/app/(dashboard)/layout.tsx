"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  MessageCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { Button, Skeleton, cn } from "@delivio/ui";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 w-full max-w-md px-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <WSProvider>
      <div className="min-h-screen bg-muted/30">
        <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card/80 backdrop-blur md:flex md:flex-col">
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm">
              D
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Delivio Vendor</div>
              <div className="text-xs text-muted-foreground">Dashboard</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-3">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={() => logout()}
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm md:hidden">
                  <span className="text-sm font-bold">D</span>
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">
                    {navItems.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))
                      ?.label ?? "Dashboard"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Manage orders, menu, and messages
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => logout()}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
              {children}
            </div>
          </main>

          {/* Mobile bottom nav */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-around">
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
                      "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
      </div>
    </WSProvider>
  );
}
