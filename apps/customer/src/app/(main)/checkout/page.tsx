"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CreditCard } from "lucide-react";
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

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalCents, clear } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");

  const deliveryFee = 250;
  const total = totalCents() + deliveryFee;

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
      const intent = await api.payments.createIntent({
        amountCents: total,
        currency: "gbp",
        metadata: { address },
      });
      toast.success("Order placed! Payment processing...");
      clear();
      router.push("/orders");
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
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

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handlePlaceOrder}
          disabled={loading}
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
