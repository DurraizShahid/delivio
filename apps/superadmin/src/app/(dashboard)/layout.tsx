"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Store,
  UserCircle,
  ClipboardList,
  LogOut,
  Shield,
  Palette,
  Megaphone,
  Settings,
} from "lucide-react";
import { Button, Skeleton, cn, ThemeToggle } from "@delivio/ui";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/shops", label: "Shops", icon: Store },
  { href: "/customers", label: "Customers", icon: UserCircle },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/themes", label: "Themes", icon: Palette },
  { href: "/banners", label: "Banners", icon: Megaphone },
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-3 w-full max-w-md px-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const currentNav = navItems.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-border/60 bg-card md:flex md:flex-col">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
              <Shield className="size-4" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Delivio</div>
              <div className="text-xs text-muted-foreground">Platform Admin</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-[18px]", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border/60 p-3">
            <button
              onClick={() => { logout(); router.replace("/login"); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-[18px]" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm md:hidden">
                  <Shield className="size-3.5" />
                </div>
                <h1 className="text-[15px] font-semibold tracking-tight">
                  {currentNav?.label ?? "Dashboard"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={() => { logout(); router.replace("/login"); }}
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-sm md:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-around py-1">
              {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <div className={cn("flex size-7 items-center justify-center rounded-lg transition-colors", isActive ? "bg-primary/10" : "")}>
                      <Icon className="size-4" />
                    </div>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
