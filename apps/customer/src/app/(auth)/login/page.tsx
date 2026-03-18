"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@delivio/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const PROJECT_REF = process.env.NEXT_PUBLIC_PROJECT_REF || "demo";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const setCustomer = useAuthStore((s) => s.setCustomer);
  const [step, setStep] = useState<"phone" | "otp">("phone");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.sendOTP(phone, PROJECT_REF);
      setStep("otp");
      toast.success("OTP sent to your phone");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.auth.verifyOTP({
        phone,
        code,
        projectRef: PROJECT_REF,
      });
      setCustomer(result.customer);
      toast.success("Welcome back!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Delivio</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Enter your phone number to sign in"
              : "Enter the code sent to your phone"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                  autoFocus
                />
              </div>
              <Button className="w-full" disabled={loading || !phone}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em]"
                required
                autoFocus
              />
              <Button className="w-full" disabled={loading || code.length !== 6}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Change phone number
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
