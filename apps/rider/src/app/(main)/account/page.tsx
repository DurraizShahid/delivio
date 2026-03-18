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
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Account</h1>

      <Card>
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
