"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Separator,
  PriceDisplay,
} from "@delivio/ui";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import type { DeliveryCheck } from "@delivio/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalCents, clear, projectRef, shopId } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [deliveryCheck, setDeliveryCheck] = useState<DeliveryCheck | null>(null);
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
          ? await api.public.shopDeliveryCheck(projectRef, shopId, geo.lat, geo.lon)
          : await api.public.deliveryCheck(projectRef, geo.lat, geo.lon);
        setDeliveryCheck(check);
      } catch {
        setDeliveryCheck(null);
      } finally {
        setCheckingDelivery(false);
      }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [address, projectRef]);

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
    <div className="mx-auto max-w-md px-4 pt-4">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <h1 className="mb-4 text-2xl font-bold">Checkout</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Address</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter your delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <PriceDisplay cents={item.unitPriceCents * item.quantity} />
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <PriceDisplay cents={totalCents()} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <PriceDisplay cents={deliveryFee} />
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <PriceDisplay cents={total} />
            </div>
          </CardContent>
        </Card>

        {checkingDelivery && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking delivery availability...
          </div>
        )}

        {cannotDeliver && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="size-4 text-destructive shrink-0" />
              <p className="text-sm font-medium text-destructive">
                Sorry, this restaurant doesn&apos;t deliver to your area
              </p>
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handlePlaceOrder}
          disabled={loading || cannotDeliver}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="size-4" />
              Pay <PriceDisplay cents={total} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
