"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PlatformBrandingMark,
  usePlatformBranding,
} from "@delivio/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@delivio/types";

export default function VendorLoginPage() {
  const { appName } = usePlatformBranding();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.auth.login(email, password);
      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        sessionStorage.setItem("delivio-preAuthToken", result.preAuthToken);
        toast.info("Two-factor authentication required");
        router.push("/2fa");
        return;
      }

      if (!("user" in result)) return;
      setUser(result.user as unknown as User);
      toast.success("Welcome back!");
      router.push("/");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Invalid email or password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background" />
        <div className="absolute left-1/2 top-0 h-80 w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
            <PlatformBrandingMark className="size-14 text-xl" imgClassName="p-2" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {appName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your restaurant
          </p>
        </div>

        <Card className="shadow-lg shadow-black/[0.04] border-border/60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-semibold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="vendor-email"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="vendor-email"
                    type="email"
                    placeholder="you@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="vendor-password"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="vendor-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need help? Contact support from the Settings page once signed in.
        </p>
      </div>
    </div>
  );
}
