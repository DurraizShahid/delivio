"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Separator,
  Badge,
} from "@delivio/ui";
import { useAuthStore } from "@/stores/auth-store";

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
    router.push("/login");
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 text-center">
        <User className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">Sign in to your account</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Access your rider profile and settings
        </p>
        <Button onClick={() => router.push("/login")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your rider profile and access details.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground" />
            <span className="text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm capitalize">{user?.role}</span>
              <Badge variant="secondary" className="text-xs">
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-1" />

      <Button
        variant="destructive"
        className="h-11 w-full gap-2 rounded-lg"
        onClick={handleLogout}
      >
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
