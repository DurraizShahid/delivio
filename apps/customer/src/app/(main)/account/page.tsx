"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User,
  Phone,
  Mail,
  ShoppingBag,
  MessageCircle,
  ChevronRight,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Skeleton, Separator } from "@delivio/ui";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import Link from "next/link";

export default function AccountPage() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading, logout } = useAuthStore();
  const clearCart = useCartStore((s) => s.clear);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleLogout() {
    await logout();
    clearCart();
    toast.success("Signed out");
    router.push("/login");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 lg:px-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const menuItems = [
    { href: "/orders", label: "My Orders", icon: ShoppingBag, desc: "View your order history" },
    { href: "/chat", label: "Messages", icon: MessageCircle, desc: "Chat with support" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold">Account</h1>

      {/* Profile card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <User className="size-8 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">
              {customer?.name || "Customer"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {customer?.phone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer?.email && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span>{customer.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card">
        {menuItems.map(({ href, label, icon: Icon, desc }, idx) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50 border-b border-border/50 last:border-b-0"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Icon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div className="mt-6">
        <Button
          variant="outline"
          className="w-full gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
