"use client";

import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { Button, Separator, PriceDisplay, cn } from "@delivio/ui";
import { useCartStore } from "@/stores/cart-store";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clear, totalCents } =
    useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="flex size-24 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-12 text-muted-foreground" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Browse restaurants and add items to get started
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-6 rounded-full px-8"
          size="lg"
        >
          Browse restaurants
        </Button>
      </div>
    );
  }

  const deliveryFee = 250;
  const subtotal = totalCents();
  const total = subtotal + deliveryFee;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Your Cart</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-border"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <PriceDisplay
                  cents={item.unitPriceCents}
                  className="mt-0.5 text-sm text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex size-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex size-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <PriceDisplay
                cents={item.unitPriceCents * item.quantity}
                className="w-20 text-right font-semibold"
              />

              <button
                onClick={() => removeItem(item.id)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove item"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          <button
            onClick={() => clear()}
            className="mt-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear cart
          </button>
        </div>

        {/* Order summary */}
        <div className="h-fit rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-bold">Order Summary</h2>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <PriceDisplay cents={subtotal} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery fee</span>
              <PriceDisplay cents={deliveryFee} />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <PriceDisplay cents={total} />
            </div>
          </div>

          <Button
            onClick={() => router.push("/checkout")}
            className="mt-6 w-full gap-2 rounded-xl"
            size="lg"
          >
            Proceed to Checkout
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
