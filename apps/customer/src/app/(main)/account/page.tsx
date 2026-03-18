"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Separator,
  Skeleton,
} from "@delivio/ui";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

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
      <div className="mx-auto max-w-md space-y-3 px-4 pt-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {customer?.name && (
            <div className="flex items-center gap-3">
              <User className="size-4 text-muted-foreground" />
              <span className="text-sm">{customer.name}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Phone className="size-4 text-muted-foreground" />
            <span className="text-sm">{customer?.phone}</span>
          </div>
          {customer?.email && (
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-sm">{customer.email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={handleLogout}
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
