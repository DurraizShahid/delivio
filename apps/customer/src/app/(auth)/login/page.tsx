"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@delivio/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

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
    <div className="relative flex min-h-screen">
      {/* Left side — decorative */}
      <div className="hidden w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background lg:flex lg:items-center lg:justify-center">
        <div className="max-w-md px-12">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <span className="text-xl font-bold text-primary-foreground">D</span>
            </div>
            <span className="text-3xl font-bold tracking-tight">Delivio</span>
          </div>
          <h2 className="mt-8 text-3xl font-bold leading-tight">
            Delicious food,
            <br />
            delivered fast.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Order from the best restaurants near you. Track your delivery in real-time.
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex flex-1 flex-col">
        {/* Top nav */}
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary shadow-sm">
              <span className="text-sm font-bold text-primary-foreground">D</span>
            </div>
            <span className="font-bold">Delivio</span>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                {step === "phone" ? "Welcome back" : "Verify your code"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {step === "phone"
                  ? "Enter your phone number to sign in or create an account."
                  : "Enter the 6-digit code we sent to your phone."}
              </p>
            </div>

            {step === "phone" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="customer-phone"
                  >
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-xl pl-10"
                      required
                      autoFocus
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2 rounded-xl"
                  size="lg"
                  disabled={loading || !phone}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending code...
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
                  <label
                    className="text-sm font-medium"
                    htmlFor="customer-otp"
                  >
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
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, ""))
                    }
                    className="rounded-xl text-center text-2xl tracking-[0.5em]"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-2 rounded-xl"
                  size="lg"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                  }}
                  className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Change phone number
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
