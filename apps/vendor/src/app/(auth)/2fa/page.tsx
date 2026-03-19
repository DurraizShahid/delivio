"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@delivio/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@delivio/types";

const PRE_AUTH_TOKEN_KEY = "delivio-preAuthToken";

export default function TwoFactorPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const { isAuthenticated, isLoading } = useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);

  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [totpToken, setTotpToken] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const token = sessionStorage.getItem(PRE_AUTH_TOKEN_KEY);
    if (!token) {
      toast.error("Two-factor session expired. Please sign in again.");
      router.replace("/login");
      return;
    }
    setPreAuthToken(token);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preAuthToken) return;

    setLoading(true);
    try {
      const result = await api.auth.login2FA(preAuthToken, totpToken);
      setUser(result.user as unknown as User);
      sessionStorage.removeItem(PRE_AUTH_TOKEN_KEY);
      toast.success("Two-factor authentication successful!");
      router.push("/");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Invalid two-factor code";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-background" />
        <div className="absolute left-1/2 top-0 h-80 w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
            <Store className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Two-factor required</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your 6-digit code to continue.</p>
        </div>

        <Card className="shadow-lg shadow-black/[0.04] border-border/60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-semibold">Verify code</CardTitle>
            <CardDescription>Use your authenticator app.</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="totp-token">
                  TOTP code
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="totp-token"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="123456"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading || totpToken.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify <ShieldCheck className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

