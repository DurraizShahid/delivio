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
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to send OTP";
      toast.error(message);
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
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Invalid OTP";
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
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-background to-background" />
        <div className="absolute left-1/2 top-0 h-64 w-[640px] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="text-base font-bold">D</span>
            </div>
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-tight">Delivio</div>
              <div className="text-sm text-muted-foreground">
                Food delivery, done right
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl tracking-tight">
              {step === "phone" ? "Welcome back" : "Verify your code"}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "Enter your phone number to sign in."
                : "Enter the 6‑digit code we sent to your phone."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="customer-phone">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                      autoFocus
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={loading || !phone}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending code…
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="customer-otp">
                    Verification code
                  </label>
                  <Input
                    id="customer-otp"
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
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
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
    </div>
  );
}
