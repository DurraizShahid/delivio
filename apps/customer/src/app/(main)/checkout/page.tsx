"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  AlertTriangle,
  MapPin,
  ShoppingBag,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Separator, PriceDisplay } from "@delivio/ui";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import type { DeliveryCheck } from "@delivio/types";
import { PromoBanner } from "@/components/promo-banner";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalCents, clear, projectRef, shopId } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [deliveryCheck, setDeliveryCheck] = useState<DeliveryCheck | null>(
    null
  );
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!address.trim() || !projectRef) {
      setDeliveryCheck(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCheckingDelivery(true);
      try {
        const geo = await api.public.geocode(address.trim());
        const check = shopId
          ? await api.public.shopDeliveryCheck(
              projectRef,
              shopId,
              geo.lat,
              geo.lon
            )
          : await api.public.deliveryCheck(projectRef, geo.lat, geo.lon);
        setDeliveryCheck(check);
      } catch {
        setDeliveryCheck(null);
      } finally {
        setCheckingDelivery(false);
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [address, projectRef, shopId]);

  const deliveryFee = 250;
  const total = totalCents() + deliveryFee;
  const cannotDeliver = deliveryCheck !== null && !deliveryCheck.deliverable;

  async function handlePlaceOrder() {
    if (!isAuthenticated) {
      toast.error("Please sign in to place an order");
      router.push("/login");
      return;
    }

    if (!address.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }

    setLoading(true);
    try {
      await api.payments.createIntent({
        amountCents: total,
        currency: "gbp",
        metadata: { address },
      });
      toast.success("Order placed! Payment processing...");
      clear();
      router.push("/orders");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Failed to place order";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    router.push("/cart");
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <PromoBanner placement="checkout" />
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Delivery address */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Delivery Address</h2>
                <p className="text-xs text-muted-foreground">
                  Where should we deliver your order?
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Input
                placeholder="Enter your delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {checkingDelivery && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Checking delivery availability...
              </div>
            )}

            {cannotDeliver && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3">
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  Sorry, this restaurant doesn&apos;t deliver to your area
                </p>
              </div>
            )}
          </div>

          {/* Order items */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="size-5 text-primary" />
              </div>
              <h2 className="font-semibold">Order Items</h2>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} &times; {item.quantity}
                  </span>
                  <PriceDisplay
                    cents={item.unitPriceCents * item.quantity}
                    className="font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — Summary */}
        <div className="h-fit space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h2 className="text-lg font-bold">Payment Summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <PriceDisplay cents={totalCents()} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <PriceDisplay cents={deliveryFee} />
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <PriceDisplay cents={total} />
              </div>
            </div>

            <Button
              className="mt-6 w-full gap-2 rounded-xl"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={loading || cannotDeliver}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="size-4" />
                  Pay <PriceDisplay cents={total} className="text-primary-foreground" />
                </>
              )}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="size-3" />
              Secure payment powered by Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
