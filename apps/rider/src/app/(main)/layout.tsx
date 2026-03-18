"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PackageCheck, Bike, Clock, MessageCircle, User } from "lucide-react";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useRiderAvailabilityLocation } from "@/hooks/use-rider-availability";
import { Skeleton, cn } from "@delivio/ui";

const navItems = [
  { href: "/", label: "Available", icon: PackageCheck },
  { href: "/active", label: "Active", icon: Bike },
  { href: "/history", label: "History", icon: Clock },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/account", label: "Account", icon: User },
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
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 pb-16">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
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
    </WSProvider>
  );
}
