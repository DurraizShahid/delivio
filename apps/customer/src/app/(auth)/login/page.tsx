"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  PlatformBrandingMark,
  PlatformWordmark,
  usePlatformBranding,
} from "@delivio/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { PromoBanner } from "@/components/promo-banner";

const PROJECT_REF = process.env.NEXT_PUBLIC_PROJECT_REF || "demo";

function normalizePhoneToE164(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  // Allow users to paste values like "+44 7700 900000" and normalize to "+447700900000".
  // We only do character normalization here; the final validation is still E.164 strict.
  const withPlus = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  const digitsAndPlusOnly = withPlus.replace(/[^\d+]/g, "");

  // Keep a single leading "+" if the user included it anywhere.
  if (digitsAndPlusOnly.includes("+")) {
    return `+${digitsAndPlusOnly.replace(/\+/g, "")}`;
  }

  return digitsAndPlusOnly;
}

function isE164(phone: string) {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export default function LoginPage() {
  const { appName, helpUrl, supportEmail } = usePlatformBranding();
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
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const normalized = normalizePhoneToE164(phone);
      if (!isE164(normalized)) {
        toast.error("Enter phone in international format (E.164), e.g. +447700900000");
        return;
      }

      // Keep state consistent so OTP verify uses the same normalized phone.
      setPhone(normalized);

      const result = await api.auth.sendOTP(normalized, PROJECT_REF);
      const nextDebugOtp = result.debugOtp ?? null;
      setDebugOtp(nextDebugOtp);
      setCode(nextDebugOtp ?? "");
      setStep("otp");
      toast.success(nextDebugOtp ? "Dev OTP generated (shown on screen)" : "OTP sent to your phone");
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
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary/[0.14] via-background to-accent/20 lg:flex lg:items-center lg:justify-center">
        <div
          className="absolute -left-20 top-1/4 size-72 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_352_/_0.35),transparent_70%)] blur-3xl motion-safe:animate-ambient-drift"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 -right-10 size-64 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.78_0.14_55_/_0.3),transparent_72%)] blur-3xl motion-safe:animate-ambient-drift-reverse"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-40 [background-size:40px_40px] motion-reduce:opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px)`,
          }}
          aria-hidden
        />
        <div className="relative max-w-md px-12">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/30 ring-2 ring-primary/20">
              <PlatformBrandingMark className="size-12 text-xl" imgClassName="p-2" />
            </div>
            <PlatformWordmark>
              <span className="text-3xl font-bold tracking-tight">{appName}</span>
            </PlatformWordmark>
          </div>
          <h2 className="mt-10 text-3xl font-extrabold leading-tight tracking-tight text-foreground">
            Delicious food,
            <br />
            <span className="text-primary">delivered fast.</span>
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
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-sm">
              <PlatformBrandingMark className="size-8 text-sm" imgClassName="p-1" />
            </div>
            <PlatformWordmark>
              <span className="font-bold">{appName}</span>
            </PlatformWordmark>
          </div>
        </div>

        {/* Form */}
        <div className="relative flex flex-1 items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_12%,var(--primary)_0%,transparent_55%)] opacity-[0.12] dark:opacity-20"
            aria-hidden
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-border/50 bg-card/60 p-6 shadow-xl shadow-black/5 backdrop-blur-md dark:bg-card/40 dark:shadow-black/25 sm:p-8">
            <PromoBanner placement="login" />
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
                      placeholder="+447700900000"
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
                  {debugOtp ? (
                    <div className="rounded-xl bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                      Dev OTP (local only):{" "}
                      <span className="font-mono text-sm tracking-widest text-foreground">
                        {debugOtp}
                      </span>
                    </div>
                  ) : null}
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
                    setDebugOtp(null);
                  }}
                  className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Change phone number
                </button>
              </form>
            )}

            {(helpUrl || supportEmail) && (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Need help?{" "}
                {helpUrl ? (
                  <a
                    href={helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Help center
                  </a>
                ) : null}
                {helpUrl && supportEmail ? (
                  <span className="text-muted-foreground/80"> · </span>
                ) : null}
                {supportEmail ? (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {supportEmail}
                  </a>
                ) : null}
              </p>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
