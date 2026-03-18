"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PackageCheck, Bike, Clock, MessageCircle, User } from "lucide-react";
import { WSProvider } from "@/providers/ws-provider";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@delivio/ui";

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
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
