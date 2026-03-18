"use client";

import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Separator,
  PriceDisplay,
  EmptyState,
} from "@delivio/ui";
import { useCartStore } from "@/stores/cart-store";

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clear, totalCents } =
    useCartStore();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12">
        <EmptyState
          icon={<ShoppingBag />}
          title="Your cart is empty"
          description="Browse restaurants and add items to get started"
          action={
            <Button onClick={() => router.push("/")}>Browse restaurants</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <h1 className="mb-4 text-2xl font-bold">Your Cart</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <PriceDisplay
                  cents={item.unitPriceCents * item.quantity}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() =>
                    updateQuantity(item.id, item.quantity - 1)
                  }
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() =>
                    updateQuantity(item.id, item.quantity + 1)
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <PriceDisplay cents={totalCents()} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Delivery</span>
          <PriceDisplay cents={250} />
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <PriceDisplay cents={totalCents() + 250} />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={() => clear()} className="flex-1">
          Clear cart
        </Button>
        <Button
          onClick={() => router.push("/checkout")}
          className="flex-1"
        >
          Checkout
        </Button>
      </div>
    </div>
  );
}
